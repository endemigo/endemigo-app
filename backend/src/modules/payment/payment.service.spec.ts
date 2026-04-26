type ModuleExports = Record<string, unknown>;

const loadPaymentModule = (): ModuleExports | null => {
  try {
    return require('./payment.service') as ModuleExports;
  } catch {
    return null;
  }
};

describe('PaymentService Phase 6 contract', () => {
  it('defines the payment service implementation', () => {
    const moduleExports = loadPaymentModule();
    const implementationExists = Boolean(moduleExports?.PaymentService);

    expect(implementationExists).toBe(true);
  });

  it('returns PAYMENT_WEBHOOK_DUPLICATE for duplicate webhook replay', async () => {
    const moduleExports = loadPaymentModule();
    const PaymentService = moduleExports?.PaymentService as
      | (new (...args: never[]) => {
          handleIyzicoWebhook?: (payload: unknown) => Promise<{ code: string }>;
        })
      | undefined;

    expect(PaymentService).toBeDefined();

    if (!PaymentService) {
      return;
    }

    const service = new PaymentService();
    const firstResult = await service.handleIyzicoWebhook?.({ eventKey: 'iyzico-event-1' });
    const secondResult = await service.handleIyzicoWebhook?.({ eventKey: 'iyzico-event-1' });

    expect(firstResult?.code).toBe('PAYMENT_WEBHOOK_PROCESSED');
    expect(secondResult?.code).toBe('PAYMENT_WEBHOOK_DUPLICATE');
  });

  it('creates refund reversal behavior instead of status-only refund', async () => {
    const moduleExports = loadPaymentModule();
    const PaymentService = moduleExports?.PaymentService as
      | (new (...args: never[]) => {
          requestRefund?: (paymentId: string) => Promise<{ code: string; ledgerEntryId?: string }>;
        })
      | undefined;

    expect(PaymentService).toBeDefined();

    if (!PaymentService) {
      return;
    }

    const service = new PaymentService();
    const result = await service.requestRefund?.('payment-1');

    expect(result?.code).toBe('PAYMENT_REFUND_REQUESTED');
    expect(result?.ledgerEntryId).toBeDefined();
  });
});
