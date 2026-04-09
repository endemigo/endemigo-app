/**
 * Merkezi API Yanıt Kodları
 * CONVENTION #12: Tüm backend yanıtları { code, message, ...data } formatında olmalıdır.
 * Yeni endpoint yazıldığında ilgili kodu BURAYA eklenmek ZORUNLUDUR.
 */

// ==========================================
// Auth
// ==========================================
export const AUTH = {
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  TOKEN_REFRESHED: 'TOKEN_REFRESHED',
  LOGOUT_SUCCESS: 'LOGOUT_SUCCESS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
} as const;

// ==========================================
// User / Profile
// ==========================================
export const USER = {
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  PHONE_ALREADY_EXISTS: 'PHONE_ALREADY_EXISTS',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  ACCOUNT_REACTIVATED: 'ACCOUNT_REACTIVATED',
  ACCOUNT_ALREADY_ACTIVE: 'ACCOUNT_ALREADY_ACTIVE',
  GRACE_PERIOD_EXPIRED: 'GRACE_PERIOD_EXPIRED',
  WRONG_PASSWORD: 'WRONG_PASSWORD',
} as const;

// ==========================================
// Seller
// ==========================================
export const SELLER = {
  BECOME_SELLER_SUCCESS: 'BECOME_SELLER_SUCCESS',
  ALREADY_SELLER: 'ALREADY_SELLER',
  SELLER_PROFILE_NOT_FOUND: 'SELLER_PROFILE_NOT_FOUND',
} as const;

// ==========================================
// KVKK
// ==========================================
export const KVKK = {
  CONSENT_CREATED: 'CONSENT_CREATED',
  CONSENT_LIST: 'CONSENT_LIST',
  INVALID_CONSENT_TYPE: 'INVALID_CONSENT_TYPE',
} as const;

// ==========================================
// Product
// ==========================================
export const PRODUCT = {
  PRODUCT_CREATED: 'PRODUCT_CREATED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  PRODUCT_LIST: 'PRODUCT_LIST',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  SELLER_REQUIRED: 'SELLER_REQUIRED',
  NOT_PRODUCT_OWNER: 'NOT_PRODUCT_OWNER',
  IMAGE_UPLOADED: 'IMAGE_UPLOADED',
  IMAGE_DELETED: 'IMAGE_DELETED',
  MAX_IMAGES_REACHED: 'MAX_IMAGES_REACHED',
} as const;

// ==========================================
// Auction
// ==========================================
export const AUCTION = {
  AUCTION_CREATED: 'AUCTION_CREATED',
  AUCTION_NOT_FOUND: 'AUCTION_NOT_FOUND',
  AUCTION_NOT_ACTIVE: 'AUCTION_NOT_ACTIVE',
  AUCTION_ENDED: 'AUCTION_ENDED',
  BID_ACCEPTED: 'BID_ACCEPTED',
  CANNOT_BID_OWN: 'CANNOT_BID_OWN',
  BID_TOO_LOW: 'BID_TOO_LOW',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  NOT_SELLER: 'NOT_SELLER',
  ACTIVE_AUCTION_EXISTS: 'ACTIVE_AUCTION_EXISTS',
} as const;

// ==========================================
// Wallet
// ==========================================
export const WALLET = {
  BALANCE_FETCHED: 'BALANCE_FETCHED',
  HOLDS_FETCHED: 'HOLDS_FETCHED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
} as const;

// ==========================================
// Generic
// ==========================================
export const GENERIC = {
  SUCCESS: 'SUCCESS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
} as const;

// Tüm kodları birleştir — type-safe kullanım
export const RC = {
  ...AUTH,
  ...USER,
  ...SELLER,
  ...KVKK,
  ...PRODUCT,
  ...AUCTION,
  ...WALLET,
  ...GENERIC,
} as const;

export type ResponseCode = (typeof RC)[keyof typeof RC];
