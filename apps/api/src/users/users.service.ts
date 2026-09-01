import { Injectable } from '@nestjs/common';
import {
  BRANCH_SCOPED_ROLES,
  ERROR_CODES,
  ROLES,
  STAFF_ROLES,
  type Paginated,
  type StaffCreateInput,
  type UserDto,
  type UserListQuery,
} from '@starline/shared';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors';
import { paginate, skipTake } from '../common/pagination';
import type { RequestUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    branchId: string | null;
    createdAt: Date;
    role: { name: string };
    branch: { name: string } | null;
    staffProfile: { employeeCode: string | null } | null;
  }): UserDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role.name,
      status: user.status as UserDto['status'],
      branchId: user.branchId,
      branchName: user.branch?.name ?? null,
      employeeCode: user.staffProfile?.employeeCode ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async list(query: UserListQuery, requester: RequestUser): Promise<Paginated<UserDto>> {
    // Branch-scoped staff only ever see their own branch's people.
    const scopedBranchId = BRANCH_SCOPED_ROLES.includes(requester.role as never)
      ? requester.branchId
      : query.branchId;

    const where = {
      ...(query.role ? { role: { name: query.role } } : {}),
      ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: {
          role: { select: { name: true } },
          branch: { select: { name: true } },
          staffProfile: { select: { employeeCode: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...skipTake(query.page, query.pageSize),
      }),
    ]);
    return paginate(rows.map((u) => this.toDto(u)), total, query.page, query.pageSize);
  }

  async createStaff(input: StaffCreateInput, actor: RequestUser): Promise<UserDto> {
    if (!STAFF_ROLES.includes(input.roleName as never)) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, `Role must be one of: ${STAFF_ROLES.join(', ')}`);
    }
    const role = await this.prisma.role.findUnique({ where: { name: input.roleName } });
    if (!role) throw AppError.notFound(`Role ${input.roleName} does not exist`);
    if (input.branchId) {
      const branch = await this.prisma.branch.findUnique({ where: { id: input.branchId } });
      if (!branch) throw AppError.notFound('Branch not found');
    }

    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        passwordHash: await bcrypt.hash(input.password, 10),
        roleId: role.id,
        branchId: input.branchId ?? null,
        staffProfile: {
          create: {
            employeeCode: input.employeeCode ?? null,
            licenseNumber: input.licenseNumber ?? null,
          },
        },
      },
      include: {
        role: { select: { name: true } },
        branch: { select: { name: true } },
        staffProfile: { select: { employeeCode: true } },
      },
    });

    this.audit.log({
      actorId: actor.id,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      after: { name: user.name, email: user.email, role: role.name, branchId: user.branchId },
    });
    return this.toDto(user);
  }

  /** Self-service profile update (any authenticated user). */
  async updateMe(userId: string, input: { name?: string; preferredLocale?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.preferredLocale !== undefined ? { preferredLocale: input.preferredLocale } : {}),
      },
      select: { id: true, name: true, preferredLocale: true },
    });
    return user;
  }

  /** Lightweight id+name list for assignment dropdowns. */
  async options(roleName: string): Promise<{ id: string; name: string; branchName: string | null }[]> {
    if (!STAFF_ROLES.includes(roleName as never) && roleName !== ROLES.PASSENGER) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Unknown role');
    }
    const users = await this.prisma.user.findMany({
      where: { role: { name: roleName }, status: 'ACTIVE' },
      select: { id: true, name: true, branch: { select: { name: true } } },
      orderBy: { name: 'asc' },
      take: 500,
    });
    return users.map((u) => ({ id: u.id, name: u.name, branchName: u.branch?.name ?? null }));
  }
}
