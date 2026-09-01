import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@starline/shared';
import type { Response } from 'express';
import { AppError } from '../errors';

/** Normalizes every error into the standard API envelope. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    // WebSocket errors are handled by the gateway; this filter is HTTP-only.
    if (host.getType() !== 'http') throw exception;

    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ERROR_CODES.INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof AppError) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      code = ERROR_CODES.RATE_LIMITED;
      message = 'Too many requests';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        code = ERROR_CODES.CONFLICT;
        message = 'A record with the same unique value already exists';
        details = { fields: exception.meta?.target };
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = ERROR_CODES.NOT_FOUND;
        message = 'Record not found';
      } else {
        this.logger.error(`Prisma error ${exception.code}: ${exception.message}`);
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : exception.message;
      code =
        status === HttpStatus.UNAUTHORIZED
          ? ERROR_CODES.UNAUTHORIZED
          : status === HttpStatus.FORBIDDEN
            ? ERROR_CODES.FORBIDDEN
            : status === HttpStatus.NOT_FOUND
              ? ERROR_CODES.NOT_FOUND
              : ERROR_CODES.VALIDATION_ERROR;
    } else {
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
      );
    }

    if (status >= 500) {
      this.logger.error(`${status} ${code}: ${message}`);
    }

    res.status(status).json({ success: false, error: { code, message, details } });
  }
}
