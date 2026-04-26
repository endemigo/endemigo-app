type ModuleExports = Record<string, unknown>;

const loadOrderModule = (): ModuleExports | null => {
  try {
    return require('./order.service') as ModuleExports;
  } catch {
    return null;
  }
};

describe('OrderService Phase 6 contract', () => {
  it('defines the order service implementation', () => {
    const moduleExports = loadOrderModule();
    const implementationExists = Boolean(moduleExports?.OrderService);

    expect(implementationExists).toBe(true);
  });

  it('rejects invalid lifecycle transitions with ORDER_INVALID_TRANSITION', async () => {
    const moduleExports = loadOrderModule();
    const OrderService = moduleExports?.OrderService as
      | (new (...args: never[]) => {
          transitionOrder?: (orderId: string, status: string) => Promise<{ code: string }>;
        })
      | undefined;

    expect(OrderService).toBeDefined();

    if (!OrderService) {
      return;
    }

    const service = new OrderService();
    const result = await service.transitionOrder?.('order-1', 'COMPLETED');

    expect(result?.code).toBe('ORDER_INVALID_TRANSITION');
  });

  it('delivery confirmation schedules the seller payout path', async () => {
    const moduleExports = loadOrderModule();
    const OrderService = moduleExports?.OrderService as
      | (new (...args: never[]) => {
          confirmDelivery?: (orderId: string, userId: string) => Promise<{ payoutScheduled: boolean }>;
        })
      | undefined;

    expect(OrderService).toBeDefined();

    if (!OrderService) {
      return;
    }

    const service = new OrderService();
    const result = await service.confirmDelivery?.('order-1', 'buyer-1');

    expect(result?.payoutScheduled).toBe(true);
  });
});
