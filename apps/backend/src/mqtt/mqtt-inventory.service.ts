import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InventoryDevice } from '@prisma/client';
import { Subscription } from 'rxjs';

import { MqttService, SiteMqttContext } from './mqtt.service';
import { InventoryService, InventoryUpsertPayload } from '../inventory/inventory.service';

type InventoryUpsertMessage = {
  type: 'inventory.upsert';
  originSiteId: string;
  payload: InventoryUpsertPayload;
};

const INVENTORY_TOPIC_PATTERN = 'ahcc/+/inventory/upsert';

@Injectable()
export class MqttInventoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttInventoryService.name);
  private readonly localSiteId: string;
  private readonly enabled: boolean;
  private updatesSubscription?: Subscription;
  private readonly inboundHandlers = new Map<string, (topic: string, payload: Buffer) => void>();

  constructor(
    configService: ConfigService,
    private readonly inventoryService: InventoryService,
    private readonly mqttService: MqttService,
  ) {
    this.localSiteId = configService.get<string>('site.id', 'default');
    this.enabled = configService.get<boolean>('mqtt.enabled', true);
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('MQTT inventory federation disabled via configuration');
      return;
    }

    this.updatesSubscription = this.inventoryService.getUpdatesStream().subscribe((record) => {
      void this.handleLocalInventoryUpdate(record).catch((error) => {
        this.logger.error(
          `Failed to publish inventory update for ${record.mac}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      });
    });

    this.mqttService.onClientConnected((context) => {
      void this.attachSubscriptions(context).catch((error) => {
        this.logger.error(
          `Failed to attach MQTT inventory subscriptions for site ${context.siteId}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      });
    });
  }

  onModuleDestroy(): void {
    this.updatesSubscription?.unsubscribe();
    this.inboundHandlers.forEach((handler, siteId) => {
      const context = this.mqttService.getConnectedContexts().find((ctx) => ctx.siteId === siteId);
      context?.client.removeListener('message', handler);
    });
    this.inboundHandlers.clear();
  }

  private async attachSubscriptions(context: SiteMqttContext): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      context.client.subscribe(INVENTORY_TOPIC_PATTERN, { qos: context.qosEvents }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const existing = this.inboundHandlers.get(context.siteId);
    if (existing) {
      context.client.removeListener('message', existing);
    }

    const handler = (topic: string, payload: Buffer) => {
      if (!topic.endsWith('/inventory/upsert')) {
        return;
      }
      void this.handleInboundInventoryUpdate(topic, payload).catch((error) => {
        this.logger.error(
          `Failed to process inbound inventory update (${topic}): ${
            error instanceof Error ? error.message : error
          }`,
        );
      });
    };

    this.inboundHandlers.set(context.siteId, handler);
    context.client.on('message', handler);
  }

  private async handleLocalInventoryUpdate(record: InventoryDevice): Promise<void> {
    const siteId = record.siteId ?? this.localSiteId;
    if (siteId !== this.localSiteId) {
      return;
    }

    const topic = this.buildInventoryTopic(siteId);
    const message: InventoryUpsertMessage = {
      type: 'inventory.upsert',
      originSiteId: siteId,
      payload: this.mapRecordToPayload(record),
    };

    await this.mqttService.publishToAll(topic, JSON.stringify(message));
  }

  private async handleInboundInventoryUpdate(topic: string, payload: Buffer): Promise<void> {
    const [, topicSiteId] = topic.split('/');

    let parsed: InventoryUpsertMessage;
    try {
      parsed = JSON.parse(payload.toString('utf8')) as InventoryUpsertMessage;
    } catch (error) {
      this.logger.warn(
        `Ignoring invalid inventory payload on ${topic}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return;
    }

    if (parsed.type !== 'inventory.upsert') {
      return;
    }

    const originSiteId = parsed.originSiteId ?? topicSiteId ?? this.localSiteId;
    if (originSiteId === this.localSiteId) {
      return;
    }

    try {
      await this.inventoryService.syncRemoteInventory(parsed.payload);
    } catch (error) {
      this.logger.error(
        `Failed to sync inventory record ${parsed.payload.mac}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private buildInventoryTopic(siteId: string): string {
    return `ahcc/${siteId}/inventory/upsert`;
  }

  private mapRecordToPayload(record: InventoryDevice): InventoryUpsertPayload {
    return {
      mac: record.mac,
      siteId: record.siteId ?? null,
      vendor: record.vendor ?? null,
      type: record.type ?? null,
      ssid: record.ssid ?? null,
      hits: record.hits,
      lastSeen: record.lastSeen ? record.lastSeen.toISOString() : null,
      maxRSSI: record.maxRSSI ?? null,
      minRSSI: record.minRSSI ?? null,
      avgRSSI: record.avgRSSI ?? null,
      locallyAdministered: record.locallyAdministered,
      multicast: record.multicast,
      lastNodeId: record.lastNodeId ?? null,
      lastLat: record.lastLat ?? null,
      lastLon: record.lastLon ?? null,
      createdAt: record.createdAt ? record.createdAt.toISOString() : null,
      updatedAt: record.updatedAt ? record.updatedAt.toISOString() : null,
    };
  }
}
