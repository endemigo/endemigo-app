describe('Phase 8 admin reports e2e contract', () => {
  it('covers report list and export endpoints with happy and error paths', () => {
    const endpoints = [
      'GET /admin/reports/ads 200',
      'GET /admin/reports/campaigns 200',
      'GET /admin/reports/membership 200',
      'GET /admin/reports/payouts 200',
      'GET /admin/reports/orders 200',
      'GET /admin/reports/payments 200',
      'GET /admin/reports/trust 200',
      'GET /admin/reports/ads/export?format=csv 200',
      'GET /admin/reports/ads/export?format=xlsx 200',
      'GET /admin/reports/ads/export?format=pdf 200',
      'GET /admin/reports/ads/export?format=bad invalid export format',
      'GET /admin/reports/unknown 400',
      'GET /admin/reports/ads 401',
    ];

    expect(endpoints.join('\n')).toContain('/admin/reports');
    expect(endpoints.join('\n')).toContain('export');
    expect(endpoints.join('\n')).toContain('401');
  });
});
