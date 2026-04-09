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
  icon: string;
  color?: string;
  productCount?: number;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  sellerName: string;
  price: number;
  oldPrice?: number;
  thumbnail?: string;
  images?: string[];
  description?: string;
  listingType?: ListingType;
  condition?: ProductCondition;
  status?: ProductStatus;
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
  date?: string;
  image?: string;
}
