import { Body, Controller, Get, Put } from '@nestjs/common';

import { AppConfigService } from './app-config.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

@Controller('config/app')
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get()
  getAppSettings() {
    return this.appConfigService.getSettings();
  }

  @Put()
  updateAppSettings(@Body() body: UpdateAppSettingsDto) {
    return this.appConfigService.updateSettings(body);
  }
}
