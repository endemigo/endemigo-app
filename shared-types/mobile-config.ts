import { MobileAudience } from './enums/mobile-audience.enum';
import { MobileBlockType } from './enums/mobile-block-type.enum';
import { MobileConfigStatus } from './enums/mobile-config-status.enum';
import { MobileSurfaceKey } from './enums/mobile-surface-key.enum';

export type MobileLocale = 'tr' | 'en';

export interface LocalizedText {
  tr?: string;
  en?: string;
}

export interface MobileActionConfig {
  label?: LocalizedText;
  route: string;
}

export interface MobileConfigBlockBase {
  id: string;
  type: MobileBlockType;
  surface: MobileSurfaceKey;
  enabled: boolean;
  order: number;
  audiences: MobileAudience[];
}

export interface MobileHeroBannerConfig extends MobileConfigBlockBase {
  type: MobileBlockType.HERO_BANNER;
  badge?: LocalizedText;
  title: LocalizedText;
  subtitle?: LocalizedText;
  imageUrl: string;
  cta?: MobileActionConfig;
}

export interface MobileEntryTileConfig extends MobileConfigBlockBase {
  type: MobileBlockType.ENTRY_TILE;
  title: LocalizedText;
  subtitle?: LocalizedText;
  cta: MobileActionConfig;
}

export interface MobileHomeSectionConfig extends MobileConfigBlockBase {
  type: MobileBlockType.HOME_SECTION;
  title?: LocalizedText;
  seeAllLabel?: LocalizedText;
  route?: string;
}

export interface MobilePromoBannerConfig extends MobileConfigBlockBase {
  type: MobileBlockType.PROMO_BANNER;
  label?: LocalizedText;
  title: LocalizedText;
  subtitle?: LocalizedText;
  imageUrl: string;
  cta?: MobileActionConfig;
}

export interface MobileTrustBlockConfig extends MobileConfigBlockBase {
  type: MobileBlockType.TRUST_BLOCK;
  title: LocalizedText;
  subtitle?: LocalizedText;
  cta?: MobileActionConfig;
}

export interface MobileProductCardAudienceOverride {
  badge?: LocalizedText;
  ctaLabel?: LocalizedText;
  showPrice?: boolean;
  showAskPriceBadge?: boolean;
}

export interface MobileProductCardConfig {
  surface: MobileSurfaceKey.PRODUCT_CARD;
  badge?: LocalizedText;
  ctaLabel?: LocalizedText;
  showCategory: boolean;
  showPrice: boolean;
  showAskPriceBadge: boolean;
  audienceOverrides?: Partial<Record<MobileAudience, MobileProductCardAudienceOverride>>;
}

export interface MobileAuctionListCardAudienceOverride {
  ctaLabel?: LocalizedText;
  liveBadgeLabel?: LocalizedText;
  showBidCount?: boolean;
  showStatusBadge?: boolean;
  showTimer?: boolean;
}

export interface MobileAuctionListCardConfig {
  surface: MobileSurfaceKey.AUCTIONS_LIST;
  ctaLabel?: LocalizedText;
  liveBadgeLabel?: LocalizedText;
  showBidCount: boolean;
  showStatusBadge: boolean;
  showTimer: boolean;
  audienceOverrides?: Partial<Record<MobileAudience, MobileAuctionListCardAudienceOverride>>;
}

export interface MobileSurfaceSlotConfig extends MobileConfigBlockBase {
  type: MobileBlockType.SURFACE_SLOT;
  title?: LocalizedText;
  subtitle?: LocalizedText;
  cta?: MobileActionConfig;
}

export interface MobileHomeConfig {
  heroBanners: MobileHeroBannerConfig[];
  entryTiles: MobileEntryTileConfig[];
  sections: MobileHomeSectionConfig[];
  promoBanners: MobilePromoBannerConfig[];
  trustBlocks: MobileTrustBlockConfig[];
}

export interface MobileCardsConfig {
  productCard: MobileProductCardConfig;
}

export interface MobileAuctionsConfig {
  listCard: MobileAuctionListCardConfig;
}

export interface MobilePreviewConfig {
  defaultAudience: MobileAudience;
  defaultLocale: MobileLocale;
}

export interface MobileExperienceConfig {
  schemaVersion: 1;
  home: MobileHomeConfig;
  cards: MobileCardsConfig;
  auctions: MobileAuctionsConfig;
  otherSurfaces: MobileSurfaceSlotConfig[];
  preview: MobilePreviewConfig;
}

export interface MobileExperienceDocumentResponse {
  status: MobileConfigStatus;
  draft: MobileExperienceConfig;
  published: MobileExperienceConfig | null;
  publishedAt: string | null;
  updatedByAdminId: string | null;
  publishedByAdminId: string | null;
}

const DEFAULT_AUDIENCES = [
  MobileAudience.GUEST,
  MobileAudience.BUYER,
  MobileAudience.SELLER,
] as const;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function isMobileRoute(value: string): boolean {
  return /^\/[A-Za-z0-9\-_/()[\]]*$/.test(value);
}

export function resolveLocalizedText(
  value: LocalizedText | undefined,
  locale: MobileLocale,
  fallback: string,
): string {
  const localized = value?.[locale] ?? value?.tr ?? value?.en;
  return typeof localized === 'string' && localized.trim().length > 0
    ? localized
    : fallback;
}

export function getDefaultMobileExperienceConfig(): MobileExperienceConfig {
  return clone({
    schemaVersion: 1,
    home: {
      heroBanners: [
        {
          id: 'home-hero-collection',
          type: MobileBlockType.HERO_BANNER,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 1,
          audiences: [...DEFAULT_AUDIENCES],
          badge: { tr: 'Yeni Koleksiyon', en: 'New Collection' },
          title: {
            tr: "Anadolu'nun Bereketli Topraklarindan",
            en: 'From the fertile lands of Anatolia',
          },
          subtitle: {
            tr: 'Cografi isaretli urunler kapiniza gelsin',
            en: 'Discover geographically indicated local goods',
          },
          imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
          cta: {
            label: { tr: 'Kesfet', en: 'Explore' },
            route: '/(tabs)/categories',
          },
        },
        {
          id: 'home-hero-auctions',
          type: MobileBlockType.HERO_BANNER,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 2,
          audiences: [MobileAudience.GUEST, MobileAudience.BUYER],
          badge: { tr: 'Muzayedeli Satis', en: 'Auction Sales' },
          title: { tr: 'Canli Muzayedeler Basladi!', en: 'Live auctions started!' },
          subtitle: {
            tr: 'Nadir parcalar icin simdi teklif ver',
            en: 'Bid now for rare pieces',
          },
          imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
          cta: {
            label: { tr: 'Teklif Ver', en: 'Bid Now' },
            route: '/(tabs)/auctions',
          },
        },
      ],
      entryTiles: [
        {
          id: 'home-tile-buy-now',
          type: MobileBlockType.ENTRY_TILE,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 1,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Hemen Al', en: 'Buy Now' },
          subtitle: {
            tr: 'Yoresinden kapiniza 24 saatte teslimat',
            en: 'Delivered from source to door in 24 hours',
          },
          cta: {
            label: { tr: 'Hemen Kesfet', en: 'Explore Now' },
            route: '/buy-now',
          },
        },
        {
          id: 'home-tile-auction',
          type: MobileBlockType.ENTRY_TILE,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 2,
          audiences: [MobileAudience.GUEST, MobileAudience.BUYER],
          title: { tr: 'Muzayede', en: 'Auction' },
          subtitle: {
            tr: 'Essiz parcalar icin teklifinizi hemen verin',
            en: 'Place your bid for unique pieces',
          },
          cta: {
            label: { tr: 'Hemen Kesfet', en: 'Explore Now' },
            route: '/(tabs)/auctions',
          },
        },
      ],
      sections: [
        {
          id: 'recently-viewed',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 3,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Kesfettiklerim', en: 'What I explored' },
        },
        {
          id: 'listings',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 4,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Ilanlar', en: 'Listings' },
          seeAllLabel: { tr: 'Tumunu Gor', en: 'See All' },
          route: '/(tabs)/categories',
        },
        {
          id: 'categories',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 5,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Kategoriler', en: 'Categories' },
          seeAllLabel: { tr: 'Tumunu Gor', en: 'See All' },
          route: '/(tabs)/categories',
        },
        {
          id: 'discounted-products',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 6,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Indirimdeki Urunler', en: 'Discounted Products' },
          seeAllLabel: { tr: 'Tumunu Gor', en: 'See All' },
          route: '/(tabs)/categories',
        },
        {
          id: 'most-liked-products',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 7,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'En Cok Begenilenler', en: 'Most Liked' },
          seeAllLabel: { tr: 'Tumunu Gor', en: 'See All' },
          route: '/(tabs)/categories',
        },
        {
          id: 'campaigns',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 8,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Guncel Kampanyalar', en: 'Current Campaigns' },
          seeAllLabel: { tr: 'Tumunu Gor', en: 'See All' },
        },
        {
          id: 'blog',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 9,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Blog', en: 'Blog' },
          seeAllLabel: { tr: 'Tumunu Gor', en: 'See All' },
        },
        {
          id: 'trust-hub',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 10,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Guven Merkezi', en: 'Trust Hub' },
        },
      ],
      promoBanners: [
        {
          id: 'promo-honey',
          type: MobileBlockType.PROMO_BANNER,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 1,
          audiences: [...DEFAULT_AUDIENCES],
          label: { tr: 'Kampanya', en: 'Campaign' },
          title: { tr: "Karakovan Bali'nda %20 Indirim", en: '20% off honeycomb honey' },
          subtitle: {
            tr: 'Sinirli stok, kacirma!',
            en: 'Limited stock, do not miss it!',
          },
          imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80',
          cta: {
            label: { tr: 'Hemen Al', en: 'Buy Now' },
            route: '/buy-now',
          },
        },
        {
          id: 'promo-pistachio',
          type: MobileBlockType.PROMO_BANNER,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 2,
          audiences: [...DEFAULT_AUDIENCES],
          label: { tr: 'Kampanya', en: 'Campaign' },
          title: { tr: "Siirt Fistigi'nda %15 Indirim", en: '15% off pistachio' },
          subtitle: {
            tr: 'Hafta sonuna kadar gecerli',
            en: 'Valid until the weekend',
          },
          imageUrl: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800&q=80',
          cta: {
            label: { tr: 'Hemen Al', en: 'Buy Now' },
            route: '/buy-now',
          },
        },
      ],
      trustBlocks: [
        {
          id: 'trust-hub-card',
          type: MobileBlockType.TRUST_BLOCK,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 1,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Guven Merkezi', en: 'Trust Hub' },
          subtitle: {
            tr: 'Orijinal • Otantik • Cografi Isaretli • Guvenli Alisveris',
            en: 'Original • Authentic • Geographically Indicated • Secure Shopping',
          },
          cta: {
            label: { tr: 'Bildirim Alin', en: 'Notify Me' },
            route: '/(tabs)/notifications',
          },
        },
      ],
    },
    cards: {
      productCard: {
        surface: MobileSurfaceKey.PRODUCT_CARD,
        badge: { tr: 'One Cikan', en: 'Featured' },
        ctaLabel: { tr: 'Incele', en: 'View' },
        showCategory: true,
        showPrice: true,
        showAskPriceBadge: true,
        audienceOverrides: {
          GUEST: {
            ctaLabel: { tr: 'Incele', en: 'View' },
          },
          BUYER: {
            ctaLabel: { tr: 'Incele', en: 'View' },
          },
          SELLER: {
            ctaLabel: { tr: 'Yonet', en: 'Manage' },
          },
        },
      },
    },
    auctions: {
      listCard: {
        surface: MobileSurfaceKey.AUCTIONS_LIST,
        ctaLabel: { tr: 'Teklif Ver', en: 'Bid Now' },
        liveBadgeLabel: { tr: 'Canli', en: 'Live' },
        showBidCount: true,
        showStatusBadge: true,
        showTimer: true,
        audienceOverrides: {
          SELLER: {
            ctaLabel: { tr: 'Incele', en: 'View' },
          },
        },
      },
    },
    otherSurfaces: [
      {
        id: 'buy-now-surface',
        type: MobileBlockType.SURFACE_SLOT,
        surface: MobileSurfaceKey.BUY_NOW,
        enabled: true,
        order: 1,
        audiences: [...DEFAULT_AUDIENCES],
        title: { tr: 'Hemen Al', en: 'Buy Now' },
        subtitle: {
          tr: 'Yoresinden kapiniza 24 saatte teslimat',
          en: 'Direct from origin to your door',
        },
        cta: {
          label: { tr: 'Kesfet', en: 'Explore' },
          route: '/home',
        },
      },
    ],
    preview: {
      defaultAudience: MobileAudience.BUYER,
      defaultLocale: 'tr',
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isLocalizedText(value: unknown, required = false): value is LocalizedText {
  if (!isRecord(value)) {
    return !required;
  }

  const tr = value.tr;
  const en = value.en;
  const validTr = tr === undefined || isNonEmptyString(tr);
  const validEn = en === undefined || isNonEmptyString(en);
  const hasAtLeastOne = isNonEmptyString(tr) || isNonEmptyString(en);
  return validTr && validEn && (!required || hasAtLeastOne);
}

function isAudienceArray(value: unknown): value is MobileAudience[] {
  return (
    Array.isArray(value)
    && value.length > 0
    && value.every((item) => Object.values(MobileAudience).includes(item as MobileAudience))
  );
}

function isActionConfig(value: unknown, required = false): value is MobileActionConfig {
  if (!isRecord(value)) {
    return !required;
  }

  if (!isNonEmptyString(value.route) || !isMobileRoute(value.route)) {
    return false;
  }

  return isLocalizedText(value.label, false);
}

function isBaseBlock(
  value: unknown,
  type: MobileBlockType,
  surface?: MobileSurfaceKey,
): value is MobileConfigBlockBase {
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

function validateEvery<T>(
  values: unknown,
  predicate: (value: unknown) => value is T,
): values is T[] {
  return Array.isArray(values) && values.every((value) => predicate(value));
}

function isHeroBanner(value: unknown): value is MobileHeroBannerConfig {
  if (!isBaseBlock(value, MobileBlockType.HERO_BANNER, MobileSurfaceKey.HOME)) {
    return false;
  }

  const candidate = value as unknown as Record<string, unknown>;
  return (
    isLocalizedText(candidate.badge, false)
    && isLocalizedText(candidate.title, true)
    && isLocalizedText(candidate.subtitle, false)
    && isNonEmptyString(candidate.imageUrl)
    && isActionConfig(candidate.cta, false)
  );
}

function isEntryTile(value: unknown): value is MobileEntryTileConfig {
  if (!isBaseBlock(value, MobileBlockType.ENTRY_TILE, MobileSurfaceKey.HOME)) {
    return false;
  }

  const candidate = value as unknown as Record<string, unknown>;
  return (
    isLocalizedText(candidate.title, true)
    && isLocalizedText(candidate.subtitle, false)
    && isActionConfig(candidate.cta, true)
  );
}

function isHomeSection(value: unknown): value is MobileHomeSectionConfig {
  if (!isBaseBlock(value, MobileBlockType.HOME_SECTION, MobileSurfaceKey.HOME)) {
    return false;
  }

  const candidate = value as unknown as Record<string, unknown>;
  return (
    isLocalizedText(candidate.title, false)
    && isLocalizedText(candidate.seeAllLabel, false)
    && (candidate.route === undefined || (isNonEmptyString(candidate.route) && isMobileRoute(candidate.route)))
  );
}

function isPromoBanner(value: unknown): value is MobilePromoBannerConfig {
  if (!isBaseBlock(value, MobileBlockType.PROMO_BANNER, MobileSurfaceKey.HOME)) {
    return false;
  }

  const candidate = value as unknown as Record<string, unknown>;
  return (
    isLocalizedText(candidate.label, false)
    && isLocalizedText(candidate.title, true)
    && isLocalizedText(candidate.subtitle, false)
    && isNonEmptyString(candidate.imageUrl)
    && isActionConfig(candidate.cta, false)
  );
}

function isTrustBlock(value: unknown): value is MobileTrustBlockConfig {
  if (!isBaseBlock(value, MobileBlockType.TRUST_BLOCK, MobileSurfaceKey.HOME)) {
    return false;
  }

  const candidate = value as unknown as Record<string, unknown>;
  return (
    isLocalizedText(candidate.title, true)
    && isLocalizedText(candidate.subtitle, false)
    && isActionConfig(candidate.cta, false)
  );
}

function isProductCardConfig(value: unknown): value is MobileProductCardConfig {
  if (!isRecord(value) || value.surface !== MobileSurfaceKey.PRODUCT_CARD) {
    return false;
  }

  return (
    isLocalizedText(value.badge, false)
    && isLocalizedText(value.ctaLabel, false)
    && typeof value.showCategory === 'boolean'
    && typeof value.showPrice === 'boolean'
    && typeof value.showAskPriceBadge === 'boolean'
  );
}

function isAuctionListCardConfig(value: unknown): value is MobileAuctionListCardConfig {
  if (!isRecord(value) || value.surface !== MobileSurfaceKey.AUCTIONS_LIST) {
    return false;
  }

  return (
    isLocalizedText(value.ctaLabel, false)
    && isLocalizedText(value.liveBadgeLabel, false)
    && typeof value.showBidCount === 'boolean'
    && typeof value.showStatusBadge === 'boolean'
    && typeof value.showTimer === 'boolean'
  );
}

function isSurfaceSlot(value: unknown): value is MobileSurfaceSlotConfig {
  if (!isBaseBlock(value, MobileBlockType.SURFACE_SLOT)) {
    return false;
  }

  const candidate = value as unknown as Record<string, unknown>;
  return (
    isLocalizedText(candidate.title, false)
    && isLocalizedText(candidate.subtitle, false)
    && isActionConfig(candidate.cta, false)
  );
}

export function isMobileExperienceConfig(value: unknown): value is MobileExperienceConfig {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    return false;
  }

  if (!isRecord(value.home) || !isRecord(value.cards) || !isRecord(value.auctions) || !isRecord(value.preview)) {
    return false;
  }

  return (
    validateEvery(value.home.heroBanners, isHeroBanner)
    && validateEvery(value.home.entryTiles, isEntryTile)
    && validateEvery(value.home.sections, isHomeSection)
    && validateEvery(value.home.promoBanners, isPromoBanner)
    && validateEvery(value.home.trustBlocks, isTrustBlock)
    && isProductCardConfig(value.cards.productCard)
    && isAuctionListCardConfig(value.auctions.listCard)
    && validateEvery(value.otherSurfaces, isSurfaceSlot)
    && Object.values(MobileAudience).includes(value.preview.defaultAudience as MobileAudience)
    && ['tr', 'en'].includes(String(value.preview.defaultLocale))
  );
}

export function validateMobileExperienceConfig(value: unknown): string[] {
  return isMobileExperienceConfig(value) ? [] : ['INVALID_MOBILE_CONFIG_PAYLOAD'];
}

export function sanitizeMobileExperienceConfig(value: unknown): MobileExperienceConfig {
  return isMobileExperienceConfig(value) ? clone(value) : getDefaultMobileExperienceConfig();
}
