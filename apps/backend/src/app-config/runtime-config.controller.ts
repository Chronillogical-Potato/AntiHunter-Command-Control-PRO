import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('config/runtime')
export class RuntimeConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getRuntimeConfig() {
    const env = this.configService.get<string>('env', 'development');
    const siteId = this.configService.get<string>('site.id', 'default');
    const mqttEnabled = this.configService.get<boolean>('mqtt.enabled', true);
    const mqttCommandsEnabled = this.configService.get<boolean>('mqtt.commandsEnabled', true);
    const namespace = this.configService.get<string>('mqtt.namespace', 'ahcc');

    return {
      env,
      siteId,
      mqtt: {
        enabled: mqttEnabled,
        commandsEnabled: mqttCommandsEnabled,
        namespace,
      },
    };
  }
}
