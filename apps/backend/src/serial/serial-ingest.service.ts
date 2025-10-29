
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription } from 'rxjs';

import { CommandsService } from '../commands/commands.service';
import { InventoryService } from '../inventory/inventory.service';
import { NodesService } from '../nodes/nodes.service';
import { CommandCenterGateway } from '../ws/command-center.gateway';
import { SerialService } from './serial.service';
import { SerialParseResult } from './serial.types';

@Injectable()
export class SerialIngestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SerialIngestService.name);
  private subscription?: Subscription;

  constructor(
    private readonly serialService: SerialService,
    private readonly nodesService: NodesService,
    private readonly inventoryService: InventoryService,
    private readonly commandsService: CommandsService,
    private readonly gateway: CommandCenterGateway,
  ) {}

  onModuleInit(): void {
    this.subscription = this.serialService.getParsedStream().subscribe((event) => {
      this.handleEvent(event).catch((error) => {
        this.logger.error(`Serial ingest failure: ${error instanceof Error ? error.message : error}`, error);
      });
    });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private async handleEvent(event: SerialParseResult): Promise<void> {
    const siteId = this.serialService.getSiteId();

    switch (event.kind) {
      case 'node-telemetry':
        await this.nodesService.upsert({
          id: event.nodeId,
          name: event.nodeId,
          lat: event.lat,
          lon: event.lon,
          lastMessage: event.lastMessage,
          ts: event.timestamp ?? new Date(),
          lastSeen: event.timestamp ?? new Date(),
          siteId,
        });
        this.gateway.emitEvent({
          type: 'node.telemetry',
          nodeId: event.nodeId,
          lat: event.lat,
          lon: event.lon,
          raw: event.raw,
          siteId,
        });
        break;
      case 'target-detected':
        {
          const nodeSnapshot = event.nodeId ? this.nodesService.getSnapshotById(event.nodeId) : undefined;
          await this.inventoryService.recordDetection(event, siteId, nodeSnapshot?.lat, nodeSnapshot?.lon);
        }
        this.gateway.emitEvent({
          type: 'event.target',
          timestamp: new Date().toISOString(),
          nodeId: event.nodeId,
          mac: event.mac,
          rssi: event.rssi,
          deviceType: event.type,
          lat: event.lat,
          lon: event.lon,
          message: `Device ${event.mac} discovered (RSSI ${event.rssi ?? 'n/a'})`,
          raw: event.raw,
          siteId,
        });
        break;
      case 'alert':
        {
          const timestamp = new Date();
          const lat =
            typeof event.data?.lat === 'number' ? event.data.lat : undefined;
          const lon =
            typeof event.data?.lon === 'number' ? event.data.lon : undefined;
          this.gateway.emitEvent({
            type: 'event.alert',
            timestamp: timestamp.toISOString(),
            level: event.level,
            category: event.category,
            nodeId: event.nodeId,
            message: event.message,
            lat,
            lon,
            data: event.data,
            raw: event.raw,
            siteId,
          });
          if (event.nodeId && event.message) {
            await this.nodesService.updateLastMessage(event.nodeId, event.message, timestamp);
          }
        }
        break;
      case 'command-ack':
        await this.commandsService.handleAck(event);
        this.gateway.emitEvent({
          type: 'command.ack',
          nodeId: event.nodeId,
          ackType: event.ackType,
          status: event.status,
          raw: event.raw,
          siteId,
        });
        break;
      case 'command-result':
        await this.commandsService.handleResult(event);
        this.gateway.emitEvent({
          type: 'command.result',
          nodeId: event.nodeId,
          command: event.command,
          payload: event.payload,
          raw: event.raw,
          siteId,
        });
        break;
      case 'raw':
      default:
        this.gateway.emitEvent({ type: 'raw', raw: event.raw });
        break;
    }
  }
}
