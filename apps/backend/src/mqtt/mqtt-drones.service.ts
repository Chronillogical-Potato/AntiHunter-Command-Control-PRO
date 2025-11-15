import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DroneStatus } from '@prisma/client';
import { Subscription } from 'rxjs';

import { MqttService, SiteMqttContext } from './mqtt.service';
import { DronesService } from '../drones/drones.service';
import { DroneSnapshot } from '../drones/drones.types';
import { FaaAircraftSummary } from '../faa/faa.types';
import { PrismaService } from '../prisma/prisma.service';

type DroneUpsertMessage = {
  type: 'drone.upsert';
  originSiteId: string;
  payload: {
    id: string;
    droneId?: string | null;
    mac?: string | null;
    nodeId?: string | null;
    siteId?: string | null;
    siteName?: string | null;
    siteColor?: string | null;
    siteCountry?: string | null;
    siteCity?: string | null;
    lat: number;
    lon: number;
    altitude?: number | null;
    speed?: number | null;
    operatorLat?: number | null;
    operatorLon?: number | null;
    rssi?: number | null;
    status: DroneStatus;
    lastSeen: string;
    ts?: string | null;
    faa?: FaaAircraftSummary | null;
  };
};

const DRONE_TOPIC_PREFIX = 'ahcc';

@Injectable()
export class MqttDronesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttDronesService.name);
  private readonly localSiteId: string;
  private droneSubscription?: Subscription;
  private readonly inboundHandlers = new Map<string, (topic: string, payload: Buffer) => void>();
  private readonly subscriptionRetryTimers = new Map<string, NodeJS.Timeout>();
  private readonly subscriptionAttempts = new Map<string, number>();
  private readonly subscriptionBaseDelayMs = 2_000;
  private readonly subscriptionMaxDelayMs = 60_000;

  constructor(
    private readonly configService: ConfigService,
    private readonly mqttService: MqttService,
    private readonly dronesService: DronesService,
    private readonly prisma: PrismaService,
  ) {
    this.localSiteId = this.configService.get<string>('site.id', 'default');
  }

  onModuleInit(): void {
    this.droneSubscription = this.dronesService.getDiffStream().subscribe({
      next: (diff) => {
        if (diff.type === 'upsert') {
          void this.handleLocalDroneUpsert(diff.drone);
        }
      },
      error: (error) => {
        this.logger.error(
          `Drone diff stream error: ${error instanceof Error ? error.message : error}`,
        );
      },
    });

    this.mqttService.onClientConnected((context) => {
      void this.attachSubscriptions(context);
    });
  }

  onModuleDestroy(): void {
    this.droneSubscription?.unsubscribe();
    this.inboundHandlers.forEach((handler, siteId) => {
      const context = this.mqttService.getConnectedContexts().find((ctx) => ctx.siteId === siteId);
      if (context) {
        context.client.removeListener('message', handler);
      }
    });
    this.inboundHandlers.clear();
    this.subscriptionRetryTimers.forEach((timer) => clearTimeout(timer));
    this.subscriptionRetryTimers.clear();
    this.subscriptionAttempts.clear();
  }

  private async handleLocalDroneUpsert(snapshot: DroneSnapshot): Promise<void> {
    const originSiteId = snapshot.originSiteId ?? snapshot.siteId ?? this.localSiteId;
    if (originSiteId !== this.localSiteId) {
      return;
    }

    const message: DroneUpsertMessage = {
      type: 'drone.upsert',
      originSiteId: this.localSiteId,
      payload: {
        id: snapshot.id,
        droneId: snapshot.droneId ?? null,
        mac: snapshot.mac ?? null,
        nodeId: snapshot.nodeId ?? null,
        siteId: snapshot.siteId ?? this.localSiteId,
        siteName: snapshot.siteName ?? null,
        siteColor: snapshot.siteColor ?? null,
        siteCountry: snapshot.siteCountry ?? null,
        siteCity: snapshot.siteCity ?? null,
        lat: snapshot.lat,
        lon: snapshot.lon,
        altitude: snapshot.altitude ?? null,
        speed: snapshot.speed ?? null,
        operatorLat: snapshot.operatorLat ?? null,
        operatorLon: snapshot.operatorLon ?? null,
        rssi: snapshot.rssi ?? null,
        status: snapshot.status,
        lastSeen: snapshot.lastSeen.toISOString(),
        ts: snapshot.ts?.toISOString() ?? null,
        faa: snapshot.faa ?? null,
      },
    };

    const topic = this.buildDroneUpsertTopic(this.localSiteId);
    try {
      await this.mqttService.publishToAll(topic, JSON.stringify(message), { qos: 1 });
    } catch (error) {
      this.logger.warn(
        `Failed to publish drone update for ${snapshot.id}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async attachSubscriptions(context: SiteMqttContext): Promise<void> {
    if (context.siteId === this.localSiteId) {
      this.logger.debug(
        `Skipping MQTT drone subscription for local site ${context.siteId} (publish-only)`,
      );
      return;
    }

    if (!context.client.connected) {
      this.logger.warn(
        `Cannot attach MQTT drone subscriptions because client for site ${context.siteId} is disconnected`,
      );
      return;
    }

    try {
      await this.subscribeToDroneTopic(context);
      this.resetSubscriptionRetry(context.siteId);
      this.registerInboundHandler(context);
      this.logger.log(`Attached drone MQTT subscriptions for site ${context.siteId}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to attach MQTT drone subscriptions for site ${context.siteId}: ${reason}`,
      );
      this.scheduleSubscriptionRetry(context.siteId, reason);
      throw error;
    }
  }

  private async handleInboundMessage(topic: string, payload: Buffer): Promise<void> {
    if (!topic.startsWith('ahcc/')) {
      return;
    }
    const [prefix, topicSiteId, resource, action] = topic.split('/');
    if (prefix !== DRONE_TOPIC_PREFIX) {
      return;
    }
    if (resource !== 'drones' || action !== 'upsert') {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload.toString('utf8'));
    } catch (error) {
      this.logger.warn(
        `Ignoring invalid drone MQTT payload on ${topic}: ${error instanceof Error ? error.message : error}`,
      );
      return;
    }

    const message = parsed as Partial<DroneUpsertMessage>;
    if (!message || message.type !== 'drone.upsert' || !message.payload) {
      return;
    }

    const originSiteId = message.originSiteId ?? topicSiteId;
    if (!originSiteId || originSiteId === this.localSiteId) {
      return;
    }

    const payloadData = message.payload;
    await this.ensureSiteRecord(
      payloadData.siteId ?? originSiteId,
      payloadData.siteName,
      payloadData.siteColor,
      payloadData.siteCountry,
      payloadData.siteCity,
    );

    await this.dronesService.upsert({
      id: payloadData.id,
      droneId: payloadData.droneId ?? null,
      mac: payloadData.mac ?? null,
      nodeId: payloadData.nodeId ?? null,
      siteId: payloadData.siteId ?? originSiteId,
      originSiteId,
      siteName: payloadData.siteName ?? null,
      siteColor: payloadData.siteColor ?? null,
      siteCountry: payloadData.siteCountry ?? null,
      siteCity: payloadData.siteCity ?? null,
      lat: payloadData.lat,
      lon: payloadData.lon,
      altitude: payloadData.altitude ?? null,
      speed: payloadData.speed ?? null,
      operatorLat: payloadData.operatorLat ?? null,
      operatorLon: payloadData.operatorLon ?? null,
      rssi: payloadData.rssi ?? null,
      status: payloadData.status,
      lastSeen: payloadData.lastSeen ? new Date(payloadData.lastSeen) : new Date(),
      ts: payloadData.ts ? new Date(payloadData.ts) : undefined,
      faa: payloadData.faa ?? null,
    });
  }

  private async ensureSiteRecord(
    siteId: string,
    name?: string | null,
    color?: string | null,
    country?: string | null,
    city?: string | null,
  ): Promise<void> {
    if (!siteId) {
      return;
    }
    try {
      await this.prisma.site.upsert({
        where: { id: siteId },
        update: {
          name: name ?? undefined,
          color: color ?? undefined,
          country: country ?? undefined,
          city: city ?? undefined,
        },
        create: {
          id: siteId,
          name: name ?? siteId,
          color: color ?? '#0ea5e9',
          country: country ?? undefined,
          city: city ?? undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to ensure site record for ${siteId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private buildDroneUpsertTopic(siteId: string): string {
    return `${DRONE_TOPIC_PREFIX}/${siteId}/drones/upsert`;
  }

  private buildSubscriptionTopic(siteId: string): string {
    return this.buildDroneUpsertTopic(siteId);
  }

  private async subscribeToDroneTopic(context: SiteMqttContext): Promise<void> {
    const topic = this.buildSubscriptionTopic(context.siteId);
    await new Promise<void>((resolve, reject) => {
      context.client.subscribe(topic, { qos: 1 }, (err, granted) => {
        if (err) {
          reject(err);
          return;
        }
        const failures = granted?.filter((entry) => entry.qos === 128) ?? [];
        if (failures.length > 0) {
          reject(
            new Error(
              `Broker rejected subscription(s) for ${failures
                .map((entry) => entry.topic)
                .join(', ')}`,
            ),
          );
          return;
        }
        this.logger.debug(
          `Subscribed to ${topic} for site ${context.siteId} with QoS ${granted?.[0]?.qos ?? 'n/a'}`,
        );
        resolve();
      });
    });
  }

  private registerInboundHandler(context: SiteMqttContext): void {
    const existing = this.inboundHandlers.get(context.siteId);
    if (existing) {
      context.client.removeListener('message', existing);
    }

    const handler = (topic: string, payload: Buffer) => {
      void this.handleInboundMessage(topic, payload).catch((error) => {
        this.logger.error(
          `Failed to handle inbound drone MQTT message on ${topic}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      });
    };

    this.inboundHandlers.set(context.siteId, handler);
    context.client.on('message', handler);
  }

  private scheduleSubscriptionRetry(siteId: string, reason: string): void {
    if (this.subscriptionRetryTimers.has(siteId)) {
      return;
    }
    const attempts = (this.subscriptionAttempts.get(siteId) ?? 0) + 1;
    this.subscriptionAttempts.set(siteId, attempts);
    const delay = Math.min(
      this.subscriptionBaseDelayMs * 2 ** (attempts - 1),
      this.subscriptionMaxDelayMs,
    );
    this.logger.warn(
      `Retrying MQTT drone subscription for site ${siteId} in ${delay}ms (attempt ${attempts}) due to: ${reason}`,
    );
    const timer = setTimeout(() => {
      this.subscriptionRetryTimers.delete(siteId);
      const context = this.getConnectedContext(siteId);
      if (!context) {
        this.logger.warn(
          `No active MQTT connection found for site ${siteId}; will wait for the next connection event to retry`,
        );
        return;
      }
      void this.attachSubscriptions(context).catch(() => {
        // errors handled inside attachSubscriptions
      });
    }, delay);
    this.subscriptionRetryTimers.set(siteId, timer);
  }

  private resetSubscriptionRetry(siteId: string): void {
    const timer = this.subscriptionRetryTimers.get(siteId);
    if (timer) {
      clearTimeout(timer);
      this.subscriptionRetryTimers.delete(siteId);
    }
    this.subscriptionAttempts.delete(siteId);
  }

  private getConnectedContext(siteId: string): SiteMqttContext | undefined {
    return this.mqttService
      .getConnectedContexts()
      .find((ctx) => ctx.siteId === siteId && ctx.client.connected);
  }
}
