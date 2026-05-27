import type { ImagePickerAsset } from 'expo-image-picker';

export const PRODUCT_CREATE_LISTING_TYPES = {
  DIRECT_SALE: 'DIRECT_SALE',
  AUCTION: 'AUCTION',
} as const;

export type ProductCreateListingType =
  (typeof PRODUCT_CREATE_LISTING_TYPES)[keyof typeof PRODUCT_CREATE_LISTING_TYPES];

export const PRODUCT_CREATE_CONDITIONS = {
  NEW: 'NEW',
  EXCELLENT: 'EXCELLENT',
  VERY_GOOD: 'VERY_GOOD',
  GOOD: 'GOOD',
} as const;

export type ProductCreateCondition =
  (typeof PRODUCT_CREATE_CONDITIONS)[keyof typeof PRODUCT_CREATE_CONDITIONS];

export const PRODUCT_CREATE_AUCTION_TYPES = {
  REALTIME: 'REALTIME',
  TIMED: 'TIMED',
} as const;

export type ProductCreateAuctionType =
  (typeof PRODUCT_CREATE_AUCTION_TYPES)[keyof typeof PRODUCT_CREATE_AUCTION_TYPES];

export const PRODUCT_CREATE_PRODUCTION_SEASONS = {
  ALL_TIME: 'ALL_TIME',
  SPRING: 'SPRING',
  SUMMER: 'SUMMER',
  AUTUMN: 'AUTUMN',
  WINTER: 'WINTER',
} as const;

export type ProductCreateProductionSeason =
  (typeof PRODUCT_CREATE_PRODUCTION_SEASONS)[keyof typeof PRODUCT_CREATE_PRODUCTION_SEASONS];

export type ProductCreateWizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ProductCreateEntryMode = 'MARKETPLACE' | 'AUCTION';

export type ProductCreateDynamicFieldValue = string | number | boolean | string[];

export interface ProductCreateVariantSkuDraft {
  colorVariantNumberId?: string;
  sizeVariantNumberId?: string;
  skuCode?: string;
  stockQuantity?: number;
  priceOverride?: number;
  imageUrl?: string;
  isActive?: boolean;
}

export interface ProductCreateImageDraft {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
}

export interface ProductCreateWizardState {
  listingType: ProductCreateListingType;
  title: string;
  categoryId: string;
  directSalePrice: string;
  stockQuantity: string;
  description: string;
  condition: ProductCreateCondition;
  originCountry: string;
  originRegion: string;
  askPriceEnabled: boolean;
  askPriceMinAmount: string;
  auctionStartPrice: string;
  auctionMinIncrement: string;
  auctionReservePrice: string;
  auctionStartTime: string;
  auctionEndTime: string;
  auctionType: ProductCreateAuctionType;
  antiSnipingEnabled: boolean;
  extensionSeconds: string;
  maxExtensions: string;
  selectedAuctionStartDelayHours?: number | null;
  selectedAuctionDurationHours?: number | null;
  sku: string;
  geoIndicationCertNo: string;
  geoIndicationRegion: string;
  geoIndicationReceivedAt: string;
  barcodeNo: string;
  productContent: string;
  sellerNotes: string;
  brand: string;
  isEndemigoBrandCandidate: boolean;
  productionProvince: string;
  productionDistrict: string;
  productionSeasons: ProductCreateProductionSeason[];
  salesMonths: number[];
  wholesalePrice: string;
  retailPrice: string;
  shippingProvince: string;
  shippingDistrict: string;
  shippingAddress: string;
  deliveryTemplateDomestic: string;
  deliveryTemplateInternational: string;
  desiDomestic: string;
  desiInternational: string;
  featureBadges: string[];
  geoBadgeSelections: string[];
  additionalCertificates: string;
  weight: string;
  dimensionWidth: string;
  dimensionHeight: string;
  dimensionDepth: string;
  dynamicFieldValues: Record<string, ProductCreateDynamicFieldValue>;
  variantSkus: ProductCreateVariantSkuDraft[];
}

export type ProductCreatePickerAsset = Pick<
  ImagePickerAsset,
  'uri' | 'fileName' | 'mimeType' | 'width' | 'height' | 'fileSize' | 'assetId'
>;
