import { Injectable, Logger } from '@nestjs/common';
import { pageQuerySchema, type AuditLogDto, type Paginated } from '@starline/shared';
import { z } from 'zod';
import { paginate, skipTake } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

export const auditListQuerySchema = pageQuerySchema.extend({
  entity: z.string().optional(),
  actorId: z.string().optional(),
  search: z.string().max(80).optional(),
});
export type AuditListQuery = z.infer<typeof auditListQuerySchema>;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget: audit writes must never fail the business operation.
   */
  log(entry: {
    actorId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
  }): void {
    void this.prisma.auditLog
      .create({
        data: {
          actorId: entry.actorId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          before: entry.before === undefined ? undefined : (entry.before as object),
          after: entry.after === undefined ? undefined : (entry.after as object),
        },
      })
      .catch((err) => this.logger.error(`Audit write failed: ${err.message}`));
  }

  async list(query: AuditListQuery): Promise<Paginated<AuditLogDto>> {
    const where = {
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.search ? { action: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        ...skipTake(query.page, query.pageSize),
      }),
    ]);
    return paginate(
      rows.map((r) => ({
        id: r.id,
        actorId: r.actorId,
        actorName: r.actor?.name ?? null,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        before: r.before,
        after: r.after,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      query.page,
      query.pageSize,
    );
  }
}
