/**
 * Shared type'lardan gelen enum ve tipler
 * Yeni tipler shared-types/'a eklenmelidir.
 */
import {
  AuctionStatus,
  ProductStatus,
  ProductCondition,
  ProductProductionSeason,
  ListingType,
  BidStatus,
  GeoIndicationType,
} from '@endemigo/shared';

export {
  AuctionStatus,
  ProductStatus,
  ProductCondition,
  ProductProductionSeason,
  ListingType,
  BidStatus,
  GeoIndicationType,
};

// ==========================================
// Mobile-specific types (API response shapes)
// ==========================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  isSeller?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  icon?: string;
  color?: string;
  productCount?: number;
  children?: Category[];
}

export interface ProductImage {
  id: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductReview {
  id?: string;
  rating: number;
  comment: string;
  createdAt?: string;
}

export interface ProductVariantOption {
  id: string;
  label: string;
  kind: 'COLOR' | 'SIZE' | 'NUMBER' | 'OPTION' | 'VARIATION';
  swatchHex?: string | null;
  imageUrl?: string | null;
  inStock?: boolean;
  stockQuantity?: number | null;
}

export interface ProductVariantSku {
  id: string;
  colorVariantNumberId?: string | null;
  sizeVariantNumberId?: string | null;
  colorVariant?: {
    id: string;
    kind?: 'COLOR' | 'SIZE' | 'NUMBER' | 'OPTION' | 'VARIATION';
    nameTr?: string | null;
    nameEn?: string | null;
    swatchHex?: string | null;
  } | null;
  sizeVariant?: {
    id: string;
    kind?: 'COLOR' | 'SIZE' | 'NUMBER' | 'OPTION' | 'VARIATION';
    nameTr?: string | null;
    nameEn?: string | null;
    swatchHex?: string | null;
  } | null;
  skuCode?: string | null;
  stockQuantity?: number;
  priceOverride?: number | null;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  sellerName: string;
  sellerId?: string;
  price: number | null;
  oldPrice?: number;
  imageUrl?: string;
  thumbnail?: string;
  images?: ProductImage[];
  description?: string;
  listingType?: ListingType;
  condition?: ProductCondition;
  status?: ProductStatus;
  askPriceEnabled?: boolean;
  askPriceMinAmount?: number | null;
  geoIndicationType?: GeoIndicationType | null;
  geoIndicationTypes?: GeoIndicationType[];
  geoIndicationCertNo?: string | null;
  geoIndicationRegion?: string | null;
  geoIndicationReceivedAt?: string | null;
  originCountry?: string | null;
  originRegion?: string | null;
  barcodeNo?: string | null;
  productContent?: string | null;
  sellerNotes?: string | null;
  brand?: string | null;
  isEndemigoBrandCandidate?: boolean;
  productionProvince?: string | null;
  productionDistrict?: string | null;
  productionSeason?: ProductProductionSeason;
  productionSeasons?: ProductProductionSeason[];
  salesMonths?: number[];
  wholesalePrice?: number | null;
  retailPrice?: number | null;
  shippingProvince?: string | null;
  shippingDistrict?: string | null;
  shippingAddress?: string | null;
  deliveryTemplateDomestic?: string | null;
  deliveryTemplateInternational?: string | null;
  desiDomestic?: string | null;
  desiInternational?: string | null;
  additionalCertificates?: string | null;
  featureBadges?: string[];
  geoBadgeSelections?: string[];
  sku?: string | null;
  weight?: number | null;
  dimensionWidth?: number | null;
  dimensionHeight?: number | null;
  dimensionDepth?: number | null;
  variantOptions?: ProductVariantOption[];
  variantSkus?: ProductVariantSku[];
  trustBadge?: string | { level?: string; labelKey?: string } | null;
  trustBadges?: string[];
  rating?: number | null;
  reviewCount?: number | null;
  latestReviewComment?: string | null;
  reviews?: ProductReview[];
  favoriteCount?: number;
  isFavorited?: boolean;
  favoritedAt?: string;
  isSponsored?: boolean;
  visibilityBoost?: number;
  createdAt?: string;
}

export enum NegotiationStatus {
  OPEN = 'OPEN',
  NEGOTIATING = 'NEGOTIATING',
  OFFER_PENDING = 'OFFER_PENDING',
  ACCEPTED = 'ACCEPTED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum NegotiationOfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  COUNTER_OFFERED = 'COUNTER_OFFERED',
  CANCELLED = 'CANCELLED',
}

export enum NegotiationMessageType {
  TEXT = 'TEXT',
  OFFER = 'OFFER',
  COUNTER_OFFER = 'COUNTER_OFFER',
  SYSTEM = 'SYSTEM',
  VIOLATION = 'VIOLATION',
}

export interface NegotiationParticipant {
  id: string;
  name: string;
}

export interface NegotiationProductSummary {
  id: string;
  title: string;
  imageUrl?: string | null;
  sellerId?: string;
  sellerName?: string;
  askPriceMinAmount?: number | null;
}

export interface NegotiationOffer {
  id: string;
  negotiationId: string;
  amount: number;
  quantity: number;
  currency: string;
  status: NegotiationOfferStatus;
  createdById: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface NegotiationMessage {
  id: string;
  negotiationId: string;
  senderId: string;
  senderName?: string;
  type: NegotiationMessageType;
  body: string;
  offerId?: string | null;
  offer?: NegotiationOffer | null;
  createdAt: string;
}

export interface Negotiation {
  id: string;
  product: NegotiationProductSummary;
  buyer: NegotiationParticipant;
  seller: NegotiationParticipant;
  status: NegotiationStatus;
  latestMessage?: NegotiationMessage | null;
  latestOffer?: NegotiationOffer | null;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StartNegotiationInput {
  productId: string;
  amount: number;
  quantity: number;
  note?: string;
}

export interface SendNegotiationMessageInput {
  negotiationId: string;
  body: string;
}

export interface CreateNegotiationOfferInput {
  negotiationId: string;
  amount: number;
  quantity: number;
  expiresInHours: 12 | 24 | 48 | 72;
  note?: string;
}

export interface Bid {
  id: string;
  bidderName: string;
  amount: number;
  isAutoBid: boolean;
  time: string;
}

export interface Blog {
  id: string | number;
  title: string;
  category: string;
  excerpt: string;
  readTime: string;
  image?: string;
  slug?: string;
  body?: string;
  publishedAt?: string;
}

export interface SellerProfile {
  id: string;
  name: string;
  avatar?: string;
  banner?: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  totalSales: number;
  description?: string;
  location?: string;
  since?: string;
  trustBadges: string[];
}
