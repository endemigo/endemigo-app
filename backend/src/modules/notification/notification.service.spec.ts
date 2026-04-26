type ModuleExports = Record<string, unknown>;

const loadNotificationModule = (): ModuleExports | null => {
  try {
    return require('./notification.service') as ModuleExports;
  } catch {
    return null;
  }
};

describe('NotificationService Phase 6 contract', () => {
  it('defines the notification service implementation', () => {
    const moduleExports = loadNotificationModule();
    const implementationExists = Boolean(moduleExports?.NotificationService);

    expect(implementationExists).toBe(true);
  });

  it('creates durable in-app notification records from events', async () => {
    const moduleExports = loadNotificationModule();
    const NotificationService = moduleExports?.NotificationService as
      | (new (...args: never[]) => {
          createFromEvent?: (event: unknown) => Promise<{ code: string; deliveryStatus: string }>;
        })
      | undefined;

    expect(NotificationService).toBeDefined();

    if (!NotificationService) {
      return;
    }

    const service = new NotificationService();
    const result = await service.createFromEvent?.({ eventId: 'payment-1', eventType: 'PAYMENT_CONFIRMED' });

    expect(result?.code).toBe('NOTIFICATION_CREATED');
    expect(result?.deliveryStatus).toBeDefined();
  });

  it('does not duplicate notifications for the same deterministic event id', async () => {
    const moduleExports = loadNotificationModule();
    const NotificationService = moduleExports?.NotificationService as
      | (new (...args: never[]) => {
          createFromEvent?: (event: unknown) => Promise<{ code: string }>;
        })
      | undefined;

    expect(NotificationService).toBeDefined();

    if (!NotificationService) {
      return;
    }

    const service = new NotificationService();
    await service.createFromEvent?.({ eventId: 'payment-1', eventType: 'PAYMENT_CONFIRMED' });
    const duplicate = await service.createFromEvent?.({ eventId: 'payment-1', eventType: 'PAYMENT_CONFIRMED' });

    expect(duplicate?.code).toBe('NOTIFICATION_DUPLICATE');
  });
});
