import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  profileUpdateSchema,
  staffCreateSchema,
  userListQuerySchema,
  type ProfileUpdateInput,
  type StaffCreateInput,
  type UserListQuery,
} from '@starline/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USER_VIEW, PERMISSIONS.PASSENGER_VIEW)
  list(
    @Query(new ZodValidationPipe(userListQuerySchema)) query: UserListQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.users.list(query, user);
  }

  @Post('staff')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  createStaff(
    @Body(new ZodValidationPipe(staffCreateSchema)) body: StaffCreateInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.users.createStaff(body, user);
  }

  @Get('options')
  @RequirePermissions(PERMISSIONS.TRIP_ASSIGN, PERMISSIONS.USER_VIEW, PERMISSIONS.BRANCH_EDIT)
  options(@Query('role') role: string) {
    return this.users.options(role ?? '');
  }

  /** Self-profile update — no admin permission required, own record only. */
  @Patch('me')
  updateMe(
    @Body(new ZodValidationPipe(profileUpdateSchema)) body: ProfileUpdateInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.users.updateMe(user.id, body);
  }
}
