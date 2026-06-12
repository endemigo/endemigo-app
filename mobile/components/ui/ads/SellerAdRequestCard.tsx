import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { AdRequestStatus } from '@endemigo/shared';
import { Colors } from '../../../constants/theme';
import { formatCurrency } from '../../../utils/transactionFormatters';
import { styles } from './SellerAdRequestCard.styles';

interface SellerAdRequestCardProps {
  packageType: string;
  amount: number;
  currency?: string;
  status?: AdRequestStatus;
  schedule?: string | null;
  durationDays?: number;
  approval?: string;
  isSubmitting?: boolean;
  onRequest?: () => void;
  onPress?: () => void;
}

function getStatusBadgeStyles(status: AdRequestStatus) {
  switch (status) {
    case 'APPROVED':
    case 'ACTIVE':
    case 'COMPLETED':
      return {
        bg: { backgroundColor: Colors.secondaryContainer },
        text: { color: Colors.onSecondaryContainer },
      };
    case 'REJECTED':
    case 'CANCELLED':
      return {
        bg: { backgroundColor: Colors.errorContainer },
        text: { color: Colors.onErrorContainer },
      };
    case 'REQUESTED':
    case 'ADMIN_REVIEW':
      return {
        bg: { backgroundColor: Colors.tertiaryFixed },
        text: { color: Colors.tertiary },
      };
    default:
      return {
        bg: { backgroundColor: Colors.slate100 },
        text: { color: Colors.slate600 },
      };
  }
}

export function SellerAdRequestCard({
  packageType,
  amount,
  currency = 'TRY',
  status,
  schedule,
  durationDays,
  approval,
  isSubmitting = false,
  onRequest,
  onPress,
}: SellerAdRequestCardProps) {
  const { t } = useTranslation();
  const badgeStyles = status ? getStatusBadgeStyles(status) : null;
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={!onPress}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{packageType}</Text>
        {status ? (
          <View style={[styles.statusBadge, badgeStyles?.bg]}>
            <Text style={[styles.statusBadgeText, badgeStyles?.text]}>
              {t(`adRequestStatuses.${status}`)}
            </Text>
          </View>
        ) : onPress ? (
          <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
        ) : null}
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t('sellerAds.reserveAmount')}</Text>
          <Text style={styles.metaValue}>{formatCurrency(amount, currency)}</Text>
        </View>
        {durationDays !== undefined && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('sellerAds.duration')}</Text>
            <Text style={styles.metaValue}>
              {t('sellerAds.durationDays', { count: durationDays })}
            </Text>
          </View>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t('sellerAds.approvalState')}</Text>
          <Text style={styles.metaValue}>
            {approval ?? t('sellerAds.approvalAdminReview')}
          </Text>
        </View>
        {schedule && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('sellerAds.schedule')}</Text>
            <Text style={styles.metaValue}>{schedule}</Text>
          </View>
        )}
      </View>

      {onRequest && (
        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          activeOpacity={0.8}
          disabled={isSubmitting}
          onPress={onRequest}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.buttonText}>{t('sellerAds.requestPackage')}</Text>
          )}
        </TouchableOpacity>
      )}
    </Container>
  );
}
