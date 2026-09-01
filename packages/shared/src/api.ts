/** Standard API envelope + error codes shared by API and web. */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

/**
 * Machine-readable error codes. The web app maps these to translated,
 * user-friendly messages — never show raw codes to end users.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_TOO_MANY_ATTEMPTS: 'OTP_TOO_MANY_ATTEMPTS',
  OTP_RESEND_TOO_SOON: 'OTP_RESEND_TOO_SOON',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SESSION_REVOKED: 'SESSION_REVOKED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  // Domain
  BRANCH_SCOPE_VIOLATION: 'BRANCH_SCOPE_VIOLATION',
  ASSIGNMENT_CONFLICT: 'ASSIGNMENT_CONFLICT',
  TRIP_NOT_ACTIVE: 'TRIP_NOT_ACTIVE',
  NOT_TRIP_CREW: 'NOT_TRIP_CREW',
  GPS_INVALID_COORDINATES: 'GPS_INVALID_COORDINATES',
  GPS_STALE_FIX: 'GPS_STALE_FIX',
  SIMULATION_ALREADY_RUNNING: 'SIMULATION_ALREADY_RUNNING',
  SIMULATION_NOT_FOUND: 'SIMULATION_NOT_FOUND',
  SEAT_ALREADY_BOOKED: 'SEAT_ALREADY_BOOKED',
  TRACKING_NOT_ALLOWED: 'TRACKING_NOT_ALLOWED',
  BOOKING_NOT_PAYABLE: 'BOOKING_NOT_PAYABLE',
  PAYMENT_INIT_FAILED: 'PAYMENT_INIT_FAILED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  TRIP_NOT_BOOKABLE: 'TRIP_NOT_BOOKABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}
