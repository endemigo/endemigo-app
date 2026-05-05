import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
}: SellerAdRequestCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{packageType}</Text>
        {status && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {t(`adRequestStatuses.${status}`)}
            </Text>
          </View>
        )}
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
    </View>
  );
}
