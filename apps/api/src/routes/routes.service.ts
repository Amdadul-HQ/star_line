import { Injectable } from '@nestjs/common';
import {
  ERROR_CODES,
  pageQuerySchema,
  type Paginated,
  type RouteCreateInput,
  type RouteDto,
  type RouteUpdateInput,
} from '@starline/shared';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors';
import { paginate, skipTake } from '../common/pagination';
import type { RequestUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

export const routeListQuerySchema = pageQuerySchema.extend({
  search: z.string().max(80).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
export type RouteListQuery = z.infer<typeof routeListQuerySchema>;

type RouteRow = {
  id: string;
  name: string;
  code: string;
  origin: string;
  destination: string;
  distanceKm: number;
  estimatedDurationMin: number;
  baseFareBdt: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  stops: {
    id: string;
    name: string;
    order: number;
    lat: number;
    lng: number;
    isBoardingPoint: boolean;
  }[];
};

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(route: RouteRow): RouteDto {
    return {
      id: route.id,
      name: route.name,
      code: route.code,
      origin: route.origin,
      destination: route.destination,
      distanceKm: route.distanceKm,
      estimatedDurationMin: route.estimatedDurationMin,
      baseFareBdt: route.baseFareBdt,
      status: route.status,
      stops: [...route.stops]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          lat: s.lat,
          lng: s.lng,
          isBoardingPoint: s.isBoardingPoint,
        })),
      createdAt: route.createdAt.toISOString(),
    };
  }

  async list(query: RouteListQuery): Promise<Paginated<RouteDto>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { origin: { contains: query.search, mode: 'insensitive' as const } },
              { destination: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.route.count({ where }),
      this.prisma.route.findMany({
        where,
        include: { stops: true },
        orderBy: { name: 'asc' },
        ...skipTake(query.page, query.pageSize),
      }),
    ]);
    return paginate(rows.map((r) => this.toDto(r)), total, query.page, query.pageSize);
  }

  async options(): Promise<{ id: string; name: string; code: string }[]> {
    return this.prisma.route.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  async get(id: string): Promise<RouteDto> {
    const route = await this.prisma.route.findUnique({ where: { id }, include: { stops: true } });
    if (!route) throw AppError.notFound('Route not found');
    return this.toDto(route);
  }

  /** Public landing-page data — active routes with daily departure counts. */
  async publicRoutes() {
    const routes = await this.prisma.route.findMany({
      where: { status: 'ACTIVE' },
      include: { _count: { select: { schedules: true } } },
      orderBy: { name: 'asc' },
      take: 12,
    });
    return routes.map((r) => ({
      id: r.id,
      name: r.name,
      origin: r.origin,
      destination: r.destination,
      baseFareBdt: r.baseFareBdt,
      estimatedDurationMin: r.estimatedDurationMin,
      dailyDepartures: r._count.schedules,
    }));
  }

  async create(input: RouteCreateInput, actor: RequestUser): Promise<RouteDto> {
    const route = await this.prisma.route.create({
      data: {
        name: input.name,
        code: input.code,
        origin: input.origin,
        destination: input.destination,
        distanceKm: input.distanceKm,
        estimatedDurationMin: input.estimatedDurationMin,
        baseFareBdt: input.baseFareBdt,
        status: input.status,
        stops: {
          create: input.stops.map((s, idx) => ({
            name: s.name,
            order: idx,
            lat: s.lat,
            lng: s.lng,
            isBoardingPoint: s.isBoardingPoint,
          })),
        },
      },
      include: { stops: true },
    });
    this.audit.log({
      actorId: actor.id,
      action: 'ROUTE_CREATED',
      entity: 'Route',
      entityId: route.id,
      after: { name: route.name, code: route.code, stops: input.stops.length },
    });
    return this.toDto(route);
  }

  async update(id: string, input: RouteUpdateInput, actor: RequestUser): Promise<RouteDto> {
    const existing = await this.prisma.route.findUnique({ where: { id }, include: { stops: true } });
    if (!existing) throw AppError.notFound('Route not found');

    const route = await this.prisma.$transaction(async (tx) => {
      if (input.stops) {
        await tx.routeStop.deleteMany({ where: { routeId: id } });
      }
      return tx.route.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.origin !== undefined ? { origin: input.origin } : {}),
          ...(input.destination !== undefined ? { destination: input.destination } : {}),
          ...(input.distanceKm !== undefined ? { distanceKm: input.distanceKm } : {}),
          ...(input.estimatedDurationMin !== undefined
            ? { estimatedDurationMin: input.estimatedDurationMin }
            : {}),
          ...(input.baseFareBdt !== undefined ? { baseFareBdt: input.baseFareBdt } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.stops
            ? {
                stops: {
                  create: input.stops.map((s, idx) => ({
                    name: s.name,
                    order: idx,
                    lat: s.lat,
                    lng: s.lng,
                    isBoardingPoint: s.isBoardingPoint,
                  })),
                },
              }
            : {}),
        },
        include: { stops: true },
      });
    });

    this.audit.log({
      actorId: actor.id,
      action: 'ROUTE_UPDATED',
      entity: 'Route',
      entityId: id,
      before: { name: existing.name, status: existing.status, stops: existing.stops.length },
      after: { name: route.name, status: route.status, stops: route.stops.length },
    });
    return this.toDto(route);
  }

  async remove(id: string, actor: RequestUser): Promise<{ ok: true }> {
    const tripCount = await this.prisma.trip.count({ where: { routeId: id } });
    if (tripCount > 0) {
      throw AppError.conflict(
        'Route has trips attached — mark it INACTIVE instead of deleting',
        ERROR_CODES.CONFLICT,
      );
    }
    const route = await this.prisma.route.delete({ where: { id } });
    this.audit.log({
      actorId: actor.id,
      action: 'ROUTE_DELETED',
      entity: 'Route',
      entityId: id,
      before: { name: route.name },
    });
    return { ok: true };
  }
}
