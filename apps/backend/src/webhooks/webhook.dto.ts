import type { WebhookEventType } from '@prisma/client';

export interface WebhookOwnerDto {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface WebhookDeliveryDto {
  id: string;
  statusCode?: number | null;
  success: boolean;
  errorMessage?: string | null;
  triggeredAt: Date;
  completedAt?: Date | null;
}

export interface WebhookDto {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  verifyTls: boolean;
  subscribedEvents: WebhookEventType[];
  shared: boolean;
  clientCertificate?: string | null;
  clientKey?: string | null;
  caBundle?: string | null;
  lastSuccessAt?: Date | null;
  lastFailureAt?: Date | null;
  owner?: WebhookOwnerDto | null;
  linkedRuleIds: string[];
  recentDeliveries: WebhookDeliveryDto[];
}
