/**
 * @endemigo/shared — Tek Kaynak (Single Source of Truth)
 *
 * Backend, Mobile ve Admin Panel tarafından paylaşılan
 * enum, sabit ve tip tanımları.
 */

// Enums
export {
  AuctionStatus,
  AuctionType,
  ProductStatus,
  ProductCondition,
  ProductProductionSeason,
  ListingType,
  BidStatus,
  HoldStatus,
  AddressType,
  LedgerAccountType,
  LedgerDirection,
  JournalEntryType,
  LedgerReferenceType,
  PaymentStatus,
  PaymentProvider,
  PayoutRequestStatus,
  OrderStatus,
  OrderSource,
  EscrowStatus,
  CargoStatus,
  CargoProvider,
  NotificationEventType,
  NotificationDeliveryStatus,
  AdminRole,
  AdminAuditAction,
  AdminSettingKey,
  AdPlacementType,
  AdRequestStatus,
  CampaignStatus,
  CampaignDiscountType,
  CampaignScopeType,
  CouponStatus,
  MembershipStatus,
  MembershipPeriod,
  TrustBadgeLevel,
  RestrictionType,
  RestrictionStatus,
  NegotiationStatus,
  OfferStatus,
  NegotiationMessageType,
  ViolationType,
  MobileAudience,
  MobileBlockType,
  MobileConfigStatus,
  MobileSurfaceKey,
  GeoIndicationType,
  VariantNumberStatus,
  VariantOptionKind,
} from './enums';

// Constants
export {
  RC,
  AUTH,
  USER,
  SELLER,
  KVKK,
  PRODUCT,
  AUCTION,
  CATEGORY,
  WALLET,
  LEDGER,
  PAYOUT,
  PAYMENT,
  ORDER,
  CARGO,
  NOTIFICATION,
  NEGOTIATION,
  SEARCH,
  CART,
  ADMIN,
  ADS,
  CAMPAIGN,
  MEMBERSHIP,
  TRUST,
  MOBILE,
  CONTENT,
  GENERIC,
} from './constants';
export type { ResponseCode } from './constants';

export {
  getDefaultMobileExperienceConfig,
  isMobileExperienceConfig,
  isMobileRoute,
  MOBILE_HOME_SURFACE_SLOT_IDS,
  MOBILE_LISTING_CREATE_OPTIONAL_FIELDS,
  resolveLocalizedText,
  sanitizeMobileExperienceConfig,
  validateMobileExperienceConfig,
} from './mobile-config';

export type {
  LocalizedText,
  MobileActionConfig,
  MobileAuctionListCardAudienceOverride,
  MobileAuctionListCardConfig,
  MobileAuctionsConfig,
  MobileCardsConfig,
  MobileConfigBlockBase,
  MobileEntryTileConfig,
  MobileExperienceConfig,
  MobileExperienceDocumentResponse,
  MobileHeroBannerConfig,
  MobileHomeConfig,
  MobileHomeSurfaceSlotId,
  MobileHomeSectionConfig,
  MobileListingCreateConfig,
  MobileListingCreateOptionalField,
  MobileLocale,
  MobilePreviewConfig,
  MobileProductCardAudienceOverride,
  MobileProductCardConfig,
  MobilePromoBannerConfig,
  MobileSurfaceSlotConfig,
  MobileTrustBlockConfig,
} from './mobile-config';

export {
  normalizeMoneyScale,
  parseTrMoneyInput,
  parseUnknownMoney,
} from './utils';

export {
  CONTENT_STUDIO_COLLECTION_KEYS,
  CONTENT_STUDIO_ITEM_STATUSES,
  getDefaultContentStudioDocument,
  isContentStudioDocument,
} from './content-studio';

export type {
  ContentStudioCollectionKey,
  ContentStudioCollections,
  ContentStudioDocument,
  ContentStudioItem,
  ContentStudioItemStatus,
  ContentStudioMetadataValue,
  PublicBlogItem,
} from './content-studio';
