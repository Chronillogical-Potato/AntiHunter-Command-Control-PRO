import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { AdsbController } from './adsb.controller';
import { AdsbService } from './adsb.service';
import { GeofencesModule } from '../geofences/geofences.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [
    MqttModule,
    WsModule,
    GeofencesModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 200 * 1024 * 1024 }, // allow up to 200MB uploads
    }),
  ],
  controllers: [AdsbController],
  providers: [AdsbService],
  exports: [AdsbService],
})
export class AdsbModule {}
