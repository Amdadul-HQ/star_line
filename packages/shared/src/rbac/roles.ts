import { ALL_PERMISSION_CODES, PERMISSIONS, PermissionCode } from './permissions';

/**
 * System roles. Roles live in the database (new roles can be added at
 * runtime); these are the built-in ones the seed creates and the app
 * references by name. `isSystem` roles cannot be deleted from the admin UI.
 */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  OPERATIONS_MANAGER: 'OPERATIONS_MANAGER',
  BRANCH_MANAGER: 'BRANCH_MANAGER',
  TICKETER: 'TICKETER',
  DRIVER: 'DRIVER',
  SUPERVISOR: 'SUPERVISOR',
  HELPER: 'HELPER',
  PASSENGER: 'PASSENGER',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const STAFF_ROLES: RoleName[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.OPERATIONS_MANAGER,
  ROLES.BRANCH_MANAGER,
  ROLES.TICKETER,
  ROLES.DRIVER,
  ROLES.SUPERVISOR,
  ROLES.HELPER,
];

/** Roles whose data access is limited to their own branch by default. */
export const BRANCH_SCOPED_ROLES: RoleName[] = [ROLES.BRANCH_MANAGER, ROLES.TICKETER];

const P = PERMISSIONS;

/** Default permission grants per system role (seeded into RolePermission). */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, PermissionCode[]> = {
  SUPER_ADMIN: [...ALL_PERMISSION_CODES],
  ADMIN: ALL_PERMISSION_CODES.filter((c) => c !== P.ROLE_MANAGE),
  OPERATIONS_MANAGER: [
    P.FLEET_VIEW,
    P.BUS_VIEW, P.BUS_EDIT, P.BUS_ASSIGN,
    P.ROUTE_VIEW, P.ROUTE_CREATE, P.ROUTE_EDIT,
    P.SCHEDULE_VIEW, P.SCHEDULE_CREATE, P.SCHEDULE_EDIT,
    P.TRIP_VIEW, P.TRIP_CREATE, P.TRIP_EDIT, P.TRIP_ASSIGN,
    P.BOOKING_VIEW,
    P.BRANCH_VIEW,
    P.PASSENGER_VIEW,
    P.REPORT_VIEW,
    P.GPS_VIEW, P.SIMULATOR_MANAGE,
    P.USER_VIEW,
  ],
  BRANCH_MANAGER: [
    P.FLEET_VIEW,
    P.BUS_VIEW,
    P.ROUTE_VIEW,
    P.SCHEDULE_VIEW,
    P.TRIP_VIEW,
    P.BOOKING_VIEW, P.BOOKING_CREATE, P.BOOKING_CANCEL,
    P.PASSENGER_VIEW,
    P.BRANCH_VIEW,
    P.REPORT_VIEW,
    P.GPS_VIEW,
    P.USER_VIEW,
  ],
  TICKETER: [
    P.TRIP_VIEW,
    P.SCHEDULE_VIEW,
    P.BOOKING_VIEW, P.BOOKING_CREATE, P.BOOKING_CANCEL,
    P.PASSENGER_VIEW,
    P.GPS_VIEW,
  ],
  DRIVER: [P.TRIP_VIEW, P.GPS_SHARE],
  SUPERVISOR: [P.TRIP_VIEW, P.TRIP_EDIT, P.BOOKING_VIEW, P.GPS_VIEW, P.GPS_SHARE],
  HELPER: [P.TRIP_VIEW],
  // Passenger access is ownership-based (their own bookings/trips), not permission-based.
  PASSENGER: [],
};

/** Where each role lands after login. */
export const ROLE_HOME_PATH: Record<RoleName, string> = {
  SUPER_ADMIN: '/admin',
  ADMIN: '/admin',
  OPERATIONS_MANAGER: '/admin',
  BRANCH_MANAGER: '/branch',
  TICKETER: '/ticketing',
  DRIVER: '/driver',
  SUPERVISOR: '/supervisor',
  HELPER: '/helper',
  PASSENGER: '/passenger',
};
