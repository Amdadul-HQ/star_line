import { HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import { ERROR_CODES } from '@starline/shared';
import { ZodSchema } from 'zod';
import { AppError } from '../errors';

/**
 * Usage: @Body(new ZodValidationPipe(schema)) — schemas live in
 * @starline/shared so web forms and the API validate identically.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        HttpStatus.BAD_REQUEST,
        result.error.flatten(),
      );
    }
    return result.data;
  }
}
