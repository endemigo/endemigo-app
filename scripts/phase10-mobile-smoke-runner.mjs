import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const MOBILE_DIR = process.cwd().endsWith(`${path.sep}mobile`) ? process.cwd() : path.join(process.cwd(), 'mobile');

function read(relativePath) {
  return readFileSync(path.join(MOBILE_DIR, relativePath), 'utf8');
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
const smokeArtifact = read('__tests__/phase10-mobile-smoke.test.tsx');
const mobileConfigHooks = read('hooks/useMobileConfig.ts');
const mobileConfigUtils = read('utils/mobileConfig.ts');
const homeScreen = read('app/home.tsx');
const productCard = read('components/ui/ProductCard.tsx');
const auctionsScreen = read('app/(tabs)/auctions.tsx');

test('mobile API client keeps auth and response-code error contracts', () => {
  assert.match(apiSource, /Authorization/);
  assert.match(apiSource, /auth\/refresh/);
  assert.match(apiErrorSource, /code/);
  assert.match(apiErrorSource, /message/);
  assert.match(smokeArtifact, /api\./);
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
    mobileConfigHooks,
    mobileConfigUtils,
    homeScreen,
    productCard,
    auctionsScreen,
    smokeArtifact,
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
    'mobile/config',
    'useMobileConfig',
    'resolveMobileAudience',
    'resolveLocalizedText',
    'api.',
  ]) {
    assert.match(joined, new RegExp(anchor));
  }
});
