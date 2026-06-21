import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
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
  useWalletHistoryInfinite,
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

const WalletTransactionItem = React.memo(({
  item,
  t,
}: {
  item: WalletHistoryItem;
  t: any;
}) => {
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
});

export default function WalletScreen() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<WalletHistoryFilter>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const wallet = useWalletBalance();
  const history = useWalletHistoryInfinite(filter);
  const payoutRequests = useWalletPayoutRequests(activeMode === 'seller');
  const createPayout = useCreatePayoutRequest();

  const isRefreshing = wallet.isRefetching || history.isRefetching || payoutRequests.isRefetching;
  const hasError = wallet.isError || history.isError;

  const transactions = useMemo(
    () => history.data?.pages.flatMap((page) => page.items) ?? [],
    [history.data],
  );

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

  const renderTransaction = React.useCallback(({ item }: { item: WalletHistoryItem }) => (
    <WalletTransactionItem item={item} t={t} />
  ), [t]);

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
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.listContent}
        data={transactions}
        keyExtractor={(item) => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        renderItem={renderTransaction}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) {
            history.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          history.isFetchingNextPage ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator color={Colors.primary} size="small" />
            </View>
          ) : null
        }
        ListHeaderComponent={(
          <View style={styles.listHeaderContainer}>
            <View style={styles.header}>
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
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setIsDropdownOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownButtonText}>
                  {filterLabels[filter]}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={Colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={48} color={Colors.slate300} />
            <Text style={styles.centerTitle}>{t('wallet.emptyTitle')}</Text>
            <Text style={styles.centerBody}>{t('wallet.emptyBody')}</Text>
          </View>
        )}
      />

      <Modal
        visible={isDropdownOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setIsDropdownOpen(false)}
          />
          <View style={styles.modalMenuContainer}>
            <View style={styles.modalMenuHeader}>
              <Text style={styles.modalMenuTitle}>{t('wallet.history')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsDropdownOpen(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalMenuList}>
              {FILTERS.map((item) => {
                const isActive = item === filter;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.modalMenuItem, isActive && styles.modalMenuItemActive]}
                    onPress={() => {
                      setFilter(item);
                      setIsDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalMenuItemText, isActive && styles.modalMenuItemTextActive]}>
                      {filterLabels[item]}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark" size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
