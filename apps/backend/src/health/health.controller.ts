import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('healthz')
  health(): Record<string, string> {
    return { status: 'ok' };
  }

  @Get('readyz')
  ready(): Record<string, string> {
    return { status: 'ready' };
  }
}
