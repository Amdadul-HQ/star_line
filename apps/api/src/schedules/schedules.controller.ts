import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  scheduleCreateSchema,
  scheduleUpdateSchema,
  type ScheduleCreateInput,
  type ScheduleUpdateInput,
} from '@starline/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types';
import {
  SchedulesService,
  scheduleListQuerySchema,
  type ScheduleListQuery,
} from './schedules.service';

@ApiTags('schedules')
@ApiBearerAuth()
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedules: SchedulesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SCHEDULE_VIEW)
  list(@Query(new ZodValidationPipe(scheduleListQuerySchema)) query: ScheduleListQuery) {
    return this.schedules.list(query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SCHEDULE_CREATE)
  create(
    @Body(new ZodValidationPipe(scheduleCreateSchema)) body: ScheduleCreateInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.schedules.create(body, user);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SCHEDULE_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(scheduleUpdateSchema)) body: ScheduleUpdateInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.schedules.update(id, body, user);
  }
}
