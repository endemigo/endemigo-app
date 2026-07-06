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
  bannerId?: string;
}

export const MOBILE_HOME_SURFACE_SLOT_IDS = [
  'home-search-bar',
  'home-hero-banners',
  'home-entry-tiles',
  'home-live-auctions',
  'home-listings',
  'home-recently-viewed',
  'home-categories',
  'home-category-products',
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
  categoryFields?: Record<string, MobileListingCreateOptionalField[]>;
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
      id: 'home-recently-viewed',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 5,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Son Gezdiklerim', en: 'Recently Viewed' },
    },
    {
      id: 'home-categories',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 6,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Kategoriler', en: 'Categories' },
    },
    {
      id: 'home-category-products',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 7,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Kategori Ürünleri', en: 'Category Products' },
    },
    {
      id: 'home-discounted-products',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 8,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'İndirimli Ürünler', en: 'Discounted Products' },
    },
    {
      id: 'home-most-liked-products',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 9,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'En Çok Beğenilenler', en: 'Most Liked Products' },
    },
    {
      id: 'home-trust-bar',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: false,
      order: 10,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Güven Barı', en: 'Trust Bar' },
    },
    {
      id: 'home-campaigns',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 11,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Kampanyalar', en: 'Campaigns' },
    },
    {
      id: 'home-blog',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 12,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Blog', en: 'Blog' },
    },
    {
      id: 'home-trust-hub',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 13,
      audiences: [...DEFAULT_AUDIENCES],
      title: { tr: 'Güven Merkezi', en: 'Trust Hub' },
    },
    {
      id: 'home-quick-tab-bar',
      type: MobileBlockType.SURFACE_SLOT,
      surface: MobileSurfaceKey.HOME,
      enabled: true,
      order: 14,
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
          id: 'category-products',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 6,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Kategori Ürünleri', en: 'Category Products' },
          seeAllLabel: { tr: 'Tümünü Gör', en: 'See All' },
          route: '/(tabs)/categories',
        },
        {
          id: 'discounted-products',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 7,
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
          order: 8,
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
          order: 9,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Güncel Kampanyalar', en: 'Current Campaigns' },
          seeAllLabel: { tr: 'Tümünü Gör', en: 'See All' },
        },
        {
          id: 'blog',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 10,
          audiences: [...DEFAULT_AUDIENCES],
          title: { tr: 'Blog', en: 'Blog' },
          seeAllLabel: { tr: 'Tümünü Gör', en: 'See All' },
        },
        {
          id: 'trust-hub',
          type: MobileBlockType.HOME_SECTION,
          surface: MobileSurfaceKey.HOME,
          enabled: true,
          order: 11,
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
  const validTr = tr === undefined || typeof tr === 'string';
  const validEn = en === undefined || typeof en === 'string';
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

  if (!isNonEmptyString(value.route)) {
    return !required;
  }

  if (!isMobileRoute(value.route)) {
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

  if (value.categoryFields !== undefined) {
    if (!isRecord(value.categoryFields)) {
      return false;
    }
    for (const fields of Object.values(value.categoryFields)) {
      if (!Array.isArray(fields) || !fields.every((field) => isListingCreateOptionalField(field))) {
        return false;
      }
    }
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
  return isRecord(value) && validateMobileExperienceConfig(value).length === 0;
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

  // Yalnizca etkin (enabled) bloklar dogrulanir: kapali bloklar taslakta eksik kalabilir.
  const validateBlocks = (
    list: unknown,
    basePath: string,
    options: { requireTitle: boolean; routeOf?: (block: Record<string, unknown>) => unknown },
  ) => {
    if (list === undefined || list === null) {
      return;
    }
    if (!Array.isArray(list)) {
      addValidationError(errors, basePath, 'INVALID_BLOCK_LIST', 'Blok listesi bir dizi olmali.');
      return;
    }
    list.forEach((block, index) => {
      if (!isRecord(block)) {
        addValidationError(errors, `${basePath}[${index}]`, 'INVALID_BLOCK', 'Blok gecerli bir obje olmali.');
        return;
      }
      if (block.enabled === false) {
        return;
      }
      const path = `${basePath}[${index}]`;
      if (options.requireTitle) {
        validateLocalizedRequired(errors, `${path}.title`, block.title);
      }
      validateAudiences(errors, `${path}.audiences`, block.audiences);
      const routeValue = options.routeOf
        ? options.routeOf(block)
        : (isRecord(block.cta) ? block.cta.route : undefined);
      validateRoute(errors, `${path}.route`, routeValue, false);
    });
  };

  const home = isRecord(value.home) ? value.home : null;
  if (home) {
    validateBlocks(home.heroBanners, 'home.heroBanners', { requireTitle: true });
    validateBlocks(home.entryTiles, 'home.entryTiles', { requireTitle: true });
    validateBlocks(home.sections, 'home.sections', {
      requireTitle: true,
      routeOf: (block) => block.route,
    });
    validateBlocks(home.promoBanners, 'home.promoBanners', { requireTitle: true });
    validateBlocks(home.trustBlocks, 'home.trustBlocks', { requireTitle: true });
  } else if (value.home !== undefined) {
    addValidationError(errors, 'home', 'INVALID_HOME_CONFIG', 'home alani gecerli bir obje olmali.');
  }

  validateBlocks(value.otherSurfaces, 'otherSurfaces', { requireTitle: false });

  return errors;
}

export function sanitizeMobileExperienceConfig(value: unknown): MobileExperienceConfig {
  const defaults = getDefaultMobileExperienceConfig();
  
  if (!isRecord(value)) {
    return defaults;
  }

  // Helper to ensure localized text is valid
  const sanitizeLocalized = (val: unknown, fallback: LocalizedText): LocalizedText => {
    if (isRecord(val)) {
      return {
        tr: typeof val.tr === 'string' ? val.tr : fallback.tr,
        en: typeof val.en === 'string' ? val.en : fallback.en,
      };
    }
    return fallback;
  };

  // Helper to ensure audiences is a valid array of MobileAudience
  const sanitizeAudiences = (val: unknown, fallback: MobileAudience[]): MobileAudience[] => {
    if (Array.isArray(val) && val.length > 0) {
      const filtered = val.filter(item => Object.values(MobileAudience).includes(item as MobileAudience));
      if (filtered.length > 0) {
        return filtered as MobileAudience[];
      }
    }
    return fallback;
  };

  // Helper to ensure route is valid
  const sanitizeRoute = (val: unknown, fallback: string): string => {
    return typeof val === 'string' ? val : fallback;
  };

  // Start with default template
  const config = clone(defaults);

  // Merge home heroBanners
  const homeVal = isRecord(value.home) ? value.home : {};
  if (Array.isArray(homeVal.heroBanners)) {
    config.home.heroBanners = homeVal.heroBanners.map((banner, index) => {
      const defBanner = defaults.home.heroBanners[0] || {};
      if (!isRecord(banner)) return clone(defBanner);
      return {
        id: typeof banner.id === 'string' ? banner.id : `hero-${index}`,
        type: MobileBlockType.HERO_BANNER,
        surface: MobileSurfaceKey.HOME,
        enabled: typeof banner.enabled === 'boolean' ? banner.enabled : true,
        order: typeof banner.order === 'number' ? banner.order : index + 1,
        audiences: sanitizeAudiences(banner.audiences, defBanner.audiences || [MobileAudience.GUEST, MobileAudience.BUYER, MobileAudience.SELLER]),
        badge: isRecord(banner.badge) ? sanitizeLocalized(banner.badge, { tr: '', en: '' }) : undefined,
        title: sanitizeLocalized(banner.title, defBanner.title),
        subtitle: isRecord(banner.subtitle) ? sanitizeLocalized(banner.subtitle, { tr: '', en: '' }) : undefined,
        imageUrl: typeof banner.imageUrl === 'string' ? banner.imageUrl : (defBanner.imageUrl || ''),
        cta: isRecord(banner.cta) ? {
          label: sanitizeLocalized(banner.cta.label, (defBanner.cta && defBanner.cta.label) || { tr: '', en: '' }),
          route: sanitizeRoute(banner.cta.route, (defBanner.cta && defBanner.cta.route) || ''),
        } : undefined,
      };
    });
  }

  // Merge home entryTiles
  if (Array.isArray(homeVal.entryTiles)) {
    config.home.entryTiles = homeVal.entryTiles.map((tile, index) => {
      const defTile = defaults.home.entryTiles[index] || defaults.home.entryTiles[0] || {};
      if (!isRecord(tile)) return clone(defTile);
      return {
        id: typeof tile.id === 'string' ? tile.id : `tile-${index}`,
        type: MobileBlockType.ENTRY_TILE,
        surface: MobileSurfaceKey.HOME,
        enabled: typeof tile.enabled === 'boolean' ? tile.enabled : true,
        order: typeof tile.order === 'number' ? tile.order : index + 1,
        audiences: sanitizeAudiences(tile.audiences, defTile.audiences || [MobileAudience.GUEST, MobileAudience.BUYER, MobileAudience.SELLER]),
        title: sanitizeLocalized(tile.title, defTile.title),
        subtitle: isRecord(tile.subtitle) ? sanitizeLocalized(tile.subtitle, { tr: '', en: '' }) : undefined,
        cta: {
          label: sanitizeLocalized(isRecord(tile.cta) ? tile.cta.label : undefined, defTile.cta?.label || { tr: '', en: '' }),
          route: sanitizeRoute(isRecord(tile.cta) ? tile.cta.route : undefined, defTile.cta?.route || ''),
        },
      };
    });
  }

  // Merge home sections
  if (Array.isArray(homeVal.sections)) {
    config.home.sections = homeVal.sections.map((sec, index) => {
      const defSec = (defaults.home.sections.find(s => s.id === sec.id) || defaults.home.sections[index] || defaults.home.sections[0]) as MobileHomeSectionConfig;
      if (!isRecord(sec)) return clone(defSec);
      return {
        id: typeof sec.id === 'string' ? sec.id : `section-${index}`,
        type: MobileBlockType.HOME_SECTION,
        surface: MobileSurfaceKey.HOME,
        enabled: typeof sec.enabled === 'boolean' ? sec.enabled : true,
        order: typeof sec.order === 'number' ? sec.order : index + 1,
        audiences: sanitizeAudiences(sec.audiences, defSec.audiences || [MobileAudience.GUEST, MobileAudience.BUYER, MobileAudience.SELLER]),
        title: sanitizeLocalized(sec.title, defSec.title || { tr: '', en: '' }),
        seeAllLabel: isRecord(sec.seeAllLabel) ? sanitizeLocalized(sec.seeAllLabel, { tr: '', en: '' }) : undefined,
        route: typeof sec.route === 'string' ? sec.route : undefined,
      };
    });
  }

  // Merge home promoBanners
  if (Array.isArray(homeVal.promoBanners)) {
    config.home.promoBanners = homeVal.promoBanners.map((promo, index) => {
      const defPromo = defaults.home.promoBanners[index] || defaults.home.promoBanners[0] || {};
      if (!isRecord(promo)) return clone(defPromo);
      return {
        id: typeof promo.id === 'string' ? promo.id : `promo-${index}`,
        type: MobileBlockType.PROMO_BANNER,
        surface: MobileSurfaceKey.HOME,
        enabled: typeof promo.enabled === 'boolean' ? promo.enabled : true,
        order: typeof promo.order === 'number' ? promo.order : index + 1,
        audiences: sanitizeAudiences(promo.audiences, defPromo.audiences || [MobileAudience.GUEST, MobileAudience.BUYER, MobileAudience.SELLER]),
        label: isRecord(promo.label) ? sanitizeLocalized(promo.label, { tr: '', en: '' }) : undefined,
        title: sanitizeLocalized(promo.title, defPromo.title),
        subtitle: isRecord(promo.subtitle) ? sanitizeLocalized(promo.subtitle, { tr: '', en: '' }) : undefined,
        imageUrl: typeof promo.imageUrl === 'string' ? promo.imageUrl : (defPromo.imageUrl || ''),
        cta: isRecord(promo.cta) ? {
          label: sanitizeLocalized(promo.cta.label, (defPromo.cta && defPromo.cta.label) || { tr: '', en: '' }),
          route: sanitizeRoute(promo.cta.route, (defPromo.cta && defPromo.cta.route) || ''),
        } : undefined,
      };
    });
  }

  // Merge home trustBlocks
  if (Array.isArray(homeVal.trustBlocks)) {
    config.home.trustBlocks = homeVal.trustBlocks.map((trust, index) => {
      const defTrust = defaults.home.trustBlocks[index] || defaults.home.trustBlocks[0] || {};
      if (!isRecord(trust)) return clone(defTrust);
      return {
        id: typeof trust.id === 'string' ? trust.id : `trust-${index}`,
        type: MobileBlockType.TRUST_BLOCK,
        surface: MobileSurfaceKey.HOME,
        enabled: typeof trust.enabled === 'boolean' ? trust.enabled : true,
        order: typeof trust.order === 'number' ? trust.order : index + 1,
        audiences: sanitizeAudiences(trust.audiences, defTrust.audiences || [MobileAudience.GUEST, MobileAudience.BUYER, MobileAudience.SELLER]),
        title: sanitizeLocalized(trust.title, defTrust.title),
        subtitle: isRecord(trust.subtitle) ? sanitizeLocalized(trust.subtitle, { tr: '', en: '' }) : undefined,
        cta: isRecord(trust.cta) ? {
          label: sanitizeLocalized(trust.cta.label, (defTrust.cta && defTrust.cta.label) || { tr: '', en: '' }),
          route: sanitizeRoute(trust.cta.route, (defTrust.cta && defTrust.cta.route) || ''),
        } : undefined,
      };
    });
  }

  // Merge cards
  const cardsVal = isRecord(value.cards) ? value.cards : {};
  const pcVal = isRecord(cardsVal.productCard) ? cardsVal.productCard : {};
  config.cards.productCard = {
    surface: MobileSurfaceKey.PRODUCT_CARD,
    badge: isRecord(pcVal.badge) ? sanitizeLocalized(pcVal.badge, { tr: '', en: '' }) : undefined,
    ctaLabel: sanitizeLocalized(pcVal.ctaLabel, defaults.cards.productCard.ctaLabel as LocalizedText),
    showCategory: typeof pcVal.showCategory === 'boolean' ? pcVal.showCategory : defaults.cards.productCard.showCategory,
    showPrice: typeof pcVal.showPrice === 'boolean' ? pcVal.showPrice : defaults.cards.productCard.showPrice,
    showAskPriceBadge: typeof pcVal.showAskPriceBadge === 'boolean' ? pcVal.showAskPriceBadge : defaults.cards.productCard.showAskPriceBadge,
    audienceOverrides: isRecord(pcVal.audienceOverrides) ? pcVal.audienceOverrides as any : defaults.cards.productCard.audienceOverrides,
  };

  // Merge auctions
  const auctionsVal = isRecord(value.auctions) ? value.auctions : {};
  const acVal = isRecord(auctionsVal.listCard) ? auctionsVal.listCard : {};
  config.auctions.listCard = {
    surface: MobileSurfaceKey.AUCTIONS_LIST,
    ctaLabel: sanitizeLocalized(acVal.ctaLabel, defaults.auctions.listCard.ctaLabel as LocalizedText),
    liveBadgeLabel: sanitizeLocalized(acVal.liveBadgeLabel || (defaults.auctions.listCard as any).liveBadgeLabel, { tr: 'Canlı', en: 'Live' }),
    showBidCount: typeof acVal.showBidCount === 'boolean' ? acVal.showBidCount : defaults.auctions.listCard.showBidCount,
    showStatusBadge: typeof acVal.showStatusBadge === 'boolean' ? acVal.showStatusBadge : defaults.auctions.listCard.showStatusBadge,
    showTimer: typeof acVal.showTimer === 'boolean' ? acVal.showTimer : defaults.auctions.listCard.showTimer,
    audienceOverrides: isRecord(acVal.audienceOverrides) ? acVal.audienceOverrides as any : defaults.auctions.listCard.audienceOverrides,
  };

  // Merge listingCreate
  const lcVal = isRecord(value.listingCreate) ? value.listingCreate : {};
  config.listingCreate = {
    optionalFields: Array.isArray(lcVal.optionalFields) ? lcVal.optionalFields : defaults.listingCreate.optionalFields,
    categoryFields: isRecord(lcVal.categoryFields) ? lcVal.categoryFields as any : defaults.listingCreate.categoryFields,
  };

  // Merge otherSurfaces
  if (Array.isArray(value.otherSurfaces)) {
    const defaultSlots = getDefaultSurfaceSlots();
    const currentSlots = value.otherSurfaces.map((slot, index) => {
      const defSlot = defaultSlots[index] || defaultSlots[0] || {};
      if (!isRecord(slot)) return clone(defSlot);
      return {
        id: typeof slot.id === 'string' ? slot.id : `slot-${index}`,
        type: MobileBlockType.SURFACE_SLOT,
        surface: typeof slot.surface === 'string' ? slot.surface : (defSlot.surface || ''),
        enabled: typeof slot.enabled === 'boolean' ? slot.enabled : true,
        order: typeof slot.order === 'number' ? slot.order : index + 1,
        audiences: sanitizeAudiences(slot.audiences, defSlot.audiences || [MobileAudience.GUEST, MobileAudience.BUYER, MobileAudience.SELLER]),
        title: sanitizeLocalized(slot.title, defSlot.title || { tr: '', en: '' }),
        subtitle: sanitizeLocalized(slot.subtitle, defSlot.subtitle || { tr: '', en: '' }),
        cta: isRecord(slot.cta) ? {
          label: sanitizeLocalized(slot.cta.label, (defSlot.cta && defSlot.cta.label) || { tr: '', en: '' }),
          route: sanitizeRoute(slot.cta.route, (defSlot.cta && defSlot.cta.route) || ''),
        } : { label: { tr: '', en: '' }, route: '' },
        bannerId: typeof slot.bannerId === 'string' ? slot.bannerId : undefined,
      };
    });

    const currentSlotIds = new Set(currentSlots.map((slot) => slot.id));
    const missingSlots = defaultSlots.filter((slot) => !currentSlotIds.has(slot.id));
    config.otherSurfaces = [...currentSlots, ...missingSlots] as any;
  } else {
    config.otherSurfaces = defaults.otherSurfaces;
  }

  // Merge preview
  const prevVal = isRecord(value.preview) ? value.preview : {};
  config.preview = {
    defaultAudience: typeof prevVal.defaultAudience === 'string' && Object.values(MobileAudience).includes(prevVal.defaultAudience as MobileAudience) ? (prevVal.defaultAudience as MobileAudience) : defaults.preview.defaultAudience,
    defaultLocale: prevVal.defaultLocale === 'tr' || prevVal.defaultLocale === 'en' ? prevVal.defaultLocale : defaults.preview.defaultLocale,
  };

  return config;
}
