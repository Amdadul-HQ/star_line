import { Module } from '@nestjs/common';
import { GpsModule } from '../gps/gps.module';
import { TripsModule } from '../trips/trips.module';
import { PassengerController } from './passenger.controller';
import { PassengerService } from './passenger.service';

@Module({
  imports: [GpsModule, TripsModule],
  controllers: [PassengerController],
  providers: [PassengerService],
})
export class PassengerModule {}
