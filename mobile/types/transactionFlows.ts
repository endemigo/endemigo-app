import {
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

export interface CargoSummary {
  provider: CargoProvider;
  trackingNumber: string;
  status: CargoStatus;
  shippedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
  timeline: CargoTimelineEvent[];
}

export interface OrderDetail {
  id: string;
  orderCode: string;
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
  cargo: CargoSummary | null;
  createdAt: string;
  updatedAt: string;
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

export const NOTIFICATION_QUERY_KEYS = {
  list: ['notifications'] as const,
  preferences: ['notification-preferences'] as const,
};
