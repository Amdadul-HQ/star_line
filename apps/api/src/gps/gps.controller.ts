import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { gpsLocationSchema, PERMISSIONS, type GpsLocationInput } from '@starline/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { AppError } from '../common/errors';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types';
import { GpsService } from './gps.service';

@ApiTags('gps')
@ApiBearerAuth()
@Controller('gps')
export class GpsController {
  constructor(private readonly gps: GpsService) {}

  @Post('trips/:tripId/start')
  @RequirePermissions(PERMISSIONS.GPS_SHARE)
  start(@Param('tripId') tripId: string, @CurrentUser() user: RequestUser) {
    return this.gps.startSharing(user, tripId);
  }

  @Post('trips/:tripId/pause')
  @RequirePermissions(PERMISSIONS.GPS_SHARE)
  pause(@Param('tripId') tripId: string, @CurrentUser() user: RequestUser) {
    return this.gps.setSharingPaused(user, tripId, true);
  }

  @Post('trips/:tripId/resume')
  @RequirePermissions(PERMISSIONS.GPS_SHARE)
  resume(@Param('tripId') tripId: string, @CurrentUser() user: RequestUser) {
    return this.gps.setSharingPaused(user, tripId, false);
  }

  @Post('trips/:tripId/end')
  @RequirePermissions(PERMISSIONS.GPS_SHARE)
  end(@Param('tripId') tripId: string, @CurrentUser() user: RequestUser) {
    return this.gps.endTrip(user, tripId);
  }

  /** Driver-app location ingest — high frequency, generous throttle. */
  @Post('location')
  @RequirePermissions(PERMISSIONS.GPS_SHARE)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  ingest(
    @Body(new ZodValidationPipe(gpsLocationSchema)) body: GpsLocationInput,
    @CurrentUser() user: RequestUser,
  ) {
    const { tripId, ...fix } = body;
    return this.gps.ingest(user, tripId, fix);
  }

  /** Fleet-wide latest locations — initial payload for the admin live map. */
  @Get('latest')
  @RequirePermissions(PERMISSIONS.GPS_VIEW)
  latest() {
    return this.gps.latest();
  }

  /** Latest location for one trip; passengers must hold a booking on it. */
  @Get('trips/:tripId/latest')
  async tripLatest(@Param('tripId') tripId: string, @CurrentUser() user: RequestUser) {
    const allowed =
      user.permissions.includes(PERMISSIONS.GPS_VIEW) ||
      (await this.gps.isCrew(user.id, tripId)) ||
      (await this.gps.isPassengerAllowed(user.id, tripId));
    if (!allowed) {
      throw AppError.forbidden('You can only track trips you are booked on', 'TRACKING_NOT_ALLOWED');
    }
    return this.gps.latestForTrip(tripId);
  }
}
