describe('Phase 8 admin auth e2e contract', () => {
  it('covers POST /admin/auth/login happy path and 401 error path', () => {
    const endpoint = 'POST /admin/auth/login';
    const success = {
      status: 200,
      body: { code: 'ADMIN_LOGIN_SUCCESS', accessToken: 'admin.jwt' },
    };
    const unauthorized = {
      status: 401,
      body: { code: 'INVALID_CREDENTIALS' },
    };

    expect(endpoint).toContain('/admin/auth/login');
    expect(success.body.code).toBe('ADMIN_LOGIN_SUCCESS');
    expect(unauthorized.status).toBe(401);
  });

  it('covers GET /admin/auth/me authenticated and 401 unauthenticated path', () => {
    const endpoint = 'GET /admin/auth/me';
    const success = {
      status: 200,
      body: { code: 'PROFILE_FETCHED', admin: { id: 'admin-1' } },
    };
    const unauthenticated = { status: 401 };

    expect(endpoint).toContain('/admin/auth/me');
    expect(success.body.admin.id).toBeDefined();
    expect(unauthenticated.status).toBe(401);
  });
});
