import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators';
import { AppError } from '../errors';
import type { RequestUser } from '../types';

/**
 * Authorization guard — enforces @RequirePermissions(...) server-side.
 * Any-of semantics: the caller needs at least one of the listed codes.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const required = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: RequestUser | undefined = context.switchToHttp().getRequest().user;
    if (!user) throw AppError.unauthorized();

    const allowed = required.some((code) => user.permissions.includes(code as never));
    if (!allowed) {
      throw AppError.forbidden(`Missing permission: ${required.join(' or ')}`);
    }
    return true;
  }
}
