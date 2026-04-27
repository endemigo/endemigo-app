import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CargoStatus } from '@endemigo/shared';
import { Colors } from '../../../constants/theme';
import { useModalStore } from '../../../store/modalStore';
import { getApiErrorMessage } from '../../../utils/transactionFormatters';
import { styles } from './DeliveryConfirmActions.styles';

interface DeliveryConfirmActionsProps {
  canConfirm: boolean;
  canDispute: boolean;
  cargoStatus?: CargoStatus | null;
  isSubmitting: boolean;
  onConfirm: () => Promise<unknown>;
}

export function DeliveryConfirmActions({
  canConfirm,
  canDispute,
  cargoStatus,
  isSubmitting,
  onConfirm,
}: DeliveryConfirmActionsProps) {
  const { t } = useTranslation();
  const { showModal } = useModalStore();
  const isDelivered = cargoStatus === CargoStatus.DELIVERED;

  if (!isDelivered || (!canConfirm && !canDispute)) {
    return null;
  }

  const handleConfirm = () => {
    showModal({
      title: t('orders.confirmDeliveryTitle'),
      message: t('orders.confirmDeliveryModal'),
      type: 'info',
      confirmText: t('orders.confirmDelivery'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        try {
          await onConfirm();
          showModal({
            title: t('orders.confirmDeliverySuccessTitle'),
            message: t('orders.confirmDeliverySuccessMessage'),
            type: 'success',
          });
        } catch (error) {
          showModal({
            title: t('orders.confirmDeliveryErrorTitle'),
            message: getApiErrorMessage(error, t('common.genericError')),
            type: 'error',
          });
        }
      },
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('orders.confirmDeliveryTitle')}</Text>
      <Text style={styles.body}>{t('orders.disputeWindow')}</Text>
      <View style={styles.buttonRow}>
        {canConfirm && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleConfirm}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.buttonText}>{t('orders.confirmDelivery')}</Text>
            )}
          </TouchableOpacity>
        )}
        {canDispute && (
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.8}>
            <Text style={styles.secondaryText}>{t('orders.disputeDelivery')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
