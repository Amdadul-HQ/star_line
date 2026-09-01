import { Injectable } from '@nestjs/common';
import {
  ERROR_CODES,
  pageQuerySchema,
  type BookingDto,
  type Paginated,
  type TrackTripDto,
} from '@starline/shared';
import { z } from 'zod';
import { AppError } from '../common/errors';
import { paginate, skipTake } from '../common/pagination';
import { EtaService } from '../gps/eta.service';
import { GpsService } from '../gps/gps.service';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../trips/trips.service';

export const passengerBookingsQuerySchema = pageQuerySchema;
export type PassengerBookingsQuery = z.infer<typeof passengerBookingsQuerySchema>;

const bookingInclude = {
  trip: {
    include: {
      route: { select: { name: true, origin: true, destination: true } },
      bus: { select: { busNumber: true } },
    },
  },
  seats: { select: { seatNumber: true } },
  payment: { select: { status: true, method: true } },
} as const;

type BookingRow = {
  id: string;
  code: string;
  tripId: string;
  status: BookingDto['status'];
  fareTotalBdt: number;
  boardingPoint: string | null;
  createdAt: Date;
  trip: {
    serviceDate: Date;
    departureAt: Date;
    route: { name: string; origin: string; destination: string };
    bus: { busNumber: string } | null;
  };
  seats: { seatNumber: string }[];
  payment: { status: string; method: string } | null;
};

@Injectable()
export class PassengerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gps: GpsService,
    private readonly eta: EtaService,
    private readonly trips: TripsService,
  ) {}

  private toBookingDto(b: BookingRow, passenger: { name: string; phone: string | null }): BookingDto {
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
      passengerName: passenger.name,
      passengerPhone: passenger.phone,
      createdAt: b.createdAt.toISOString(),
      paymentStatus: b.payment?.status ?? null,
      paymentMethod: b.payment?.method ?? null,
    };
  }

  async overview(userId: string) {
    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, phone: true },
    });
    const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const [upcoming, totalBookings] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where: {
          passengerId: userId,
          status: { in: ['CONFIRMED', 'PENDING'] },
          trip: {
            status: { notIn: ['CANCELLED', 'COMPLETED'] },
            // Departing soon — or already on the road (tracking matters most then).
            OR: [
              { departureAt: { gte: cutoff } },
              { status: { in: ['BOARDING', 'DEPARTED', 'IN_TRANSIT', 'ARRIVED'] } },
            ],
          },
        },
        include: bookingInclude,
        orderBy: { trip: { departureAt: 'asc' } },
        take: 3,
      }),
      this.prisma.booking.count({ where: { passengerId: userId } }),
    ]);
    return {
      upcoming: upcoming.map((b) => this.toBookingDto(b, me)),
      totalBookings,
    };
  }

  async bookings(userId: string, query: PassengerBookingsQuery): Promise<Paginated<BookingDto>> {
    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, phone: true },
    });
    const where = { passengerId: userId };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { trip: { departureAt: 'desc' } },
        ...skipTake(query.page, query.pageSize),
      }),
    ]);
    return paginate(rows.map((b) => this.toBookingDto(b, me)), total, query.page, query.pageSize);
  }

  /** Live tracking payload — strictly limited to trips the passenger booked. */
  async track(userId: string, tripId: string): Promise<TrackTripDto> {
    const allowed = await this.gps.isPassengerAllowed(userId, tripId);
    if (!allowed) {
      throw AppError.forbidden(
        'You can only track trips you are booked on',
        ERROR_CODES.TRACKING_NOT_ALLOWED,
      );
    }

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
        bus: { select: { busNumber: true, seatCapacity: true } },
        driver: { select: { name: true } },
        supervisor: { select: { name: true } },
        helper: { select: { name: true } },
        branch: { select: { name: true } },
      },
    });
    if (!trip) throw AppError.notFound('Trip not found');

    const location = await this.gps.latestForTrip(tripId);
    const stops = trip.route.stops.map((s) => ({ lat: s.lat, lng: s.lng, name: s.name }));
    const etaResult =
      location && !location.stale
        ? this.eta.compute(stops, { lat: location.lat, lng: location.lng }, location.speedKph)
        : { etaMinutes: null, progressPct: null, nextStop: null, remainingKm: null };

    return {
      trip: this.trips.toDto(trip as never),
      location,
      etaMinutes: etaResult.etaMinutes,
      progressPct: etaResult.progressPct,
      nextStop: etaResult.nextStop,
      routePath: stops,
    };
  }
}
