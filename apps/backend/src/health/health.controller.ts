import { Controller, Get } from '@nestjs/common';

import { Public } from '../auth/auth.decorators';

@Controller()
export class HealthController {
  @Get('healthz')
  @Public()
  health(): Record<string, string> {
    return { status: 'ok' };
  }

  @Get('readyz')
  @Public()
  ready(): Record<string, string> {
    return { status: 'ready' };
  }
}
