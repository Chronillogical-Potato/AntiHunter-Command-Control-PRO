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
    const httpPort = this.configService.get<number>('http.port', 3000);
    const httpRedirectPort = this.configService.get<number>('http.redirectPort');
    const httpsEnabled = this.configService.get<boolean>('https.enabled', false);
    const httpsActive = this.configService.get<boolean>('https.active', httpsEnabled);

    return {
      env,
      siteId,
      mqtt: {
        enabled: mqttEnabled,
        commandsEnabled: mqttCommandsEnabled,
        namespace,
      },
      http: {
        port: httpPort,
        redirectPort: httpRedirectPort,
      },
      https: {
        enabled: httpsEnabled,
        active: httpsActive,
      },
      websocket: {
        secure: httpsActive,
      },
    };
  }
}
