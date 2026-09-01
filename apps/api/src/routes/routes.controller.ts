import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  routeCreateSchema,
  routeUpdateSchema,
  type RouteCreateInput,
  type RouteUpdateInput,
} from '@starline/shared';
import { CurrentUser, Public, RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types';
import { RoutesService, routeListQuerySchema, type RouteListQuery } from './routes.service';

@ApiTags('routes')
@Controller()
export class RoutesController {
  constructor(private readonly routes: RoutesService) {}

  /** Public: powers the landing page "Popular Routes" section. */
  @Public()
  @Get('public/routes')
  publicRoutes() {
    return this.routes.publicRoutes();
  }

  @ApiBearerAuth()
  @Get('routes')
  @RequirePermissions(PERMISSIONS.ROUTE_VIEW)
  list(@Query(new ZodValidationPipe(routeListQuerySchema)) query: RouteListQuery) {
    return this.routes.list(query);
  }

  @ApiBearerAuth()
  @Get('routes/options')
  @RequirePermissions(PERMISSIONS.ROUTE_VIEW, PERMISSIONS.TRIP_CREATE, PERMISSIONS.SIMULATOR_MANAGE)
  options() {
    return this.routes.options();
  }

  @ApiBearerAuth()
  @Get('routes/:id')
  @RequirePermissions(PERMISSIONS.ROUTE_VIEW)
  get(@Param('id') id: string) {
    return this.routes.get(id);
  }

  @ApiBearerAuth()
  @Post('routes')
  @RequirePermissions(PERMISSIONS.ROUTE_CREATE)
  create(
    @Body(new ZodValidationPipe(routeCreateSchema)) body: RouteCreateInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.routes.create(body, user);
  }

  @ApiBearerAuth()
  @Patch('routes/:id')
  @RequirePermissions(PERMISSIONS.ROUTE_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(routeUpdateSchema)) body: RouteUpdateInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.routes.update(id, body, user);
  }

  @ApiBearerAuth()
  @Delete('routes/:id')
  @RequirePermissions(PERMISSIONS.ROUTE_DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.routes.remove(id, user);
  }
}
