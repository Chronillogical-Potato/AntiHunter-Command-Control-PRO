import { Module } from '@nestjs/common';

import { CommandsModule } from '../commands/commands.module';
import { NodesModule } from '../nodes/nodes.module';
import { AuthModule } from '../auth/auth.module';
import { CommandCenterGateway } from './command-center.gateway';

@Module({
  imports: [NodesModule, CommandsModule, AuthModule],
  providers: [CommandCenterGateway],
  exports: [CommandCenterGateway],
})
export class WsModule {}
