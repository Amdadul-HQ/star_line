import { Injectable } from '@nestjs/common';
import {
  pageQuerySchema,
  type Paginated,
  type ScheduleCreateInput,
  type ScheduleDto,
  type ScheduleUpdateInput,
} from '@starline/shared';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors';
import { paginate, skipTake } from '../common/pagination';
import type { RequestUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

export const scheduleListQuerySchema = pageQuerySchema.extend({
  routeId: z.string().cuid().optional(),
});
export type ScheduleListQuery = z.infer<typeof scheduleListQuerySchema>;

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(s: {
    id: string;
    routeId: string;
    departureTime: string;
    daysOfWeek: number[];
    fareBdt: number | null;
    isActive: boolean;
    route: { name: string };
  }): ScheduleDto {
    return {
      id: s.id,
      routeId: s.routeId,
      routeName: s.route.name,
      departureTime: s.departureTime,
      daysOfWeek: s.daysOfWeek,
      fareBdt: s.fareBdt,
      isActive: s.isActive,
    };
  }

  async list(query: ScheduleListQuery): Promise<Paginated<ScheduleDto>> {
    const where = query.routeId ? { routeId: query.routeId } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.schedule.count({ where }),
      this.prisma.schedule.findMany({
        where,
        include: { route: { select: { name: true } } },
        orderBy: [{ route: { name: 'asc' } }, { departureTime: 'asc' }],
        ...skipTake(query.page, query.pageSize),
      }),
    ]);
    return paginate(rows.map((s) => this.toDto(s)), total, query.page, query.pageSize);
  }

  async create(input: ScheduleCreateInput, actor: RequestUser): Promise<ScheduleDto> {
    const route = await this.prisma.route.findUnique({ where: { id: input.routeId } });
    if (!route) throw AppError.notFound('Route not found');
    const schedule = await this.prisma.schedule.create({
      data: {
        routeId: input.routeId,
        departureTime: input.departureTime,
        daysOfWeek: input.daysOfWeek,
        fareBdt: input.fareBdt ?? null,
        isActive: input.isActive,
      },
      include: { route: { select: { name: true } } },
    });
    this.audit.log({
      actorId: actor.id,
      action: 'SCHEDULE_CREATED',
      entity: 'Schedule',
      entityId: schedule.id,
      after: { route: route.name, departureTime: schedule.departureTime },
    });
    return this.toDto(schedule);
  }

  async update(id: string, input: ScheduleUpdateInput, actor: RequestUser): Promise<ScheduleDto> {
    const existing = await this.prisma.schedule.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Schedule not found');
    const schedule = await this.prisma.schedule.update({
      where: { id },
      data: {
        ...(input.departureTime !== undefined ? { departureTime: input.departureTime } : {}),
        ...(input.daysOfWeek !== undefined ? { daysOfWeek: input.daysOfWeek } : {}),
        ...(input.fareBdt !== undefined ? { fareBdt: input.fareBdt } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: { route: { select: { name: true } } },
    });
    this.audit.log({
      actorId: actor.id,
      action: 'SCHEDULE_UPDATED',
      entity: 'Schedule',
      entityId: id,
      before: { departureTime: existing.departureTime, isActive: existing.isActive },
      after: { departureTime: schedule.departureTime, isActive: schedule.isActive },
    });
    return this.toDto(schedule);
  }
}
