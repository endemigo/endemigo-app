import { useQuery } from '@tanstack/react-query';
import { OrderStatus } from '@endemigo/shared';
import api from '../lib/api';
import ENV from '../lib/config';
import { useRoleModeStore } from '../store/roleModeStore';
import {
  ORDER_QUERY_KEYS,
  type ApiResponseEnvelope,
  type OrderDetail,
  type OrderListItem,
  type RoleMode,
} from '../types/transactionFlows';

const ORDER_PAGE_SIZE = 20;

export type OrderStatusFilter =
  | 'all'
  | OrderStatus.PAYMENT_PENDING
  | OrderStatus.ESCROW_HELD
  | OrderStatus.PREPARING_SHIPMENT
  | OrderStatus.IN_TRANSIT
  | OrderStatus.DELIVERED
  | OrderStatus.COMPLETED;

interface RawOrder {
  id: string;
  productId: string;
  amount: number | string;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  autoConfirmAt?: string | null;
  buyerId?: string;
  sellerId?: string;
}

interface OrdersResponse extends ApiResponseEnvelope {
  orders: RawOrder[];
}

function getOrderEndpoint(activeMode: RoleMode) {
  return activeMode === 'buyer' ? '/orders/buyer' : '/orders/seller';
}

function normalizeOrder(raw: RawOrder, activeMode: RoleMode): OrderListItem {
  return {
    id: raw.id,
    orderCode: raw.id.slice(0, 8).toUpperCase(),
    roleMode: activeMode,
    title: raw.productId,
    productId: raw.productId,
    productImage: null,
    amount: Number(raw.amount),
    currency: raw.currency,
    status: raw.status,
    updatedAt: raw.updatedAt ?? raw.createdAt,
    autoCompleteAt: raw.autoConfirmAt ?? null,
  };
}

export function useOrdersByMode(status: OrderStatusFilter = 'all', page = 1) {
  const activeMode = useRoleModeStore((state) => state.activeMode);

  return useQuery({
    queryKey: [...ORDER_QUERY_KEYS.list(activeMode, status), page],
    queryFn: async () => {
      if (ENV.USE_MOCK) return { orders: [], total: 0, page, hasNextPage: false };
      const { data } = await api.get<OrdersResponse>(getOrderEndpoint(activeMode));
      const normalized = data.orders
        .map((order) => normalizeOrder(order, activeMode))
        .filter((order) => status === 'all' || order.status === status);
      const start = (page - 1) * ORDER_PAGE_SIZE;
      return {
        orders: normalized.slice(start, start + ORDER_PAGE_SIZE),
        total: normalized.length,
        page,
        hasNextPage: start + ORDER_PAGE_SIZE < normalized.length,
      };
    },
  });
}

export function useOrderDetail(orderId?: string) {
  const activeMode = useRoleModeStore((state) => state.activeMode);

  return useQuery<OrderDetail | null>({
    queryKey: ORDER_QUERY_KEYS.detail(orderId ?? 'unknown'),
    queryFn: async () => {
      if (!orderId || ENV.USE_MOCK) return null;
      const { data } = await api.get<OrdersResponse>(getOrderEndpoint(activeMode));
      const found = data.orders.find((order) => order.id === orderId);
      if (!found) return null;
      const item = normalizeOrder(found, activeMode);
      return {
        id: item.id,
        orderCode: item.orderCode,
        buyerId: found.buyerId ?? '',
        sellerId: found.sellerId ?? '',
        status: item.status,
        amount: item.amount,
        currency: item.currency,
        roleMode: activeMode,
        canConfirmDelivery: activeMode === 'buyer' && item.status === OrderStatus.DELIVERED,
        canDispute: activeMode === 'buyer' && item.status === OrderStatus.DELIVERED,
        autoCompleteAt: item.autoCompleteAt,
        timeline: [],
        cargo: null,
        createdAt: found.createdAt,
        updatedAt: item.updatedAt,
      };
    },
    enabled: Boolean(orderId),
  });
}
