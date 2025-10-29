import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { OnModuleDestroy, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Subscription } from 'rxjs';

import { CommandState, CommandsService } from '../commands/commands.service';
import { SendCommandDto } from '../commands/dto/send-command.dto';
import { NodesService } from '../nodes/nodes.service';

@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: true, credentials: true },
})
export class CommandCenterGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly clientDiffSubscriptions = new Map<string, Subscription>();
  private commandSubscription?: Subscription;

  constructor(
    private readonly nodesService: NodesService,
    private readonly commandsService: CommandsService,
  ) {}

  afterInit(server: Server): void {
    this.commandSubscription = this.commandsService.getUpdatesStream().subscribe((command) => {
      server.emit('command.update', command);
    });
  }

  handleConnection(@ConnectedSocket() client: Socket): void {
    client.emit('init', {
      nodes: this.nodesService.getSnapshot(),
    });

    const subscription = this.nodesService.getDiffStream().subscribe((diff) => {
      client.emit('nodes', diff);
    });

    this.clientDiffSubscriptions.set(client.id, subscription);
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    const subscription = this.clientDiffSubscriptions.get(client.id);
    subscription?.unsubscribe();
    this.clientDiffSubscriptions.delete(client.id);
  }

  onModuleDestroy(): void {
    this.commandSubscription?.unsubscribe();
    this.clientDiffSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.clientDiffSubscriptions.clear();
  }

  emitEvent(payload: unknown): void {
    if (!this.server) {
      return;
    }
    this.server.emit('event', payload);
  }

  emitCommandUpdate(command: CommandState): void {
    if (!this.server) {
      return;
    }
    this.server.emit('command.update', command);
  }

  @SubscribeMessage('sendCommand')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleSendCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendCommandDto,
  ) {
    try {
      const state = await this.commandsService.sendCommand(dto, client.data?.userId);
      return { event: 'command.queued', data: state };
    } catch (error) {
      throw new WsException(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}
