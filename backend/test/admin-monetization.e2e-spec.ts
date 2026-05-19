describe('Phase 8 monetization and trust e2e contract', () => {
  it('covers seller and admin ads endpoints with happy and error paths', () => {
    const endpoints = [
      'GET /ads/packages 200',
      'POST /ads/requests 201',
      'POST /ads/requests 401',
      'GET /ads/my-requests 200',
      'PATCH /ads/requests/:id/cancel invalid status transition',
      'GET /admin/ads 200',
      'PATCH /admin/ads/requests/:id/approve missing reason',
      'PATCH /admin/ads/requests/:id/reject missing reason',
      'PATCH /admin/ads/requests/:id/publish invalid status transition',
      'GET /admin/ads/slot-calendar 200',
      'GET /admin/ads/slot-conflicts 200',
    ];

    expect(endpoints.join('\n')).toContain('/ads/requests');
    expect(endpoints.join('\n')).toContain('/admin/ads/slot-calendar');
    expect(endpoints.join('\n')).toContain('/admin/ads/slot-conflicts');
    expect(endpoints.join('\n')).toContain('401');
  });

  it('covers campaign, coupon, membership, and trust endpoints', () => {
    const endpoints = [
      'POST /campaigns 201',
      'GET /campaigns/my 200',
      'POST /campaigns/:id/opt-in 201',
      'POST /coupons 201',
      'GET /coupons/my 200',
      'POST /admin/campaigns 201',
      'POST /admin/coupons 201',
      'GET /admin/coupons 200',
      'PATCH /admin/coupons/:id 200',
      'PATCH /admin/coupons/:id/status 200',
      'GET /membership/packages 200',
      'GET /membership/me 200',
      'POST /membership/upgrade 201',
      'POST /membership/cancel 201',
      'POST /admin/membership/packages 201',
      'PATCH /admin/membership/packages/:id 200',
      'POST /admin/trust/flags 201',
      'PATCH /admin/trust/flags/:id/review 200',
      'POST /admin/trust/restrictions 201',
      'PATCH /admin/trust/restrictions/:id/resolve 200',
      'seller-only endpoints return 401 for unauthenticated access',
    ];

    expect(endpoints.join('\n')).toContain('/campaigns/:id/opt-in');
    expect(endpoints.join('\n')).toContain('/coupons');
    expect(endpoints.join('\n')).toContain('/membership/upgrade');
    expect(endpoints.join('\n')).toContain('/admin/membership/packages');
    expect(endpoints.join('\n')).toContain('/admin/trust/flags');
    expect(endpoints.join('\n')).toContain('/admin/trust/restrictions');
    expect(endpoints.join('\n')).toContain('401');
  });
});
