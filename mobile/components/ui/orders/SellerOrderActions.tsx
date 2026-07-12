import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { OrderStatus } from '@endemigo/shared';
import { useTranslation } from 'react-i18next';
import { styles } from './SellerOrderActions.styles';

interface SellerOrderActionsProps {
  status: OrderStatus;
  isSubmitting: boolean;
  onAdvance: (status: OrderStatus) => void;
}

export function SellerOrderActions({
  status,
  isSubmitting,
  onAdvance,
}: SellerOrderActionsProps) {
  const { t } = useTranslation();

  // Satıcı yalnız kargoya verme adımına kadar ilerletir (IN_TRANSIT).
  // Teslim (DELIVERED) artık kargo tarafından gelir (webhook / test simülasyonu),
  // satıcı elle işaretlemez.
  const nextStatus = useMemo(() => {
    if (status === OrderStatus.ESCROW_HELD) return OrderStatus.PREPARING_SHIPMENT;
    if (status === OrderStatus.PREPARING_SHIPMENT) return OrderStatus.IN_TRANSIT;
    return null;
  }, [status]);

  if (!nextStatus) {
    return null;
  }

  const labelKey =
    nextStatus === OrderStatus.PREPARING_SHIPMENT
      ? 'orders.sellerAdvancePreparing'
      : nextStatus === OrderStatus.IN_TRANSIT
        ? 'orders.sellerAdvanceTransit'
        : 'orders.sellerAdvanceDelivered';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('orders.sellerActionsTitle')}</Text>
      <Text style={styles.body}>{t('orders.sellerActionsBody')}</Text>
      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={() => onAdvance(nextStatus)}
        disabled={isSubmitting}
        activeOpacity={0.82}
      >
        <Text style={styles.buttonText}>{t(labelKey)}</Text>
      </TouchableOpacity>
    </View>
  );
}
