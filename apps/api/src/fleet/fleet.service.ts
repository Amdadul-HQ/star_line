import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ACTIVE_TRIP_STATUSES,
  BUS_STATUSES,
  type BusStatus,
  type FleetOverviewDto,
} from '@starline/shared';
import { dhakaDateTime, serviceDateValue, todayDhaka } from '../common/time';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FleetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async overview(): Promise<FleetOverviewDto> {
    const today = todayDhaka();
    const dayStart = dhakaDateTime(today, '00:00');
    const staleMs = (this.config.get<number>('GPS_STALE_AFTER_SECONDS') ?? 60) * 1000;

    // groupBy sits outside the $transaction tuple — its generics don't
    // survive Prisma's transaction type inference.
    const byStatusRaw = await this.prisma.bus.groupBy({
      by: ['status'],
      _count: { _all: true },
      orderBy: { status: 'asc' },
    });

    const [activeTrips, tripsToday, bookingsToday, revenueToday, passengers, liveBuses] =
      await this.prisma.$transaction([
      this.prisma.trip.count({ where: { status: { in: ACTIVE_TRIP_STATUSES } } }),
      this.prisma.trip.count({ where: { serviceDate: serviceDateValue(today) } }),
      this.prisma.booking.count({
        where: { createdAt: { gte: dayStart }, status: { not: 'CANCELLED' } },
      }),
      this.prisma.booking.aggregate({
        where: { createdAt: { gte: dayStart }, status: { not: 'CANCELLED' } },
        _sum: { fareTotalBdt: true },
      }),
      this.prisma.user.count({ where: { role: { name: 'PASSENGER' } } }),
      this.prisma.busLocation.count({
        where: { recordedAt: { gte: new Date(Date.now() - staleMs) } },
      }),
    ]);

    const byStatus = Object.fromEntries(BUS_STATUSES.map((s) => [s, 0])) as Record<
      BusStatus,
      number
    >;
    let totalBuses = 0;
    for (const row of byStatusRaw) {
      byStatus[row.status as BusStatus] = row._count._all;
      totalBuses += row._count._all;
    }

    return {
      totalBuses,
      byStatus,
      activeTrips,
      tripsToday,
      bookingsToday,
      revenueTodayBdt: revenueToday._sum.fareTotalBdt ?? 0,
      passengers,
      liveBuses,
    };
  }
}
