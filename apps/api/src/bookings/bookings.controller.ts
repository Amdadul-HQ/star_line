import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  bookingCreateSchema,
  tripSearchQuerySchema,
  type BookingCreateInput,
  type TripSearchQuery,
} from '@starline/shared';
import { CurrentUser, Public } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types';
import { PaymentsService } from '../payments/payments.service';
import { BookingsService } from './bookings.service';

@ApiTags('bookings')
@Controller()
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly payments: PaymentsService,
  ) {}

  /** Public trip search for the passenger booking flow. */
  @Public()
  @Get('public/trips/search')
  search(@Query(new ZodValidationPipe(tripSearchQuerySchema)) query: TripSearchQuery) {
    return this.bookings.search(query);
  }

  /** Public seat availability (booking itself requires sign-in). */
  @Public()
  @Get('public/trips/:id/seats')
  seatMap(@Param('id') id: string) {
    return this.bookings.seatMap(id);
  }

  /** Atomic seat reservation — creates a PENDING booking awaiting payment. */
  @ApiBearerAuth()
  @Post('bookings')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @Body(new ZodValidationPipe(bookingCreateSchema)) body: BookingCreateInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.bookings.create(body, user);
  }

  /** Start checkout for a PENDING booking (also used for "Pay now" retries). */
  @ApiBearerAuth()
  @Post('bookings/:id/pay')
  pay(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.payments.initiateForBooking(id, user);
  }

  @ApiBearerAuth()
  @Get('bookings/code/:code')
  byCode(@Param('code') code: string, @CurrentUser() user: RequestUser) {
    return this.bookings.byCode(code, user);
  }
}
