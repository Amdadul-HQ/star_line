import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ERROR_CODES } from '@starline/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import { IS_PUBLIC_KEY } from '../decorators';
import { AppError } from '../errors';
import type { RequestUser } from '../types';

/**
 * Global authentication guard. Verifies the Bearer access token, re-checks
 * the account against the database (status/role may change mid-session) and
 * attaches the resolved principal + permissions to the request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    if (context.getType() !== 'http') return true; // WS auth happens in the gateway

    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    if (!header?.startsWith('Bearer ')) throw AppError.unauthorized();

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(header.slice(7), {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch (err) {
      const expired = err instanceof Error && err.name === 'TokenExpiredError';
      throw AppError.unauthorized(
        expired ? 'Access token expired' : 'Invalid access token',
        expired ? ERROR_CODES.TOKEN_EXPIRED : ERROR_CODES.UNAUTHORIZED,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        branchId: true,
        role: { select: { name: true } },
      },
    });
    if (!user) throw AppError.unauthorized();
    if (user.status !== 'ACTIVE') {
      throw AppError.unauthorized('Account is not active', ERROR_CODES.ACCOUNT_INACTIVE);
    }

    const permissions = await this.rbac.getPermissionsForRole(user.role.name);
    const requestUser: RequestUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role.name,
      branchId: user.branchId,
      status: user.status,
      permissions,
    };
    req.user = requestUser;
    return true;
  }
}
