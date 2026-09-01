import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  tripAssignSchema,
  tripCreateSchema,
  tripListQuerySchema,
  tripStatusSchema,
  type TripAssignInput,
  type TripCreateInput,
  type TripListQuery,
  type TripStatusInput,
} from '@starline/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types';
import { TripsService } from './trips.service';

@ApiTags('trips')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.TRIP_VIEW)
  list(
    @Query(new ZodValidationPipe(tripListQuerySchema)) query: TripListQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.trips.list(query, user);
  }

  /** Crew view — no TRIP_VIEW required, results are always the caller's own trips. */
  @Get('mine/today')
  myToday(@CurrentUser() user: RequestUser) {
    return this.trips.myToday(user);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.trips.get(id, user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.TRIP_CREATE)
  create(
    @Body(new ZodValidationPipe(tripCreateSchema)) body: TripCreateInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.trips.create(body, user);
  }

  @Patch(':id/assign')
  @RequirePermissions(PERMISSIONS.TRIP_ASSIGN)
  assign(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(tripAssignSchema)) body: TripAssignInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.trips.assign(id, body, user);
  }

  /** Crew (driver/supervisor of the trip) or TRIP_EDIT holders. */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(tripStatusSchema)) body: TripStatusInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.trips.updateStatus(id, body.status, user);
  }
}
