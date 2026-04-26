import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationDeliveryStatus } from '@endemigo/shared';
import { NotificationService } from './notification.service';
import { OneSignalProvider } from './providers/onesignal.provider';

@Processor('notification')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly oneSignalProvider: OneSignalProvider,
  ) {
    super();
  }

  async process(job: Job<{ notificationId: string }>) {
    if (job.name !== 'send-push') {
      this.logger.warn(`Unknown notification job: ${job.name}`);
      return;
    }

    const notification = await this.notificationService.findForDelivery(
      job.data.notificationId,
    );

    if (!notification) {
      this.logger.warn(`Notification not found: ${job.data.notificationId}`);
      return;
    }

    try {
      const result = await this.oneSignalProvider.sendPush({
        notificationId: notification.id,
        userId: notification.userId,
        title: notification.title,
        body: notification.body,
        idempotencyKey: this.buildIdempotencyKey(notification.id),
      });

      await this.notificationService.updateDeliveryStatus(
        notification.id,
        result.status,
        result.providerMessageId,
      );
    } catch (error) {
      const attempts = job.opts.attempts ?? 1;
      const isFinalAttempt = job.attemptsMade + 1 >= attempts;

      if (!isFinalAttempt) {
        throw error;
      }

      await this.notificationService.updateDeliveryStatus(
        notification.id,
        NotificationDeliveryStatus.FAILED,
        undefined,
      );
    }
  }

  buildIdempotencyKey(notificationId: string) {
    return `notification:${notificationId}`;
  }
}
