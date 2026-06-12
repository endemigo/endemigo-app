import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  MembershipPeriod,
  MembershipStatus,
} from '@endemigo/shared';
import { Colors } from '../../constants/theme';
import { MembershipPackageCard } from '../../components/ui/membership/MembershipPackageCard';
import { MembershipBenefitShowcase } from '../../components/ui/membership/MembershipBenefitShowcase';
import {
  type MembershipBenefits,
  type MembershipPackage,
  useCancelMembership,
  useMembershipPackages,
  useMyMembership,
  useStartMembershipUpgrade,
} from '../../hooks/useMembership';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { useRoleModeStore } from '../../store/roleModeStore';
import { formatShortDate, getApiErrorMessage } from '../../utils/transactionFormatters';
import { styles } from '../../styles/tabs/membership.styles';

function benefitRows(t: (key: string, options?: Record<string, unknown>) => string, benefits: MembershipBenefits) {
  return [
    {
      label: t('membership.benefits.visibilityBoost'),
      value: t('membership.benefitValues.visibilityBoost', { value: benefits.visibilityBoost }),
    },
    {
      label: t('membership.benefits.adCredits'),
      value: t('membership.benefitValues.adCredits', { value: benefits.adCredits }),
    },
    {
      label: t('membership.benefits.commissionRate'),
      value: t('membership.benefitValues.commissionRate', {
        value: Math.round(benefits.commissionRate * 100),
      }),
    },
    {
      label: t('membership.benefits.payoutPriority'),
      value: t(`membership.payoutPriority.${benefits.payoutPriority}`),
    },
  ];
}

function packagePeriods(membershipPackage: MembershipPackage) {
  return [
    {
      period: MembershipPeriod.MONTHLY,
      price: membershipPackage.monthlyPrice,
      currency: membershipPackage.currency,
    },
    {
      period: MembershipPeriod.YEARLY,
      price: membershipPackage.yearlyPrice,
      currency: membershipPackage.currency,
    },
  ];
}

export default function MembershipScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const { showModal } = useModalStore();
  const pathname = usePathname();
  const isFocused = pathname.includes('/membership');

  const isSellerAccess = activeMode === 'seller' && Boolean(user?.isSeller);
  const packagesQuery = useMembershipPackages();
  const membershipQuery = useMyMembership(isSellerAccess);
  const upgradeMutation = useStartMembershipUpgrade();
  const cancelMutation = useCancelMembership();
  const subscription = membershipQuery.data?.subscription;
  const currentBenefits = membershipQuery.data?.benefits;
  const currentPackageId = subscription?.packageId;
  const currentPackageName = subscription?.package?.name ?? t('paketim.standardPackage');
  const grace = subscription?.status === MembershipStatus.GRACE;
  const cancelAtPeriodEnd = Boolean(subscription?.cancelAtPeriodEnd);

  useEffect(() => {
    if (isFocused && !isSellerAccess) {
      showModal({
        title: t('paketim.accessDeniedTitle'),
        message: t('paketim.accessDeniedMessage'),
        type: 'info',
      });
      router.replace('/(tabs)/profile' as never);
    }
  }, [isFocused, isSellerAccess, router, showModal, t]);

  const benefits = useMemo(
    () => [
      t('paketim.benefitVisibility'),
      t('paketim.benefitTrust'),
      t('paketim.benefitPayout'),
      t('paketim.benefitSupport'),
    ],
    [t],
  );

  const handleUpgrade = (membershipPackage: MembershipPackage, period: MembershipPeriod) => {
    showModal({
      title: t('membership.upgrade.title'),
      message: t('membership.upgrade.message', { packageName: membershipPackage.name }),
      type: 'info',
      confirmText: t('membership.upgrade.confirm'),
      cancelText: t('common.cancel'),
      onCancel: () => undefined,
      onConfirm: () => {
        upgradeMutation.mutateAsync({ packageId: membershipPackage.id, period })
          .then(() => {
            showModal({
              title: t('membership.upgrade.successTitle'),
              message: t('membership.upgrade.successMessage'),
              type: 'success',
            });
          })
          .catch((error: unknown) => {
            showModal({
              title: t('membership.upgrade.errorTitle'),
              message: getApiErrorMessage(error, t('common.genericError')),
              type: 'error',
            });
          });
      },
    });
  };

  const handleCancel = () => {
    showModal({
      title: t('membership.cancel.title'),
      message: t('membership.cancel.message'),
      type: 'info',
      confirmText: t('membership.cancel.confirm'),
      cancelText: t('common.cancel'),
      onCancel: () => undefined,
      onConfirm: () => {
        cancelMutation.mutateAsync()
          .then(() => {
            showModal({
              title: t('membership.cancel.successTitle'),
              message: t('membership.cancel.successMessage'),
              type: 'success',
            });
          })
          .catch((error: unknown) => {
            showModal({
              title: t('membership.cancel.errorTitle'),
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
        <Text style={styles.title}>{t('paketim.title')}</Text>
        <Text style={styles.subtitle}>{t('paketim.sellerInfoDescription')}</Text>
      </View>

      <MembershipBenefitShowcase
        packageName={currentPackageName}
        benefits={benefits}
        sellerOnly
        highlightedBenefit={t('paketim.benefitPayout')}
      />

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t('membership.status')}</Text>
          <Text style={styles.statusValue}>
            {subscription ? t(`membership.statuses.${subscription.status}`) : t('membership.statuses.FREE')}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t('membership.period')}</Text>
          <Text style={styles.statusValue}>
            {subscription ? t(`membership.periods.${subscription.period}`) : t('membership.periods.MONTHLY')}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t('membership.renewal')}</Text>
          <Text style={styles.statusValue}>
            {formatShortDate(subscription?.currentPeriodEndsAt) || t('membership.noRenewal')}
          </Text>
        </View>
        {grace && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{t('membership.grace')}</Text>
            <Text style={styles.statusValue}>{formatShortDate(subscription?.graceEndsAt)}</Text>
          </View>
        )}
        {cancelAtPeriodEnd && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{t('membership.cancelAtPeriodEnd')}</Text>
            <Text style={styles.statusValue}>{t('common.ok')}</Text>
          </View>
        )}
      </View>

      {currentBenefits && (
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>{t('membership.currentBenefits')}</Text>
          <Text style={styles.noteBody}>
            {benefitRows(t, currentBenefits).map((item) => `${item.label}: ${item.value}`).join('\n')}
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('membership.packages')}</Text>
      <View style={styles.packageList}>
        {(packagesQuery.data ?? []).map((membershipPackage) => (
          <MembershipPackageCard
            key={membershipPackage.id}
            name={membershipPackage.name}
            periods={packagePeriods(membershipPackage)}
            benefits={benefitRows(t, membershipPackage.benefits)}
            current={membershipPackage.id === currentPackageId}
            isSubmitting={upgradeMutation.isPending}
            onUpgrade={(period) => handleUpgrade(membershipPackage, period)}
          />
        ))}
      </View>

      {subscription && !cancelAtPeriodEnd && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            cancelMutation.isPending && styles.actionButtonDisabled,
          ]}
          activeOpacity={0.8}
          disabled={cancelMutation.isPending}
          onPress={handleCancel}
        >
          <Text style={styles.actionButtonText}>{t('membership.cancel.cta')}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>{t('paketim.sellerInfoTitle')}</Text>
        <Text style={styles.noteBody}>{t('membership.periodEndNote')}</Text>
      </View>
    </ScrollView>
  );
}
