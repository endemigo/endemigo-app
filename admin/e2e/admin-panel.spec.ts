import { expect, test, type Page } from '@playwright/test';

const admin = {
  id: 'admin-1',
  email: 'admin@endemigo.test',
  displayName: 'Ops Admin',
  roles: ['SUPER_ADMIN'],
  lastLoginAt: null,
};

async function mockAdminApi(page: Page) {
  await page.route('http://localhost:3030/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/admin/auth/login') {
      return route.fulfill({
        json: { code: 'ADMIN_LOGIN_SUCCESS', message: 'login ok', admin, accessToken: 'test-token' },
      });
    }
    if (path === '/admin/auth/me') {
      return route.fulfill({ json: { code: 'SUCCESS', message: 'me', admin } });
    }
    if (path === '/admin/queues') {
      const bucket = { count: 1, latest: [{ id: 'queue-1', createdAt: new Date().toISOString() }] };
      return route.fulfill({
        json: {
          code: 'ADMIN_QUEUE_FETCHED',
          message: 'queues',
          sellerApprovals: bucket,
          adApprovals: bucket,
          payoutReviews: bucket,
          trustFlags: bucket,
          orderReviews: bucket,
          paymentReviews: bucket,
          membershipGrace: bucket,
        },
      });
    }
    if (path === '/admin/dashboard/metrics') {
      return route.fulfill({
        json: {
          code: 'SUCCESS',
          message: 'dashboard',
          metrics: {
            volume: { totalOrders: 4, grossMerchandiseValue: 1200 },
            auctions: { activeCount: 2, endingSoonCount: 1 },
            payments: { pendingReviewAmount: 300, failedCount: 1 },
            userBehavior: { newUsers: 8, newSellers: 2, activeSellers: 3 },
            errors: { recentCount: 0 },
          },
        },
      });
    }
    if (path === '/admin/bids') {
      return route.fulfill({
        json: {
          code: 'SUCCESS',
          message: 'bids',
          resource: 'bids',
          items: [{ id: 'bid-1', auctionId: 'auction-1', userId: 'user-1', amount: 50, createdAt: new Date().toISOString() }],
          pagination: { page: 1, limit: 25, total: 1 },
        },
      });
    }
    if (path === '/admin/bids/bid-1') {
      return route.fulfill({
        json: {
          code: 'SUCCESS',
          message: 'bid detail',
          resource: 'bids',
          overview: { id: 'bid-1', auctionId: 'auction-1', amount: 50 },
          timeline: [{ id: 'event-1', label: 'Bid placed', createdAt: new Date().toISOString() }],
          relatedRecords: {},
          audit: { targetType: 'bids', targetId: 'bid-1' },
        },
      });
    }
    if (path === '/admin/users') {
      return route.fulfill({
        json: {
          code: 'SUCCESS',
          message: 'users',
          resource: 'users',
          items: [{ id: 'user-1', email: 'seller@endemigo.test', role: 'seller', isActive: true, createdAt: new Date().toISOString() }],
          pagination: { page: 1, limit: 25, total: 1 },
        },
      });
    }
    if (path === '/admin/users/user-1/restrict') {
      return route.fulfill({ json: { code: 'USER_RESTRICTED', message: 'restricted' } });
    }
    if (path === '/admin/audit-logs') {
      return route.fulfill({ json: { code: 'ADMIN_AUDIT_FETCHED', message: 'audit', items: [] } });
    }
    if (path === '/admin/reports/ads/export') {
      return route.fulfill({ body: 'id,status\nad-1,ACTIVE', contentType: 'text/csv' });
    }
    if (path === '/admin/reports/ads') {
      return route.fulfill({
        json: {
          code: 'SUCCESS',
          message: 'reports',
          type: 'ads',
          items: [{ id: 'ad-1', sellerId: 'seller-1', status: 'ACTIVE', createdAt: new Date().toISOString() }],
          pagination: { page: 1, limit: 25, total: 1 },
        },
      });
    }
    if (path === '/admin/reports/campaigns') {
      return route.fulfill({
        json: {
          code: 'SUCCESS',
          message: 'campaigns',
          items: [{ id: 'campaign-1', name: 'Spring', sellerId: null, status: 'ACTIVE', isPlatform: true, requiresSellerOptIn: true, startsAt: new Date().toISOString(), endsAt: new Date().toISOString() }],
          pagination: { page: 1, limit: 25, total: 1 },
        },
      });
    }
    if (path === '/admin/coupons' && request.method() === 'GET') {
      return route.fulfill({
        json: {
          code: 'SUCCESS',
          message: 'coupons',
          resource: 'coupons',
          items: [{ id: 'coupon-1', code: 'SAVE10', sellerId: 'seller-1', status: 'ACTIVE', discountType: 'FIXED_AMOUNT', discountValue: 10, maxUses: 100, perUserLimit: 1, startsAt: new Date().toISOString(), endsAt: new Date().toISOString() }],
          pagination: { page: 1, limit: 25, total: 1 },
        },
      });
    }
    if (path === '/admin/coupons' && request.method() === 'POST') {
      return route.fulfill({
        json: {
          code: 'COUPON_CREATED',
          message: 'coupon created',
          coupon: { id: 'coupon-2', code: 'WELCOME10' },
        },
      });
    }
    if (path === '/admin/coupons/coupon-1' && request.method() === 'PATCH') {
      return route.fulfill({
        json: {
          code: 'COUPON_UPDATED',
          message: 'coupon updated',
          coupon: { id: 'coupon-1', code: 'SAVE20' },
        },
      });
    }
    if (path === '/admin/coupons/coupon-1/status' && request.method() === 'PATCH') {
      return route.fulfill({
        json: {
          code: 'COUPON_STATUS_UPDATED',
          message: 'coupon status updated',
          coupon: { id: 'coupon-1', status: 'DISABLED' },
        },
      });
    }

    return route.fulfill({ json: { code: 'SUCCESS', message: 'ok', items: [], pagination: { page: 1, limit: 25, total: 0 } } });
  });
}

test.beforeEach(async ({ page }) => {
  await mockAdminApi(page);
});

test('login, dashboard, queues, bids detail, reports, and coupons tab', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-posta').fill('admin@endemigo.test');
  await page.getByLabel('Şifre').fill('secret');
  await page.getByRole('button', { name: /Giriş yap/i }).click();
  await expect(page.getByRole('heading', { name: 'Operations Console' })).toBeVisible();

  await page.goto('/queues');
  await expect(page.getByRole('heading', { name: 'Öncelikli Kuyruklar' })).toBeVisible();

  await page.goto('/bids/bid-1');
  await expect(page.getByRole('heading', { name: 'Teklif Detayı' })).toBeVisible();

  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Raporlar' })).toBeVisible();
  await page.getByRole('button', { name: 'CSV' }).click();
  await page.getByRole('button', { name: 'Excel' }).click();
  await page.getByRole('button', { name: 'PDF' }).click();

  await page.goto('/campaigns');
  await page.getByRole('button', { name: 'Kuponlar' }).click();
  await expect(page.getByRole('button', { name: 'Platform Kuponu' })).toBeVisible();
  await page.getByRole('button', { name: 'Düzenle' }).click();
  await page.getByLabel('Kod').fill('SAVE20');
  await page.getByPlaceholder('Değişiklik yapan yönetici işlemleri için zorunludur').fill('Kupon güncelleme');
  await page.getByRole('button', { name: 'Kaydet' }).click();
  await page.getByRole('button', { name: 'Pasif Yap' }).click();
  await page.getByPlaceholder('Değişiklik yapan yönetici işlemleri için zorunludur').fill('Kuponu kapat');
  await page.getByRole('dialog').getByRole('button', { name: 'Uygula', exact: true }).click();
});
