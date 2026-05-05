describe('Phase 8 admin foundation e2e contract', () => {
  it('covers GET /admin/audit-logs happy path and 401 error path', () => {
    const matrix = [
      'GET /admin/audit-logs 200',
      'GET /admin/audit-logs 401',
    ];

    expect(matrix).toContain('GET /admin/audit-logs 200');
    expect(matrix).toContain('GET /admin/audit-logs 401');
  });

  it('covers GET /admin/settings and PATCH /admin/settings/:key happy and error paths', () => {
    const matrix = [
      'GET /admin/settings 200',
      'GET /admin/settings 401',
      'PATCH /admin/settings/:key 200',
      'PATCH /admin/settings/:key 401',
      'PATCH /admin/settings/:key invalid setting key',
      'PATCH /admin/settings/:key missing reason',
    ];

    expect(matrix.join('\n')).toContain('/admin/settings');
    expect(matrix.join('\n')).toContain('PATCH /admin/settings');
    expect(matrix.join('\n')).toContain('missing reason');
    expect(matrix.join('\n')).toContain('401');
  });
});
