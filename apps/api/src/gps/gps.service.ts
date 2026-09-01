import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import {
  ACTIVE_TRIP_STATUSES,
  ERROR_CODES,
  type BusLatestLocationDto,
  type GpsSource,
  type TripStatus,
} from '@starline/shared';
import { AppError } from '../common/errors';
import type { RequestUser } from '../common/types';
import { EVENTS } from '../events/events';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../trips/trips.service';

interface TripMeta {
  tripId: string;
  busId: string;
  busNumber: string;
  routeName: string;
  driverId: string | null;
  supervisorId: string | null;
  status: TripStatus;
}

export interface GpsFix {
  lat: number;
  lng: number;
  speedKph?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  recordedAt: string;
}

const META_TTL_MS = 30_000;

@Injectable()
export class GpsService {
  private readonly logger = new Logger(GpsService.name);
  private metaCache = new Map<string, { meta: TripMeta; cachedAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
    private readonly trips: TripsService,
  ) {}

  // ----------------------------------------------------------------- meta

  private async getTripMeta(tripId: string): Promise<TripMeta> {
    const hit = this.metaCache.get(tripId);
    if (hit && Date.now() - hit.cachedAt < META_TTL_MS) return hit.meta;

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bus: { select: { busNumber: true } },
        route: { select: { name: true } },
      },
    });
    if (!trip) throw AppError.notFound('Trip not found');
    if (!trip.busId || !trip.bus) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Trip has no bus assigned');
    }
    const meta: TripMeta = {
      tripId,
      busId: trip.busId,
      busNumber: trip.bus.busNumber,
      routeName: trip.route.name,
      driverId: trip.driverId,
      supervisorId: trip.supervisorId,
      status: trip.status as TripStatus,
    };
    this.metaCache.set(tripId, { meta, cachedAt: Date.now() });
    return meta;
  }

  invalidateTripMeta(tripId: string) {
    this.metaCache.delete(tripId);
  }

  private assertCrew(meta: TripMeta, userId: string) {
    if (meta.driverId !== userId && meta.supervisorId !== userId) {
      throw AppError.forbidden('You are not assigned to this trip', ERROR_CODES.NOT_TRIP_CREW);
    }
  }

  // --------------------------------------------------------- trip sharing

  /** Driver presses START TRIP — trip departs and a GPS session opens. */
  async startSharing(user: RequestUser, tripId: string) {
    this.invalidateTripMeta(tripId);
    const meta = await this.getTripMeta(tripId);
    this.assertCrew(meta, user.id);

    if (!['SCHEDULED', 'BOARDING', 'DEPARTED', 'IN_TRANSIT'].includes(meta.status)) {
      throw AppError.conflict('Trip is not in a startable state', ERROR_CODES.TRIP_NOT_ACTIVE);
    }
    if (meta.status === 'SCHEDULED' || meta.status === 'BOARDING') {
      await this.trips.applyStatus(tripId, 'DEPARTED');
      meta.status = 'DEPARTED';
    }

    const existing = await this.prisma.gpsSession.findFirst({
      where: { tripId, status: { in: ['ACTIVE', 'PAUSED'] } },
      orderBy: { startedAt: 'desc' },
    });
    const session = existing
      ? await this.prisma.gpsSession.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE' },
        })
      : await this.prisma.gpsSession.create({
          data: {
            tripId,
            busId: meta.busId,
            startedById: user.id,
            source: 'DRIVER_APP',
            status: 'ACTIVE',
          },
        });
    return { id: session.id, tripId, busId: meta.busId, status: session.status };
  }

  async setSharingPaused(user: RequestUser, tripId: string, paused: boolean) {
    const meta = await this.getTripMeta(tripId);
    this.assertCrew(meta, user.id);
    const session = await this.prisma.gpsSession.findFirst({
      where: { tripId, status: { in: ['ACTIVE', 'PAUSED'] } },
      orderBy: { startedAt: 'desc' },
    });
    if (!session) throw AppError.notFound('No active GPS session for this trip');
    const updated = await this.prisma.gpsSession.update({
      where: { id: session.id },
      data: { status: paused ? 'PAUSED' : 'ACTIVE' },
    });
    return { id: updated.id, tripId, busId: meta.busId, status: updated.status };
  }

  /** Driver presses END TRIP — sessions close, trip completes, bus goes idle. */
  async endTrip(user: RequestUser, tripId: string) {
    const meta = await this.getTripMeta(tripId);
    this.assertCrew(meta, user.id);

    await this.prisma.gpsSession.updateMany({
      where: { tripId, status: { in: ['ACTIVE', 'PAUSED'] } },
      data: { status: 'ENDED', endedAt: new Date() },
    });
    if (ACTIVE_TRIP_STATUSES.includes(meta.status)) {
      await this.trips.applyStatus(tripId, meta.status === 'DEPARTED' ? 'ARRIVED' : 'COMPLETED');
      if (meta.status === 'DEPARTED') await this.trips.applyStatus(tripId, 'COMPLETED');
    }
    this.invalidateTripMeta(tripId);
    return { ok: true };
  }

  // -------------------------------------------------------------- ingest

  /** Driver-app ingest — crew-authenticated. */
  async ingest(user: RequestUser, tripId: string, fix: GpsFix) {
    const meta = await this.getTripMeta(tripId);
    this.assertCrew(meta, user.id);
    return this.processFix(meta, fix, 'DRIVER_APP');
  }

  /** Internal ingest for the simulator (authorization handled by its controller). */
  async ingestSystem(tripId: string, fix: GpsFix, source: GpsSource) {
    const meta = await this.getTripMeta(tripId);
    return this.processFix(meta, fix, source);
  }

  /**
   * The single GPS pipeline: validate → upsert latest → async history →
   * broadcast. Both real devices and the simulator go through here, so the
   * realtime behaviour seen in the UI always originates from the backend.
   */
  private async processFix(meta: TripMeta, fix: GpsFix, source: GpsSource) {
    const recordedAt = new Date(fix.recordedAt);
    const now = Date.now();
    if (Number.isNaN(recordedAt.getTime())) {
      throw AppError.badRequest(ERROR_CODES.GPS_INVALID_COORDINATES, 'Invalid timestamp');
    }
    const maxAgeMs = (this.config.get<number>('GPS_MAX_FIX_AGE_SECONDS') ?? 120) * 1000;
    if (now - recordedAt.getTime() > maxAgeMs) {
      throw AppError.badRequest(ERROR_CODES.GPS_STALE_FIX, 'GPS fix is too old');
    }
    if (recordedAt.getTime() - now > 30_000) {
      throw AppError.badRequest(ERROR_CODES.GPS_INVALID_COORDINATES, 'GPS fix timestamp is in the future');
    }
    if (fix.lat === 0 && fix.lng === 0) {
      throw AppError.badRequest(ERROR_CODES.GPS_INVALID_COORDINATES, 'Null-island coordinates rejected');
    }
    if (!ACTIVE_TRIP_STATUSES.includes(meta.status)) {
      throw new AppError(ERROR_CODES.TRIP_NOT_ACTIVE, 'Trip is not active', HttpStatus.CONFLICT);
    }

    // Drop duplicates / out-of-order fixes (same or older timestamp).
    const latest = await this.prisma.busLocation.findUnique({ where: { busId: meta.busId } });
    if (latest && latest.recordedAt.getTime() >= recordedAt.getTime()) {
      return { accepted: false, reason: 'duplicate_or_out_of_order' };
    }

    await this.prisma.busLocation.upsert({
      where: { busId: meta.busId },
      create: {
        busId: meta.busId,
        tripId: meta.tripId,
        lat: fix.lat,
        lng: fix.lng,
        speedKph: fix.speedKph ?? null,
        heading: fix.heading ?? null,
        accuracy: fix.accuracy ?? null,
        source,
        recordedAt,
      },
      update: {
        tripId: meta.tripId,
        lat: fix.lat,
        lng: fix.lng,
        speedKph: fix.speedKph ?? null,
        heading: fix.heading ?? null,
        accuracy: fix.accuracy ?? null,
        source,
        recordedAt,
      },
    });

    // Historical trail is written off the hot path.
    void this.prisma.gpsLocationHistory
      .create({
        data: {
          busId: meta.busId,
          tripId: meta.tripId,
          lat: fix.lat,
          lng: fix.lng,
          speedKph: fix.speedKph ?? null,
          heading: fix.heading ?? null,
          accuracy: fix.accuracy ?? null,
          recordedAt,
        },
      })
      .catch((err) => this.logger.warn(`History write failed: ${err.message}`));

    // First movement promotes DEPARTED → IN_TRANSIT.
    if (meta.status === 'DEPARTED') {
      await this.trips.applyStatus(meta.tripId, 'IN_TRANSIT');
      meta.status = 'IN_TRANSIT';
    }

    this.events.emit(EVENTS.BUS_LOCATION_UPDATED, {
      busId: meta.busId,
      busNumber: meta.busNumber,
      tripId: meta.tripId,
      routeName: meta.routeName,
      lat: fix.lat,
      lng: fix.lng,
      speedKph: fix.speedKph ?? null,
      heading: fix.heading ?? null,
      accuracy: fix.accuracy ?? null,
      recordedAt: recordedAt.toISOString(),
      source,
    });

    return { accepted: true };
  }

  // --------------------------------------------------------------- reads

  private staleAfterMs(): number {
    return (this.config.get<number>('GPS_STALE_AFTER_SECONDS') ?? 60) * 1000;
  }

  async latest(): Promise<BusLatestLocationDto[]> {
    const rows = await this.prisma.busLocation.findMany({
      include: {
        bus: { select: { busNumber: true, status: true } },
        trip: { select: { route: { select: { name: true } } } },
      },
      orderBy: { recordedAt: 'desc' },
      take: 1000,
    });
    const staleAfter = this.staleAfterMs();
    return rows.map((r) => ({
      busId: r.busId,
      busNumber: r.bus.busNumber,
      tripId: r.tripId,
      routeName: r.trip?.route.name ?? null,
      status: r.bus.status,
      lat: r.lat,
      lng: r.lng,
      speedKph: r.speedKph,
      heading: r.heading,
      accuracy: r.accuracy,
      recordedAt: r.recordedAt.toISOString(),
      stale: Date.now() - r.recordedAt.getTime() > staleAfter,
    }));
  }

  async latestForTrip(tripId: string): Promise<BusLatestLocationDto | null> {
    const row = await this.prisma.busLocation.findFirst({
      where: { tripId },
      include: {
        bus: { select: { busNumber: true, status: true } },
        trip: { select: { route: { select: { name: true } } } },
      },
    });
    if (!row) return null;
    return {
      busId: row.busId,
      busNumber: row.bus.busNumber,
      tripId: row.tripId,
      routeName: row.trip?.route.name ?? null,
      status: row.bus.status,
      lat: row.lat,
      lng: row.lng,
      speedKph: row.speedKph,
      heading: row.heading,
      accuracy: row.accuracy,
      recordedAt: row.recordedAt.toISOString(),
      stale: Date.now() - row.recordedAt.getTime() > this.staleAfterMs(),
    };
  }

  // ------------------------------------------------------- authorization

  async isCrew(userId: string, tripId: string): Promise<boolean> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { driverId: true, supervisorId: true, helperId: true },
    });
    if (!trip) return false;
    return [trip.driverId, trip.supervisorId, trip.helperId].includes(userId);
  }

  async isPassengerAllowed(userId: string, tripId: string): Promise<boolean> {
    const count = await this.prisma.booking.count({
      where: { tripId, passengerId: userId, status: { in: ['CONFIRMED', 'PENDING', 'COMPLETED'] } },
    });
    return count > 0;
  }

  // ------------------------------------------------------------ liveness

  /** Buses mid-trip that stopped reporting get flagged OFFLINE. */
  @Interval(60_000)
  async offlineSweep() {
    const offlineAfterMs = (this.config.get<number>('GPS_OFFLINE_AFTER_SECONDS') ?? 300) * 1000;
    const cutoff = new Date(Date.now() - offlineAfterMs);
    const gone = await this.prisma.bus.findMany({
      where: { status: 'IN_TRIP', location: { recordedAt: { lt: cutoff } } },
      select: { id: true, busNumber: true },
    });
    if (gone.length === 0) return;
    await this.prisma.bus.updateMany({
      where: { id: { in: gone.map((b) => b.id) } },
      data: { status: 'OFFLINE' },
    });
    for (const bus of gone) {
      this.logger.warn(`Bus ${bus.busNumber} marked OFFLINE (no GPS for ${offlineAfterMs / 1000}s)`);
    }
  }
}
