import { Job } from 'bullmq';
import { NotificationDeliveryStatus, NotificationEventType } from '@endemigo/shared';
import { NotificationProcessor } from './notification.processor';
import { OneSignalProvider } from './providers/onesignal.provider';
import { NotificationService } from './notification.service';

describe('NotificationProcessor', () => {
  let notificationService: Pick<NotificationService, 'findForDelivery' | 'updateDeliveryStatus'>;
  let provider: Pick<OneSignalProvider, 'sendPush'>;
  let processor: NotificationProcessor;

  beforeEach(() => {
    notificationService = {
      findForDelivery: jest.fn(),
      updateDeliveryStatus: jest.fn(),
    };
    provider = {
      sendPush: jest.fn(),
    };
    processor = new NotificationProcessor(
      notificationService as NotificationService,
      provider as OneSignalProvider,
    );
  });

  it('uses the persisted notification id as deterministic retry idempotency key', async () => {
    (notificationService.findForDelivery as jest.Mock).mockResolvedValue({
      id: 'notification-1',
      userId: 'user-1',
      eventType: NotificationEventType.AUCTION_OUTBID,
      title: 'Outbid',
      body: 'A higher bid was placed.',
    });
    (provider.sendPush as jest.Mock).mockResolvedValue({
      status: NotificationDeliveryStatus.SENT,
      providerMessageId: 'onesignal-1',
    });

    await processor.process({
      name: 'send-push',
      data: { notificationId: 'notification-1' },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ notificationId: string }>);

    expect(provider.sendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'notification:notification-1',
      }),
    );
    expect(notificationService.updateDeliveryStatus).toHaveBeenCalledWith(
      'notification-1',
      NotificationDeliveryStatus.SENT,
      'onesignal-1',
    );
  });

  it('marks missing subscription as no push subscription without throwing', async () => {
    (notificationService.findForDelivery as jest.Mock).mockResolvedValue({
      id: 'notification-2',
      userId: 'user-2',
      eventType: NotificationEventType.PAYMENT_REMINDER,
      title: 'Payment reminder',
      body: 'Please complete payment.',
    });
    (provider.sendPush as jest.Mock).mockResolvedValue({
      status: NotificationDeliveryStatus.NO_PUSH_SUBSCRIPTION,
    });

    await processor.process({
      name: 'send-push',
      data: { notificationId: 'notification-2' },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ notificationId: string }>);

    expect(notificationService.updateDeliveryStatus).toHaveBeenCalledWith(
      'notification-2',
      NotificationDeliveryStatus.NO_PUSH_SUBSCRIPTION,
      undefined,
    );
  });

  it('rethrows retryable provider failures before the final attempt', async () => {
    (notificationService.findForDelivery as jest.Mock).mockResolvedValue({
      id: 'notification-3',
      userId: 'user-3',
      eventType: NotificationEventType.ORDER_STATUS_CHANGED,
      title: 'Order updated',
      body: 'Order changed.',
    });
    (provider.sendPush as jest.Mock).mockRejectedValue(new Error('temporary outage'));

    await expect(
      processor.process({
        name: 'send-push',
        data: { notificationId: 'notification-3' },
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as Job<{ notificationId: string }>),
    ).rejects.toThrow('temporary outage');

    expect(notificationService.updateDeliveryStatus).not.toHaveBeenCalledWith(
      'notification-3',
      NotificationDeliveryStatus.FAILED,
      expect.anything(),
    );
  });

  it('marks final provider failure failed while preserving the in-app row', async () => {
    (notificationService.findForDelivery as jest.Mock).mockResolvedValue({
      id: 'notification-4',
      userId: 'user-4',
      eventType: NotificationEventType.ASK_PRICE,
      title: 'Ask price',
      body: 'A buyer asked for a price.',
    });
    (provider.sendPush as jest.Mock).mockRejectedValue(new Error('provider rejected'));

    await processor.process({
      name: 'send-push',
      data: { notificationId: 'notification-4' },
      attemptsMade: 2,
      opts: { attempts: 3 },
    } as Job<{ notificationId: string }>);

    expect(notificationService.updateDeliveryStatus).toHaveBeenCalledWith(
      'notification-4',
      NotificationDeliveryStatus.FAILED,
      undefined,
    );
  });
});
