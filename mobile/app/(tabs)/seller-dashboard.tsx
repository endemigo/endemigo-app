import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../constants/theme';
import { SellerQuickActions } from '../../components/ui/seller-dashboard/SellerQuickActions';
import { useSellerDashboardSummary } from '../../hooks/useSellerDashboard';
import { useMyPendingLots } from '../../hooks/useProductEdit';
import { useListingDrafts } from '../../hooks/useListingDrafts';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/transactionFormatters';
import { styles } from '../../styles/tabs/seller-dashboard.styles';

export default function SellerDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isSeller = Boolean(user?.isSeller);
  const summary = useSellerDashboardSummary(isSeller);
  const pendingLots = useMyPendingLots(isSeller);
  const drafts = useListingDrafts(isSeller);

  if (summary.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.centerBody}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (summary.isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.error} />
        <Text style={[styles.centerTitle, { marginTop: Spacing.sm }]}>{t('common.error')}</Text>
        <Text style={styles.centerBody}>{t('common.genericError')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => summary.refetch()} activeOpacity={0.8}>
          <Text style={styles.retryText}>{t('wallet.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isSeller || !summary.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerTitle}>{t('sellerDashboard.accessDeniedTitle')}</Text>
        <Text style={styles.centerBody}>{t('sellerDashboard.accessDeniedBody')}</Text>
      </View>
    );
  }

  const data = summary.data;
  const pendingLotCount = pendingLots.data?.length ?? 0;
  const draftCount = drafts.data?.length ?? 0;

  // Aksiyon gerektiren işler — yalnız sayısı > 0 olanlar; her satır ilgili ekrana götürür.
  const actionRows = [
    { key: 'drafts', icon: 'document-text-outline' as const, label: t('sellerDashboard.cards.drafts'), count: draftCount, route: '/drafts' },
    { key: 'newOrders', icon: 'sparkles-outline' as const, label: t('sellerDashboard.cards.newOrders'), count: data.orders.newOrders, route: '/(tabs)/orders' },
    { key: 'preparing', icon: 'cube-outline' as const, label: t('sellerDashboard.cards.preparing'), count: data.orders.preparingShipment, route: '/(tabs)/orders' },
    { key: 'pendingLots', icon: 'hammer-outline' as const, label: t('sellerHome.actions.pendingLots'), count: pendingLotCount, route: '/my-products' },
    { key: 'lowStock', icon: 'alert-circle-outline' as const, label: t('sellerDashboard.cards.lowStock'), count: data.products.lowStockProducts, route: '/my-products' },
    { key: 'returnRequested', icon: 'arrow-undo-outline' as const, label: t('sellerDashboard.cards.returnRequested'), count: data.orders.returnRequested, route: '/(tabs)/orders' },
    { key: 'openNegotiations', icon: 'chatbubbles-outline' as const, label: t('sellerDashboard.cards.openNegotiations'), count: data.inbox.openNegotiations, route: '/(tabs)/messages' },
  ].filter((row) => row.count > 0);

  // 3x3 hızlı erişim menüsü.
  const quickActions = [
    { key: 'new-listing', label: t('sellerDashboard.quickActions.newListing'), icon: 'add-circle-outline' as const, onPress: () => router.push({ pathname: '/(tabs)/become-seller', params: { mode: 'MARKETPLACE' } } as never) },
    { key: 'add-to-auction', label: t('sellerDashboard.quickActions.addToAuction'), icon: 'hammer-outline' as const, onPress: () => router.push({ pathname: '/my-products', params: { selectForAuction: '1' } } as never) },
    { key: 'my-products', label: t('sellerDashboard.quickActions.myProducts'), icon: 'cube-outline' as const, onPress: () => router.push('/my-products') },
    { key: 'drafts', label: t('sellerDashboard.quickActions.drafts'), icon: 'document-text-outline' as const, onPress: () => router.push('/drafts') },
    { key: 'orders', label: t('sellerDashboard.quickActions.orders'), icon: 'receipt-outline' as const, onPress: () => router.push('/(tabs)/orders') },
    { key: 'wallet', label: t('sellerDashboard.quickActions.wallet'), icon: 'wallet-outline' as const, onPress: () => router.push('/(tabs)/wallet') },
    { key: 'campaigns', label: t('sellerDashboard.quickActions.campaigns'), icon: 'pricetags-outline' as const, onPress: () => router.push('/(tabs)/seller-campaigns') },
    { key: 'ads', label: t('sellerDashboard.quickActions.ads'), icon: 'megaphone-outline' as const, onPress: () => router.push('/(tabs)/seller-ads') },
    { key: 'messages', label: t('sellerDashboard.quickActions.messages'), icon: 'chatbubble-ellipses-outline' as const, onPress: () => router.push('/(tabs)/messages') },
    { key: 'notifications', label: t('sellerDashboard.quickActions.notifications'), icon: 'notifications-outline' as const, onPress: () => router.push('/(tabs)/notifications') },
    { key: 'sender-addresses', label: t('sellerDashboard.quickActions.senderAddresses'), icon: 'business-outline' as const, onPress: () => router.push({ pathname: '/addresses', params: { type: 'SENDER' } } as never) },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.base },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={summary.isRefetching}
          onRefresh={() => {
            summary.refetch();
            pendingLots.refetch();
            drafts.refetch();
          }}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Hero — mağaza + bakiye (cüzdana götürür) */}
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{t('sellerDashboard.eyebrow')}</Text>
        <Text style={styles.title}>{data.seller.businessName}</Text>
        <Text style={styles.subtitle}>
          {t('sellerDashboard.storeStatus', {
            status: t(`sellerDashboard.storeStatuses.${data.seller.status}`),
          })}
        </Text>
        <TouchableOpacity
          style={styles.heroBalanceRow}
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/wallet')}
        >
          <View style={styles.heroBalanceCard}>
            <Text style={styles.heroBalanceLabel}>{t('sellerDashboard.availableBalance')}</Text>
            <Text style={styles.heroBalanceValue}>{formatCurrency(data.wallet.available)}</Text>
          </View>
          <View style={styles.heroBalanceCard}>
            <Text style={styles.heroBalanceLabel}>{t('sellerDashboard.pendingPayout')}</Text>
            <Text style={styles.heroBalanceValue}>{formatCurrency(data.payouts.pendingAmount)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Aksiyon Gerekenler — tıklanabilir, yalnız bekleyen işler */}
      <Text style={styles.sectionTitle}>{t('sellerDashboard.sections.actionNeeded')}</Text>
      {actionRows.length ? (
        <View style={local.actionCard}>
          {actionRows.map((row, index) => (
            <TouchableOpacity
              key={row.key}
              style={[local.actionRow, index > 0 && local.actionRowBorder]}
              activeOpacity={0.8}
              onPress={() => router.push(row.route as never)}
            >
              <View style={local.actionIcon}>
                <Ionicons name={row.icon} size={18} color={Colors.primary} />
              </View>
              <Text style={local.actionLabel} numberOfLines={1}>
                {row.label}
              </Text>
              <View style={local.actionBadge}>
                <Text style={local.actionBadgeText}>{row.count > 99 ? '99+' : row.count}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={local.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={22} color={Colors.primary} />
          <Text style={local.emptyText}>{t('sellerDashboard.allClear')}</Text>
        </View>
      )}

      {/* Hızlı Erişim — tam navigasyon menüsü */}
      <Text style={styles.sectionTitle}>{t('sellerDashboard.sections.quickActions')}</Text>
      <SellerQuickActions actions={quickActions} />
    </ScrollView>
  );
}

const local = StyleSheet.create({
  actionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  actionRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryTintSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.body,
    color: Colors.onSurface,
  },
  actionBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    backgroundColor: Colors.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBadgeText: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.caption,
    color: Colors.white,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: Colors.slate600,
  },
});
