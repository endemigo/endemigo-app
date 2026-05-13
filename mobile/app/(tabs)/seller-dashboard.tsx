import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { SellerQuickActions } from '../../components/ui/seller-dashboard/SellerQuickActions';
import { SellerStatCard } from '../../components/ui/seller-dashboard/SellerStatCard';
import { useSellerDashboardSummary } from '../../hooks/useSellerDashboard';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/transactionFormatters';
import { styles } from './seller-dashboard.styles';

export default function SellerDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const summary = useSellerDashboardSummary(Boolean(user?.isSeller));

  if (summary.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.centerBody}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!user?.isSeller || !summary.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerTitle}>{t('sellerDashboard.accessDeniedTitle')}</Text>
        <Text style={styles.centerBody}>{t('sellerDashboard.accessDeniedBody')}</Text>
      </View>
    );
  }

  const quickActions = [
    {
      key: 'orders',
      label: t('sellerDashboard.quickActions.orders'),
      icon: 'receipt-outline' as const,
      onPress: () => router.push('/(tabs)/orders'),
    },
    {
      key: 'wallet',
      label: t('sellerDashboard.quickActions.wallet'),
      icon: 'wallet-outline' as const,
      onPress: () => router.push('/(tabs)/wallet'),
    },
    {
      key: 'campaigns',
      label: t('sellerDashboard.quickActions.campaigns'),
      icon: 'pricetags-outline' as const,
      onPress: () => router.push('/(tabs)/seller-campaigns'),
    },
    {
      key: 'ads',
      label: t('sellerDashboard.quickActions.ads'),
      icon: 'megaphone-outline' as const,
      onPress: () => router.push('/(tabs)/seller-ads'),
    },
    {
      key: 'messages',
      label: t('sellerDashboard.quickActions.messages'),
      icon: 'chatbubble-ellipses-outline' as const,
      onPress: () => router.push('/(tabs)/messages'),
    },
    {
      key: 'sender-addresses',
      label: t('sellerDashboard.quickActions.senderAddresses'),
      icon: 'business-outline' as const,
      onPress: () =>
        router.push({
          pathname: '/addresses',
          params: { type: 'SENDER' },
        } as never),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={summary.isRefetching}
          onRefresh={summary.refetch}
          tintColor={Colors.primary}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{t('sellerDashboard.eyebrow')}</Text>
        <Text style={styles.title}>{summary.data.seller.businessName}</Text>
        <Text style={styles.subtitle}>
          {t('sellerDashboard.storeStatus', {
            status: t(`sellerDashboard.storeStatuses.${summary.data.seller.status}`),
          })}
        </Text>
        <View style={styles.heroBalanceRow}>
          <View style={styles.heroBalanceCard}>
            <Text style={styles.heroBalanceLabel}>{t('sellerDashboard.availableBalance')}</Text>
            <Text style={styles.heroBalanceValue}>
              {formatCurrency(summary.data.wallet.available)}
            </Text>
          </View>
          <View style={styles.heroBalanceCard}>
            <Text style={styles.heroBalanceLabel}>{t('sellerDashboard.pendingPayout')}</Text>
            <Text style={styles.heroBalanceValue}>
              {formatCurrency(summary.data.payouts.pendingAmount)}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('sellerDashboard.sections.operations')}</Text>
      <View style={styles.grid}>
        <SellerStatCard
          label={t('sellerDashboard.cards.newOrders')}
          value={String(summary.data.orders.newOrders)}
          icon="sparkles-outline"
          tone="primary"
        />
        <SellerStatCard
          label={t('sellerDashboard.cards.preparing')}
          value={String(summary.data.orders.preparingShipment)}
          icon="cube-outline"
          tone="accent"
        />
        <SellerStatCard
          label={t('sellerDashboard.cards.inTransit')}
          value={String(summary.data.orders.inTransit)}
          icon="car-outline"
          tone="secondary"
        />
        <SellerStatCard
          label={t('sellerDashboard.cards.unread')}
          value={String(summary.data.inbox.unreadNotifications)}
          icon="mail-unread-outline"
          tone="neutral"
        />
      </View>

      <Text style={styles.sectionTitle}>{t('sellerDashboard.sections.products')}</Text>
      <View style={styles.grid}>
        <SellerStatCard
          label={t('sellerDashboard.cards.activeProducts')}
          value={String(summary.data.products.activeProducts)}
          icon="storefront-outline"
          tone="primary"
        />
        <SellerStatCard
          label={t('sellerDashboard.cards.draftProducts')}
          value={String(summary.data.products.draftProducts)}
          icon="document-text-outline"
          tone="neutral"
        />
        <SellerStatCard
          label={t('sellerDashboard.cards.reviewProducts')}
          value={String(summary.data.products.reviewProducts)}
          icon="shield-checkmark-outline"
          tone="secondary"
        />
        <SellerStatCard
          label={t('sellerDashboard.cards.lowStock')}
          value={String(summary.data.products.lowStockProducts)}
          icon="alert-circle-outline"
          tone="accent"
        />
      </View>

      <Text style={styles.sectionTitle}>{t('sellerDashboard.sections.finance')}</Text>
      <View style={styles.grid}>
        <SellerStatCard
          label={t('sellerDashboard.cards.heldBalance')}
          value={formatCurrency(summary.data.wallet.held)}
          icon="lock-closed-outline"
          tone="accent"
        />
        <SellerStatCard
          label={t('sellerDashboard.cards.processingPayout')}
          value={formatCurrency(summary.data.payouts.processingAmount)}
          icon="time-outline"
          tone="neutral"
        />
        <SellerStatCard
          label={t('sellerDashboard.cards.openNegotiations')}
          value={String(summary.data.inbox.openNegotiations)}
          icon="chatbubbles-outline"
          tone="secondary"
        />
        <SellerStatCard
          label={t('sellerDashboard.cards.senderAddresses')}
          value={String(summary.data.addresses.senderAddressCount)}
          icon="location-outline"
          tone="primary"
        />
      </View>

      <Text style={styles.sectionTitle}>{t('sellerDashboard.sections.quickActions')}</Text>
      <SellerQuickActions actions={quickActions} />
    </ScrollView>
  );
}
