import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CargoProvider, CargoStatus, OrderStatus } from '@endemigo/shared';
import api from '../lib/api';
import ENV from '../lib/config';
import { useRoleModeStore } from '../store/roleModeStore';
import { useCartStore, type CartItem } from '../store/cartStore';
import {
  ORDER_QUERY_KEYS,
  WALLET_QUERY_KEYS,
  type ApiResponseEnvelope,
  type CargoShipmentSummary,
  type OrderDetail,
  type OrderListItem,
  type RoleMode,
  type SubmittedOrderReview,
} from '../types/transactionFlows';

const ORDER_PAGE_SIZE = 20;

export type OrderStatusFilter =
  | 'all'
  | OrderStatus.PAYMENT_PENDING
  | OrderStatus.ESCROW_HELD
  | OrderStatus.PREPARING_SHIPMENT
  | OrderStatus.IN_TRANSIT
  | OrderStatus.DELIVERED
  | OrderStatus.COMPLETED
  | OrderStatus.RETURN_REQUESTED
  | OrderStatus.RETURN_APPROVED
  | OrderStatus.RETURN_IN_TRANSIT
  | OrderStatus.RETURN_DELIVERED
  | OrderStatus.REFUND_PENDING
  | OrderStatus.REFUNDED;

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
  productTitle?: string | null;
  productImageUrl?: string | null;
  returnReasonCode?: string | null;
  returnReasonNote?: string | null;
  returnImages?: string[] | null;
}

interface RawCargoEvent {
  id: string;
  status: CargoStatus;
  title: string;
  detail: string | null;
  occurredAt: string;
}

interface RawShipment {
  id: string;
  shipmentType: 'FORWARD' | 'RETURN';
  orderId: string;
  trackingNumber: string;
  provider: CargoProvider;
  status: CargoStatus;
  lastEventAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  events?: RawCargoEvent[];
}

interface RawReview {
  id: string;
  productRating: number;
  productComment: string | null;
  sellerRating: number;
  sellerComment: string | null;
  createdAt: string;
}

interface OrdersResponse extends ApiResponseEnvelope {
  orders: RawOrder[];
}

interface OrderDetailResponse extends ApiResponseEnvelope {
  order: RawOrder;
  shipments: RawShipment[];
  forwardShipment: RawShipment | null;
  returnShipment: RawShipment | null;
  reviewEligibility: {
    canRequestReturn: boolean;
    canReview: boolean;
    canCancel?: boolean;
  };
  returnWindowEndsAt?: string | null;
  submittedReview: RawReview | null;
}

export interface CheckoutQuoteSummary {
  items: Array<{
    cartItemId: string;
    productId: string;
    title: string | null;
    quantity: number;
    lineOriginal: number;
    lineFinal: number;
  }>;
  subtotal: number;
  discountTotal: number;
  coupon: { code: string; discountAmount: number } | null;
  discountedSubtotal: number;
  shipping: number;
  serviceFee: number;
  grandTotal: number;
}

interface CheckoutQuoteResponse extends ApiResponseEnvelope {
  quote: CheckoutQuoteSummary;
}

export interface CheckoutPayload {
  shippingAddressId?: string;
  couponCode?: string;
}

interface ConfirmDeliveryResponse extends ApiResponseEnvelope {
  order?: RawOrder;
}

interface TransitionSellerOrderResponse extends ApiResponseEnvelope {
  order?: RawOrder;
}

interface ReturnRequestPayload {
  reasonCode: string;
  note?: string;
  images?: string[];
}

interface ReturnReviewPayload {
  decision: 'approve' | 'reject';
  reason?: string;
}

interface SubmitReviewPayload {
  productRating: number;
  productComment?: string;
  sellerRating: number;
  sellerComment?: string;
}

function getOrderEndpoint(activeMode: RoleMode) {
  return activeMode === 'buyer' ? '/orders/buyer' : '/orders/seller';
}

function normalizeOrder(raw: RawOrder, activeMode: RoleMode): OrderListItem {
  return {
    id: raw.id,
    orderCode: raw.id.slice(0, 8).toUpperCase(),
    roleMode: activeMode,
    title: raw.productTitle || raw.productId,
    productId: raw.productId,
    productImage: raw.productImageUrl ?? null,
    amount: Number(raw.amount),
    currency: raw.currency,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? raw.createdAt,
    autoCompleteAt: raw.autoConfirmAt ?? null,
  };
}

function normalizeShipment(raw: RawShipment): CargoShipmentSummary {
  return {
    id: raw.id,
    shipmentType: raw.shipmentType,
    provider: raw.provider,
    trackingNumber: raw.trackingNumber,
    status: raw.status,
    shippedAt: raw.createdAt,
    deliveredAt: raw.deliveredAt,
    updatedAt: raw.lastEventAt ?? raw.updatedAt,
    timeline: (raw.events ?? []).map((event) => ({
      id: event.id,
      status: event.status,
      title: event.title,
      detail: event.detail ?? raw.trackingNumber,
      createdAt: event.occurredAt,
    })),
  };
}

function normalizeReview(review: RawReview | null): SubmittedOrderReview | null {
  if (!review) {
    return null;
  }

  return {
    id: review.id,
    productRating: review.productRating,
    productComment: review.productComment,
    sellerRating: review.sellerRating,
    sellerComment: review.sellerComment,
    createdAt: review.createdAt,
  };
}

function invalidateOrderRelatedQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId?: string,
) {
  if (orderId) {
    queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.detail(orderId) });
    queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.cargo(orderId) });
  }
  queryClient.invalidateQueries({ queryKey: ['orders'] });
  queryClient.invalidateQueries({ queryKey: ['product'] });
  queryClient.invalidateQueries({ queryKey: ['seller'] });
  queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEYS.summary });
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

export function useInfiniteOrdersByMode() {
  const activeMode = useRoleModeStore((state) => state.activeMode);

  return useInfiniteQuery({
    queryKey: ['orders', 'infinite', activeMode],
    queryFn: async ({ pageParam = 1 }) => {
      if (ENV.USE_MOCK) return { orders: [], total: 0, page: pageParam, hasNextPage: false };
      const { data } = await api.get<OrdersResponse>(getOrderEndpoint(activeMode));
      const normalized = data.orders.map((order) => normalizeOrder(order, activeMode));
      const start = (pageParam - 1) * ORDER_PAGE_SIZE;
      const paginatedOrders = normalized.slice(start, start + ORDER_PAGE_SIZE);
      return {
        orders: paginatedOrders,
        page: pageParam,
        hasNextPage: start + ORDER_PAGE_SIZE < normalized.length,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.page + 1 : undefined;
    },
  });
}

export function useOrderDetail(orderId?: string) {
  const activeMode = useRoleModeStore((state) => state.activeMode);

  return useQuery<OrderDetail | null>({
    queryKey: [...ORDER_QUERY_KEYS.detail(orderId ?? 'unknown'), activeMode],
    queryFn: async () => {
      if (!orderId || ENV.USE_MOCK) return null;
      const { data } = await api.get<OrderDetailResponse>(`/orders/${orderId}`);
      const order = data.order;
      const shipments = (data.shipments ?? []).map(normalizeShipment);
      const forwardShipment = data.forwardShipment
        ? normalizeShipment(data.forwardShipment)
        : null;
      const returnShipment = data.returnShipment
        ? normalizeShipment(data.returnShipment)
        : null;

      return {
        id: order.id,
        orderCode: order.id.slice(0, 8).toUpperCase(),
        title: order.productTitle || order.productId,
        productId: order.productId,
        productImage: order.productImageUrl ?? null,
        buyerId: order.buyerId ?? '',
        sellerId: order.sellerId ?? '',
        status: order.status,
        amount: Number(order.amount),
        currency: order.currency,
        roleMode: activeMode,
        canConfirmDelivery:
          activeMode === 'buyer' && order.status === OrderStatus.DELIVERED,
        canDispute: false,
        autoCompleteAt: order.autoConfirmAt ?? null,
        timeline: [],
        shipments,
        forwardShipment,
        returnShipment,
        reviewEligibility: data.reviewEligibility,
        returnWindowEndsAt: data.returnWindowEndsAt ?? null,
        submittedReview: normalizeReview(data.submittedReview),
        returnReasonCode: order.returnReasonCode ?? null,
        returnReasonNote: order.returnReasonNote ?? null,
        returnImages: order.returnImages ?? null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    },
    enabled: Boolean(orderId),
  });
}

export function useOrderCargo(orderId?: string) {
  return useQuery<CargoShipmentSummary | null>({
    queryKey: ORDER_QUERY_KEYS.cargo(orderId ?? 'unknown'),
    queryFn: async () => {
      if (!orderId || ENV.USE_MOCK) return null;
      const { data } = await api.get<OrderDetailResponse>(`/orders/${orderId}`);
      return data.forwardShipment ? normalizeShipment(data.forwardShipment) : null;
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
      const { data } = await api.post<ConfirmDeliveryResponse>(
        `/orders/${orderId}/confirm-delivery`,
      );
      return data;
    },
    onSuccess: () => {
      invalidateOrderRelatedQueries(queryClient, orderId);
    },
  });
}

export function useOrderReturnRequest(orderId?: string) {
  const queryClient = useQueryClient();

  return useMutation<ApiResponseEnvelope, Error, ReturnRequestPayload>({
    mutationFn: async (payload) => {
      if (!orderId) throw new Error('Order id is required');
      const { data } = await api.post<ApiResponseEnvelope>(
        `/orders/${orderId}/return-request`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      invalidateOrderRelatedQueries(queryClient, orderId);
    },
  });
}

export function useUploadReturnImage(orderId?: string) {
  return useMutation<{ url: string; images: string[] }, Error, { uri: string; fileName: string; mimeType: string }>({
    mutationFn: async (fileInfo) => {
      if (!orderId) throw new Error('Order id is required');
      if (ENV.USE_MOCK) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return { url: fileInfo.uri, images: [fileInfo.uri] };
      }

      const formData = new FormData();
      formData.append('file', {
        uri: fileInfo.uri,
        name: fileInfo.fileName || `return-${Date.now()}.jpg`,
        type: fileInfo.mimeType || 'image/jpeg',
      } as any);

      const { data } = await api.post<{ url: string; images: string[] }>(
        `/orders/${orderId}/return-images`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return data;
    },
  });
}

export function useSellerReturnReview(orderId?: string) {
  const queryClient = useQueryClient();

  return useMutation<ApiResponseEnvelope, Error, ReturnReviewPayload>({
    mutationFn: async (payload) => {
      if (!orderId) throw new Error('Order id is required');
      const { data } = await api.patch<ApiResponseEnvelope>(
        `/orders/${orderId}/return-review`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      invalidateOrderRelatedQueries(queryClient, orderId);
    },
  });
}

export function useConfirmReturnDelivered(orderId?: string) {
  const queryClient = useQueryClient();

  return useMutation<ApiResponseEnvelope, Error, void>({
    mutationFn: async () => {
      if (!orderId) throw new Error('Order id is required');
      const { data } = await api.post<ApiResponseEnvelope>(
        `/orders/${orderId}/confirm-return-delivered`,
      );
      return data;
    },
    onSuccess: () => {
      invalidateOrderRelatedQueries(queryClient, orderId);
    },
  });
}

export function useOrderSubmitReview(orderId?: string) {
  const queryClient = useQueryClient();

  return useMutation<ApiResponseEnvelope, Error, SubmitReviewPayload>({
    mutationFn: async (payload) => {
      if (!orderId) throw new Error('Order id is required');
      const { data } = await api.post<ApiResponseEnvelope>(
        `/orders/${orderId}/review`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      invalidateOrderRelatedQueries(queryClient, orderId);
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
      invalidateOrderRelatedQueries(queryClient, orderId);
    },
  });
}

export function useCheckoutQuote(couponCode?: string) {
  return useQuery<CheckoutQuoteSummary | null>({
    queryKey: ['checkout', 'quote', couponCode ?? null],
    queryFn: async () => {
      if (ENV.USE_MOCK) return null;
      const { data } = await api.post<CheckoutQuoteResponse>(
        '/payments/checkout/quote',
        couponCode ? { couponCode } : {},
      );
      return data.quote;
    },
    retry: false,
  });
}

export function useCancelOrder(orderId?: string) {
  const queryClient = useQueryClient();

  return useMutation<ApiResponseEnvelope, Error, void>({
    mutationFn: async () => {
      if (!orderId) throw new Error('Order id is required');
      const { data } = await api.post<ApiResponseEnvelope>(
        `/orders/${orderId}/cancel`,
      );
      return data;
    },
    onSuccess: () => {
      invalidateOrderRelatedQueries(queryClient, orderId);
    },
  });
}

export function useCheckoutCart() {
  const queryClient = useQueryClient();
  const clearCart = useCartStore((state) => state.clearCart);

  return useMutation<any, Error, CheckoutPayload | void>({
    mutationFn: async (payload) => {
      if (ENV.USE_MOCK) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await clearCart();
        return;
      }

      const { data } = await api.post('/payments/checkout', {
        idempotencyKey: `checkout-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        callbackUrl: 'endemigo://checkout/callback',
        ...(payload?.shippingAddressId
          ? { shippingAddressId: payload.shippingAddressId }
          : {}),
        ...(payload?.couponCode ? { couponCode: payload.couponCode } : {}),
      });

      const payment = (data as any).payment;
      if (payment?.checkoutToken) {
        // Complete payment directly by calling webhook callback (development signature bypass enabled)
        await api.post('/payments/iyzico/webhook', {
          eventKey: payment.checkoutToken,
          token: payment.checkoutToken,
          status: 'success',
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['checkout'] });
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEYS.summary });
    },
  });
}

export function useInitiateOrderPayment(orderId?: string) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { amount: number; currency?: string }>({
    mutationFn: async ({ amount, currency = 'TRY' }) => {
      if (!orderId) throw new Error('Order id is required');
      if (ENV.USE_MOCK) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return { success: true };
      }

      const { data } = await api.post('/payments/initiate', {
        orderId,
        amount,
        currency,
        idempotencyKey: `pay-order-${orderId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        callbackUrl: 'endemigo://payment/callback',
      });

      const payment = (data as any).payment;
      if (payment?.checkoutToken) {
        await api.post('/payments/iyzico/webhook', {
          eventKey: payment.checkoutToken,
          token: payment.checkoutToken,
          status: 'success',
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEYS.summary });
    },
  });
}
