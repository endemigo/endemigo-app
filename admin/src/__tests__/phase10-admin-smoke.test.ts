import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const apiSource = readFileSync(new URL('../services/api.ts', import.meta.url), 'utf8');
const routerSource = readFileSync(new URL('../router/index.ts', import.meta.url), 'utf8');
const reportsSource = readFileSync(new URL('../views/reports/ReportsView.vue', import.meta.url), 'utf8');
const mobileConfigSource = readFileSync(new URL('../views/mobile/MobileConfigView.vue', import.meta.url), 'utf8');
const productFormSource = readFileSync(new URL('../views/products/ProductFormView.vue', import.meta.url), 'utf8');
const campaignsSource = readFileSync(new URL('../views/monetization/CampaignsView.vue', import.meta.url), 'utf8');
const contentStudioSource = readFileSync(new URL('../views/content/ContentStudioView.vue', import.meta.url), 'utf8');
const newslettersSource = readFileSync(new URL('../views/content/NewslettersView.vue', import.meta.url), 'utf8');

test('admin API envelope and auth token behavior stay contract-compatible', () => {
  assert.match(apiSource, /interface ApiEnvelope/);
  assert.match(apiSource, /code:\s*string/);
  assert.match(apiSource, /message:\s*string/);
  assert.match(apiSource, /Authorization/);
  assert.match(apiSource, /clearStoredAdminToken/);
});

test('admin routes cover Phase 10 smoke areas', () => {
  for (const route of ['dashboard', 'queues', 'operations', 'monetization', 'trust', 'settings', 'mobile-config', 'content-management', 'newsletters', 'audit', 'reports']) {
    assert.match(routerSource, new RegExp(route));
  }
});

test('admin reports and export paths are present', () => {
  assert.match(reportsSource, /adminApi\.get/);
  assert.match(reportsSource, /reports/);
  assert.match(reportsSource, /export/);
});

test('campaigns view exposes coupons tab and admin coupon endpoint anchors', () => {
  for (const anchor of ['Kuponlar', 'admin/coupons', 'maxUses', 'perUserLimit', 'scopeType', 'scopeId', 'Düzenle', 'Pasif Yap', 'Aktif Yap', 'Kullanım', 'Kalan Hak']) {
    assert.match(campaignsSource, new RegExp(anchor));
  }
});

test('mobile config editor exposes draft, publish, preview and localized fields', () => {
  for (const anchor of ['mobile-config', 'preview', 'publish', 'heroBanners', 'entryTiles', 'otherSurfaces', 'selectedLocale', 'selectedAudience']) {
    assert.match(mobileConfigSource, new RegExp(anchor));
  }
});

test('admin product form stays aligned with typed product contract', () => {
  for (const anchor of ['originCountry: \'TR\'', 'salesMonths: selectedSalesMonths.value', 'parseTrMoneyInput', 'normalizeMoneyScale']) {
    assert.match(productFormSource, new RegExp(anchor));
  }
});

test('content studio and newsletter surfaces expose real collection management anchors', () => {
  for (const anchor of ['admin/content-studio', 'collectionDefinitions', 'blogs', 'banners', 'popups', 'newsletters']) {
    assert.match(contentStudioSource, new RegExp(anchor));
  }

  for (const anchor of ['admin/content-studio', 'newsletters', 'featuredCollection']) {
    assert.match(newslettersSource, new RegExp(anchor));
  }
});
