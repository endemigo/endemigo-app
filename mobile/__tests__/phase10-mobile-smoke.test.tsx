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
const searchHooks = read('hooks/useSearch.ts');
const walletHooks = read('hooks/useWallet.ts');
const orderHooks = read('hooks/useOrders.ts');
const notificationHooks = read('hooks/useNotifications.ts');
const negotiationHooks = read('hooks/useNegotiations.ts');
const sellerAdsHooks = read('hooks/useSellerAds.ts');
const sellerCampaignHooks = read('hooks/useSellerCampaigns.ts');
const membershipHooks = read('hooks/useMembership.ts');
const auctionHooks = read('hooks/useAuctions.ts');
const exploreScreen = read('app/(tabs)/explore.tsx');
const favoritesScreen = read('app/(tabs)/favoriler.tsx');
const productDetailScreen = read('app/product/[id].tsx');
const auctionDetailScreen = read('app/auction/[id].tsx');
const negotiationDetailScreen = read('app/negotiation/[id].tsx');

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
    searchHooks,
    walletHooks,
    orderHooks,
    notificationHooks,
    negotiationHooks,
    sellerAdsHooks,
    sellerCampaignHooks,
    membershipHooks,
    auctionHooks,
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
    'products/search',
    'toggleFavorite',
    'withdrawBid',
    'api.',
  ]) {
    assert.match(joined, new RegExp(anchor));
  }
});

test('mobile explore, favorites and product detail surfaces wire real catalog flows', () => {
  assert.match(exploreScreen, /useSearchProducts/);
  assert.match(exploreScreen, /useSearchAuctions/);
  assert.match(exploreScreen, /useBlogs/);
  assert.match(favoritesScreen, /useFavorites/);
  assert.match(favoritesScreen, /useToggleFavorite/);
  assert.match(productDetailScreen, /useToggleFavorite/);
  assert.match(auctionDetailScreen, /useWithdrawBid/);
});

test('mobile negotiation detail surfaces API error messages for mutations', () => {
  assert.match(negotiationDetailScreen, /resolveApiErrorMessage/);
  assert.match(negotiationDetailScreen, /onError/);
});
