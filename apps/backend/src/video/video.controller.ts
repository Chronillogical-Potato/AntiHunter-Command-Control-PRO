import { Controller, Get } from '@nestjs/common';

import { VideoAddonService } from './video-addon.service';

@Controller('video')
export class VideoController {
  constructor(private readonly videoAddonService: VideoAddonService) {}

  @Get('fpv/status')
  getStatus() {
    return this.videoAddonService.getStatus();
  }
}
