import { Injectable } from '@nestjs/common';
import {
  BRANCH_SCOPED_ROLES,
  BUS_STATUSES,
  countSeats,
  ERROR_CODES,
  generateSeatLayout,
  pageQuerySchema,
  type BusCreateInput,
  type BusDto,
  type BusUpdateInput,
  type Paginated,
  type SeatLayout,
} from '@starline/shared';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors';
import { paginate, skipTake } from '../common/pagination';
import type { RequestUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

export const busListQuerySchema = pageQuerySchema.extend({
  status: z.enum(BUS_STATUSES).optional(),
  branchId: z.string().cuid().optional(),
  search: z.string().max(80).optional(),
});
export type BusListQuery = z.infer<typeof busListQuerySchema>;

@Injectable()
export class BusesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(bus: {
    id: string;
    busNumber: string;
    registrationNumber: string;
    brand: string;
    model: string;
    category: 'AC' | 'NON_AC';
    serviceType: string;
    seatCapacity: number;
    seatLayout: unknown;
    status: BusDto['status'];
    branchId: string | null;
    createdAt: Date;
    branch: { name: string } | null;
  }): BusDto {
    return {
      id: bus.id,
      busNumber: bus.busNumber,
      registrationNumber: bus.registrationNumber,
      brand: bus.brand,
      model: bus.model,
      category: bus.category,
      serviceType: bus.serviceType,
      seatCapacity: bus.seatCapacity,
      seatLayout: (bus.seatLayout as SeatLayout | null) ?? null,
      status: bus.status,
      branchId: bus.branchId,
      branchName: bus.branch?.name ?? null,
      createdAt: bus.createdAt.toISOString(),
    };
  }

  private scopeBranch(query: BusListQuery, user: RequestUser): string | undefined {
    return BRANCH_SCOPED_ROLES.includes(user.role as never)
      ? (user.branchId ?? undefined)
      : query.branchId;
  }

  async list(query: BusListQuery, user: RequestUser): Promise<Paginated<BusDto>> {
    const branchId = this.scopeBranch(query, user);
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(branchId ? { branchId } : {}),
      ...(query.search
        ? {
            OR: [
              { busNumber: { contains: query.search, mode: 'insensitive' as const } },
              { registrationNumber: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.bus.count({ where }),
      this.prisma.bus.findMany({
        where,
        include: { branch: { select: { name: true } } },
        orderBy: { busNumber: 'asc' },
        ...skipTake(query.page, query.pageSize),
      }),
    ]);
    return paginate(rows.map((b) => this.toDto(b)), total, query.page, query.pageSize);
  }

  async options(): Promise<{ id: string; busNumber: string; status: string }[]> {
    return this.prisma.bus.findMany({
      where: { status: { notIn: ['INACTIVE'] } },
      select: { id: true, busNumber: true, status: true },
      orderBy: { busNumber: 'asc' },
    });
  }

  async profile(id: string) {
    const bus = await this.prisma.bus.findUnique({
      where: { id },
      include: {
        branch: { select: { name: true } },
        location: true,
        trips: {
          where: { status: { in: ['SCHEDULED', 'BOARDING', 'DEPARTED', 'IN_TRANSIT'] } },
          include: {
            route: { select: { name: true } },
            driver: { select: { id: true, name: true } },
            supervisor: { select: { id: true, name: true } },
            helper: { select: { id: true, name: true } },
          },
          orderBy: { departureAt: 'asc' },
          take: 3,
        },
      },
    });
    if (!bus) throw AppError.notFound('Bus not found');
    return {
      ...this.toDto(bus),
      location: bus.location
        ? {
            lat: bus.location.lat,
            lng: bus.location.lng,
            speedKph: bus.location.speedKph,
            heading: bus.location.heading,
            recordedAt: bus.location.recordedAt.toISOString(),
          }
        : null,
      activeTrips: bus.trips.map((t) => ({
        id: t.id,
        routeName: t.route.name,
        departureAt: t.departureAt.toISOString(),
        status: t.status,
        driverName: t.driver?.name ?? null,
        supervisorName: t.supervisor?.name ?? null,
        helperName: t.helper?.name ?? null,
      })),
    };
  }

  async create(input: BusCreateInput, actor: RequestUser): Promise<BusDto> {
    if (input.branchId) {
      const branch = await this.prisma.branch.findUnique({ where: { id: input.branchId } });
      if (!branch) throw AppError.notFound('Branch not found');
    }
    // Auto-generate a standard layout when none supplied; capacity follows
    // the layout so the two never disagree.
    let layout = input.seatLayout as SeatLayout | undefined;
    let capacity = input.seatCapacity;
    if (!layout) {
      const rows = Math.ceil(input.seatCapacity / (input.seatCapacity % 3 === 0 ? 3 : 4));
      layout = generateSeatLayout(input.seatCapacity % 3 === 0 ? '2+1' : '2+2', rows);
      capacity = countSeats(layout);
    } else {
      capacity = countSeats(layout);
    }

    const bus = await this.prisma.bus.create({
      data: {
        busNumber: input.busNumber,
        registrationNumber: input.registrationNumber,
        brand: input.brand,
        model: input.model,
        category: input.category,
        serviceType: input.serviceType,
        seatCapacity: capacity,
        seatLayout: layout as unknown as object,
        status: input.status,
        branchId: input.branchId ?? null,
      },
      include: { branch: { select: { name: true } } },
    });
    this.audit.log({
      actorId: actor.id,
      action: 'BUS_CREATED',
      entity: 'Bus',
      entityId: bus.id,
      after: { busNumber: bus.busNumber, status: bus.status },
    });
    return this.toDto(bus);
  }

  async update(id: string, input: BusUpdateInput, actor: RequestUser): Promise<BusDto> {
    const existing = await this.prisma.bus.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Bus not found');

    const bus = await this.prisma.bus.update({
      where: { id },
      data: {
        ...(input.busNumber !== undefined ? { busNumber: input.busNumber } : {}),
        ...(input.registrationNumber !== undefined
          ? { registrationNumber: input.registrationNumber }
          : {}),
        ...(input.brand !== undefined ? { brand: input.brand } : {}),
        ...(input.model !== undefined ? { model: input.model } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.serviceType !== undefined ? { serviceType: input.serviceType } : {}),
        ...(input.seatCapacity !== undefined ? { seatCapacity: input.seatCapacity } : {}),
        ...(input.seatLayout !== undefined
          ? { seatLayout: input.seatLayout as unknown as object }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
      },
      include: { branch: { select: { name: true } } },
    });
    this.audit.log({
      actorId: actor.id,
      action: 'BUS_UPDATED',
      entity: 'Bus',
      entityId: id,
      before: { busNumber: existing.busNumber, status: existing.status, branchId: existing.branchId },
      after: { busNumber: bus.busNumber, status: bus.status, branchId: bus.branchId },
    });
    return this.toDto(bus);
  }

  async remove(id: string, actor: RequestUser): Promise<{ ok: true }> {
    const tripCount = await this.prisma.trip.count({ where: { busId: id } });
    if (tripCount > 0) {
      throw AppError.conflict(
        'Bus has trips attached — mark it INACTIVE instead of deleting',
        ERROR_CODES.CONFLICT,
      );
    }
    const bus = await this.prisma.bus.delete({ where: { id } });
    this.audit.log({
      actorId: actor.id,
      action: 'BUS_DELETED',
      entity: 'Bus',
      entityId: id,
      before: { busNumber: bus.busNumber },
    });
    return { ok: true };
  }
}
