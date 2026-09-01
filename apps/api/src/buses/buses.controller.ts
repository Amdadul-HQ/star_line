import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  busCreateSchema,
  busUpdateSchema,
  PERMISSIONS,
  type BusCreateInput,
  type BusUpdateInput,
} from '@starline/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types';
import { BusesService, busListQuerySchema, type BusListQuery } from './buses.service';

@ApiTags('buses')
@ApiBearerAuth()
@Controller('buses')
export class BusesController {
  constructor(private readonly buses: BusesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.BUS_VIEW)
  list(
    @Query(new ZodValidationPipe(busListQuerySchema)) query: BusListQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.buses.list(query, user);
  }

  @Get('options')
  @RequirePermissions(PERMISSIONS.BUS_VIEW, PERMISSIONS.TRIP_ASSIGN, PERMISSIONS.SIMULATOR_MANAGE)
  options() {
    return this.buses.options();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.BUS_VIEW)
  profile(@Param('id') id: string) {
    return this.buses.profile(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.BUS_CREATE)
  create(
    @Body(new ZodValidationPipe(busCreateSchema)) body: BusCreateInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.buses.create(body, user);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.BUS_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(busUpdateSchema)) body: BusUpdateInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.buses.update(id, body, user);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.BUS_DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.buses.remove(id, user);
  }
}
