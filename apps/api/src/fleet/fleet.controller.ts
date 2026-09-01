import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@starline/shared';
import { RequirePermissions } from '../common/decorators';
import { FleetService } from './fleet.service';

@ApiTags('fleet')
@ApiBearerAuth()
@Controller('fleet')
export class FleetController {
  constructor(private readonly fleet: FleetService) {}

  @Get('overview')
  @RequirePermissions(PERMISSIONS.FLEET_VIEW)
  overview() {
    return this.fleet.overview();
  }
}
