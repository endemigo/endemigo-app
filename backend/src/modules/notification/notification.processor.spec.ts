type ModuleExports = Record<string, unknown>;

const loadNotificationProcessorModule = (): ModuleExports | null => {
  try {
    return require('./notification.processor') as ModuleExports;
  } catch {
    return null;
  }
};

describe('NotificationProcessor Phase 6 contract', () => {
  it('defines the notification processor implementation', () => {
    const moduleExports = loadNotificationProcessorModule();
    const implementationExists = Boolean(moduleExports?.NotificationProcessor);

    expect(implementationExists).toBe(true);
  });

  it('builds an idempotency key for OneSignal retries', () => {
    const moduleExports = loadNotificationProcessorModule();
    const NotificationProcessor = moduleExports?.NotificationProcessor as
      | (new (...args: never[]) => {
          buildIdempotencyKey?: (notificationId: string) => string;
        })
      | undefined;

    expect(NotificationProcessor).toBeDefined();

    if (!NotificationProcessor) {
      return;
    }

    const processor = new NotificationProcessor();

    expect(processor.buildIdempotencyKey?.('notification-1')).toBe('notification:notification-1');
  });
});
