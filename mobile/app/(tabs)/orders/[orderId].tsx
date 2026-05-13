import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OrderStatus } from '@endemigo/shared';
import { Colors } from '../../../constants/theme';
import {
  useOrderCargo,
  useOrderConfirmDelivery,
  useOrderDetail,
  useSellerOrderTransition,
} from '../../../hooks/useOrders';
import { CargoSummaryCard } from '../../../components/ui/orders/CargoSummaryCard';
import { DeliveryConfirmActions } from '../../../components/ui/orders/DeliveryConfirmActions';
import { OrderStatusTimeline } from '../../../components/ui/orders/OrderStatusTimeline';
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
  const cargo = useOrderCargo(orderId);
  const confirmDelivery = useOrderConfirmDelivery(orderId);
  const sellerTransition = useSellerOrderTransition(orderId);

  const handleRefresh = async () => {
    await Promise.all([order.refetch(), cargo.refetch()]);
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

  if (order.isLoading || cargo.isLoading) {
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
          refreshing={order.isRefetching || cargo.isRefetching}
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
      <CargoSummaryCard cargo={cargo.data ?? null} />
      <DeliveryConfirmActions
        canConfirm={order.data.canConfirmDelivery}
        canDispute={order.data.canDispute}
        cargoStatus={cargo.data?.status}
        isSubmitting={confirmDelivery.isPending}
        onConfirm={confirmDelivery.mutateAsync}
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
