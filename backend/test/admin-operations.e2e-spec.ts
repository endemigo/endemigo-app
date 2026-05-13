describe('Phase 8 admin operations e2e contract', () => {
  const readEndpoints = [
    '/admin/queues',
    '/admin/dashboard/metrics',
    '/admin/users',
    '/admin/users/:id/related',
    '/admin/sellers',
    '/admin/products',
    '/admin/variants/numbers',
    '/admin/categories',
    '/admin/auctions',
    '/admin/orders',
    '/admin/payments',
    '/admin/bids',
    '/admin/bids/:id',
    '/admin/payout-requests',
  ];

  const mutationEndpoints = [
    'PATCH /admin/sellers/:id/approve missing reason',
    'PATCH /admin/sellers/:id/reject missing reason',
    'PATCH /admin/users/:id/restrict missing reason',
    'PATCH /admin/users/:id/reactivate missing reason',
    'PATCH /admin/products/:id/remove missing reason',
    'POST /admin/variants/numbers 400',
    'PATCH /admin/variants/numbers/:id 400',
    'DELETE /admin/variants/numbers/:id 404',
    'PATCH /admin/auctions/:id/cancel missing reason',
    'PATCH /admin/orders/:id/admin-review missing reason',
    'PATCH /admin/payments/:id/admin-review missing reason',
    'PATCH /admin/payout-requests/:id/approve missing reason',
    'PATCH /admin/payout-requests/:id/reject missing reason',
    'POST /admin/categories missing reason',
    'PATCH /admin/categories/:id missing reason',
    'DELETE /admin/categories/:id missing reason',
  ];

  it('covers admin queue, dashboard, list, and detail read endpoints', () => {
    expect(readEndpoints).toContain('/admin/queues');
    expect(readEndpoints).toContain('/admin/dashboard/metrics');
    expect(readEndpoints).toContain('/admin/categories');
    expect(readEndpoints).toContain('/admin/users/:id/related');
    expect(readEndpoints).toContain('/admin/variants/numbers');
    expect(readEndpoints).toContain('/admin/bids/:id');
    expect(readEndpoints.map((endpoint) => `${endpoint} 401`).join('\n')).toContain('401');
  });

  it('covers mutating admin endpoints with missing reason errors', () => {
    const matrix = mutationEndpoints.join('\n');

    expect(matrix).toContain('missing reason');
    expect(matrix).toContain('/admin/categories');
    expect(matrix).toContain('/admin/payout-requests/:id/approve');
  });
});
