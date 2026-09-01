import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types';
import {
  PassengerService,
  passengerBookingsQuerySchema,
  type PassengerBookingsQuery,
} from './passenger.service';

/**
 * Passenger self-service endpoints. No admin permissions involved —
 * every query is scoped to the authenticated user's own data.
 */
@ApiTags('passenger')
@ApiBearerAuth()
@Controller('passenger')
export class PassengerController {
  constructor(private readonly passenger: PassengerService) {}

  @Get('me/overview')
  overview(@CurrentUser() user: RequestUser) {
    return this.passenger.overview(user.id);
  }

  @Get('me/bookings')
  bookings(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(passengerBookingsQuerySchema)) query: PassengerBookingsQuery,
  ) {
    return this.passenger.bookings(user.id, query);
  }

  @Get('trips/:tripId/track')
  track(@Param('tripId') tripId: string, @CurrentUser() user: RequestUser) {
    return this.passenger.track(user.id, tripId);
  }
}
