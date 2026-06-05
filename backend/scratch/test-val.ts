import {
  validateMobileExperienceConfig,
  getDefaultMobileExperienceConfig
} from '../../shared-types/mobile-config';

// Define enums locally
enum MobileBlockType {
  HERO_BANNER = 'HERO_BANNER',
  ENTRY_TILE = 'ENTRY_TILE',
  HOME_SECTION = 'HOME_SECTION',
  PROMO_BANNER = 'PROMO_BANNER',
  TRUST_BLOCK = 'TRUST_BLOCK',
  PRODUCT_CARD = 'PRODUCT_CARD',
  AUCTION_CARD = 'AUCTION_CARD',
  SURFACE_SLOT = 'SURFACE_SLOT',
}

enum MobileSurfaceKey {
  HOME = 'HOME',
  PRODUCT_CARD = 'PRODUCT_CARD',
  AUCTIONS_LIST = 'AUCTIONS_LIST',
  LISTING_CREATE = 'LISTING_CREATE',
  BUY_NOW = 'BUY_NOW',
  PRODUCT_DETAIL = 'PRODUCT_DETAIL',
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS',
  HOME_QUICK_TAB_BAR = 'HOME_QUICK_TAB_BAR',
}

enum MobileAudience {
  GUEST = 'GUEST',
  BUYER = 'BUYER',
  SELLER = 'SELLER',
}

const draft = {
  ...getDefaultMobileExperienceConfig(),
  home: {
    ...getDefaultMobileExperienceConfig().home,
    sections: [
      {"id":"recently-viewed","type":"HOME_SECTION","order":4,"title":{"tr":"Keşfettiklerim","en":"What I explored"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"seeAllLabel":{"tr":"","en":""},"route":""},
      {"id":"listings","type":"HOME_SECTION","order":5,"route":"/(tabs)/categories","title":{"tr":"İlanlar","en":"Listings"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"seeAllLabel":{"tr":"Tümünü Gör","en":"See All"}},
      {"id":"categories","type":"HOME_SECTION","order":6,"route":"/(tabs)/categories","title":{"tr":"Kategoriler","en":"Categories"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"seeAllLabel":{"tr":"Tümünü Gör","en":"See All"}},
      {"id":"discounted-products","type":"HOME_SECTION","order":7,"route":"/(tabs)/categories","title":{"tr":"İndirimdeki Ürünler","en":"Discounted Products"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"seeAllLabel":{"tr":"Tümünü Gör","en":"See All"}},
      {"id":"most-liked-products","type":"HOME_SECTION","order":8,"route":"/(tabs)/categories","title":{"tr":"En Çok Beğenilenler","en":"Most Liked"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"seeAllLabel":{"tr":"Tümünü Gör","en":"See All"}},
      {"id":"campaigns","type":"HOME_SECTION","order":9,"title":{"tr":"Güncel Kampanyalar","en":"Current Campaigns"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"seeAllLabel":{"tr":"Tümünü Gör","en":"See All"},"route":""},
      {"id":"blog","type":"HOME_SECTION","order":10,"title":{"tr":"Blog","en":"Blog"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"seeAllLabel":{"tr":"Tümünü Gör","en":"See All"},"route":""},
      {"id":"trust-hub","type":"HOME_SECTION","order":11,"title":{"tr":"Güven Merkezi","en":"Trust Hub"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"seeAllLabel":{"tr":"","en":""},"route":""}
    ]
  },
  otherSurfaces: [
    {"id":"home-search-bar","type":"SURFACE_SLOT","order":2,"title":{"tr":"Arama Barı","en":"Search Bar"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"subtitle":{"tr":"","en":""},"cta":{"route":"","label":{"tr":"","en":""}}},
    {"id":"home-hero-banners","type":"SURFACE_SLOT","order":3,"title":{"tr":"Hero Banner","en":"Hero Banner"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"subtitle":{"tr":"","en":""},"cta":{"route":"","label":{"tr":"","en":""}}},
    {"id":"home-entry-tiles","type":"SURFACE_SLOT","order":4,"title":{"tr":"Giriş Kartları","en":"Entry Tiles"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"subtitle":{"tr":"","en":""},"cta":{"route":"","label":{"tr":"","en":""}}},
    {"id":"home-listings","type":"SURFACE_SLOT","order":5,"title":{"tr":"İlanlar Alanı","en":"Listings Block"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"subtitle":{"tr":"","en":""},"cta":{"route":"","label":{"tr":"","en":""}}},
    {"id":"home-categories","type":"SURFACE_SLOT","order":6,"title":{"tr":"Kategoriler","en":"Categories"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"subtitle":{"tr":"","en":""},"cta":{"route":"","label":{"tr":"","en":""}}},
    {"id":"home-recently-viewed","type":"SURFACE_SLOT","order":7,"title":{"tr":"Son Gezdiklerim","en":"Recently Viewed"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"subtitle":{"tr":"","en":""},"cta":{"route":"","label":{"tr":"","en":""}}},
    {"id":"home-discounted-products","type":"SURFACE_SLOT","order":8,"title":{"tr":"İndirimli Ürünler","en":"Discounted Products"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"subtitle":{"tr":"","en":""},"cta":{"route":"","label":{"tr":"","en":""}}},
    {"id":"home-most-liked-products","type":"SURFACE_SLOT","order":9,"title":{"tr":"En Çok Beğenilenler","en":"Most Liked Products"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"subtitle":{"tr":"","en":""},"cta":{"route":"","label":{"tr":"","en":""}}},
    {"id":"home-trust-bar","type":"SURFACE_SLOT","order":10,"title":{"tr":"Güven Barı","en":"Trust Bar"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"subtitle":{"tr":"","en":""},"cta":{"route":"","label":{"tr":"","en":""}}},
    {"id":"home-campaigns","type":"SURFACE_SLOT","order":11,"title":{"tr":"Kampanyalar","en":"Campaigns"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"subtitle":{"tr":"","en":""},"cta":{"route":"","label":{"tr":"","en":""}}},
    {"id":"home-blog","type":"SURFACE_SLOT","order":12,"title":{"tr":"Blog","en":"Blog"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"subtitle":{"tr":"","en":""},"cta":{"route":"","label":{"tr":"","en":""}}},
    {"id":"home-trust-hub","type":"SURFACE_SLOT","order":13,"title":{"tr":"Güven Merkezi","en":"Trust Hub"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"subtitle":{"tr":"","en":""},"cta":{"route":"","label":{"tr":"","en":""}}},
    {"id":"home-quick-tab-bar","type":"SURFACE_SLOT","order":14,"title":{"tr":"Hızlı Sekme Çubuğu","en":"Quick Tab Bar"},"enabled":true,"surface":"HOME","audiences":["GUEST","BUYER","SELLER"],"subtitle":{"tr":"","en":""},"cta":{"route":"","label":{"tr":"","en":""}}},
    {"id":"buy-now-surface","cta":{"route":"/home","label":{"tr":"Keşfet","en":"Explore"}},"type":"SURFACE_SLOT","order":1,"title":{"tr":"Hemen Al","en":"Buy Now"},"enabled":true,"surface":"BUY_NOW","subtitle":{"tr":"Yöresinden kapınıza 24 saatte teslimat","en":"Direct from origin to your door"},"audiences":["GUEST","BUYER","SELLER"]},
    {"id":"surface-1780320401136","type":"SURFACE_SLOT","enabled":true,"order":1,"audiences":["BUYER"],"title":{"tr":"Yeni Banner Alanı","en":"New Banner Slot"},"subtitle":{"tr":"Kampanya açıklaması","en":"Campaign subtitle"},"cta":{"label":{"tr":"","en":""},"route":"/home"},"surface":"HOME","bannerId":"209d43ef-118e-4a87-b9cd-0925afde7c06"}
  ]
};

// Copy exact helper predicates from shared-types/mobile-config.ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function isLocalizedText(value: unknown, required = false): boolean {
  if (!isRecord(value)) {
    return !required;
  }
  const tr = value.tr;
  const en = value.en;
  const validTr = tr === undefined || typeof tr === 'string';
  const validEn = en === undefined || typeof en === 'string';
  const hasAtLeastOne = isNonEmptyString(tr) || isNonEmptyString(en);
  return validTr && validEn && (!required || hasAtLeastOne);
}
function isMobileRoute(value: string): boolean {
  return /^\/[A-Za-z0-9\-_/()[\]]*$/.test(value);
}
function isActionConfig(value: unknown, required = false): boolean {
  if (!isRecord(value)) {
    return !required;
  }
  if (!isNonEmptyString(value.route)) {
    return !required;
  }
  if (!isMobileRoute(value.route)) {
    return false;
  }
  return isLocalizedText(value.label, false);
}
function isAudienceArray(value: unknown): boolean {
  return (
    Array.isArray(value)
    && value.length > 0
    && value.every((item) => Object.values(MobileAudience).includes(item as MobileAudience))
  );
}
function isBaseBlock(value: unknown, type: MobileBlockType, surface?: MobileSurfaceKey): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const isSurfaceValid = surface ? value.surface === surface : Object.values(MobileSurfaceKey).includes(value.surface as MobileSurfaceKey);
  return (
    isNonEmptyString(value.id)
    && value.type === type
    && isSurfaceValid
    && typeof value.enabled === 'boolean'
    && Number.isInteger(value.order)
    && Number(value.order) >= 0
    && isAudienceArray(value.audiences)
  );
}
function isHeroBanner(value: unknown): boolean {
  if (!isBaseBlock(value, MobileBlockType.HERO_BANNER, MobileSurfaceKey.HOME)) return false;
  const candidate = value as Record<string, any>;
  return (
    isLocalizedText(candidate.badge, false)
    && isLocalizedText(candidate.title, true)
    && isLocalizedText(candidate.subtitle, false)
    && isNonEmptyString(candidate.imageUrl)
    && isActionConfig(candidate.cta, false)
  );
}
function isEntryTile(value: unknown): boolean {
  if (!isBaseBlock(value, MobileBlockType.ENTRY_TILE, MobileSurfaceKey.HOME)) return false;
  const candidate = value as Record<string, any>;
  return (
    isLocalizedText(candidate.title, true)
    && isLocalizedText(candidate.subtitle, false)
    && isActionConfig(candidate.cta, true)
  );
}
function isHomeSection(value: unknown): boolean {
  if (!isBaseBlock(value, MobileBlockType.HOME_SECTION, MobileSurfaceKey.HOME)) return false;
  const candidate = value as Record<string, any>;
  return (
    isLocalizedText(candidate.title, true)
    && isLocalizedText(candidate.seeAllLabel, false)
    && (candidate.route === undefined || candidate.route === '' || (isNonEmptyString(candidate.route) && isMobileRoute(candidate.route)))
  );
}
function isPromoBanner(value: unknown): boolean {
  if (!isBaseBlock(value, MobileBlockType.PROMO_BANNER, MobileSurfaceKey.HOME)) return false;
  const candidate = value as Record<string, any>;
  return (
    isLocalizedText(candidate.label, false)
    && isLocalizedText(candidate.title, true)
    && isLocalizedText(candidate.subtitle, false)
    && isNonEmptyString(candidate.imageUrl)
    && isActionConfig(candidate.cta, false)
  );
}
function isTrustBlock(value: unknown): boolean {
  if (!isBaseBlock(value, MobileBlockType.TRUST_BLOCK, MobileSurfaceKey.HOME)) return false;
  const candidate = value as Record<string, any>;
  return (
    isLocalizedText(candidate.title, true)
    && isLocalizedText(candidate.subtitle, false)
    && isActionConfig(candidate.cta, false)
  );
}
function isSurfaceSlot(value: unknown): boolean {
  if (!isBaseBlock(value, MobileBlockType.SURFACE_SLOT)) return false;
  const candidate = value as Record<string, any>;
  return (
    isLocalizedText(candidate.title, false)
    && isLocalizedText(candidate.subtitle, false)
    && isActionConfig(candidate.cta, false)
  );
}

// Diagnostic runner
console.log("--- EVALUATING BLOCKS ---");
draft.home.heroBanners.forEach((item, idx) => {
  console.log(`heroBanners[${idx}]:`, isHeroBanner(item));
});
draft.home.entryTiles.forEach((item, idx) => {
  console.log(`entryTiles[${idx}]:`, isEntryTile(item));
});
draft.home.sections.forEach((item, idx) => {
  console.log(`sections[${idx}] (${item.id}):`, isHomeSection(item));
});
draft.home.promoBanners.forEach((item, idx) => {
  console.log(`promoBanners[${idx}]:`, isPromoBanner(item));
});
draft.home.trustBlocks.forEach((item, idx) => {
  console.log(`trustBlocks[${idx}]:`, isTrustBlock(item));
});
draft.otherSurfaces.forEach((item, idx) => {
  console.log(`otherSurfaces[${idx}] (${item.id}):`, isSurfaceSlot(item));
  if (!isSurfaceSlot(item)) {
    console.log("  isBaseBlock:", isBaseBlock(item, MobileBlockType.SURFACE_SLOT));
    console.log("  isLocalizedText title:", isLocalizedText(item.title, false));
    console.log("  isLocalizedText subtitle:", isLocalizedText(item.subtitle, false));
    console.log("  isActionConfig cta:", isActionConfig(item.cta, false));
  }
});
