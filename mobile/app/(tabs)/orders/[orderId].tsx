import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CargoStatus, OrderStatus } from '@endemigo/shared';
import { Colors } from '../../../constants/theme';
import {
  useConfirmReturnDelivered,
  useOrderConfirmDelivery,
  useOrderDetail,
  useOrderReturnRequest,
  useOrderSubmitReview,
  useSellerReturnReview,
  useSellerOrderTransition,
} from '../../../hooks/useOrders';
import { CargoSummaryCard } from '../../../components/ui/orders/CargoSummaryCard';
import { DeliveryConfirmActions } from '../../../components/ui/orders/DeliveryConfirmActions';
import { OrderReviewCard } from '../../../components/ui/orders/OrderReviewCard';
import { OrderStatusTimeline } from '../../../components/ui/orders/OrderStatusTimeline';
import { ReturnRequestCard } from '../../../components/ui/orders/ReturnRequestCard';
import { ReturnStatusCard } from '../../../components/ui/orders/ReturnStatusCard';
import { SellerOrderActions } from '../../../components/ui/orders/SellerOrderActions';
import { formatCurrency } from '../../../utils/transactionFormatters';
import { useModalStore } from '../../../store/modalStore';
import { useRoleModeStore } from '../../../store/roleModeStore';
import { resolveApiErrorMessage } from '../../../utils/apiError';
import { styles } from '../../../styles/tabs/orders/[orderId].styles';

export default function OrderDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ orderId: string }>();
  const orderId = params.orderId;
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const { showModal } = useModalStore();
  const order = useOrderDetail(orderId);
  const confirmDelivery = useOrderConfirmDelivery(orderId);
  const sellerTransition = useSellerOrderTransition(orderId);
  const returnRequest = useOrderReturnRequest(orderId);
  const returnReview = useSellerReturnReview(orderId);
  const confirmReturnDelivered = useConfirmReturnDelivered(orderId);
  const submitReview = useOrderSubmitReview(orderId);

  const handleRefresh = async () => {
    await order.refetch();
  };

  const handleSellerAdvance = (status: OrderStatus) => {
    showModal({
      title: t('orders.sellerActionsTitle'),
      message: t('orders.sellerActionsConfirm', {
        status: t(`orderStatuses.${status}`),
      }),
      type: 'info',
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        try {
          await sellerTransition.mutateAsync(status);
        } catch (error: unknown) {
          showModal({
            title: t('common.error'),
            message: resolveApiErrorMessage(error, t, 'common.genericError'),
            type: 'error',
          });
        }
      },
    });
  };

  const handleReturnRequest = async (payload: { reasonCode: string; note?: string }) => {
    try {
      await returnRequest.mutateAsync(payload);
      showModal({
        title: t('orders.returnRequestSuccessTitle'),
        message: t('orders.returnRequestSuccessMessage'),
        type: 'success',
      });
    } catch (error: unknown) {
      showModal({
        title: t('common.error'),
        message: resolveApiErrorMessage(error, t, 'common.genericError'),
        type: 'error',
      });
    }
  };

  const handleReturnDecision = async (decision: 'approve' | 'reject') => {
    try {
      await returnReview.mutateAsync({ decision });
      showModal({
        title: t('orders.returnStatusTitle'),
        message: t(
          decision === 'approve'
            ? 'orders.returnApproveSuccess'
            : 'orders.returnRejectSuccess',
        ),
        type: 'success',
      });
    } catch (error: unknown) {
      showModal({
        title: t('common.error'),
        message: resolveApiErrorMessage(error, t, 'common.genericError'),
        type: 'error',
      });
    }
  };

  const handleConfirmReturnDelivered = async () => {
    try {
      await confirmReturnDelivered.mutateAsync();
      showModal({
        title: t('orders.returnStatusTitle'),
        message: t('orders.returnDeliveredSuccess'),
        type: 'success',
      });
    } catch (error: unknown) {
      showModal({
        title: t('common.error'),
        message: resolveApiErrorMessage(error, t, 'common.genericError'),
        type: 'error',
      });
    }
  };

  const handleSubmitReview = async (payload: {
    productRating: number;
    productComment?: string;
    sellerRating: number;
    sellerComment?: string;
  }) => {
    try {
      await submitReview.mutateAsync(payload);
      showModal({
        title: t('orders.reviewSubmittedTitle'),
        message: t('orders.reviewSubmittedMessage'),
        type: 'success',
      });
    } catch (error: unknown) {
      showModal({
        title: t('common.error'),
        message: resolveApiErrorMessage(error, t, 'common.genericError'),
        type: 'error',
      });
    }
  };

  if (order.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.centerBody}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (order.isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="receipt-outline" size={52} color={Colors.slate300} />
        <Text style={styles.centerTitle}>{t('orders.detailLoadError')}</Text>
        <Text style={styles.centerBody}>{t('common.genericError')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh} activeOpacity={0.8}>
          <Text style={styles.retryText}>{t('orders.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!order.data) {
    return (
      <View style={styles.center}>
        <Ionicons name="file-tray-outline" size={52} color={Colors.slate300} />
        <Text style={styles.centerTitle}>{t('orders.detailNotFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={order.isRefetching}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.orderCode}>{order.data.orderCode}</Text>
          <Text style={styles.amount}>{formatCurrency(order.data.amount, order.data.currency)}</Text>
        </View>
        <Text style={styles.status}>{t(`orderStatuses.${order.data.status}`)}</Text>
        {order.data.autoCompleteAt && (
          <Text style={styles.status}>
            {t('orders.autoCompleteAt', { date: order.data.autoCompleteAt })}
          </Text>
        )}
      </View>

      <OrderStatusTimeline
        status={order.data.status}
        createdAt={order.data.createdAt}
        updatedAt={order.data.updatedAt}
      />
      <CargoSummaryCard shipments={order.data.shipments} />
      <DeliveryConfirmActions
        canConfirm={order.data.canConfirmDelivery}
        canDispute={order.data.canDispute}
        cargoStatus={order.data.forwardShipment?.status}
        isSubmitting={confirmDelivery.isPending}
        onConfirm={confirmDelivery.mutateAsync}
      />
      <ReturnRequestCard
        canRequestReturn={activeMode === 'buyer' && order.data.reviewEligibility.canRequestReturn}
        isSubmitting={returnRequest.isPending}
        onSubmit={handleReturnRequest}
      />
      <ReturnStatusCard
        status={order.data.status}
        reasonCode={order.data.returnReasonCode}
        note={order.data.returnReasonNote}
        canApprove={
          activeMode === 'seller' && order.data.status === OrderStatus.RETURN_REQUESTED
        }
        canReject={
          activeMode === 'seller' && order.data.status === OrderStatus.RETURN_REQUESTED
        }
        canConfirmDelivered={
          activeMode === 'seller' &&
          Boolean(order.data.returnShipment) &&
          order.data.returnShipment?.status === CargoStatus.DELIVERED
        }
        isSubmitting={returnReview.isPending || confirmReturnDelivered.isPending}
        onApprove={() => handleReturnDecision('approve')}
        onReject={() => handleReturnDecision('reject')}
        onConfirmDelivered={handleConfirmReturnDelivered}
      />
      <OrderReviewCard
        canReview={activeMode === 'buyer' && order.data.reviewEligibility.canReview}
        submittedReview={order.data.submittedReview}
        isSubmitting={submitReview.isPending}
        onSubmit={handleSubmitReview}
      />
      {activeMode === 'seller' && (
        <SellerOrderActions
          status={order.data.status}
          isSubmitting={sellerTransition.isPending}
          onAdvance={handleSellerAdvance}
        />
      )}
    </ScrollView>
  );
}
