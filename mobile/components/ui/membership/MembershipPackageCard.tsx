import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MembershipPeriod } from '@endemigo/shared';
import { Colors } from '../../../constants/theme';
import { formatCurrency } from '../../../utils/transactionFormatters';
import { styles } from './MembershipPackageCard.styles';

export interface MembershipPackagePeriod {
  period: MembershipPeriod;
  price: number;
  currency: string;
}

export interface MembershipPackageBenefit {
  label: string;
  value: string;
}

interface MembershipPackageCardProps {
  name: string;
  periods: MembershipPackagePeriod[];
  benefits: MembershipPackageBenefit[];
  current: boolean;
  isSubmitting?: boolean;
  onUpgrade: (period: MembershipPeriod) => void;
}

export function MembershipPackageCard({
  name,
  periods,
  benefits,
  current,
  isSubmitting = false,
  onUpgrade,
}: MembershipPackageCardProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.card, current && styles.cardCurrent]}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{name}</Text>
        {current && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>{t('membership.current')}</Text>
          </View>
        )}
      </View>

      <View style={styles.benefitList}>
        {benefits.map((benefit) => (
          <View key={benefit.label} style={styles.benefitRow}>
            <Text style={styles.benefitLabel}>{benefit.label}</Text>
            <Text style={styles.benefitValue}>{benefit.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.periodList}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.period}
            style={[
              styles.periodButton,
              (current || isSubmitting) && styles.periodButtonDisabled,
            ]}
            activeOpacity={0.8}
            disabled={current || isSubmitting}
            onPress={() => onUpgrade(period.period)}
          >
            <Text style={styles.periodLabel}>
              {t(`membership.periods.${period.period}`)}
            </Text>
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.periodPrice}>
                {formatCurrency(period.price, period.currency)}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
