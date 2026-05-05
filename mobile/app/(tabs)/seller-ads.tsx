import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { SellerAdRequestCard } from '../../components/ui/ads/SellerAdRequestCard';
import {
  type SellerAdPackage,
  useAdPackages,
  useCreateAdRequest,
  useMyAdRequests,
} from '../../hooks/useSellerAds';
import { useWalletBalance } from '../../hooks/useWallet';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { useRoleModeStore } from '../../store/roleModeStore';
import {
  formatCurrency,
  formatShortDate,
  getApiErrorMessage,
} from '../../utils/transactionFormatters';
import { styles } from '../../styles/tabs/seller-ads.styles';

function requestSchedule(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt && !endsAt) return null;
  return `${formatShortDate(startsAt)} - ${formatShortDate(endsAt)}`;
}

export default function SellerAdsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const { showModal } = useModalStore();
  const isSellerAccess = activeMode === 'seller' && Boolean(user?.isSeller);
  const packagesQuery = useAdPackages();
  const requestsQuery = useMyAdRequests(isSellerAccess);
  const walletQuery = useWalletBalance();
  const createAdRequest = useCreateAdRequest();
  const approval = t('sellerAds.approvalAdminReview');

  useEffect(() => {
    if (!isSellerAccess) {
      showModal({
        title: t('sellerAds.accessDeniedTitle'),
        message: t('sellerAds.accessDeniedMessage'),
        type: 'info',
      });
      router.replace('/(tabs)/profile' as never);
    }
  }, [isSellerAccess, router, showModal, t]);

  const handleRequest = (adPackage: SellerAdPackage) => {
    showModal({
      title: t('sellerAds.confirmTitle'),
      message: t('sellerAds.confirmMessage', { packageName: adPackage.name }),
      type: 'info',
      confirmText: t('sellerAds.confirmCta'),
      cancelText: t('common.cancel'),
      onCancel: () => undefined,
      onConfirm: () => {
        createAdRequest.mutateAsync({
          packageId: adPackage.id,
          idempotencyKey: `mobile-ad-${adPackage.id}-${Date.now()}`,
        })
          .then(() => {
            showModal({
              title: t('sellerAds.successTitle'),
              message: t('sellerAds.successMessage'),
              type: 'success',
            });
          })
          .catch((error: unknown) => {
            showModal({
              title: t('sellerAds.errorTitle'),
              message: getApiErrorMessage(error, t('common.genericError')),
              type: 'error',
            });
          });
      },
    });
  };

  if (!isSellerAccess) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('sellerAds.title')}</Text>
        <Text style={styles.subtitle}>{t('sellerAds.subtitle')}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{t('sellerAds.availableWallet')}</Text>
        <Text style={styles.summaryValue}>
          {walletQuery.data
            ? formatCurrency(walletQuery.data.available)
            : t('common.loading')}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>{t('sellerAds.packages')}</Text>
      {(packagesQuery.data ?? []).map((adPackage) => (
        <SellerAdRequestCard
          key={adPackage.id}
          packageType={t(`sellerAds.packageTypes.${adPackage.placementType}`)}
          amount={adPackage.price}
          currency={adPackage.currency}
          durationDays={adPackage.durationDays}
          approval={approval}
          isSubmitting={createAdRequest.isPending}
          onRequest={() => handleRequest(adPackage)}
        />
      ))}

      <Text style={styles.sectionTitle}>{t('sellerAds.requests')}</Text>
      {(requestsQuery.data ?? []).length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{t('sellerAds.emptyRequests')}</Text>
        </View>
      ) : (
        (requestsQuery.data ?? []).map((request) => (
          <SellerAdRequestCard
            key={request.id}
            packageType={t(`sellerAds.packageTypes.${request.placementType}`)}
            amount={request.amount}
            currency={request.currency}
            status={request.status}
            schedule={requestSchedule(request.startsAt, request.endsAt)}
            approval={t(`adRequestStatuses.${request.status}`)}
          />
        ))
      )}
    </ScrollView>
  );
}
