import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import {
  useCreatePayoutRequest,
  useWalletBalance,
  useWalletHistory,
  useWalletPayoutRequests,
  type WalletHistoryFilter,
} from '../../hooks/useWallet';
import { useRoleModeStore } from '../../store/roleModeStore';
import { SellerPayoutCard } from '../../components/ui/wallet/SellerPayoutCard';
import { WalletSummaryCard } from '../../components/ui/wallet/WalletSummaryCard';
import type { WalletHistoryItem } from '../../types/transactionFlows';
import { formatCurrency, formatShortDateTime } from '../../utils/transactionFormatters';
import { styles } from '../../styles/tabs/wallet.styles';

const FILTERS: WalletHistoryFilter[] = ['all', 'top_up', 'payment', 'hold', 'refund', 'payout'];

export default function WalletScreen() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<WalletHistoryFilter>('all');
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const wallet = useWalletBalance();
  const history = useWalletHistory(filter, 1);
  const payoutRequests = useWalletPayoutRequests(activeMode === 'seller');
  const createPayout = useCreatePayoutRequest();

  const isRefreshing = wallet.isRefetching || history.isRefetching || payoutRequests.isRefetching;
  const hasError = wallet.isError || history.isError;

  const filterLabels = useMemo(
    () => ({
      all: t('wallet.filterAll'),
      top_up: t('wallet.filterTopUp'),
      payment: t('wallet.filterPayment'),
      hold: t('wallet.filterHold'),
      refund: t('wallet.filterRefund'),
      payout: t('wallet.filterPayout'),
    }),
    [t],
  );

  const handleRefresh = async () => {
    await Promise.all([wallet.refetch(), history.refetch(), payoutRequests.refetch()]);
  };

  const renderTransaction = ({ item }: { item: WalletHistoryItem }) => {
    const isCredit = item.direction === 'CREDIT' || item.direction === 'credit';
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionTop}>
          <Text style={styles.transactionType}>
            {t(`walletTransactionTypes.${item.type}`)}
          </Text>
          <Text style={isCredit ? styles.transactionAmountCredit : styles.transactionAmountDebit}>
            {isCredit ? '+' : '-'}{formatCurrency(item.amount, item.currency)}
          </Text>
        </View>
        <Text style={styles.transactionDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.transactionDate}>{formatShortDateTime(item.createdAt)}</Text>
      </View>
    );
  };

  if (wallet.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.centerBody}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.center}>
        <Ionicons name="wallet-outline" size={52} color={Colors.slate300} />
        <Text style={styles.centerTitle}>{t('wallet.loadError')}</Text>
        <Text style={styles.centerBody}>{t('common.genericError')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh} activeOpacity={0.8}>
          <Text style={styles.retryText}>{t('wallet.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={history.data?.items ?? []}
      keyExtractor={(item) => item.id}
      renderItem={renderTransaction}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
      }
      ListHeaderComponent={(
        <>
          <View style={styles.header}>
            <Text style={styles.title}>{t('wallet.title')}</Text>
            <Text style={styles.subtitle}>{t('wallet.summaryTitle')}</Text>
          </View>

          <WalletSummaryCard summary={wallet.data} />

          <SellerPayoutCard
            available={wallet.data?.available ?? 0}
            payoutRequests={payoutRequests.data}
            isSubmitting={createPayout.isPending}
            onSubmit={createPayout.mutateAsync}
          />

          <Text style={styles.sectionTitle}>{t('wallet.history')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((item) => {
              const isActive = item === filter;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setFilter(item)}
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
          <Ionicons name="receipt-outline" size={48} color={Colors.slate300} />
          <Text style={styles.centerTitle}>{t('wallet.emptyTitle')}</Text>
          <Text style={styles.centerBody}>{t('wallet.emptyBody')}</Text>
        </View>
      )}
    />
  );
}
