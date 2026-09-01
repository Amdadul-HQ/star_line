import type {
  BranchStatus,
  BookingStatus,
  BusCategory,
  BusStatus,
  GpsSessionStatus,
  RouteStatus,
  TripStatus,
  UserStatus,
} from './enums';
import type { PermissionCode } from './rbac/permissions';
import type { RoleName } from './rbac/roles';
import type { SeatLayout } from './seat-layout';

/** DTOs returned by the API. Kept flat and JSON-safe (dates as ISO strings). */

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: RoleName | string;
  permissions: PermissionCode[];
  branchId: string | null;
  branchName: string | null;
  preferredLocale: string;
  status: UserStatus;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface OtpRequestResponse {
  phone: string;
  /** Seconds until the code expires. */
  expiresIn: number;
  /** Seconds the client must wait before requesting a resend. */
  resendAfter: number;
  /** Sandbox only — echoed so dev/testing can log in without SMS. Never set in production. */
  devCode?: string;
}

export interface UserDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: UserStatus;
  branchId: string | null;
  branchName: string | null;
  employeeCode: string | null;
  createdAt: string;
}

export interface BranchDto {
  id: string;
  name: string;
  code: string;
  address: string;
  district: string;
  division: string;
  phone: string;
  status: BranchStatus;
  managerId: string | null;
  managerName: string | null;
  busCount?: number;
  createdAt: string;
}

export interface BusDto {
  id: string;
  busNumber: string;
  registrationNumber: string;
  brand: string;
  model: string;
  category: BusCategory;
  serviceType: string;
  seatCapacity: number;
  seatLayout: SeatLayout | null;
  status: BusStatus;
  branchId: string | null;
  branchName: string | null;
  createdAt: string;
}

export interface RouteStopDto {
  id: string;
  name: string;
  order: number;
  lat: number;
  lng: number;
  isBoardingPoint: boolean;
}

export interface RouteDto {
  id: string;
  name: string;
  code: string;
  origin: string;
  destination: string;
  distanceKm: number;
  estimatedDurationMin: number;
  baseFareBdt: number;
  status: RouteStatus;
  stops: RouteStopDto[];
  createdAt: string;
}

export interface ScheduleDto {
  id: string;
  routeId: string;
  routeName: string;
  departureTime: string;
  daysOfWeek: number[];
  fareBdt: number | null;
  isActive: boolean;
}

export interface TripDto {
  id: string;
  routeId: string;
  routeName: string;
  origin: string;
  destination: string;
  serviceDate: string;
  departureAt: string;
  status: TripStatus;
  fareBdt: number;
  busId: string | null;
  busNumber: string | null;
  driverId: string | null;
  driverName: string | null;
  supervisorId: string | null;
  supervisorName: string | null;
  helperId: string | null;
  helperName: string | null;
  branchId: string | null;
  branchName: string | null;
  bookedSeats?: number;
  seatCapacity?: number | null;
}

export interface BusLatestLocationDto {
  busId: string;
  busNumber: string;
  tripId: string | null;
  routeName: string | null;
  status: BusStatus;
  lat: number;
  lng: number;
  speedKph: number | null;
  heading: number | null;
  accuracy: number | null;
  recordedAt: string;
  /** True when the fix is older than the configured stale threshold. */
  stale: boolean;
}

export interface FleetOverviewDto {
  totalBuses: number;
  byStatus: Record<BusStatus, number>;
  activeTrips: number;
  tripsToday: number;
  bookingsToday: number;
  revenueTodayBdt: number;
  passengers: number;
  liveBuses: number;
}

export interface BookingDto {
  id: string;
  code: string;
  tripId: string;
  routeName: string;
  origin: string;
  destination: string;
  serviceDate: string;
  departureAt: string;
  busNumber: string | null;
  seatNumbers: string[];
  fareTotalBdt: number;
  status: BookingStatus;
  boardingPoint: string | null;
  passengerName: string;
  passengerPhone: string | null;
  createdAt: string;
}

export interface TrackTripDto {
  trip: TripDto;
  location: BusLatestLocationDto | null;
  etaMinutes: number | null;
  progressPct: number | null;
  nextStop: string | null;
  routePath: { lat: number; lng: number; name: string }[];
}

export interface GpsSessionDto {
  id: string;
  tripId: string;
  busId: string;
  status: GpsSessionStatus;
  source: string;
  startedAt: string;
  endedAt: string | null;
}

export interface AuditLogDto {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: PermissionCode[];
  userCount?: number;
}
