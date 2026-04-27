import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { WalletSummary } from '../../../types/transactionFlows';
import { formatCurrency } from '../../../utils/transactionFormatters';
import { styles } from './WalletSummaryCard.styles';

interface WalletSummaryCardProps {
  summary?: WalletSummary;
}

export function WalletSummaryCard({ summary }: WalletSummaryCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{t('wallet.summaryTitle')}</Text>
      <Text style={styles.primaryLabel}>{t('wallet.availableBalance')}</Text>
      <Text style={styles.availableAmount}>
        {formatCurrency(summary?.available ?? 0)}
      </Text>

      <View style={styles.metricRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>{t('wallet.totalBalance')}</Text>
          <Text style={styles.metricValue}>{formatCurrency(summary?.balance ?? 0)}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>{t('wallet.heldBalance')}</Text>
          <Text style={styles.metricValue}>{formatCurrency(summary?.held ?? 0)}</Text>
        </View>
      </View>
    </View>
  );
}
