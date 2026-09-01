import { HttpStatus, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ERROR_CODES,
  pointAlongPath,
  progressAlongPathKm,
  totalPathKm,
  type LatLng,
  type SimulatorStartInput,
  type SimulatorStatePayload,
} from '@starline/shared';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors';
import { serviceDateValue, todayDhaka } from '../common/time';
import type { RequestUser } from '../common/types';
import { EVENTS } from '../events/events';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../trips/trips.service';
import { GpsService } from './gps.service';

interface SimState {
  id: string;
  tripId: string;
  busId: string;
  busNumber: string;
  routeName: string;
  path: LatLng[];
  totalKm: number;
  distanceKm: number;
  speedKph: number;
  intervalMs: number;
  status: 'ACTIVE' | 'PAUSED';
  sessionId: string;
  timer: NodeJS.Timeout | null;
}

/**
 * Development GPS simulator — moves a bus along its route geometry and pushes
 * each position through the exact same backend pipeline as a real driver
 * device (validation → latest store → history → WebSocket broadcast).
 * Nothing is faked client-side.
 */
@Injectable()
export class SimulatorService implements OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);
  private sims = new Map<string, SimState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly gps: GpsService,
    private readonly trips: TripsService,
    private readonly events: EventEmitter2,
    private readonly audit: AuditService,
  ) {}

  list(): SimulatorStatePayload[] {
    return [...this.sims.values()].map((s) => this.toPayload(s));
  }

  private toPayload(s: SimState): SimulatorStatePayload {
    return {
      simulationId: s.id,
      tripId: s.tripId,
      busId: s.busId,
      busNumber: s.busNumber,
      routeName: s.routeName,
      status: s.status,
      speedKph: s.speedKph,
      progressPct: s.totalKm > 0 ? Math.min(100, Math.round((s.distanceKm / s.totalKm) * 100)) : 0,
    };
  }

  private emitState(s: SimState, status?: 'ACTIVE' | 'PAUSED' | 'ENDED') {
    this.events.emit(EVENTS.SIMULATOR_STATE, {
      ...this.toPayload(s),
      ...(status ? { status } : {}),
    });
  }

  async start(input: SimulatorStartInput, actor: RequestUser): Promise<SimulatorStatePayload> {
    const trip = await this.resolveTrip(input);
    if (!trip.busId || !trip.bus) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Trip has no bus assigned');
    }

    for (const sim of this.sims.values()) {
      if (sim.busId === trip.busId) {
        throw new AppError(
          ERROR_CODES.SIMULATION_ALREADY_RUNNING,
          `A simulation is already running for bus ${sim.busNumber}`,
          HttpStatus.CONFLICT,
        );
      }
    }

    const stops = [...trip.route.stops].sort((a, b) => a.order - b.order);
    if (stops.length < 2) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Route needs at least 2 stops to simulate');
    }
    const path = stops.map((s) => ({ lat: s.lat, lng: s.lng }));
    const totalKm = totalPathKm(path);

    if (['SCHEDULED', 'BOARDING'].includes(trip.status)) {
      await this.trips.applyStatus(trip.id, 'DEPARTED');
    } else if (!['DEPARTED', 'IN_TRANSIT'].includes(trip.status)) {
      throw AppError.conflict('Trip is not in a simulatable state', ERROR_CODES.TRIP_NOT_ACTIVE);
    }
    this.gps.invalidateTripMeta(trip.id);

    const session = await this.prisma.gpsSession.create({
      data: {
        tripId: trip.id,
        busId: trip.busId,
        startedById: actor.id,
        source: 'SIMULATOR',
        status: 'ACTIVE',
      },
    });

    // Resume from the bus's current progress if it already has a fix on this trip.
    let distanceKm = 0;
    const existingLocation = await this.prisma.busLocation.findUnique({
      where: { busId: trip.busId },
    });
    if (existingLocation && existingLocation.tripId === trip.id) {
      distanceKm = progressAlongPathKm(path, {
        lat: existingLocation.lat,
        lng: existingLocation.lng,
      });
    }

    const state: SimState = {
      id: randomUUID(),
      tripId: trip.id,
      busId: trip.busId,
      busNumber: trip.bus.busNumber,
      routeName: trip.route.name,
      path,
      totalKm,
      distanceKm,
      speedKph: input.speedKph,
      intervalMs: input.intervalMs,
      status: 'ACTIVE',
      sessionId: session.id,
      timer: null,
    };
    state.timer = setInterval(() => void this.tick(state), state.intervalMs);
    this.sims.set(state.id, state);

    this.audit.log({
      actorId: actor.id,
      action: 'SIMULATION_STARTED',
      entity: 'Trip',
      entityId: trip.id,
      after: { bus: state.busNumber, route: state.routeName, speedKph: state.speedKph },
    });
    this.logger.log(`Simulation ${state.id} started: ${state.busNumber} on ${state.routeName}`);
    this.emitState(state);
    return this.toPayload(state);
  }

  private async resolveTrip(input: SimulatorStartInput) {
    const include = {
      bus: { select: { busNumber: true } },
      route: { select: { name: true, baseFareBdt: true, stops: true } },
    } as const;

    if (input.tripId) {
      const trip = await this.prisma.trip.findUnique({ where: { id: input.tripId }, include });
      if (!trip) throw AppError.notFound('Trip not found');
      return trip;
    }

    // busId + routeId mode: reuse today's pending trip for the pair, or
    // create a dev trip on the fly so the simulator "just works".
    const today = serviceDateValue(todayDhaka());
    const existing = await this.prisma.trip.findFirst({
      where: {
        busId: input.busId,
        routeId: input.routeId,
        serviceDate: today,
        status: { in: ['SCHEDULED', 'BOARDING', 'DEPARTED', 'IN_TRANSIT'] },
      },
      orderBy: { departureAt: 'asc' },
      include,
    });
    if (existing) return existing;

    const route = await this.prisma.route.findUnique({ where: { id: input.routeId! } });
    if (!route) throw AppError.notFound('Route not found');
    return this.prisma.trip.create({
      data: {
        routeId: input.routeId!,
        busId: input.busId!,
        serviceDate: today,
        departureAt: new Date(),
        fareBdt: route.baseFareBdt,
        status: 'SCHEDULED',
      },
      include,
    });
  }

  private async tick(state: SimState) {
    if (state.status !== 'ACTIVE') return;
    try {
      // Small speed jitter makes the feed look organic.
      const jitter = 0.9 + Math.random() * 0.2;
      const speed = Math.round(state.speedKph * jitter);
      state.distanceKm += (speed * state.intervalMs) / 3_600_000;

      if (state.distanceKm >= state.totalKm) {
        await this.finish(state);
        return;
      }

      const point = pointAlongPath(state.path, state.distanceKm);
      await this.gps.ingestSystem(
        state.tripId,
        {
          lat: point.lat,
          lng: point.lng,
          speedKph: speed,
          heading: Math.round(point.headingDeg),
          accuracy: 8,
          recordedAt: new Date().toISOString(),
        },
        'SIMULATOR',
      );
      this.emitState(state);
    } catch (err) {
      this.logger.error(
        `Simulation ${state.id} tick failed: ${err instanceof Error ? err.message : err}`,
      );
      await this.stop(state.id).catch(() => undefined);
    }
  }

  private async finish(state: SimState) {
    const end = state.path[state.path.length - 1];
    await this.gps
      .ingestSystem(
        state.tripId,
        {
          lat: end.lat,
          lng: end.lng,
          speedKph: 0,
          heading: 0,
          accuracy: 8,
          recordedAt: new Date().toISOString(),
        },
        'SIMULATOR',
      )
      .catch(() => undefined);
    await this.teardown(state, true);
    this.logger.log(`Simulation ${state.id} completed route ${state.routeName}`);
  }

  async pause(id: string): Promise<SimulatorStatePayload> {
    const state = this.require(id);
    state.status = 'PAUSED';
    await this.prisma.gpsSession.update({
      where: { id: state.sessionId },
      data: { status: 'PAUSED' },
    });
    this.emitState(state);
    return this.toPayload(state);
  }

  async resume(id: string): Promise<SimulatorStatePayload> {
    const state = this.require(id);
    state.status = 'ACTIVE';
    await this.prisma.gpsSession.update({
      where: { id: state.sessionId },
      data: { status: 'ACTIVE' },
    });
    this.emitState(state);
    return this.toPayload(state);
  }

  async updateSpeed(id: string, speedKph: number): Promise<SimulatorStatePayload> {
    const state = this.require(id);
    state.speedKph = speedKph;
    this.emitState(state);
    return this.toPayload(state);
  }

  async stop(id: string): Promise<{ ok: true }> {
    const state = this.require(id);
    await this.teardown(state, false);
    return { ok: true };
  }

  private async teardown(state: SimState, completed: boolean) {
    if (state.timer) clearInterval(state.timer);
    this.sims.delete(state.id);
    await this.prisma.gpsSession
      .update({ where: { id: state.sessionId }, data: { status: 'ENDED', endedAt: new Date() } })
      .catch(() => undefined);
    const trip = await this.prisma.trip.findUnique({ where: { id: state.tripId } });
    if (trip && ['DEPARTED', 'IN_TRANSIT'].includes(trip.status)) {
      if (completed) {
        await this.trips.applyStatus(state.tripId, 'ARRIVED').catch(() => undefined);
        await this.trips.applyStatus(state.tripId, 'COMPLETED').catch(() => undefined);
      } else {
        // Manual stop mid-route: leave the trip active; a driver/admin decides.
      }
    }
    this.gps.invalidateTripMeta(state.tripId);
    this.events.emit(EVENTS.SIMULATOR_STATE, { ...this.toPayload(state), status: 'ENDED' });
  }

  private require(id: string): SimState {
    const state = this.sims.get(id);
    if (!state) {
      throw new AppError(ERROR_CODES.SIMULATION_NOT_FOUND, 'Simulation not found', HttpStatus.NOT_FOUND);
    }
    return state;
  }

  onModuleDestroy() {
    for (const state of this.sims.values()) {
      if (state.timer) clearInterval(state.timer);
    }
    this.sims.clear();
  }
}
