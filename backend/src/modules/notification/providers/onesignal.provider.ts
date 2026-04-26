import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createConfiguration,
  DefaultApi,
  Notification as OneSignalNotification,
} from '@onesignal/node-onesignal';
import { NotificationDeliveryStatus } from '@endemigo/shared';

export interface PushPayload {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  idempotencyKey: string;
}

export interface PushResult {
  status: NotificationDeliveryStatus;
  providerMessageId?: string;
}

@Injectable()
export class OneSignalProvider {
  private readonly appId?: string;
  private readonly client?: DefaultApi;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('ONESIGNAL_APP_ID');
    const restApiKey = this.configService.get<string>('ONESIGNAL_REST_API_KEY');

    if (this.appId && restApiKey) {
      const configuration = createConfiguration({ restApiKey });
      this.client = new DefaultApi(configuration);
    }
  }

  async sendPush(payload: PushPayload): Promise<PushResult> {
    if (!this.appId || !this.client) {
      return { status: NotificationDeliveryStatus.NO_PUSH_SUBSCRIPTION };
    }

    const notification = new OneSignalNotification();
    notification.app_id = this.appId;
    notification.include_aliases = { external_id: [payload.userId] };
    notification.target_channel = 'push';
    notification.headings = { en: payload.title, tr: payload.title };
    notification.contents = { en: payload.body, tr: payload.body };
    notification.idempotency_key = payload.idempotencyKey;

    const response = await this.client.createNotification(notification);

    return {
      status: NotificationDeliveryStatus.SENT,
      providerMessageId: response.id,
    };
  }
}
