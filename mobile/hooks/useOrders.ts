import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CargoProvider, CargoStatus, OrderStatus } from '@endemigo/shared';
import api from '../lib/api';
import ENV from '../lib/config';
import { useRoleModeStore } from '../store/roleModeStore';
import {
  ORDER_QUERY_KEYS,
  WALLET_QUERY_KEYS,
  type ApiResponseEnvelope,
  type CargoSummary,
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

interface CargoShipment {
  id: string;
  orderId: string;
  trackingNumber: string;
  provider: CargoProvider;
  status: CargoStatus;
  lastEventAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CargoResponse extends ApiResponseEnvelope {
  shipment: CargoShipment | null;
}

interface ConfirmDeliveryResponse extends ApiResponseEnvelope {
  order?: RawOrder;
}

interface TransitionSellerOrderResponse extends ApiResponseEnvelope {
  order?: RawOrder;
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
    queryKey: [...ORDER_QUERY_KEYS.detail(orderId ?? 'unknown'), activeMode],
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

export function useOrderCargo(orderId?: string) {
  return useQuery<CargoSummary | null>({
    queryKey: ORDER_QUERY_KEYS.cargo(orderId ?? 'unknown'),
    queryFn: async () => {
      if (!orderId || ENV.USE_MOCK) return null;
      const { data } = await api.get<CargoResponse>(`/cargo/orders/${orderId}/shipment`);
      if (!data.shipment) return null;
      const shipment = data.shipment;
      return {
        provider: shipment.provider,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        shippedAt: shipment.createdAt,
        deliveredAt: shipment.deliveredAt,
        updatedAt: shipment.lastEventAt ?? shipment.updatedAt,
        timeline: [
          {
            id: shipment.id,
            status: shipment.status,
            title: shipment.status,
            detail: shipment.trackingNumber,
            createdAt: shipment.lastEventAt ?? shipment.updatedAt,
          },
        ],
      };
    },
    enabled: Boolean(orderId),
  });
}

export function useOrderConfirmDelivery(orderId?: string) {
  const queryClient = useQueryClient();

  return useMutation<ConfirmDeliveryResponse, Error, void>({
    mutationFn: async () => {
      if (!orderId) throw new Error('Order id is required');
      if (ENV.USE_MOCK) {
        return {
          code: 'ORDER_DELIVERY_CONFIRMED',
          message: 'Order delivery confirmed',
        };
      }
      const { data } = await api.post<ConfirmDeliveryResponse>(`/orders/${orderId}/confirm-delivery`);
      return data;
    },
    onSuccess: () => {
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.detail(orderId) });
        queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.cargo(orderId) });
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEYS.summary });
    },
  });
}

export function useSellerOrderTransition(orderId?: string) {
  const queryClient = useQueryClient();

  return useMutation<TransitionSellerOrderResponse, Error, OrderStatus>({
    mutationFn: async (status) => {
      if (!orderId) {
        throw new Error('Order id is required');
      }
      const { data } = await api.patch<TransitionSellerOrderResponse>(
        `/orders/${orderId}/seller-status`,
        { status },
      );
      return data;
    },
    onSuccess: () => {
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.detail(orderId) });
        queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.cargo(orderId) });
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
