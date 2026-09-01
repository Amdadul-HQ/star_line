import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  simulatorStartSchema,
  simulatorUpdateSchema,
  type SimulatorStartInput,
  type SimulatorUpdateInput,
} from '@starline/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types';
import { SimulatorService } from './simulator.service';

@ApiTags('gps-simulator')
@ApiBearerAuth()
@Controller('gps/simulator')
@RequirePermissions(PERMISSIONS.SIMULATOR_MANAGE)
export class SimulatorController {
  constructor(private readonly simulator: SimulatorService) {}

  @Get()
  list() {
    return this.simulator.list();
  }

  @Post('start')
  start(
    @Body(new ZodValidationPipe(simulatorStartSchema)) body: SimulatorStartInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.simulator.start(body, user);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string) {
    return this.simulator.pause(id);
  }

  @Post(':id/resume')
  resume(@Param('id') id: string) {
    return this.simulator.resume(id);
  }

  @Post(':id/stop')
  stop(@Param('id') id: string) {
    return this.simulator.stop(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(simulatorUpdateSchema)) body: SimulatorUpdateInput,
  ) {
    return this.simulator.updateSpeed(id, body.speedKph ?? 50);
  }
}
