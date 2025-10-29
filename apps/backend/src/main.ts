import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { join } from 'path';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const configService = app.get(ConfigService);
  const prefix = configService.get<string>('http.prefix', 'api');
  if (prefix) {
    app.setGlobalPrefix(prefix, { exclude: ['healthz', 'readyz', 'metrics'] });
  }

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/media/',
  });

  const port = configService.get<number>('http.port', 3000);
  await app.listen(port, () => {
    logger.log(`Command Center backend listening on port ${port}`, 'Bootstrap');
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console -- Fallback in case logger is not initialized
  console.error('Fatal error starting Command Center backend', error);
  process.exit(1);
});
