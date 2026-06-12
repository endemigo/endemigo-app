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
    () => data?.pages.flatMap((page) => page.orders) ?? [],
    [data],
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

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={allOrders}
      keyExtractor={(item) => item.id}
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
      renderItem={({ item }) => (
        <OrderListItem
          item={item}
          onPress={() => router.push(`/(tabs)/orders/${item.id}` as never)}
        />
      )}
      ListHeaderComponent={(
        <View style={styles.headerContainer}>
          <View style={styles.heroCard}>
            <View style={styles.titleRow}>
              <Text style={styles.subtitle}>
                {activeMode === 'seller' ? t('orders.sellerTitle') : t('orders.buyerTitle')}
              </Text>
              <View style={[styles.modeBadge, activeMode === 'seller' && styles.modeBadgeSeller]}>
                <Text style={[
                  styles.modeBadgeText,
                  activeMode === 'seller' && styles.modeBadgeTextSeller,
                ]}>
                  {activeMode === 'seller' ? t('orders.roleSeller') : t('orders.roleBuyer')}
                </Text>
              </View>
            </View>
          </View>
        </View>
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
