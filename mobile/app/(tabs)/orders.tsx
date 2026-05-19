import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OrderStatus } from '@endemigo/shared';
import { Colors } from '../../constants/theme';
import { useOrdersByMode, type OrderStatusFilter } from '../../hooks/useOrders';
import { useRoleModeStore } from '../../store/roleModeStore';
import { OrderListItem } from '../../components/ui/orders/OrderListItem';
import { styles } from '../../styles/tabs/orders.styles';

const STATUS_FILTERS: OrderStatusFilter[] = [
  'all',
  OrderStatus.PAYMENT_PENDING,
  OrderStatus.PREPARING_SHIPMENT,
  OrderStatus.IN_TRANSIT,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const [status, setStatus] = useState<OrderStatusFilter>('all');
  const orders = useOrdersByMode(status, 1);

  const filterLabels = useMemo(
    (): Record<OrderStatusFilter, string> => ({
      all: t('orders.filterAll'),
      [OrderStatus.PAYMENT_PENDING]: t('orders.filterPayment'),
      [OrderStatus.RETURN_REQUESTED]: t('orders.filterCompleted'),
      [OrderStatus.RETURN_APPROVED]: t('orders.filterCompleted'),
      [OrderStatus.RETURN_IN_TRANSIT]: t('orders.filterInTransit'),
      [OrderStatus.RETURN_DELIVERED]: t('orders.filterDelivered'),
      [OrderStatus.REFUND_PENDING]: t('orders.filterDelivered'),
      [OrderStatus.REFUNDED]: t('orders.filterCompleted'),
      [OrderStatus.ESCROW_HELD]: t('orders.filterPayment'),
      [OrderStatus.PREPARING_SHIPMENT]: t('orders.filterPreparing'),
      [OrderStatus.IN_TRANSIT]: t('orders.filterInTransit'),
      [OrderStatus.DELIVERED]: t('orders.filterDelivered'),
      [OrderStatus.COMPLETED]: t('orders.filterCompleted'),
    }),
    [t],
  );

  if (orders.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.centerBody}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (orders.isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="receipt-outline" size={52} color={Colors.slate300} />
        <Text style={styles.centerTitle}>{t('orders.loadError')}</Text>
        <Text style={styles.centerBody}>{t('common.genericError')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => orders.refetch()} activeOpacity={0.8}>
          <Text style={styles.retryText}>{t('orders.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={orders.data?.orders ?? []}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={orders.isRefetching} onRefresh={orders.refetch} tintColor={Colors.primary} />
      }
      renderItem={({ item }) => (
        <OrderListItem
          item={item}
          onPress={() => router.push(`/(tabs)/orders/${item.id}` as never)}
        />
      )}
      ListHeaderComponent={(
        <>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{t('orders.title')}</Text>
              <View style={[styles.modeBadge, activeMode === 'seller' && styles.modeBadgeSeller]}>
                <Text style={[
                  styles.modeBadgeText,
                  activeMode === 'seller' && styles.modeBadgeTextSeller,
                ]}>
                  {activeMode === 'seller' ? t('orders.roleSeller') : t('orders.roleBuyer')}
                </Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              {activeMode === 'seller' ? t('orders.sellerTitle') : t('orders.buyerTitle')}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {STATUS_FILTERS.map((item) => {
              const isActive = item === status;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setStatus(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {filterLabels[item]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}
      ListEmptyComponent={(
        <View style={styles.center}>
          <Ionicons name="file-tray-outline" size={48} color={Colors.slate300} />
          <Text style={styles.centerTitle}>{t('orders.emptyTitle')}</Text>
          <Text style={styles.centerBody}>{t('orders.emptyBody')}</Text>
        </View>
      )}
    />
  );
}
