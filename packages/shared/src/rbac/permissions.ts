/**
 * Canonical permission catalogue.
 * The database `Permission` table is seeded from this list; the API guard
 * checks these codes server-side. New permissions are added here first.
 */

export const PERMISSIONS = {
  // Buses
  BUS_VIEW: 'BUS_VIEW',
  BUS_CREATE: 'BUS_CREATE',
  BUS_EDIT: 'BUS_EDIT',
  BUS_DELETE: 'BUS_DELETE',
  BUS_ASSIGN: 'BUS_ASSIGN',
  // Routes
  ROUTE_VIEW: 'ROUTE_VIEW',
  ROUTE_CREATE: 'ROUTE_CREATE',
  ROUTE_EDIT: 'ROUTE_EDIT',
  ROUTE_DELETE: 'ROUTE_DELETE',
  // Schedules
  SCHEDULE_VIEW: 'SCHEDULE_VIEW',
  SCHEDULE_CREATE: 'SCHEDULE_CREATE',
  SCHEDULE_EDIT: 'SCHEDULE_EDIT',
  // Trips
  TRIP_VIEW: 'TRIP_VIEW',
  TRIP_CREATE: 'TRIP_CREATE',
  TRIP_EDIT: 'TRIP_EDIT',
  TRIP_ASSIGN: 'TRIP_ASSIGN',
  // Bookings
  BOOKING_VIEW: 'BOOKING_VIEW',
  BOOKING_CREATE: 'BOOKING_CREATE',
  BOOKING_CANCEL: 'BOOKING_CANCEL',
  // Passengers
  PASSENGER_VIEW: 'PASSENGER_VIEW',
  PASSENGER_EDIT: 'PASSENGER_EDIT',
  // Branches
  BRANCH_VIEW: 'BRANCH_VIEW',
  BRANCH_CREATE: 'BRANCH_CREATE',
  BRANCH_EDIT: 'BRANCH_EDIT',
  // Reports & fleet
  REPORT_VIEW: 'REPORT_VIEW',
  FLEET_VIEW: 'FLEET_VIEW',
  // GPS
  GPS_VIEW: 'GPS_VIEW',
  GPS_SHARE: 'GPS_SHARE',
  SIMULATOR_MANAGE: 'SIMULATOR_MANAGE',
  // Users / staff
  USER_VIEW: 'USER_VIEW',
  USER_MANAGE: 'USER_MANAGE',
  // RBAC administration
  ROLE_VIEW: 'ROLE_VIEW',
  ROLE_MANAGE: 'ROLE_MANAGE',
  // Platform
  AUDIT_VIEW: 'AUDIT_VIEW',
  SETTINGS_VIEW: 'SETTINGS_VIEW',
  SETTINGS_MANAGE: 'SETTINGS_MANAGE',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionDefinition {
  code: PermissionCode;
  group: string;
  description: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { code: PERMISSIONS.BUS_VIEW, group: 'BUS', description: 'View buses and bus profiles' },
  { code: PERMISSIONS.BUS_CREATE, group: 'BUS', description: 'Create buses' },
  { code: PERMISSIONS.BUS_EDIT, group: 'BUS', description: 'Edit buses' },
  { code: PERMISSIONS.BUS_DELETE, group: 'BUS', description: 'Delete/retire buses' },
  { code: PERMISSIONS.BUS_ASSIGN, group: 'BUS', description: 'Assign buses to trips/branches' },
  { code: PERMISSIONS.ROUTE_VIEW, group: 'ROUTE', description: 'View routes' },
  { code: PERMISSIONS.ROUTE_CREATE, group: 'ROUTE', description: 'Create routes' },
  { code: PERMISSIONS.ROUTE_EDIT, group: 'ROUTE', description: 'Edit routes and stops' },
  { code: PERMISSIONS.ROUTE_DELETE, group: 'ROUTE', description: 'Delete routes' },
  { code: PERMISSIONS.SCHEDULE_VIEW, group: 'SCHEDULE', description: 'View schedules' },
  { code: PERMISSIONS.SCHEDULE_CREATE, group: 'SCHEDULE', description: 'Create schedules' },
  { code: PERMISSIONS.SCHEDULE_EDIT, group: 'SCHEDULE', description: 'Edit schedules' },
  { code: PERMISSIONS.TRIP_VIEW, group: 'TRIP', description: 'View trips' },
  { code: PERMISSIONS.TRIP_CREATE, group: 'TRIP', description: 'Create trips' },
  { code: PERMISSIONS.TRIP_EDIT, group: 'TRIP', description: 'Edit trips / update status' },
  { code: PERMISSIONS.TRIP_ASSIGN, group: 'TRIP', description: 'Assign bus & crew to trips' },
  { code: PERMISSIONS.BOOKING_VIEW, group: 'BOOKING', description: 'View bookings' },
  { code: PERMISSIONS.BOOKING_CREATE, group: 'BOOKING', description: 'Create bookings' },
  { code: PERMISSIONS.BOOKING_CANCEL, group: 'BOOKING', description: 'Cancel bookings' },
  { code: PERMISSIONS.PASSENGER_VIEW, group: 'PASSENGER', description: 'View passengers' },
  { code: PERMISSIONS.PASSENGER_EDIT, group: 'PASSENGER', description: 'Edit passenger profiles' },
  { code: PERMISSIONS.BRANCH_VIEW, group: 'BRANCH', description: 'View branches' },
  { code: PERMISSIONS.BRANCH_CREATE, group: 'BRANCH', description: 'Create branches' },
  { code: PERMISSIONS.BRANCH_EDIT, group: 'BRANCH', description: 'Edit branches' },
  { code: PERMISSIONS.REPORT_VIEW, group: 'REPORT', description: 'View reports' },
  { code: PERMISSIONS.FLEET_VIEW, group: 'FLEET', description: 'View fleet overview metrics' },
  { code: PERMISSIONS.GPS_VIEW, group: 'GPS', description: 'View live GPS map & locations' },
  { code: PERMISSIONS.GPS_SHARE, group: 'GPS', description: 'Share GPS location for an assigned trip' },
  { code: PERMISSIONS.SIMULATOR_MANAGE, group: 'GPS', description: 'Operate the development GPS simulator' },
  { code: PERMISSIONS.USER_VIEW, group: 'USER', description: 'View users & staff' },
  { code: PERMISSIONS.USER_MANAGE, group: 'USER', description: 'Create/edit users & staff' },
  { code: PERMISSIONS.ROLE_VIEW, group: 'RBAC', description: 'View roles & permission matrix' },
  { code: PERMISSIONS.ROLE_MANAGE, group: 'RBAC', description: 'Modify roles & permissions' },
  { code: PERMISSIONS.AUDIT_VIEW, group: 'PLATFORM', description: 'View audit logs' },
  { code: PERMISSIONS.SETTINGS_VIEW, group: 'PLATFORM', description: 'View system settings' },
  { code: PERMISSIONS.SETTINGS_MANAGE, group: 'PLATFORM', description: 'Modify system settings' },
];

export const ALL_PERMISSION_CODES = PERMISSION_DEFINITIONS.map((p) => p.code);
