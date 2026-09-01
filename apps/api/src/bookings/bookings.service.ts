import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import {
  ERROR_CODES,
  generateSeatLayout,
  listSeatNumbers,
  type BookingCreateInput,
  type BookingDto,
  type SeatDisplayState,
  type SeatLayout,
  type SeatMapDto,
  type TripSearchQuery,
  type TripSearchResultDto,
} from '@starline/shared';
import { randomInt } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors';
import { serviceDateValue } from '../common/time';
import type { RequestUser } from '../common/types';
import { EVENTS } from '../events/events';
import { PrismaService } from '../prisma/prisma.service';

/** Grace window: trips remain bookable until shortly after departure. */
const BOOKABLE_UNTIL_AFTER_DEPARTURE_MIN = 15;

const bookingInclude = {
  trip: {
    include: {
      route: { select: { name: true, origin: true, destination: true } },
      bus: { select: { busNumber: true } },
    },
  },
  seats: { select: { seatNumber: true } },
  passenger: { select: { name: true, phone: true } },
  payment: { select: { status: true, method: true } },
} as const;

type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
    private readonly audit: AuditService,
  ) {}

  private reserveMinutes(): number {
    return this.config.get<number>('BOOKING_PENDING_EXPIRE_MINUTES') ?? 15;
  }

  toDto(b: BookingRow): BookingDto {
    return {
      id: b.id,
      code: b.code,
      tripId: b.tripId,
      routeName: b.trip.route.name,
      origin: b.trip.route.origin,
      destination: b.trip.route.destination,
      serviceDate: b.trip.serviceDate.toISOString().slice(0, 10),
      departureAt: b.trip.departureAt.toISOString(),
      busNumber: b.trip.bus?.busNumber ?? null,
      seatNumbers: b.seats.map((s) => s.seatNumber),
      fareTotalBdt: b.fareTotalBdt,
      status: b.status,
      boardingPoint: b.boardingPoint,
      passengerName: b.passenger.name,
      passengerPhone: b.passenger.phone,
      createdAt: b.createdAt.toISOString(),
      paymentStatus: b.payment?.status ?? null,
      paymentMethod: b.payment?.method ?? null,
    };
  }

  // ---------------------------------------------------------------- search

  async search(query: TripSearchQuery): Promise<TripSearchResultDto[]> {
    const cutoff = new Date(Date.now() - BOOKABLE_UNTIL_AFTER_DEPARTURE_MIN * 60_000);
    const trips = await this.prisma.trip.findMany({
      where: {
        serviceDate: serviceDateValue(query.date),
        status: { in: ['SCHEDULED', 'BOARDING'] },
        busId: { not: null },
        departureAt: { gte: cutoff },
        route: {
          origin: { equals: query.from, mode: 'insensitive' },
          destination: { equals: query.to, mode: 'insensitive' },
          status: 'ACTIVE',
        },
      },
      include: {
        route: { select: { name: true, origin: true, destination: true, estimatedDurationMin: true } },
        bus: { select: { busNumber: true, category: true, serviceType: true, seatCapacity: true } },
        _count: { select: { bookingSeats: true } },
      },
      orderBy: { departureAt: 'asc' },
      take: 50,
    });

    return trips
      .filter((t) => t.bus)
      .map((t) => ({
        id: t.id,
        routeName: t.route.name,
        origin: t.route.origin,
        destination: t.route.destination,
        departureAt: t.departureAt.toISOString(),
        estimatedDurationMin: t.route.estimatedDurationMin,
        fareBdt: t.fareBdt,
        busNumber: t.bus!.busNumber,
        category: t.bus!.category,
        serviceType: t.bus!.serviceType,
        seatCapacity: t.bus!.seatCapacity,
        seatsLeft: Math.max(0, t.bus!.seatCapacity - t._count.bookingSeats),
        status: t.status,
      }));
  }

  // --------------------------------------------------------------- seat map

  async seatMap(tripId: string, userId?: string): Promise<SeatMapDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        route: {
          select: {
            name: true,
            origin: true,
            destination: true,
            stops: { orderBy: { order: 'asc' } },
          },
        },
        bus: true,
        bookingSeats: {
          include: { booking: { select: { status: true, passengerId: true } } },
        },
      },
    });
    if (!trip) throw AppError.notFound('Trip not found');
    if (!trip.bus) {
      throw new AppError(ERROR_CODES.TRIP_NOT_BOOKABLE, 'No bus assigned yet', HttpStatus.CONFLICT);
    }

    const layout =
      (trip.bus.seatLayout as unknown as SeatLayout | null) ??
      generateSeatLayout('2+2', Math.ceil(trip.bus.seatCapacity / 4));

    const seatStates: Record<string, SeatDisplayState> = {};
    for (const seat of trip.bookingSeats) {
      if (seat.booking.status === 'PENDING') {
        seatStates[seat.seatNumber] = seat.booking.passengerId === userId ? 'MINE' : 'HELD';
      } else if (seat.booking.status !== 'CANCELLED') {
        seatStates[seat.seatNumber] = 'BOOKED';
      }
    }

    return {
      trip: {
        id: trip.id,
        routeName: trip.route.name,
        origin: trip.route.origin,
        destination: trip.route.destination,
        departureAt: trip.departureAt.toISOString(),
        fareBdt: trip.fareBdt,
        busNumber: trip.bus.busNumber,
        category: trip.bus.category,
        serviceType: trip.bus.serviceType,
        status: trip.status,
      },
      layout,
      seatStates,
      boardingPoints: trip.route.stops.filter((s) => s.isBoardingPoint).map((s) => s.name),
      reserveMinutes: this.reserveMinutes(),
    };
  }

  // ----------------------------------------------------------------- create

  /**
   * Atomic reservation: booking + seats + pending payment in one transaction.
   * The BookingSeat unique(tripId, seatNumber) constraint is the final word —
   * two passengers can never hold the same seat, no matter the race.
   */
  async create(input: BookingCreateInput, user: RequestUser): Promise<BookingDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: input.tripId },
      include: {
        route: { select: { origin: true, stops: { orderBy: { order: 'asc' } } } },
        bus: true,
      },
    });
    if (!trip || !trip.bus) throw AppError.notFound('Trip not found');
    if (
      !['SCHEDULED', 'BOARDING'].includes(trip.status) ||
      trip.departureAt.getTime() < Date.now() - BOOKABLE_UNTIL_AFTER_DEPARTURE_MIN * 60_000
    ) {
      throw new AppError(
        ERROR_CODES.TRIP_NOT_BOOKABLE,
        'This trip is not open for booking',
        HttpStatus.CONFLICT,
      );
    }

    const layout =
      (trip.bus.seatLayout as unknown as SeatLayout | null) ??
      generateSeatLayout('2+2', Math.ceil(trip.bus.seatCapacity / 4));
    const validSeats = new Set(listSeatNumbers(layout));
    const seats = [...new Set(input.seatNumbers)];
    for (const seat of seats) {
      if (!validSeats.has(seat)) {
        throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, `Unknown seat ${seat}`);
      }
    }

    const boardingPoints = trip.route.stops.filter((s) => s.isBoardingPoint).map((s) => s.name);
    const boardingPoint =
      input.boardingPoint && boardingPoints.includes(input.boardingPoint)
        ? input.boardingPoint
        : (boardingPoints[0] ?? trip.route.origin);

    const fareTotalBdt = trip.fareBdt * seats.length;

    for (let attempt = 0; attempt < 3; attempt++) {
      const code = `SL${randomInt(100000, 1000000)}`;
      try {
        const booking = await this.prisma.booking.create({
          data: {
            code,
            tripId: trip.id,
            passengerId: user.id,
            status: 'PENDING',
            fareTotalBdt,
            boardingPoint,
            seats: { create: seats.map((seatNumber) => ({ seatNumber, tripId: trip.id })) },
            payment: {
              create: { amountBdt: fareTotalBdt, method: 'SANDBOX', status: 'PENDING' },
            },
          },
          include: bookingInclude,
        });
        this.audit.log({
          actorId: user.id,
          action: 'BOOKING_CREATED',
          entity: 'Booking',
          entityId: booking.id,
          after: { code, seats, fareTotalBdt },
        });
        this.events.emit(EVENTS.SEAT_HELD, { tripId: trip.id, seats });
        return this.toDto(booking);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const target = String(err.meta?.target ?? '');
          if (target.includes('seatNumber')) {
            throw AppError.conflict(
              'One of the selected seats was just taken',
              ERROR_CODES.SEAT_ALREADY_BOOKED,
            );
          }
          if (target.includes('code')) continue; // rare code collision → retry
        }
        throw err;
      }
    }
    throw AppError.conflict('Could not allocate a booking code', ERROR_CODES.CONFLICT);
  }

  // ------------------------------------------------------------------ reads

  async byCode(code: string, user: RequestUser): Promise<BookingDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { code },
      include: bookingInclude,
    });
    if (!booking) throw AppError.notFound('Booking not found');
    const canView =
      booking.passengerId === user.id || user.permissions.includes('BOOKING_VIEW' as never);
    if (!canView) throw AppError.forbidden();
    return this.toDto(booking);
  }

  // ------------------------------------------------------------ expiry sweep

  /** Unpaid reservations release their seats after the configured window. */
  @Interval(60_000)
  async expirePendingBookings() {
    const cutoff = new Date(Date.now() - this.reserveMinutes() * 60_000);
    const stale = await this.prisma.booking.findMany({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
      select: { id: true, code: true, tripId: true },
    });
    for (const booking of stale) {
      await this.prisma.$transaction([
        this.prisma.bookingSeat.deleteMany({ where: { bookingId: booking.id } }),
        this.prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } }),
        this.prisma.payment.updateMany({
          where: { bookingId: booking.id, status: 'PENDING' },
          data: { status: 'FAILED' },
        }),
      ]);
      this.events.emit(EVENTS.SEAT_RELEASED, { tripId: booking.tripId });
      this.logger.log(`Released expired reservation ${booking.code}`);
    }
  }
}
