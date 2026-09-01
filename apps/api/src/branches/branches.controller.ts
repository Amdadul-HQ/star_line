import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  branchCreateSchema,
  branchUpdateSchema,
  PERMISSIONS,
  type BranchCreateInput,
  type BranchUpdateInput,
} from '@starline/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types';
import { BranchesService, branchListQuerySchema, type BranchListQuery } from './branches.service';

@ApiTags('branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.BRANCH_VIEW)
  list(@Query(new ZodValidationPipe(branchListQuerySchema)) query: BranchListQuery) {
    return this.branches.list(query);
  }

  @Get('options')
  @RequirePermissions(PERMISSIONS.BRANCH_VIEW, PERMISSIONS.BUS_CREATE, PERMISSIONS.TRIP_ASSIGN, PERMISSIONS.USER_MANAGE)
  options() {
    return this.branches.options();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.BRANCH_CREATE)
  create(
    @Body(new ZodValidationPipe(branchCreateSchema)) body: BranchCreateInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.branches.create(body, user);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.BRANCH_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(branchUpdateSchema)) body: BranchUpdateInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.branches.update(id, body, user);
  }
}
