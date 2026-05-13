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

export const MOBILE_HOME_SURFACE_SLOT_IDS = [
  'home-search-bar',
  'home-hero-banners',
  'home-entry-tiles',
  'home-listings',
  'home-categories',
  'home-recently-viewed',
  'home-discounted-products',
  'home-most-liked-products',
  'home-trust-bar',
  'home-campaigns',
  'home-blog',
  'home-trust-hub',
  'home-quick-tab-bar',
] as const;

export type MobileHomeSurfaceSlotId = (typeof MOBILE_HOME_SURFACE_SLOT_IDS)[number];

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

export const MOBILE_LISTING_CREATE_OPTIONAL_FIELDS = [
  'originRegion',
  'originCountry',
  'shippingProvince',
  'shippingDistrict',
  'shippingAddress',
  'deliveryTemplateDomestic',
  'deliveryTemplateInternational',
  'desiDomestic',
  'desiInternational',
  'wholesalePrice',
  'retailPrice',
  'sellerNotes',
  'brand',
  'isEndemigoBrandCandidate',
  'productionProvince',
  'productionDistrict',
  'productContent',
  'barcodeNo',
  'geoIndicationReceivedAt',
  'geoIndicationCertNo',
  'geoIndicationRegion',
  'additionalCertificates',
  'featureBadges',
  'geoBadgeSelections',
  'sku',
  'weight',
  'dimensionWidth',
  'dimensionHeight',
  'dimensionDepth',
  'productionSeasons',
  'salesMonths',
  'images',
] as const;

export type MobileListingCreateOptionalField =
  (typeof MOBILE_LISTING_CREATE_OPTIONAL_FIELDS)[number];

export interface MobileListingCreateConfig {
  optionalFields: MobileListingCreateOptionalField[];
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
  listingCreate: MobileListingCreateConfig;
  otherSurfaces: MobileSurfaceSlotConfig[];
  preview: MobilePreviewConfig;
}

export interface MobileExperienceDocumentResponse {
  status: MobileConfigStatus;
  version: number;
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

function getDefaultListingCreateConfig(): MobileListingCreateConfig {
  return {
    optionalFields: [...MOBILE_LISTING_CREATE_OPTIONAL_FIELDS],
  };
}

function buildDefaultHomeSurfaceSlots(): MobileSurfaceSlotConfig[] {
  return [
    {
      id: 'home-search-bar',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 1,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Arama Barı', en: 'Search Bar' },
    },
    {
      id: 'home-hero-banners',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 2,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Hero Banner', en: 'Hero Banner' },
    },
    {
      id: 'home-entry-tiles',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 3,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Giriş Kartları', en: 'Entry Tiles' },
    },
    {
      id: 'home-listings',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 4,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'İlanlar Alanı', en: 'Listings Block' },
    },
    {
      id: 'home-categories',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 5,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Kategoriler', en: 'Categories' },
    },
    {
      id: 'home-recently-viewed',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 6,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Son Gezdiklerim', en: 'Recently Viewed' },
    },
    {
      id: 'home-discounted-products',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 7,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'İndirimli Ürünler', en: 'Discounted Products' },
    },
    {
      id: 'home-most-liked-products',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 8,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'En Çok Beğenilenler', en: 'Most Liked Products' },
    },
    {
      id: 'home-trust-bar',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 9,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Güven Barı', en: 'Trust Bar' },
    },
    {
      id: 'home-campaigns',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 10,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Kampanyalar', en: 'Campaigns' },
    },
    {
      id: 'home-blog',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 11,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Blog', en: 'Blog' },
    },
    {
      id: 'home-trust-hub',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 12,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Güven Merkezi', en: 'Trust Hub' },
    },
    {
      id: 'home-quick-tab-bar',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 13,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Hızlı Sekme Çubuğu', en: 'Quick Tab Bar' },
    },
  ];
}

function buildDefaultNonHomeSurfaceSlots(): MobileSurfaceSlotConfig[] {
  return [
    {
      id: 'buy-now-surface',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.BUY_NOW,
      enabled: true,
      order: 1,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Hemen Al', en: 'Buy Now' },
      subtitle: {
        tr: 'Yöresinden kapınıza 24 saatte teslimat',
        en: 'Direct from origin to your door',
      },
      cta: {
        label: { tr: 'Keşfet', en: 'Explore' },
        route: '/home',
      },
    },
  ];
}

function getDefaultSurfaceSlots(): MobileSurfaceSlotConfig[] {
  return [...buildDefaultHomeSurfaceSlots(), ...buildDefaultNonHomeSurfaceSlots()];
}

export function isMobileRoute(value: string): boolean {
  return /^\/[A-Za-z0-9\-_/()[\]]*$/.test(value);
}

function normalizeLegacyTurkishAscii(value: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/\bTumunu\b/g, 'Tümünü'],
    [/\bGor\b/g, 'Gör'],
    [/\bKesfet\b/g, 'Keşfet'],
    [/\bMuzayedeli\b/g, 'Müzayedeli'],
    [/\bMuzayede\b/g, 'Müzayede'],
    [/\bSatis\b/g, 'Satış'],
    [/\bCanli\b/g, 'Canlı'],
    [/\bBasladi\b/g, 'Başladı'],
    [/\bparcalar\b/g, 'parçalar'],
    [/\bicin\b/g, 'için'],
    [/\bsimdi\b/g, 'şimdi'],
    [/\bKesfettiklerim\b/g, 'Keşfettiklerim'],
    [/\bIlanlar\b/g, 'İlanlar'],
    [/\bIndirimdeki\b/g, 'İndirimdeki'],
    [/\bUrunler\b/g, 'Ürünler'],
    [/\bCok\b/g, 'Çok'],
    [/\bBegenilenler\b/g, 'Beğenilenler'],
    [/\bGuncel\b/g, 'Güncel'],
    [/\bGuven\b/g, 'Güven'],
    [/\bCografi\b/g, 'Coğrafi'],
    [/\bisaretli\b/g, 'işaretli'],
    [/\bIsaretli\b/g, 'İşaretli'],
    [/\burunler\b/g, 'ürünler'],
    [/\bkapiniza\b/g, 'kapınıza'],
    [/\bBali\b/g, 'Balı'],
    [/\bSinirli\b/g, 'Sınırlı'],
    [/\bkacirma\b/g, 'kaçırma'],
    [/\bFistigi\b/g, 'Fıstığı'],
    [/\bgecerli\b/g, 'geçerli'],
    [/\bAlisveris\b/g, 'Alışveriş'],
    [/\bAlin\b/g, 'Alın'],
    [/\bOne\b/g, 'Öne'],
    [/\bCikan\b/g, 'Çıkan'],
    [/\bIncele\b/g, 'İncele'],
    [/\bYonet\b/g, 'Yönet'],
    [/\bYoresinden\b/g, 'Yöresinden'],
  ];

  return replacements.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), value);
}

export function resolveLocalizedText(
  value: LocalizedText | undefined,
  locale: MobileLocale,
  fallback: string,
): string {
  const localized = value?.[locale] ?? value?.tr ?? value?.en;
  const resolved = typeof localized === 'string' && localized.trim().length > 0
    ? localized
    : fallback;
  return locale === 'tr' ? normalizeLegacyTurkishAscii(resolved) : resolved;
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
            tr: "Anadolu'nun Bereketli Topraklarından",
            en: 'From the fertile lands of Anatolia',
          },
          subtitle: {
            tr: 'Coğrafi işaretli ürünler kapınıza gelsin',
            en: 'Discover geographically indicated local goods',
          },
          imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
          cta: {
            label: { tr: 'Keşfet', en: 'Explore' },
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
          badge: { tr: 'Müzayedeli Satış', en: 'Auction Sales' },
          title: { tr: 'Canlı Müzayedeler Başladı!', en: 'Live auctions started!' },
          subtitle: {
            tr: 'Nadir parçalar için şimdi teklif ver',
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
            tr: 'Yöresinden kapınıza 24 saatte teslimat',
            en: 'Delivered from source to door in 24 hours',
          },
          cta: {
            label: { tr: 'Hemen Keşfet', en: 'Explore Now' },
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
          title: { tr: 'Müzayede', en: 'Auction' },
          subtitle: {
            tr: 'Eşsiz parçalar için teklifinizi hemen verin',
            en: 'Place your bid for unique pieces',
          },
          cta: {
            label: { tr: 'Hemen Keşfet', en: 'Explore Now' },
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
          title: { tr: 'Keşfettiklerim', en: 'What I explored' },
        },
        {
          id: 'listings',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 4,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'İlanlar', en: 'Listings' },
          seeAllLabel: { tr: 'Tümünü Gör', en: 'See All' },
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
          seeAllLabel: { tr: 'Tümünü Gör', en: 'See All' },
          route: '/(tabs)/categories',
        },
        {
          id: 'discounted-products',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 6,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'İndirimdeki Ürünler', en: 'Discounted Products' },
          seeAllLabel: { tr: 'Tümünü Gör', en: 'See All' },
          route: '/(tabs)/categories',
        },
        {
          id: 'most-liked-products',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 7,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'En Çok Beğenilenler', en: 'Most Liked' },
          seeAllLabel: { tr: 'Tümünü Gör', en: 'See All' },
          route: '/(tabs)/categories',
        },
        {
          id: 'campaigns',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 8,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Güncel Kampanyalar', en: 'Current Campaigns' },
          seeAllLabel: { tr: 'Tümünü Gör', en: 'See All' },
        },
        {
          id: 'blog',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 9,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Blog', en: 'Blog' },
          seeAllLabel: { tr: 'Tümünü Gör', en: 'See All' },
        },
        {
          id: 'trust-hub',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 10,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Güven Merkezi', en: 'Trust Hub' },
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
          title: { tr: "Karakovan Balı'nda %20 İndirim", en: '20% off honeycomb honey' },
          subtitle: {
            tr: 'Sınırlı stok, kaçırma!',
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
          title: { tr: "Siirt Fıstığı'nda %15 İndirim", en: '15% off pistachio' },
          subtitle: {
            tr: 'Hafta sonuna kadar geçerli',
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
          title: { tr: 'Güven Merkezi', en: 'Trust Hub' },
          subtitle: {
            tr: 'Orijinal • Otantik • Coğrafi İşaretli • Güvenli Alışveriş',
            en: 'Original • Authentic • Geographically Indicated • Secure Shopping',
          },
          cta: {
            label: { tr: 'Bildirim Alın', en: 'Notify Me' },
            route: '/(tabs)/notifications',
          },
        },
      ],
    },
    cards: {
      productCard: {
        surface: MobileSurfaceKey.PRODUCT_CARD,
        badge: { tr: 'Öne Çıkan', en: 'Featured' },
        ctaLabel: { tr: 'İncele', en: 'View' },
        showCategory: true,
        showPrice: true,
        showAskPriceBadge: true,
        audienceOverrides: {
          GUEST: {
            ctaLabel: { tr: 'İncele', en: 'View' },
          },
          BUYER: {
            ctaLabel: { tr: 'İncele', en: 'View' },
          },
          SELLER: {
            ctaLabel: { tr: 'Yönet', en: 'Manage' },
          },
        },
      },
    },
    auctions: {
      listCard: {
        surface: MobileSurfaceKey.AUCTIONS_LIST,
        ctaLabel: { tr: 'Teklif Ver', en: 'Bid Now' },
        liveBadgeLabel: { tr: 'Canlı', en: 'Live' },
        showBidCount: true,
        showStatusBadge: true,
        showTimer: true,
        audienceOverrides: {
          SELLER: {
            ctaLabel: { tr: 'İncele', en: 'View' },
          },
        },
      },
    },
    listingCreate: getDefaultListingCreateConfig(),
    otherSurfaces: getDefaultSurfaceSlots(),
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

function isListingCreateOptionalField(value: unknown): value is MobileListingCreateOptionalField {
  return (
    typeof value === 'string'
    && (MOBILE_LISTING_CREATE_OPTIONAL_FIELDS as readonly string[]).includes(value)
  );
}

function isListingCreateConfig(value: unknown): value is MobileListingCreateConfig {
  if (!isRecord(value) || !Array.isArray(value.optionalFields)) {
    return false;
  }

  return value.optionalFields.every((field) => isListingCreateOptionalField(field));
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

  if (
    !isRecord(value.home)
    || !isRecord(value.cards)
    || !isRecord(value.auctions)
    || !isRecord(value.listingCreate)
    || !isRecord(value.preview)
  ) {
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
    && isListingCreateConfig(value.listingCreate)
    && validateEvery(value.otherSurfaces, isSurfaceSlot)
    && Object.values(MobileAudience).includes(value.preview.defaultAudience as MobileAudience)
    && ['tr', 'en'].includes(String(value.preview.defaultLocale))
  );
}

export interface MobileConfigValidationError {
  path: string;
  code: string;
  message: string;
}

function addValidationError(
  errors: MobileConfigValidationError[],
  path: string,
  code: string,
  message: string,
) {
  errors.push({ path, code, message });
}

function hasLocalizedValue(value: LocalizedText | undefined): boolean {
  return Boolean(value?.tr?.trim() || value?.en?.trim());
}

function validateRoute(
  errors: MobileConfigValidationError[],
  path: string,
  routeValue: unknown,
  required: boolean,
) {
  if (typeof routeValue !== 'string' || routeValue.trim().length === 0) {
    if (required) {
      addValidationError(errors, path, 'REQUIRED_ROUTE', 'Route zorunludur.');
    }
    return;
  }

  if (!isMobileRoute(routeValue)) {
    addValidationError(errors, path, 'INVALID_ROUTE_FORMAT', 'Route / ile baslamali ve mobil formatta olmali.');
  }
}

function validateAudiences(
  errors: MobileConfigValidationError[],
  path: string,
  audiences: unknown,
) {
  if (!Array.isArray(audiences) || audiences.length === 0) {
    addValidationError(errors, path, 'AUDIENCE_REQUIRED', 'En az bir audience secilmelidir.');
    return;
  }

  if (!audiences.every((item) => Object.values(MobileAudience).includes(item as MobileAudience))) {
    addValidationError(errors, path, 'INVALID_AUDIENCE', 'Audience listesi gecersiz deger iceriyor.');
  }
}

function validateLocalizedRequired(
  errors: MobileConfigValidationError[],
  path: string,
  value: unknown,
) {
  if (!isLocalizedText(value, true) || !hasLocalizedValue(value as LocalizedText)) {
    addValidationError(errors, path, 'REQUIRED_LOCALIZED_TEXT', 'TR veya EN alani bos birakilamaz.');
  }
}

export function validateMobileExperienceConfig(value: unknown): MobileConfigValidationError[] {
  if (!isRecord(value)) {
    return [
      {
        path: 'draft',
        code: 'INVALID_MOBILE_CONFIG_PAYLOAD',
        message: 'Mobil konfigurasyon gecerli bir obje olmali.',
      },
    ];
  }

  const errors: MobileConfigValidationError[] = [];

  if (value.schemaVersion !== 1) {
    addValidationError(errors, 'schemaVersion', 'INVALID_SCHEMA_VERSION', 'schemaVersion degeri 1 olmali.');
  }

  if (!isRecord(value.home)) {
    addValidationError(errors, 'home', 'HOME_REQUIRED', 'home alani zorunludur.');
  } else {
    const sections = Array.isArray(value.home.sections) ? value.home.sections : [];
    if (sections.length === 0) {
      addValidationError(errors, 'home.sections', 'MIN_SECTION_REQUIRED', 'En az 1 home section bulunmali.');
    }

    sections.forEach((entry, index) => {
      if (!isRecord(entry)) {
        addValidationError(errors, `home.sections[${index}]`, 'INVALID_SECTION', 'Section yapisi gecersiz.');
        return;
      }

      validateAudiences(errors, `home.sections[${index}].audiences`, entry.audiences);
      validateRoute(errors, `home.sections[${index}].route`, entry.route, false);
      validateLocalizedRequired(errors, `home.sections[${index}].title`, entry.title);
    });

    if (Array.isArray(value.home.heroBanners)) {
      value.home.heroBanners.forEach((entry, index) => {
        if (!isRecord(entry)) return;
        validateAudiences(errors, `home.heroBanners[${index}].audiences`, entry.audiences);
        validateLocalizedRequired(errors, `home.heroBanners[${index}].title`, entry.title);
        if (!isNonEmptyString(entry.imageUrl)) {
          addValidationError(errors, `home.heroBanners[${index}].imageUrl`, 'REQUIRED_IMAGE_URL', 'Gorsel URL zorunludur.');
        }
        validateRoute(errors, `home.heroBanners[${index}].cta.route`, isRecord(entry.cta) ? entry.cta.route : undefined, false);
      });
    }

    if (Array.isArray(value.home.entryTiles)) {
      value.home.entryTiles.forEach((entry, index) => {
        if (!isRecord(entry)) return;
        validateAudiences(errors, `home.entryTiles[${index}].audiences`, entry.audiences);
        validateLocalizedRequired(errors, `home.entryTiles[${index}].title`, entry.title);
        validateRoute(errors, `home.entryTiles[${index}].cta.route`, isRecord(entry.cta) ? entry.cta.route : undefined, true);
      });
    }
  }

  if (!isRecord(value.cards) || !isRecord(value.cards.productCard)) {
    addValidationError(errors, 'cards.productCard', 'PRODUCT_CARD_REQUIRED', 'Product card ayarlari zorunludur.');
  } else {
    validateLocalizedRequired(errors, 'cards.productCard.ctaLabel', value.cards.productCard.ctaLabel);
  }

  if (!isRecord(value.auctions) || !isRecord(value.auctions.listCard)) {
    addValidationError(errors, 'auctions.listCard', 'AUCTION_CARD_REQUIRED', 'Auction list card ayarlari zorunludur.');
  } else {
    validateLocalizedRequired(errors, 'auctions.listCard.ctaLabel', value.auctions.listCard.ctaLabel);
  }

  if (!isRecord(value.listingCreate) || !Array.isArray(value.listingCreate.optionalFields)) {
    addValidationError(errors, 'listingCreate.optionalFields', 'LISTING_CREATE_REQUIRED', 'Ilan verme alanlari zorunludur.');
  } else if (
    !value.listingCreate.optionalFields.every((field) => isListingCreateOptionalField(field))
  ) {
    addValidationError(errors, 'listingCreate.optionalFields', 'INVALID_LISTING_CREATE_FIELD', 'Ilan verme alanlarinda gecersiz deger var.');
  }

  if (!Array.isArray(value.otherSurfaces)) {
    addValidationError(errors, 'otherSurfaces', 'OTHER_SURFACES_INVALID', 'otherSurfaces bir liste olmali.');
  } else {
    value.otherSurfaces.forEach((entry, index) => {
      if (!isRecord(entry)) {
        addValidationError(errors, `otherSurfaces[${index}]`, 'INVALID_SURFACE', 'Surface kaydi gecersiz.');
        return;
      }
      validateAudiences(errors, `otherSurfaces[${index}].audiences`, entry.audiences);
      validateLocalizedRequired(errors, `otherSurfaces[${index}].title`, entry.title);
      validateRoute(errors, `otherSurfaces[${index}].cta.route`, isRecord(entry.cta) ? entry.cta.route : undefined, false);
    });
  }

  if (!isRecord(value.preview)) {
    addValidationError(errors, 'preview', 'PREVIEW_REQUIRED', 'preview alani zorunludur.');
  } else {
    if (!Object.values(MobileAudience).includes(value.preview.defaultAudience as MobileAudience)) {
      addValidationError(errors, 'preview.defaultAudience', 'INVALID_DEFAULT_AUDIENCE', 'Varsayilan audience gecersiz.');
    }
    if (!['tr', 'en'].includes(String(value.preview.defaultLocale))) {
      addValidationError(errors, 'preview.defaultLocale', 'INVALID_DEFAULT_LOCALE', 'Varsayilan dil tr veya en olmali.');
    }
  }

  if (errors.length === 0 && !isMobileExperienceConfig(value)) {
    addValidationError(
      errors,
      'draft',
      'INVALID_MOBILE_CONFIG_PAYLOAD',
      'Mobil konfigurasyon semasi gecersiz.',
    );
  }

  return errors;
}

export function sanitizeMobileExperienceConfig(value: unknown): MobileExperienceConfig {
  const ensureDefaultSurfaceSlotsForConfig = (
    config: MobileExperienceConfig,
  ): MobileExperienceConfig => {
    const defaultSlots = getDefaultSurfaceSlots();
    const currentSlots = Array.isArray(config.otherSurfaces)
      ? config.otherSurfaces
      : [];
    const currentSlotIds = new Set(currentSlots.map((slot) => slot.id));
    const missingSlots = defaultSlots.filter((slot) => !currentSlotIds.has(slot.id));
    if (missingSlots.length === 0) {
      return config;
    }
    return {
      ...config,
      otherSurfaces: [...currentSlots, ...missingSlots],
    };
  };

  if (isMobileExperienceConfig(value)) {
    return clone(ensureDefaultSurfaceSlotsForConfig(value));
  }

  if (!isRecord(value)) {
    return getDefaultMobileExperienceConfig();
  }

  const withListingCreate = {
    ...value,
    listingCreate: isListingCreateConfig(value.listingCreate)
      ? value.listingCreate
      : getDefaultListingCreateConfig(),
  };

  return isMobileExperienceConfig(withListingCreate)
    ? clone(ensureDefaultSurfaceSlotsForConfig(withListingCreate))
    : getDefaultMobileExperienceConfig();
}
