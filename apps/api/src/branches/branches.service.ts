import { Injectable } from '@nestjs/common';
import {
  pageQuerySchema,
  type BranchCreateInput,
  type BranchDto,
  type BranchUpdateInput,
  type Paginated,
} from '@starline/shared';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors';
import { paginate, skipTake } from '../common/pagination';
import type { RequestUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

export const branchListQuerySchema = pageQuerySchema.extend({
  search: z.string().max(80).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
export type BranchListQuery = z.infer<typeof branchListQuerySchema>;

type BranchRow = {
  id: string;
  name: string;
  code: string;
  address: string;
  district: string;
  division: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  managerId: string | null;
  createdAt: Date;
  manager: { name: string } | null;
  _count?: { buses: number };
};

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(b: BranchRow): BranchDto {
    return {
      id: b.id,
      name: b.name,
      code: b.code,
      address: b.address,
      district: b.district,
      division: b.division,
      phone: b.phone,
      status: b.status,
      managerId: b.managerId,
      managerName: b.manager?.name ?? null,
      busCount: b._count?.buses,
      createdAt: b.createdAt.toISOString(),
    };
  }

  async list(query: BranchListQuery): Promise<Paginated<BranchDto>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { district: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.branch.count({ where }),
      this.prisma.branch.findMany({
        where,
        include: { manager: { select: { name: true } }, _count: { select: { buses: true } } },
        orderBy: { name: 'asc' },
        ...skipTake(query.page, query.pageSize),
      }),
    ]);
    return paginate(rows.map((b) => this.toDto(b)), total, query.page, query.pageSize);
  }

  /** id+name list for dropdowns. */
  async options(): Promise<{ id: string; name: string; code: string }[]> {
    return this.prisma.branch.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(input: BranchCreateInput, actor: RequestUser): Promise<BranchDto> {
    await this.assertManagerValid(input.managerId);
    const branch = await this.prisma.branch.create({
      data: {
        name: input.name,
        code: input.code,
        address: input.address,
        district: input.district,
        division: input.division,
        phone: input.phone,
        status: input.status,
        managerId: input.managerId ?? null,
      },
      include: { manager: { select: { name: true } }, _count: { select: { buses: true } } },
    });
    this.audit.log({
      actorId: actor.id,
      action: 'BRANCH_CREATED',
      entity: 'Branch',
      entityId: branch.id,
      after: { name: branch.name, code: branch.code },
    });
    return this.toDto(branch);
  }

  async update(id: string, input: BranchUpdateInput, actor: RequestUser): Promise<BranchDto> {
    const existing = await this.prisma.branch.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Branch not found');
    if (input.managerId !== undefined) await this.assertManagerValid(input.managerId);

    const branch = await this.prisma.branch.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.district !== undefined ? { district: input.district } : {}),
        ...(input.division !== undefined ? { division: input.division } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.managerId !== undefined ? { managerId: input.managerId } : {}),
      },
      include: { manager: { select: { name: true } }, _count: { select: { buses: true } } },
    });
    this.audit.log({
      actorId: actor.id,
      action: 'BRANCH_UPDATED',
      entity: 'Branch',
      entityId: id,
      before: { name: existing.name, status: existing.status, managerId: existing.managerId },
      after: { name: branch.name, status: branch.status, managerId: branch.managerId },
    });
    return this.toDto(branch);
  }

  private async assertManagerValid(managerId: string | null | undefined) {
    if (!managerId) return;
    const manager = await this.prisma.user.findUnique({
      where: { id: managerId },
      include: { role: true },
    });
    if (!manager) throw AppError.notFound('Manager user not found');
    if (manager.role.name === 'PASSENGER') {
      throw AppError.badRequest('VALIDATION_ERROR', 'Branch manager must be a staff user');
    }
  }
}
