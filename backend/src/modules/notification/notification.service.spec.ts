import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import {
  NotificationDeliveryStatus,
  NotificationEventType,
  RC,
} from '@endemigo/shared';
import { NotificationPreference } from './entities/notification-preference.entity';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';

type MockRepository<T extends { id?: string }> = Partial<
  Record<keyof Repository<T>, jest.Mock>
> & {
  items: T[];
};

const createMockRepository = <T extends { id?: string }>(): MockRepository<T> => {
  const repo: MockRepository<T> = {
    items: [],
    create: jest.fn((input: Partial<T>) => input as T),
    save: jest.fn(async (input: T) => {
      const saved = { ...input, id: input.id ?? `id-${repo.items.length + 1}` } as T;
      const index = repo.items.findIndex((item) => item.id === saved.id);
      if (index >= 0) {
        repo.items[index] = saved;
      } else {
        repo.items.push(saved);
      }
      return saved;
    }),
    find: jest.fn(async () => repo.items),
    findOne: jest.fn(async ({ where }: { where: Partial<T> }) => {
      return (
        repo.items.find((item) =>
          Object.entries(where).every(([key, value]) => item[key as keyof T] === value),
        ) ?? null
      );
    }),
  };

  return repo;
};

describe('NotificationService', () => {
  let notificationRepository: MockRepository<Notification>;
  let preferenceRepository: MockRepository<NotificationPreference>;
  let queue: Pick<Queue, 'add'>;
  let service: NotificationService;

  beforeEach(() => {
    notificationRepository = createMockRepository<Notification>();
    preferenceRepository = createMockRepository<NotificationPreference>();
    queue = { add: jest.fn() } as Pick<Queue, 'add'>;

    service = new NotificationService(
      notificationRepository as unknown as Repository<Notification>,
      preferenceRepository as unknown as Repository<NotificationPreference>,
      queue as Queue,
    );
  });

  it('persists a durable in-app row before enqueueing push delivery', async () => {
    const result = await service.createFromEvent({
      eventId: 'payment-1',
      userId: 'user-1',
      eventType: NotificationEventType.PAYMENT_CONFIRMED,
      title: 'Payment confirmed',
      body: 'Payment was received.',
      relatedEntityType: 'payment',
      relatedEntityId: 'payment-1',
    });

    expect(result.code).toBe(RC.NOTIFICATION_CREATED);
    expect(result.notification.deliveryStatus).toBe(NotificationDeliveryStatus.PENDING);
    const saveOrder = notificationRepository.save.mock.invocationCallOrder[0];
    const enqueueOrder = (queue.add as jest.Mock).mock.invocationCallOrder[0];
    expect(saveOrder).toBeLessThan(enqueueOrder);
    expect(queue.add).toHaveBeenCalledWith(
      'send-push',
      { notificationId: result.notification.id },
      expect.objectContaining({
        attempts: 3,
        jobId: `push-${result.notification.id}`,
      }),
    );
  });

  it('returns the existing row for a duplicate logical event id', async () => {
    await service.createFromEvent({
      eventId: 'order-1-status',
      userId: 'user-1',
      eventType: NotificationEventType.ORDER_STATUS_CHANGED,
      title: 'Order updated',
      body: 'Order changed.',
    });

    const duplicate = await service.createFromEvent({
      eventId: 'order-1-status',
      userId: 'user-1',
      eventType: NotificationEventType.ORDER_STATUS_CHANGED,
      title: 'Order updated again',
      body: 'Order changed again.',
    });

    expect(duplicate.code).toBe(RC.NOTIFICATION_DUPLICATE);
    expect(notificationRepository.items).toHaveLength(1);
  });

  it('creates default preferences and updates supported event channels', async () => {
    const defaults = await service.getPreferences('user-1');

    expect(defaults.code).toBe(RC.NOTIFICATION_PREFERENCES_FETCHED);
    expect(defaults.preferences.channels[NotificationEventType.AUCTION_OUTBID]).toEqual({
      inApp: true,
      push: true,
    });

    const updated = await service.updatePreferences('user-1', {
      channels: {
        [NotificationEventType.AUCTION_OUTBID]: {
          inApp: true,
          push: false,
        },
      },
    });

    expect(updated.code).toBe(RC.NOTIFICATION_PREFERENCES_UPDATED);
    expect(updated.preferences.channels[NotificationEventType.AUCTION_OUTBID].push).toBe(false);
  });

  it('lists and marks only the authenticated user notifications as read', async () => {
    const owned = await service.createFromEvent({
      eventId: 'cargo-1',
      userId: 'user-1',
      eventType: NotificationEventType.CARGO_STATUS_CHANGED,
      title: 'Cargo updated',
      body: 'Cargo changed.',
    });
    await service.createFromEvent({
      eventId: 'cargo-2',
      userId: 'user-2',
      eventType: NotificationEventType.CARGO_STATUS_CHANGED,
      title: 'Cargo updated',
      body: 'Cargo changed.',
    });

    const list = await service.listForUser('user-1');
    const read = await service.markRead('user-1', owned.notification.id);

    expect(list.notifications).toHaveLength(1);
    expect(read.notification.readAt).toBeInstanceOf(Date);
  });
});
