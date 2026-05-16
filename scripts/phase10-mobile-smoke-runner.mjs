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
const searchHooks = read('hooks/useSearch.ts');
const walletHooks = read('hooks/useWallet.ts');
const orderHooks = read('hooks/useOrders.ts');
const notificationHooks = read('hooks/useNotifications.ts');
const negotiationHooks = read('hooks/useNegotiations.ts');
const sellerAdsHooks = read('hooks/useSellerAds.ts');
const sellerCampaignHooks = read('hooks/useSellerCampaigns.ts');
const membershipHooks = read('hooks/useMembership.ts');
const auctionHooks = read('hooks/useAuctions.ts');
const mobileConfigHooks = read('hooks/useMobileConfig.ts');
const mobileConfigUtils = read('utils/mobileConfig.ts');
const homeScreen = read('app/home.tsx');
const productCard = read('components/ui/ProductCard.tsx');
const auctionsScreen = read('app/(tabs)/auctions.tsx');
const exploreScreen = read('app/(tabs)/explore.tsx');
const favoritesScreen = read('app/(tabs)/favoriler.tsx');
const productDetailScreen = read('app/product/[id].tsx');
const auctionDetailScreen = read('app/auction/[id].tsx');
const negotiationDetailScreen = read('app/negotiation/[id].tsx');
const negotiationComposer = read('components/negotiation/NegotiationComposer.tsx');

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
    mobileConfigHooks,
    mobileConfigUtils,
    homeScreen,
    productCard,
    auctionsScreen,
    exploreScreen,
    favoritesScreen,
    productDetailScreen,
    auctionDetailScreen,
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
    'mobile/config',
    'useMobileConfig',
    'resolveMobileAudience',
    'resolveLocalizedText',
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

test('mobile negotiation composer shows and validates minimum offer amount', () => {
  assert.match(negotiationDetailScreen, /askPriceMinAmount/);
  assert.match(negotiationDetailScreen, /negotiation\.askPrice\.minimum/);
  assert.match(negotiationComposer, /minimumAmount/);
  assert.match(negotiationComposer, /parsedAmount >= minimumOfferAmount/);
  assert.match(negotiationComposer, /negotiation\.askPrice\.minimum/);
});
