import { Injectable } from '@nestjs/common';
import type { PermissionCode, RoleDto } from '@starline/shared';
import { PrismaService } from '../prisma/prisma.service';

const CACHE_TTL_MS = 30_000;

/**
 * Role → permission resolution with a short in-memory cache.
 * Single-instance cache is fine for now; swap for Redis when the API scales
 * horizontally (documented in ARCHITECTURE.md).
 */
@Injectable()
export class RbacService {
  private cache = new Map<string, { permissions: PermissionCode[]; cachedAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async getPermissionsForRole(roleName: string): Promise<PermissionCode[]> {
    const hit = this.cache.get(roleName);
    if (hit && Date.now() - hit.cachedAt < CACHE_TTL_MS) return hit.permissions;

    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
      include: { permissions: { include: { permission: true } } },
    });
    const permissions = (role?.permissions.map((rp) => rp.permission.code) ?? []) as PermissionCode[];
    this.cache.set(roleName, { permissions, cachedAt: Date.now() });
    return permissions;
  }

  invalidate(roleName?: string) {
    if (roleName) this.cache.delete(roleName);
    else this.cache.clear();
  }

  async listRoles(): Promise<RoleDto[]> {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissions: r.permissions.map((rp) => rp.permission.code) as PermissionCode[],
      userCount: r._count.users,
    }));
  }
}
