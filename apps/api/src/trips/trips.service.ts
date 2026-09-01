import { HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ACTIVE_TRIP_STATUSES,
  BRANCH_SCOPED_ROLES,
  ERROR_CODES,
  ROLES,
  type Paginated,
  type TripAssignInput,
  type TripCreateInput,
  type TripDto,
  type TripListQuery,
  type TripStatus,
} from '@starline/shared';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors';
import { paginate, skipTake } from '../common/pagination';
import { dhakaDateTime, serviceDateValue, todayDhaka } from '../common/time';
import type { RequestUser } from '../common/types';
import { EVENTS } from '../events/events';
import { PrismaService } from '../prisma/prisma.service';

/** Allowed lifecycle transitions. */
const TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['BOARDING', 'DEPARTED', 'CANCELLED'],
  BOARDING: ['DEPARTED', 'CANCELLED'],
  DEPARTED: ['IN_TRANSIT', 'ARRIVED', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED', 'COMPLETED', 'CANCELLED'],
  ARRIVED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

/** Buffer added around a trip's estimated window when checking conflicts. */
const CONFLICT_BUFFER_MIN = 60;

const tripInclude = {
  route: { select: { name: true, origin: true, destination: true, estimatedDurationMin: true } },
  bus: { select: { busNumber: true, seatCapacity: true } },
  driver: { select: { name: true } },
  supervisor: { select: { name: true } },
  helper: { select: { name: true } },
  branch: { select: { name: true } },
  _count: { select: { bookingSeats: true } },
} as const;

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  toDto(t: {
    id: string;
    routeId: string;
    serviceDate: Date;
    departureAt: Date;
    status: TripStatus;
    fareBdt: number;
    busId: string | null;
    driverId: string | null;
    supervisorId: string | null;
    helperId: string | null;
    branchId: string | null;
    route: { name: string; origin: string; destination: string };
    bus: { busNumber: string; seatCapacity: number } | null;
    driver: { name: string } | null;
    supervisor: { name: string } | null;
    helper: { name: string } | null;
    branch: { name: string } | null;
    _count?: { bookingSeats: number };
  }): TripDto {
    return {
      id: t.id,
      routeId: t.routeId,
      routeName: t.route.name,
      origin: t.route.origin,
      destination: t.route.destination,
      serviceDate: t.serviceDate.toISOString().slice(0, 10),
      departureAt: t.departureAt.toISOString(),
      status: t.status,
      fareBdt: t.fareBdt,
      busId: t.busId,
      busNumber: t.bus?.busNumber ?? null,
      driverId: t.driverId,
      driverName: t.driver?.name ?? null,
      supervisorId: t.supervisorId,
      supervisorName: t.supervisor?.name ?? null,
      helperId: t.helperId,
      helperName: t.helper?.name ?? null,
      branchId: t.branchId,
      branchName: t.branch?.name ?? null,
      bookedSeats: t._count?.bookingSeats,
      seatCapacity: t.bus?.seatCapacity ?? null,
    };
  }

  async list(query: TripListQuery, user: RequestUser): Promise<Paginated<TripDto>> {
    const scopedBranchId = BRANCH_SCOPED_ROLES.includes(user.role as never)
      ? user.branchId
      : query.branchId;
    const where = {
      ...(query.date ? { serviceDate: serviceDateValue(query.date) } : {}),
      ...(query.routeId ? { routeId: query.routeId } : {}),
      ...(query.busId ? { busId: query.busId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.trip.count({ where }),
      this.prisma.trip.findMany({
        where,
        include: tripInclude,
        orderBy: { departureAt: 'asc' },
        ...skipTake(query.page, query.pageSize),
      }),
    ]);
    return paginate(rows.map((t) => this.toDto(t)), total, query.page, query.pageSize);
  }

  /** Today's trips for the signed-in crew member (driver/supervisor/helper). */
  async myToday(user: RequestUser) {
    const today = serviceDateValue(todayDhaka());
    const trips = await this.prisma.trip.findMany({
      where: {
        serviceDate: today,
        status: { notIn: ['CANCELLED'] },
        OR: [{ driverId: user.id }, { supervisorId: user.id }, { helperId: user.id }],
      },
      include: {
        ...tripInclude,
        route: {
          select: {
            name: true,
            origin: true,
            destination: true,
            estimatedDurationMin: true,
            stops: { orderBy: { order: 'asc' } },
          },
        },
        gpsSessions: { where: { status: { in: ['ACTIVE', 'PAUSED'] } }, take: 1 },
      },
      orderBy: { departureAt: 'asc' },
    });
    return trips.map((t) => ({
      ...this.toDto(t),
      stops: t.route.stops.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        lat: s.lat,
        lng: s.lng,
        isBoardingPoint: s.isBoardingPoint,
      })),
      gpsSession: t.gpsSessions[0]
        ? { id: t.gpsSessions[0].id, status: t.gpsSessions[0].status }
        : null,
    }));
  }

  async get(id: string, user: RequestUser): Promise<TripDto> {
    const trip = await this.prisma.trip.findUnique({ where: { id }, include: tripInclude });
    if (!trip) throw AppError.notFound('Trip not found');
    const isCrew = [trip.driverId, trip.supervisorId, trip.helperId].includes(user.id);
    if (!isCrew && !user.permissions.includes('TRIP_VIEW' as never)) {
      throw AppError.forbidden();
    }
    return this.toDto(trip);
  }

  /** Class-aware default fare: AC buses use the route's AC fare when set. */
  private classFare(
    route: { baseFareBdt: number; acFareBdt: number | null },
    busCategory: 'AC' | 'NON_AC' | null,
  ): number {
    return busCategory === 'AC' && route.acFareBdt ? route.acFareBdt : route.baseFareBdt;
  }

  async create(input: TripCreateInput, actor: RequestUser): Promise<TripDto> {
    const route = await this.prisma.route.findUnique({ where: { id: input.routeId } });
    if (!route) throw AppError.notFound('Route not found');

    let busCategory: 'AC' | 'NON_AC' | null = null;
    if (input.busId) {
      const bus = await this.prisma.bus.findUnique({ where: { id: input.busId } });
      if (!bus) throw AppError.notFound('Bus not found');
      busCategory = bus.category;
    }

    const departureAt = dhakaDateTime(input.serviceDate, input.departureTime);
    await this.validateAssignments(null, {
      busId: input.busId ?? null,
      driverId: input.driverId ?? null,
      supervisorId: input.supervisorId ?? null,
      helperId: input.helperId ?? null,
      departureAt,
      durationMin: route.estimatedDurationMin,
    });
    await this.validateCrewRoles(input);

    const trip = await this.prisma.trip.create({
      data: {
        routeId: input.routeId,
        scheduleId: input.scheduleId ?? null,
        serviceDate: serviceDateValue(input.serviceDate),
        departureAt,
        fareBdt: input.fareBdt ?? this.classFare(route, busCategory),
        busId: input.busId ?? null,
        driverId: input.driverId ?? null,
        supervisorId: input.supervisorId ?? null,
        helperId: input.helperId ?? null,
        branchId: input.branchId ?? null,
      },
      include: tripInclude,
    });
    this.audit.log({
      actorId: actor.id,
      action: 'TRIP_CREATED',
      entity: 'Trip',
      entityId: trip.id,
      after: { route: route.name, departureAt: departureAt.toISOString() },
    });
    return this.toDto(trip);
  }

  async assign(id: string, input: TripAssignInput, actor: RequestUser): Promise<TripDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        route: {
          select: { name: true, estimatedDurationMin: true, baseFareBdt: true, acFareBdt: true },
        },
      },
    });
    if (!trip) throw AppError.notFound('Trip not found');
    if (['COMPLETED', 'CANCELLED'].includes(trip.status)) {
      throw AppError.conflict('Cannot reassign a finished trip', ERROR_CODES.TRIP_NOT_ACTIVE);
    }

    const next = {
      busId: input.busId !== undefined ? input.busId : trip.busId,
      driverId: input.driverId !== undefined ? input.driverId : trip.driverId,
      supervisorId: input.supervisorId !== undefined ? input.supervisorId : trip.supervisorId,
      helperId: input.helperId !== undefined ? input.helperId : trip.helperId,
    };
    await this.validateAssignments(id, {
      ...next,
      departureAt: trip.departureAt,
      durationMin: trip.route.estimatedDurationMin,
    });
    await this.validateCrewRoles(next);

    // Bus class changed? Re-apply the class default fare — but only while the
    // fare is still a default and nobody has bought a ticket at the old price.
    let fareBdt: number | undefined;
    if (input.busId !== undefined && next.busId && next.busId !== trip.busId) {
      const bus = await this.prisma.bus.findUnique({ where: { id: next.busId } });
      if (!bus) throw AppError.notFound('Bus not found');
      const soldSeats = await this.prisma.booking.count({
        where: { tripId: id, status: { notIn: ['CANCELLED'] } },
      });
      const defaults = [trip.route.baseFareBdt, trip.route.acFareBdt].filter(
        (f): f is number => f != null,
      );
      if (soldSeats === 0 && defaults.includes(trip.fareBdt)) {
        fareBdt = this.classFare(trip.route, bus.category);
      }
    }

    const updated = await this.prisma.trip.update({
      where: { id },
      data: {
        busId: next.busId,
        driverId: next.driverId,
        supervisorId: next.supervisorId,
        helperId: next.helperId,
        ...(fareBdt !== undefined ? { fareBdt } : {}),
        ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
      },
      include: tripInclude,
    });

    this.audit.log({
      actorId: actor.id,
      action: 'TRIP_ASSIGNED',
      entity: 'Trip',
      entityId: id,
      before: {
        busId: trip.busId,
        driverId: trip.driverId,
        supervisorId: trip.supervisorId,
        helperId: trip.helperId,
      },
      after: next,
    });
    if (input.driverId) this.events.emit(EVENTS.DRIVER_ASSIGNED, { tripId: id, driverId: input.driverId });
    if (input.busId) this.events.emit(EVENTS.BUS_ASSIGNED, { tripId: id, busId: input.busId });
    return this.toDto(updated);
  }

  async updateStatus(id: string, status: TripStatus, user: RequestUser): Promise<TripDto> {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw AppError.notFound('Trip not found');

    const isCrew = [trip.driverId, trip.supervisorId].includes(user.id);
    if (!isCrew && !user.permissions.includes('TRIP_EDIT' as never)) {
      throw AppError.forbidden('Only assigned crew or trip editors can change trip status');
    }
    if (!TRANSITIONS[trip.status as TripStatus].includes(status)) {
      throw AppError.conflict(
        `Cannot move trip from ${trip.status} to ${status}`,
        ERROR_CODES.CONFLICT,
      );
    }

    const updated = await this.applyStatus(id, status);
    this.audit.log({
      actorId: user.id,
      action: 'TRIP_STATUS_CHANGED',
      entity: 'Trip',
      entityId: id,
      before: { status: trip.status },
      after: { status },
    });
    return this.toDto(updated);
  }

  /**
   * Applies a status + the bus-status side effects, and emits the domain
   * event the realtime gateway broadcasts. Used by both the REST endpoint
   * and the GPS start/end flow.
   */
  async applyStatus(tripId: string, status: TripStatus) {
    const now = new Date();
    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        status,
        ...(status === 'ARRIVED' || status === 'COMPLETED' ? { arrivedAt: now } : {}),
      },
      include: tripInclude,
    });

    let busStatus: 'IN_TRIP' | 'IDLE' | undefined;
    if (updated.busId) {
      if (ACTIVE_TRIP_STATUSES.includes(status)) busStatus = 'IN_TRIP';
      if (['ARRIVED', 'COMPLETED', 'CANCELLED'].includes(status)) {
        const otherActive = await this.prisma.trip.count({
          where: {
            busId: updated.busId,
            id: { not: tripId },
            status: { in: ACTIVE_TRIP_STATUSES },
          },
        });
        if (otherActive === 0) busStatus = 'IDLE';
      }
      if (busStatus) {
        await this.prisma.bus.update({ where: { id: updated.busId }, data: { status: busStatus } });
      }
    }

    this.events.emit(EVENTS.TRIP_STATUS_CHANGED, {
      tripId,
      status,
      busId: updated.busId,
      busStatus,
      at: now.toISOString(),
    });
    return updated;
  }

  private async validateCrewRoles(input: {
    driverId?: string | null;
    supervisorId?: string | null;
    helperId?: string | null;
  }) {
    const checks: Array<[string | null | undefined, string]> = [
      [input.driverId, ROLES.DRIVER],
      [input.supervisorId, ROLES.SUPERVISOR],
      [input.helperId, ROLES.HELPER],
    ];
    for (const [userId, roleName] of checks) {
      if (!userId) continue;
      const u = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
      if (!u) throw AppError.notFound(`User for role ${roleName} not found`);
      if (u.role.name !== roleName) {
        throw AppError.badRequest(
          ERROR_CODES.VALIDATION_ERROR,
          `${u.name} is ${u.role.name}, expected ${roleName}`,
        );
      }
    }
  }

  /**
   * Server-side conflict prevention: a bus/driver/supervisor/helper cannot be
   * on two overlapping trips. Overlap = estimated windows (departure →
   * departure + duration + buffer) intersect.
   */
  private async validateAssignments(
    tripId: string | null,
    input: {
      busId: string | null;
      driverId: string | null;
      supervisorId: string | null;
      helperId: string | null;
      departureAt: Date;
      durationMin: number;
    },
  ) {
    const myStart = input.departureAt.getTime();
    const myEnd = myStart + (input.durationMin + CONFLICT_BUFFER_MIN) * 60_000;
    // Candidate window — anything departing within ±24h could overlap.
    const windowStart = new Date(myStart - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(myEnd + 24 * 60 * 60 * 1000);

    const resources: Array<['busId' | 'driverId' | 'supervisorId' | 'helperId', string]> = [];
    if (input.busId) resources.push(['busId', input.busId]);
    if (input.driverId) resources.push(['driverId', input.driverId]);
    if (input.supervisorId) resources.push(['supervisorId', input.supervisorId]);
    if (input.helperId) resources.push(['helperId', input.helperId]);
    if (resources.length === 0) return;

    for (const [field, value] of resources) {
      const candidates = await this.prisma.trip.findMany({
        where: {
          [field]: value,
          ...(tripId ? { id: { not: tripId } } : {}),
          status: { in: ['SCHEDULED', 'BOARDING', 'DEPARTED', 'IN_TRANSIT'] },
          departureAt: { gte: windowStart, lte: windowEnd },
        },
        include: { route: { select: { name: true, estimatedDurationMin: true } } },
      });
      for (const other of candidates) {
        const otherStart = other.departureAt.getTime();
        const otherEnd =
          otherStart + (other.route.estimatedDurationMin + CONFLICT_BUFFER_MIN) * 60_000;
        if (myStart < otherEnd && otherStart < myEnd) {
          throw new AppError(
            ERROR_CODES.ASSIGNMENT_CONFLICT,
            `Assignment conflict: ${field.replace('Id', '')} is already on trip ${other.route.name} at ${other.departureAt.toISOString()}`,
            HttpStatus.CONFLICT,
            { field, conflictingTripId: other.id },
          );
        }
      }
    }
  }
}
