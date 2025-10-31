import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { VideoAddonService } from './video-addon.service';
import { VideoController } from './video.controller';

@Module({
  imports: [ConfigModule],
  providers: [VideoAddonService],
  controllers: [VideoController],
  exports: [VideoAddonService],
})
export class VideoModule {}
