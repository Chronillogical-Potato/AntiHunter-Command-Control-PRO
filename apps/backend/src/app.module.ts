import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import configuration from './config/configuration';
import { validateEnvironment } from './config/environment.validation';
import { AppConfigModule } from './app-config/app-config.module';
import { HealthModule } from './health/health.module';
import { NodesModule } from './nodes/nodes.module';
import { PrismaModule } from './prisma/prisma.module';
import { SerialModule } from './serial/serial.module';
import { CommandsModule } from './commands/commands.module';
import { WsModule } from './ws/ws.module';
import { InventoryModule } from './inventory/inventory.module';
import { IngestModule } from './ingest/ingest.module';
import { AlarmsModule } from './alarms/alarms.module';
import { TargetsModule } from './targets/targets.module';
import { OuiModule } from './oui/oui.module';
import { SitesModule } from './sites/sites.module';
import { MqttModule } from './mqtt/mqtt.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { ExportsModule } from './exports/exports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnvironment,
      expandVariables: true,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const env = configService.get<string>('env', 'development');
        const level = configService.get<string>('logging.level', 'info');
        const structured = configService.get<boolean>('logging.structured', true);
        const pretty = env !== 'production' || !structured;

        return {
          pinoHttp: {
            level,
            transport: pretty
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: false,
                    translateTime: 'SYS:standard',
                  },
                }
              : undefined,
            base: undefined,
          },
        };
      },
    }),
    PrismaModule,
    AuthModule,
    AppConfigModule,
    HealthModule,
    SerialModule,
    NodesModule,
    InventoryModule,
    CommandsModule,
    WsModule,
    IngestModule,
    AlarmsModule,
    TargetsModule,
    OuiModule,
    MqttModule,
    SitesModule,
    MailModule,
    UsersModule,
    ExportsModule,
  ],
})
export class AppModule {}


