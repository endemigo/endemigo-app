import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, Modal } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/theme';
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
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const { showModal } = useModalStore();
  const pathname = usePathname();
  const isFocused = pathname.includes('/seller-ads');
  const [activeTab, setActiveTab] = useState<'packages' | 'requests'>('packages');
  const [selectedPackage, setSelectedPackage] = useState<SellerAdPackage | null>(null);

  const isSellerAccess = activeMode === 'seller' && Boolean(user?.isSeller);
  const packagesQuery = useAdPackages();
  const requestsQuery = useMyAdRequests(isSellerAccess);
  const walletQuery = useWalletBalance();
  const createAdRequest = useCreateAdRequest();
  const approval = t('sellerAds.approvalAdminReview');

  useEffect(() => {
    if (isFocused && !isSellerAccess) {
      showModal({
        title: t('sellerAds.accessDeniedTitle'),
        message: t('sellerAds.accessDeniedMessage'),
        type: 'info',
      });
      router.replace('/(tabs)/profile' as never);
    }
  }, [isFocused, isSellerAccess, router, showModal, t]);

  const handleRequest = (adPackage: SellerAdPackage) => {
    setSelectedPackage(null); // Close detail modal
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
        setActiveTab('requests'); // Switch to requests tab to see the pending request
      })
      .catch((error: unknown) => {
        showModal({
          title: t('sellerAds.errorTitle'),
          message: getApiErrorMessage(error, t('common.genericError')),
          type: 'error',
        });
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
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xxl, paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.base },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('sellerAds.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.descriptionContainer}>
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

        {/* Segmented Control Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabSegment, activeTab === 'packages' && styles.tabSegmentActive]}
            onPress={() => setActiveTab('packages')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'packages' && styles.tabTextActive]}>
              {t('sellerAds.packagesTab')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabSegment, activeTab === 'requests' && styles.tabSegmentActive]}
            onPress={() => setActiveTab('requests')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
              {t('sellerAds.requestsTab')}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'packages' ? (
          <View style={styles.tabContentContainer}>
            {(packagesQuery.data ?? []).map((adPackage) => (
              <SellerAdRequestCard
                key={adPackage.id}
                packageType={t(`sellerAds.packageTypes.${adPackage.placementType}`)}
                amount={adPackage.price}
                currency={adPackage.currency}
                durationDays={adPackage.durationDays}
                approval={approval}
                onPress={() => setSelectedPackage(adPackage)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.tabContentContainer}>
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
          </View>
        )}
      </ScrollView>

      {/* Package Detail Modal / Bottom Sheet */}
      <Modal
        visible={selectedPackage !== null}
        transparent={true}
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setSelectedPackage(null)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />

            {selectedPackage && (
              <>
                <Text style={styles.modalTitle}>
                  {t(`sellerAds.packageTypes.${selectedPackage.placementType}`)}
                </Text>

                <Text style={styles.modalDescription}>
                  {t(`sellerAds.packageDescriptions.${selectedPackage.placementType}`)}
                </Text>

                <View style={styles.modalDivider} />

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>{t('sellerAds.reserveAmount')}</Text>
                  <Text style={styles.modalDetailValue}>
                    {formatCurrency(selectedPackage.price, selectedPackage.currency)}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>{t('sellerAds.duration')}</Text>
                  <Text style={styles.modalDetailValue}>
                    {t('sellerAds.durationDays', { count: selectedPackage.durationDays })}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>{t('sellerAds.approvalState')}</Text>
                  <Text style={styles.modalDetailValue}>{approval}</Text>
                </View>

                <View style={styles.modalDivider} />

                {/* Wallet Info */}
                <View style={styles.modalWalletBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="wallet-outline" size={16} color={Colors.slate500} />
                    <Text style={styles.modalWalletLabel}>{t('sellerAds.availableWallet')}</Text>
                  </View>
                  <Text style={styles.modalWalletValue}>
                    {walletQuery.data ? formatCurrency(walletQuery.data.available) : '...'}
                  </Text>
                </View>

                {/* Insufficient Balance Warning */}
                {walletQuery.data && walletQuery.data.available < selectedPackage.price ? (
                  <View style={styles.modalWarningBox}>
                    <Ionicons name="warning" size={16} color={Colors.error} />
                    <Text style={styles.modalWarningText}>
                      Cüzdan bakiyeniz yetersiz. Lütfen bakiye yükleyin.
                    </Text>
                  </View>
                ) : null}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setSelectedPackage(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalCancelButtonText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalSubmitButton,
                      (createAdRequest.isPending || (walletQuery.data && walletQuery.data.available < selectedPackage.price)) && styles.modalSubmitButtonDisabled
                    ]}
                    onPress={() => handleRequest(selectedPackage)}
                    disabled={createAdRequest.isPending || (walletQuery.data && walletQuery.data.available < selectedPackage.price)}
                    activeOpacity={0.8}
                  >
                    {createAdRequest.isPending ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={styles.modalSubmitButtonText}>{t('sellerAds.confirmCta')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
