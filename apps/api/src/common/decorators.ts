import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { RequestUser } from './types';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marks a route as reachable without authentication. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = 'requiredPermissions';
/**
 * Require the caller to hold AT LEAST ONE of the given permission codes
 * (any-of semantics; most routes pass a single code).
 */
export const RequirePermissions = (...codes: string[]) => SetMetadata(PERMISSIONS_KEY, codes);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
