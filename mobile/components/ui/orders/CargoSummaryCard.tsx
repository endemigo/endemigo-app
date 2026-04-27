import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CargoSummary } from '../../../types/transactionFlows';
import { formatShortDateTime } from '../../../utils/transactionFormatters';
import { styles } from './CargoSummaryCard.styles';

interface CargoSummaryCardProps {
  cargo: CargoSummary | null;
}

export function CargoSummaryCard({ cargo }: CargoSummaryCardProps) {
  const { t } = useTranslation();

  if (!cargo) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{t('cargo.title')}</Text>
        <Text style={styles.emptyText}>{t('cargo.noCargo')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('cargo.title')}</Text>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{t(`cargoStatuses.${cargo.status}`)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t('cargo.provider')}</Text>
        <Text style={styles.value}>{cargo.provider}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t('cargo.trackingNumber')}</Text>
        <Text style={styles.value}>{cargo.trackingNumber}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t('cargo.status')}</Text>
        <Text style={styles.value}>{formatShortDateTime(cargo.updatedAt)}</Text>
      </View>
      <Text style={styles.emptyText}>{t('cargo.mockProviderNote')}</Text>
    </View>
  );
}
