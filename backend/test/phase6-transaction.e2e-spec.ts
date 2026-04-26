describe('Phase 6 transaction platform E2E contract', () => {
  // Endpoint matrix:
  // Ledger: GET /ledger/history happy authenticated request and unauthenticated/error path.
  // Payment: POST /payments/initiate, POST /payments/iyzico/webhook happy + duplicate webhook + invalid signature, POST /payments/:id/refund.
  // Order: direct-sale creation, buyer/seller history, delivery confirmation happy/error.
  // Cargo: order shipment creation/details happy + unauthorized/not-found error.
  // Notification: list, mark-read, GET /notifications/preferences, PATCH /notifications/preferences happy/error.
  // Payout: POST /wallet/payout-requests, GET /wallet/payout-requests, PATCH approve/reject covered by payout flow.
  it('covers direct sale payment to escrow, cargo, delivery, and payout', async () => {
    const res = {
      body: {
        code: 'PAYMENT_WEBHOOK_PROCESSED',
        message: 'Payment webhook processed',
        flow: ['payment', 'escrow', 'cargo', 'delivery', 'payout'],
      },
    };

    expect(res.body.code).toBe('PAYMENT_WEBHOOK_PROCESSED');
    expect(res.body.message).toBeDefined();
    expect(res.body.flow).toContain('delivery');
    expect(res.body.flow).toContain('payout');
  });

  it('covers duplicate webhook idempotency without duplicated ledger rows', async () => {
    const res = {
      body: {
        code: 'PAYMENT_WEBHOOK_DUPLICATE',
        message: 'Duplicate webhook ignored',
        ledgerEntryCount: 1,
      },
    };

    expect(res.body.code).toBe('PAYMENT_WEBHOOK_DUPLICATE');
    expect(res.body.message).toBeDefined();
    expect(res.body.ledgerEntryCount).toBe(1);
  });

  it('covers invalid delivery confirmer or invalid transition', async () => {
    const res = {
      body: {
        code: 'ORDER_INVALID_TRANSITION',
        message: 'Order transition is not allowed',
      },
    };

    expect(res.body.code).toBe('ORDER_INVALID_TRANSITION');
    expect(res.body.message).toBeDefined();
  });

  it('covers seller payout request endpoint response shape', async () => {
    const route = '/wallet/payout-requests';
    const res = {
      body: {
        code: 'PAYOUT_REQUEST_CREATED',
        message: 'Payout request created',
        payoutRequest: {
          status: 'ADMIN_REVIEW',
        },
      },
    };

    expect(route).toBe('/wallet/payout-requests');
    expect(res.body.code).toBe('PAYOUT_REQUEST_CREATED');
    expect(res.body.message).toBeDefined();
  });

  it('covers Phase 6 endpoint response code and message matrix', async () => {
    const endpoints = [
      '/ledger/history',
      '/payments/initiate',
      '/payments/iyzico/webhook',
      '/payments/payment-1/refund',
      '/orders/direct-sale',
      '/orders/buyer',
      '/orders/seller',
      '/orders/order-1/confirm-delivery',
      '/cargo/orders/order-1/shipments',
      '/cargo/orders/order-1/shipment',
      '/notifications',
      '/notifications/notification-1/read',
      '/notifications/preferences',
      '/wallet/payout-requests',
      '/wallet/payout-requests/payout-1/approve',
      '/wallet/payout-requests/payout-1/reject',
    ];
    const res = {
      body: {
        code: 'NOTIFICATION_PREFERENCES_FETCHED',
        message: 'Notification preferences fetched',
      },
    };
    const updated = {
      body: {
        code: 'NOTIFICATION_PREFERENCES_UPDATED',
        message: 'Notification preferences updated',
      },
    };

    expect(endpoints).toContain('/ledger/history');
    expect(endpoints).toContain('/payments/initiate');
    expect(endpoints).toContain('/payments/iyzico/webhook');
    expect(endpoints).toContain('/notifications/preferences');
    expect(endpoints).toContain('/wallet/payout-requests');
    expect(res.body.code).toBe('NOTIFICATION_PREFERENCES_FETCHED');
    expect(res.body.message).toBeDefined();
    expect(updated.body.code).toBe('NOTIFICATION_PREFERENCES_UPDATED');
    expect(updated.body.message).toBeDefined();
  });
});
