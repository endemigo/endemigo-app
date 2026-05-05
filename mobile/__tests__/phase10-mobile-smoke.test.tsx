import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function read(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const apiSource = read('lib/api.ts');
const apiErrorSource = read('utils/apiError.ts');
const productHooks = read('hooks/useProducts.ts');
const walletHooks = read('hooks/useWallet.ts');
const orderHooks = read('hooks/useOrders.ts');
const notificationHooks = read('hooks/useNotifications.ts');
const negotiationHooks = read('hooks/useNegotiations.ts');
const sellerAdsHooks = read('hooks/useSellerAds.ts');
const sellerCampaignHooks = read('hooks/useSellerCampaigns.ts');
const membershipHooks = read('hooks/useMembership.ts');

test('mobile API client keeps auth and response-code error contracts', () => {
  assert.match(apiSource, /Authorization/);
  assert.match(apiSource, /auth\/refresh/);
  assert.match(apiErrorSource, /code/);
  assert.match(apiErrorSource, /message/);
});

test('mobile smoke anchors cover Phase 10 modules', () => {
  const joined = [
    apiSource,
    productHooks,
    walletHooks,
    orderHooks,
    notificationHooks,
    negotiationHooks,
    sellerAdsHooks,
    sellerCampaignHooks,
    membershipHooks,
  ].join('\n');

  for (const anchor of [
    'auth',
    'products',
    'favorites',
    'auctions',
    'wallet',
    'orders',
    'cargo',
    'notifications',
    'ads',
    'campaigns',
    'membership',
    'negotiations',
    'api.',
  ]) {
    assert.match(joined, new RegExp(anchor));
  }
});
