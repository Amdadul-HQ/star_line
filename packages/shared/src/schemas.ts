import { z } from 'zod';
import {
  BUS_CATEGORIES,
  BUS_STATUSES,
  BRANCH_STATUSES,
  ROUTE_STATUSES,
  TRIP_STATUSES,
} from './enums';

/** Bangladeshi mobile number in international format, e.g. +8801712345678 */
export const bdPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+8801[3-9]\d{8}$/, 'Must be a valid +880 mobile number');

// ---------------------------------------------------------------- pagination
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PageQueryInput = z.infer<typeof pageQuerySchema>;

// ---------------------------------------------------------------------- auth
export const staffLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
});
export type StaffLoginInput = z.infer<typeof staffLoginSchema>;

export const otpRequestSchema = z.object({
  phone: bdPhoneSchema,
});
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  phone: bdPhoneSchema,
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP is a 6 digit code'),
  name: z.string().trim().min(2).max(80).optional(),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

// -------------------------------------------------------------------- branch
export const branchCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,12}$/),
  address: z.string().trim().min(3).max(200),
  district: z.string().trim().min(2).max(60),
  division: z.string().trim().min(2).max(60),
  phone: z.string().trim().min(6).max(20),
  managerId: z.string().cuid().nullish(),
  status: z.enum(BRANCH_STATUSES).default('ACTIVE'),
});
export const branchUpdateSchema = branchCreateSchema.partial();
export type BranchCreateInput = z.infer<typeof branchCreateSchema>;
export type BranchUpdateInput = z.infer<typeof branchUpdateSchema>;

// ----------------------------------------------------------------------- bus
const seatCellSchema = z.object({
  kind: z.enum(['SEAT', 'AISLE', 'EMPTY', 'DOOR', 'DRIVER']),
  seatNumber: z.string().max(6).optional(),
});
export const seatLayoutSchema = z.object({
  template: z.string().max(20),
  rows: z.number().int().min(1).max(30),
  cols: z.number().int().min(1).max(8),
  grid: z.array(z.array(seatCellSchema)),
});

export const busCreateSchema = z.object({
  busNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,15}$/),
  registrationNumber: z.string().trim().min(4).max(40),
  brand: z.string().trim().min(2).max(40),
  model: z.string().trim().min(1).max(60),
  category: z.enum(BUS_CATEGORIES),
  serviceType: z.string().trim().min(2).max(40), // e.g. "Luxury Coach", "Business Class"
  seatCapacity: z.number().int().min(10).max(80),
  seatLayout: seatLayoutSchema.optional(),
  branchId: z.string().cuid().nullish(),
  status: z.enum(BUS_STATUSES).default('IDLE'),
});
export const busUpdateSchema = busCreateSchema.partial();
export type BusCreateInput = z.infer<typeof busCreateSchema>;
export type BusUpdateInput = z.infer<typeof busUpdateSchema>;

// --------------------------------------------------------------------- route
export const routeStopSchema = z.object({
  name: z.string().trim().min(2).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  isBoardingPoint: z.boolean().default(true),
  /** Marks this stop as a staffed ticket counter. */
  isCounter: z.boolean().default(false),
  counterPhone: z.string().trim().max(20).nullish(),
  counterAddress: z.string().trim().max(200).nullish(),
  note: z.string().trim().max(300).nullish(),
  /** Counter staff (user ids, e.g. ticketers) assigned to this counter. */
  staffIds: z.array(z.string().cuid()).max(10).default([]),
});

export const routeCreateSchema = z.object({
  name: z.string().trim().min(3).max(120),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,12}$/),
  origin: z.string().trim().min(2).max(60),
  destination: z.string().trim().min(2).max(60),
  distanceKm: z.number().positive().max(2000),
  estimatedDurationMin: z.number().int().positive().max(24 * 60),
  /** NON_AC (base class) fare. */
  baseFareBdt: z.number().int().positive().max(100000),
  /** Optional AC-class fare; falls back to base when unset. */
  acFareBdt: z.number().int().positive().max(100000).nullish(),
  status: z.enum(ROUTE_STATUSES).default('ACTIVE'),
  /** Ordered origin → destination; at least origin + destination. */
  stops: z.array(routeStopSchema).min(2),
});
export const routeUpdateSchema = routeCreateSchema.partial();
export type RouteCreateInput = z.infer<typeof routeCreateSchema>;
export type RouteUpdateInput = z.infer<typeof routeUpdateSchema>;

// ------------------------------------------------------------------ schedule
export const scheduleCreateSchema = z.object({
  routeId: z.string().cuid(),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm'),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  fareBdt: z.number().int().positive().max(100000).nullish(),
  isActive: z.boolean().default(true),
});
export const scheduleUpdateSchema = scheduleCreateSchema.partial();
export type ScheduleCreateInput = z.infer<typeof scheduleCreateSchema>;
export type ScheduleUpdateInput = z.infer<typeof scheduleUpdateSchema>;

// ---------------------------------------------------------------------- trip
export const tripCreateSchema = z.object({
  routeId: z.string().cuid(),
  scheduleId: z.string().cuid().nullish(),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm'),
  fareBdt: z.number().int().positive().max(100000).nullish(),
  busId: z.string().cuid().nullish(),
  driverId: z.string().cuid().nullish(),
  supervisorId: z.string().cuid().nullish(),
  helperId: z.string().cuid().nullish(),
  branchId: z.string().cuid().nullish(),
});
export type TripCreateInput = z.infer<typeof tripCreateSchema>;

export const tripAssignSchema = z.object({
  busId: z.string().cuid().nullish(),
  driverId: z.string().cuid().nullish(),
  supervisorId: z.string().cuid().nullish(),
  helperId: z.string().cuid().nullish(),
  branchId: z.string().cuid().nullish(),
});
export type TripAssignInput = z.infer<typeof tripAssignSchema>;

export const tripStatusSchema = z.object({
  status: z.enum(TRIP_STATUSES),
});
export type TripStatusInput = z.infer<typeof tripStatusSchema>;

export const tripListQuerySchema = pageQuerySchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  routeId: z.string().cuid().optional(),
  busId: z.string().cuid().optional(),
  status: z.enum(TRIP_STATUSES).optional(),
  branchId: z.string().cuid().optional(),
});
export type TripListQuery = z.infer<typeof tripListQuerySchema>;

// ----------------------------------------------------------------------- gps
export const gpsLocationSchema = z.object({
  tripId: z.string().cuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** km/h — buses physically top out well under 200. */
  speedKph: z.number().min(0).max(200).nullish(),
  heading: z.number().min(0).max(360).nullish(),
  accuracy: z.number().min(0).max(10000).nullish(),
  recordedAt: z.string().datetime({ offset: true }),
});
export type GpsLocationInput = z.infer<typeof gpsLocationSchema>;

export const simulatorStartSchema = z
  .object({
    tripId: z.string().cuid().optional(),
    busId: z.string().cuid().optional(),
    routeId: z.string().cuid().optional(),
    speedKph: z.number().min(15).max(120).default(50),
    intervalMs: z.number().int().min(1000).max(15000).default(2500),
  })
  .refine((v) => !!v.tripId || (!!v.busId && !!v.routeId), {
    message: 'Provide tripId, or busId + routeId',
  });
export type SimulatorStartInput = z.infer<typeof simulatorStartSchema>;

export const simulatorUpdateSchema = z.object({
  speedKph: z.number().min(15).max(120).optional(),
});
export type SimulatorUpdateInput = z.infer<typeof simulatorUpdateSchema>;

// --------------------------------------------------------------------- users
export const staffCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  phone: bdPhoneSchema.nullish(),
  roleName: z.string().min(2),
  branchId: z.string().cuid().nullish(),
  employeeCode: z.string().trim().max(20).nullish(),
  licenseNumber: z.string().trim().max(40).nullish(),
});
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;

export const userListQuerySchema = pageQuerySchema.extend({
  role: z.string().optional(),
  branchId: z.string().cuid().optional(),
  search: z.string().trim().max(80).optional(),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  preferredLocale: z.enum(['en', 'bn']).optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// ------------------------------------------------------------------ booking
export const tripSearchQuerySchema = z.object({
  from: z.string().trim().min(2).max(60),
  to: z.string().trim().min(2).max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
});
export type TripSearchQuery = z.infer<typeof tripSearchQuerySchema>;

export const bookingCreateSchema = z.object({
  tripId: z.string().cuid(),
  seatNumbers: z.array(z.string().trim().min(1).max(6)).min(1).max(4),
  boardingPoint: z.string().trim().max(80).nullish(),
});
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

// ------------------------------------------------------------------ settings
export const generalSettingsSchema = z.object({
  companyName: z.string().trim().min(2).max(80),
  supportPhone: z.string().trim().min(6).max(20),
  supportEmail: z.string().trim().email(),
  defaultLocale: z.enum(['en', 'bn']),
});
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
