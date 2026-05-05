import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NegotiationStatus } from '../../types';
import { styles } from './NegotiationStatusBadge.styles';

interface NegotiationStatusBadgeProps {
  status: NegotiationStatus;
}

export function NegotiationStatusBadge({ status }: NegotiationStatusBadgeProps) {
  const { t } = useTranslation();

  const isClosed = [
    NegotiationStatus.ACCEPTED,
    NegotiationStatus.PAYMENT_PENDING,
    NegotiationStatus.COMPLETED,
    NegotiationStatus.REJECTED,
    NegotiationStatus.EXPIRED,
    NegotiationStatus.CANCELLED,
    NegotiationStatus.ARCHIVED,
  ].includes(status);

  return (
    <View style={[styles.badge, isClosed ? styles.badgeMuted : styles.badgeActive]}>
      <Text style={[styles.text, isClosed ? styles.textMuted : styles.textActive]}>
        {t(`negotiation.status.${status}`)}
      </Text>
    </View>
  );
}
