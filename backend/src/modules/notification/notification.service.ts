import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import {
  NotificationDeliveryStatus,
  NotificationEventType,
  RC,
} from '@endemigo/shared';
import { Repository } from 'typeorm';
import {
  NotificationPreference,
  NotificationPreferenceChannels,
} from './entities/notification-preference.entity';
import { Notification } from './entities/notification.entity';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

export interface NotificationEventInput {
  eventId: string;
  userId: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

const DEFAULT_CHANNEL = { inApp: true, push: true };

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
    @InjectQueue('notification')
    private readonly notificationQueue: Queue,
  ) {}

  async createFromEvent(event: NotificationEventInput) {
    const existing = await this.notificationRepository.findOne({
      where: { userId: event.userId, eventId: event.eventId },
    });

    if (existing) {
      return {
        code: RC.NOTIFICATION_DUPLICATE,
        message: 'Notification already exists',
        notification: existing,
      };
    }

    const notification = this.notificationRepository.create({
      userId: event.userId,
      eventId: event.eventId,
      eventType: event.eventType,
      title: event.title,
      body: event.body,
      relatedEntityType: event.relatedEntityType ?? null,
      relatedEntityId: event.relatedEntityId ?? null,
      deliveryStatus: NotificationDeliveryStatus.PENDING,
      providerMessageId: null,
      readAt: null,
    });

    const saved = await this.notificationRepository.save(notification);

    await this.notificationQueue.add(
      'send-push',
      { notificationId: saved.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        jobId: `push-${saved.id}`,
      },
    );

    return {
      code: RC.NOTIFICATION_CREATED,
      message: 'Notification created',
      notification: saved,
    };
  }

  async createAskPriceOrderHookNotification(input: {
    eventId: string;
    buyerId: string;
    sellerId: string;
    productId: string;
    acceptedOfferId: string;
  }) {
    return this.createFromEvent({
      eventId: input.eventId,
      userId: input.sellerId,
      eventType: NotificationEventType.ASK_PRICE,
      title: 'Ask Price order hook',
      body: 'An accepted Ask Price offer is ready for order processing.',
      relatedEntityType: 'acceptedOffer',
      relatedEntityId: input.acceptedOfferId,
    });
  }

  async listForUser(userId: string) {
    const notifications = await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return {
      code: RC.NOTIFICATION_CREATED,
      message: 'Notifications fetched',
      notifications: notifications.filter((notification) => notification.userId === userId),
    };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Notification not found',
      });
    }

    notification.readAt = new Date();
    const saved = await this.notificationRepository.save(notification);

    return {
      code: RC.NOTIFICATION_CREATED,
      message: 'Notification marked read',
      notification: saved,
    };
  }

  async getPreferences(userId: string) {
    const preferences = await this.getOrCreatePreferences(userId);

    return {
      code: RC.NOTIFICATION_PREFERENCES_FETCHED,
      message: 'Notification preferences fetched',
      preferences,
    };
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    const preferences = await this.getOrCreatePreferences(userId);
    const nextChannels = {
      ...preferences.channels,
      ...(dto.channels ?? {}),
    } as NotificationPreferenceChannels;

    if (dto.disabledEventTypes) {
      for (const eventType of dto.disabledEventTypes) {
        nextChannels[eventType] = { inApp: false, push: false };
      }
    }

    preferences.channels = nextChannels;
    const saved = await this.preferenceRepository.save(preferences);

    return {
      code: RC.NOTIFICATION_PREFERENCES_UPDATED,
      message: 'Notification preferences updated',
      preferences: saved,
    };
  }

  async findForDelivery(notificationId: string) {
    return this.notificationRepository.findOne({ where: { id: notificationId } });
  }

  async updateDeliveryStatus(
    notificationId: string,
    status: NotificationDeliveryStatus,
    providerMessageId?: string,
  ) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Notification not found',
      });
    }

    notification.deliveryStatus = status;
    notification.providerMessageId = providerMessageId ?? null;
    return this.notificationRepository.save(notification);
  }

  private async getOrCreatePreferences(userId: string) {
    const existing = await this.preferenceRepository.findOne({ where: { userId } });

    if (existing) {
      existing.channels = this.withDefaultChannels(existing.channels);
      return existing;
    }

    const preferences = this.preferenceRepository.create({
      userId,
      channels: this.withDefaultChannels({}),
    });

    return this.preferenceRepository.save(preferences);
  }

  private withDefaultChannels(
    channels: NotificationPreferenceChannels,
  ): NotificationPreferenceChannels {
    return Object.values(NotificationEventType).reduce<NotificationPreferenceChannels>(
      (acc, eventType) => {
        acc[eventType] = channels[eventType] ?? DEFAULT_CHANNEL;
        return acc;
      },
      {},
    );
  }
}
