import {
  AddressType,
  CargoProvider,
  CargoStatus,
  NotificationEventType,
  OrderStatus,
  PayoutRequestStatus,
} from '@endemigo/shared';

export type RoleMode = 'buyer' | 'seller';

export type WalletTransactionType =
  | 'top_up'
  | 'payment'
  | 'hold'
  | 'refund'
  | 'payout'
  | 'wallet_hold'
  | 'wallet_release'
  | 'wallet_capture'
  | 'payment_escrow'
  | 'payment_refund'
  | 'order_escrow_release'
  | 'payout_reserve'
  | 'payout_release';

export interface ApiResponseEnvelope {
  code: string;
  message: string;
}

export interface WalletSummary {
  walletId: string;
  balance: number;
  held: number;
  available: number;
}

export interface AddressItem {
  id: string;
  userId: string;
  type: AddressType;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string | null;
  addressLine: string;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddressPayload {
  type: AddressType;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood?: string;
  addressLine: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}

export interface WalletHoldItem {
  id: string;
  auctionId: string;
  amount: number;
  createdAt: string;
  releasedAt: string | null;
  capturedAt: string | null;
}

export interface WalletHistoryItem {
  id: string;
  type: WalletTransactionType;
  status?: string;
  amount: number;
  currency: string;
  direction: 'CREDIT' | 'DEBIT' | 'credit' | 'debit';
  description: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  referenceId?: string | null;
  createdAt: string;
}

export interface WalletHistoryResponse {
  items: WalletHistoryItem[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}

export interface PayoutRequestPayload {
  amount: number;
  currency?: string;
  idempotencyKey: string;
  payoutMethodMetadata?: {
    iban?: string;
    note?: string;
  };
}

export interface PayoutRequestItem {
  id: string;
  sellerId: string;
  amount: number;
  currency?: string;
  status: PayoutRequestStatus;
  payoutMethodMetadata?: {
    iban?: string;
    note?: string;
  };
  reviewReason?: string | null;
  manualPayoutReference: string | null;
  reviewedAt: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface OrderListItem {
  id: string;
  orderCode: string;
  roleMode: RoleMode;
  title: string;
  productId: string;
  productImage: string | null;
  amount: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  autoCompleteAt: string | null;
}

export interface OrderListResponse {
  orders: OrderListItem[];
}

export interface OrderTimelineStep {
  key: 'payment' | 'preparing' | 'cargo' | 'delivered' | 'completed';
  status: 'pending' | 'active' | 'done' | 'failed';
  timestamp: string | null;
}

export interface CargoTimelineEvent {
  id: string;
  status: CargoStatus;
  title: string;
  detail: string;
  createdAt: string;
}

export interface CargoShipmentSummary {
  id: string;
  shipmentType: 'FORWARD' | 'RETURN';
  provider: CargoProvider;
  trackingNumber: string;
  status: CargoStatus;
  shippedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
  timeline: CargoTimelineEvent[];
}

export type CargoSummary = CargoShipmentSummary;

export interface SubmittedOrderReview {
  id: string;
  productRating: number;
  productComment: string | null;
  sellerRating: number;
  sellerComment: string | null;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  orderCode: string;
  title: string;
  productId: string;
  productImage: string | null;
  buyerId: string;
  sellerId: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  roleMode: RoleMode;
  canConfirmDelivery: boolean;
  canDispute: boolean;
  autoCompleteAt: string | null;
  timeline: OrderTimelineStep[];
  shipments: CargoShipmentSummary[];
  forwardShipment: CargoShipmentSummary | null;
  returnShipment: CargoShipmentSummary | null;
  reviewEligibility: {
    canRequestReturn: boolean;
    canReview: boolean;
  };
  submittedReview: SubmittedOrderReview | null;
  returnReasonCode?: string | null;
  returnReasonNote?: string | null;
  returnImages?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerDashboardSummary {
  seller: {
    id: string;
    businessName: string;
    status: string;
  };
  orders: {
    newOrders: number;
    preparingShipment: number;
    inTransit: number;
    delivered: number;
    returnRequested: number;
    returnInTransit: number;
    refundedOrders: number;
  };
  products: {
    draftProducts: number;
    reviewProducts: number;
    activeProducts: number;
    outOfStockProducts: number;
    suspendedProducts: number;
    soldProducts: number;
    lowStockProducts: number;
  };
  wallet: {
    balance: number;
    held: number;
    available: number;
  };
  payouts: {
    pendingAmount: number;
    processingAmount: number;
    paidAmount: number;
    pendingCount: number;
  };
  inbox: {
    unreadNotifications: number;
    openNegotiations: number;
  };
  addresses: {
    senderAddressCount: number;
  };
  operations: {
    requiresActionCount: number;
  };
}

export interface NotificationItem {
  id: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  requiresAction: boolean;
  actionRoute: string | null;
  actionEntityId: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export type NotificationPreferenceCategory = 'order' | 'cargo' | 'auction' | 'payment';

export interface NotificationPreferenceItem {
  category: NotificationPreferenceCategory;
  inApp: boolean;
  push: boolean;
}

export interface NotificationPreferencesPayload {
  categories: NotificationPreferenceItem[];
}

export interface NotificationPreferencesUpdatePayload {
  categories: NotificationPreferenceItem[];
}

export const WALLET_QUERY_KEYS = {
  summary: ['wallet'] as const,
  holds: ['wallet-holds'] as const,
  history: (filter?: string, page?: number) =>
    ['wallet-history', filter ?? 'all', page ?? 1] as const,
  payoutRequests: ['wallet-payout-requests'] as const,
};

export const ORDER_QUERY_KEYS = {
  list: (mode: RoleMode, status: OrderStatus | 'all' = 'all') => ['orders', mode, status] as const,
  detail: (orderId: string) => ['order', orderId] as const,
  cargo: (orderId: string) => ['order-cargo', orderId] as const,
};

export const ADDRESS_QUERY_KEYS = {
  list: (type?: AddressType) => ['addresses', type ?? 'all'] as const,
};

export const SELLER_DASHBOARD_QUERY_KEYS = {
  summary: ['seller-dashboard'] as const,
};

export const NOTIFICATION_QUERY_KEYS = {
  list: ['notifications'] as const,
  preferences: ['notification-preferences'] as const,
};
