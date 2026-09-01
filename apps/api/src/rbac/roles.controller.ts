import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSION_DEFINITIONS, PERMISSIONS } from '@starline/shared';
import { RequirePermissions } from '../common/decorators';
import { RbacService } from './rbac.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rbac: RbacService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ROLE_VIEW)
  listRoles() {
    return this.rbac.listRoles();
  }

  @Get('permissions')
  @RequirePermissions(PERMISSIONS.ROLE_VIEW)
  listPermissions() {
    return PERMISSION_DEFINITIONS;
  }
}
