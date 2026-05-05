/**
 * Shared type'lardan gelen enum ve tipler
 * Yeni tipler shared-types/'a eklenmelidir.
 */
import {
  AuctionStatus,
  ProductStatus,
  ProductCondition,
  ListingType,
  BidStatus,
} from '@endemigo/shared';

export {
  AuctionStatus,
  ProductStatus,
  ProductCondition,
  ListingType,
  BidStatus,
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
