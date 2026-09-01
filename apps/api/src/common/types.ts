import type { PermissionCode, UserStatus } from '@starline/shared';

/** Authenticated principal attached to each request by JwtAuthGuard. */
export interface RequestUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  branchId: string | null;
  status: UserStatus;
  permissions: PermissionCode[];
}
