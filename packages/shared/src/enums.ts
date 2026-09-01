/**
 * Domain enums shared between API and web.
 * Kept as const objects (not TS enums) so values survive JSON round-trips
 * and can be iterated for seeds, selects and validation.
 */

export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const BUS_STATUSES = [
  'ACTIVE',
  'IN_TRIP',
  'IDLE',
  'MAINTENANCE',
  'INACTIVE',
  'OFFLINE',
] as const;
export type BusStatus = (typeof BUS_STATUSES)[number];

export const BUS_CATEGORIES = ['AC', 'NON_AC'] as const;
export type BusCategory = (typeof BUS_CATEGORIES)[number];

export const BRANCH_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type BranchStatus = (typeof BRANCH_STATUSES)[number];

export const ROUTE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type RouteStatus = (typeof ROUTE_STATUSES)[number];

export const TRIP_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'BOARDING',
  'DEPARTED',
  'IN_TRANSIT',
  'ARRIVED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

/** Trip statuses during which live GPS is expected/allowed. */
export const ACTIVE_TRIP_STATUSES: TripStatus[] = ['BOARDING', 'DEPARTED', 'IN_TRANSIT'];

export const BOOKING_STATUSES = [
  'CONFIRMED',
  'PENDING',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const SEAT_STATES = ['AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED', 'RESERVED'] as const;
export type SeatState = (typeof SEAT_STATES)[number];

export const GPS_SESSION_STATUSES = ['ACTIVE', 'PAUSED', 'ENDED'] as const;
export type GpsSessionStatus = (typeof GPS_SESSION_STATUSES)[number];

export const GPS_SOURCES = ['DRIVER_APP', 'SIMULATOR', 'DEVICE'] as const;
export type GpsSource = (typeof GPS_SOURCES)[number];

export const ROUTE_ADHERENCE = ['ON_ROUTE', 'DEVIATED', 'UNKNOWN'] as const;
export type RouteAdherence = (typeof ROUTE_ADHERENCE)[number];

export const NOTIFICATION_CHANNELS = ['IN_APP', 'SMS', 'EMAIL', 'PUSH'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof LOCALES)[number];
