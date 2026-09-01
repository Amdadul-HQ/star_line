import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { EtaService } from './eta.service';
import { GpsController } from './gps.controller';
import { GpsGateway } from './gps.gateway';
import { GpsService } from './gps.service';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';

@Module({
  imports: [TripsModule],
  controllers: [GpsController, SimulatorController],
  providers: [GpsService, GpsGateway, SimulatorService, EtaService],
  exports: [GpsService, EtaService],
})
export class GpsModule {}
