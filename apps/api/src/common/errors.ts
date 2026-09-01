import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@starline/shared';

/**
 * Application error carrying a machine-readable code the frontend translates.
 * Always thrown instead of raw HttpException so every error follows the
 * { success: false, error: { code, message } } envelope.
 */
export class AppError extends HttpException {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, status: HttpStatus, details?: unknown) {
    super({ code, message, details }, status);
    this.code = code;
    this.details = details;
  }

  static badRequest(code: string, message: string, details?: unknown) {
    return new AppError(code, message, HttpStatus.BAD_REQUEST, details);
  }

  static unauthorized(message = 'Authentication required', code: string = ERROR_CODES.UNAUTHORIZED) {
    return new AppError(code, message, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(message = 'Not allowed', code: string = ERROR_CODES.FORBIDDEN) {
    return new AppError(code, message, HttpStatus.FORBIDDEN);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(ERROR_CODES.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }

  static conflict(message: string, code: string = ERROR_CODES.CONFLICT, details?: unknown) {
    return new AppError(code, message, HttpStatus.CONFLICT, details);
  }
}
