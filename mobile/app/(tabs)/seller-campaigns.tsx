import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  CampaignDiscountType,
  CampaignScopeType,
} from '@endemigo/shared';
import { Colors } from '../../constants/theme';
import {
  CampaignRuleForm,
  type CampaignRuleFormValues,
} from '../../components/ui/campaigns/CampaignRuleForm';
import {
  type SellerCampaign,
  useCreateCampaign,
  useCreateCoupon,
  useMyCampaigns,
  useMyCoupons,
  useOptIntoCampaign,
} from '../../hooks/useSellerCampaigns';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { useRoleModeStore } from '../../store/roleModeStore';
import { formatShortDate, getApiErrorMessage } from '../../utils/transactionFormatters';
import { styles } from '../../styles/tabs/seller-campaigns.styles';

const defaultValidity = () => ({
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
});

function platformOptedIn(campaign: SellerCampaign) {
  return (campaign.metadata.optedInSellerIds?.length ?? 0) > 0;
}

export default function SellerCampaignsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const { showModal } = useModalStore();
  const pathname = usePathname();
  const isFocused = pathname.includes('/seller-campaigns');

  const isSellerAccess = activeMode === 'seller' && Boolean(user?.isSeller);
  const campaignsQuery = useMyCampaigns(isSellerAccess);
  const couponsQuery = useMyCoupons(isSellerAccess);
  const createCampaign = useCreateCampaign();
  const createCoupon = useCreateCoupon();
  const optIntoCampaign = useOptIntoCampaign();

  useEffect(() => {
    if (isFocused && !isSellerAccess) {
      showModal({
        title: t('sellerCampaigns.accessDeniedTitle'),
        message: t('sellerCampaigns.accessDeniedMessage'),
        type: 'info',
      });
      router.replace('/(tabs)/profile' as never);
    }
  }, [isFocused, isSellerAccess, router, showModal, t]);

  const showError = (titleKey: string, error: unknown) => {
    showModal({
      title: t(titleKey),
      message: getApiErrorMessage(error, t('common.genericError')),
      type: 'error',
    });
  };

  const validateForm = (values: CampaignRuleFormValues) => {
    if (!values.scopeId || values.discountValue <= 0) {
      showModal({
        title: t('sellerCampaigns.validationTitle'),
        message: t('sellerCampaigns.validationMessage'),
        type: 'error',
      });
      return false;
    }
    return true;
  };

  const handleCampaignSubmit = (values: CampaignRuleFormValues) => {
    if (!validateForm(values)) return;
    createCampaign.mutateAsync({
      name: values.title || t('sellerCampaigns.defaultCampaignName'),
      startsAt: values.validity.startsAt,
      endsAt: values.validity.endsAt,
      rules: [
        {
          discountType: values.discountType,
          discountValue: values.discountValue,
          scopeType: values.scope,
          scopeId: values.scopeId,
          minAmount: values.thresholds.minAmount,
        },
      ],
    })
      .then(() => {
        showModal({
          title: t('sellerCampaigns.createSuccessTitle'),
          message: t('sellerCampaigns.createCampaignSuccessMessage'),
          type: 'success',
        });
      })
      .catch((error: unknown) => showError('sellerCampaigns.createErrorTitle', error));
  };

  const handleCouponSubmit = (values: CampaignRuleFormValues) => {
    if (!validateForm(values)) return;
    createCoupon.mutateAsync({
      code: values.code || values.title,
      discountType: values.discountType,
      discountValue: values.discountValue,
      startsAt: values.validity.startsAt,
      endsAt: values.validity.endsAt,
      minAmount: values.thresholds.minAmount,
      maxUses: values.thresholds.maxUses,
      perUserLimit: values.thresholds.perUserLimit,
      scopeType: values.scope,
      scopeId: values.scopeId,
    })
      .then(() => {
        showModal({
          title: t('sellerCampaigns.createSuccessTitle'),
          message: t('sellerCampaigns.createCouponSuccessMessage'),
          type: 'success',
        });
      })
      .catch((error: unknown) => showError('sellerCampaigns.createErrorTitle', error));
  };

  const handleOptIn = (campaignId: string) => {
    optIntoCampaign.mutateAsync(campaignId)
      .then(() => {
        showModal({
          title: t('sellerCampaigns.optInSuccessTitle'),
          message: t('sellerCampaigns.optInSuccessMessage'),
          type: 'success',
        });
      })
      .catch((error: unknown) => showError('sellerCampaigns.optInErrorTitle', error));
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
        <Text style={styles.title}>{t('sellerCampaigns.title')}</Text>
        <Text style={styles.subtitle}>{t('sellerCampaigns.subtitle')}</Text>
      </View>

      <CampaignRuleForm
        mode="campaign"
        scope={CampaignScopeType.PRODUCT}
        discountType={CampaignDiscountType.FIXED_AMOUNT}
        thresholds={{}}
        validity={defaultValidity()}
        isSubmitting={createCampaign.isPending}
        onSubmit={handleCampaignSubmit}
      />

      <CampaignRuleForm
        mode="coupon"
        scope={CampaignScopeType.PRODUCT}
        discountType={CampaignDiscountType.PERCENTAGE}
        thresholds={{ perUserLimit: 1 }}
        validity={defaultValidity()}
        isSubmitting={createCoupon.isPending}
        onSubmit={handleCouponSubmit}
      />

      <Text style={styles.sectionTitle}>{t('sellerCampaigns.platformCampaigns')}</Text>
      <View style={styles.listCard}>
        {(campaignsQuery.data ?? []).filter((campaign) => campaign.isPlatform).length === 0 ? (
          <Text style={styles.emptyText}>{t('sellerCampaigns.emptyPlatformCampaigns')}</Text>
        ) : (
          (campaignsQuery.data ?? [])
            .filter((campaign) => campaign.isPlatform)
            .map((campaign) => {
              const optedIn = platformOptedIn(campaign);
              return (
                <View key={campaign.id} style={styles.row}>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>{campaign.name}</Text>
                    <Text style={styles.rowMeta}>
                      {formatShortDate(campaign.startsAt)} - {formatShortDate(campaign.endsAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      (optedIn || optIntoCampaign.isPending) && styles.actionButtonDisabled,
                    ]}
                    activeOpacity={0.8}
                    disabled={optedIn || optIntoCampaign.isPending}
                    onPress={() => handleOptIn(campaign.id)}
                  >
                    <Text style={styles.actionText}>
                      {optedIn ? t('sellerCampaigns.optedIn') : t('sellerCampaigns.optIn')}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
        )}
      </View>

      <Text style={styles.sectionTitle}>{t('sellerCampaigns.myCampaigns')}</Text>
      <View style={styles.listCard}>
        {(campaignsQuery.data ?? []).filter((campaign) => !campaign.isPlatform).length === 0 ? (
          <Text style={styles.emptyText}>{t('sellerCampaigns.emptyCampaigns')}</Text>
        ) : (
          (campaignsQuery.data ?? [])
            .filter((campaign) => !campaign.isPlatform)
            .map((campaign) => (
              <View key={campaign.id} style={styles.row}>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{campaign.name}</Text>
                  <Text style={styles.rowMeta}>
                    {t(`campaignStatuses.${campaign.status}`)}
                  </Text>
                </View>
              </View>
            ))
        )}
      </View>

      <Text style={styles.sectionTitle}>{t('sellerCampaigns.myCoupons')}</Text>
      <View style={styles.listCard}>
        {(couponsQuery.data ?? []).length === 0 ? (
          <Text style={styles.emptyText}>{t('sellerCampaigns.emptyCoupons')}</Text>
        ) : (
          (couponsQuery.data ?? []).map((coupon) => (
            <View key={coupon.id} style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>{coupon.code}</Text>
                <Text style={styles.rowMeta}>
                  {t(`couponStatuses.${coupon.status}`)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
