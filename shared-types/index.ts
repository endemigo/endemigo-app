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
  ListingType,
  BidStatus,
  HoldStatus,
  AddressType,
  LedgerAccountType,
  LedgerDirection,
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
  WALLET,
  LEDGER,
  PAYOUT,
  PAYMENT,
  ORDER,
  CARGO,
  NOTIFICATION,
  SEARCH,
  GENERIC,
} from './constants';
export type { ResponseCode } from './constants';
