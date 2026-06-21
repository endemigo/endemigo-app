import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { useInfiniteOrdersByMode } from '../../hooks/useOrders';
import { useRoleModeStore } from '../../store/roleModeStore';
import { OrderListItem } from '../../components/ui/orders/OrderListItem';
import { styles } from '../../styles/tabs/orders.styles';

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const activeMode = useRoleModeStore((state) => state.activeMode);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useInfiniteOrdersByMode();

  const allOrders = useMemo(
    () => {
      const rawOrders = data?.pages.flatMap((page) => page.orders) ?? [];
      if (activeMode !== 'seller') {
        return rawOrders;
      }

      const groups: Record<string, typeof rawOrders> = {};
      const individualOrders: typeof rawOrders = [];

      for (const order of rawOrders) {
        if (order.groupId) {
          if (!groups[order.groupId]) {
            groups[order.groupId] = [];
          }
          groups[order.groupId].push(order);
        } else {
          individualOrders.push(order);
        }
      }

      const groupedList: typeof rawOrders = [];

      for (const [groupId, items] of Object.entries(groups)) {
        const firstItem = items[0];
        const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);
        
        const titles = items.map((item) => item.title).filter(Boolean);
        const uniqueTitles = Array.from(new Set(titles));
        const summaryTitle = items.length > 1
          ? `${items.length} ${t('orders.itemsCount', { defaultValue: 'Ürün' })}: ${uniqueTitles.join(', ')}`
          : firstItem.title;

        groupedList.push({
          ...firstItem,
          id: firstItem.id,
          orderCode: groupId,
          amount: totalAmount,
          title: summaryTitle,
        });
      }

      for (const order of individualOrders) {
        groupedList.push(order);
      }

      return groupedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    [data, activeMode, t],
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.centerBody}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="receipt-outline" size={52} color={Colors.slate300} />
        <Text style={styles.centerTitle}>{t('orders.loadError')}</Text>
        <Text style={styles.centerBody}>{t('common.genericError')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.8}>
          <Text style={styles.retryText}>{t('orders.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleOrderPress = React.useCallback((id: string) => {
    router.push(`/(tabs)/orders/${id}` as never);
  }, [router]);

  const renderOrderItem = React.useCallback(({ item }: { item: any }) => (
    <OrderListItem
      item={item}
      onPress={() => handleOrderPress(item.id)}
    />
  ), [handleOrderPress]);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={allOrders}
      keyExtractor={(item) => item.id}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
      }
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage().catch(() => undefined);
        }
      }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator color={Colors.primary} size="small" style={{ paddingVertical: 12 }} />
        ) : null
      }
      renderItem={renderOrderItem}
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
