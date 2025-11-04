import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction, Request } from 'express';

import { FirewallService, FirewallBlockedException } from './firewall.service';

@Injectable()
export class FirewallMiddleware implements NestMiddleware {
  private readonly logger = new Logger(FirewallMiddleware.name);

  constructor(private readonly firewallService: FirewallService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.firewallService.handleRequest(req);
      next();
    } catch (error) {
      if (error instanceof FirewallBlockedException) {
        res.status(403).json({
          message: error.message,
          code: 'FIREWALL_BLOCKED',
        });
        return;
      }
      this.logger.error(
        `Firewall middleware error: ${error instanceof Error ? error.message : String(error)}`,
      );
      next(error);
    }
  }
}
