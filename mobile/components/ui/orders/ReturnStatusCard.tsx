import React from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import { OrderStatus } from '@endemigo/shared';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/theme';
import { styles } from './ReturnStatusCard.styles';

interface ReturnStatusCardProps {
  status: OrderStatus;
  reasonCode?: string | null;
  note?: string | null;
  returnImages?: string[] | null;
  canApprove: boolean;
  canReject: boolean;
  canConfirmDelivered: boolean;
  isSubmitting: boolean;
  onApprove: () => Promise<unknown>;
  onReject: () => Promise<unknown>;
  onConfirmDelivered: () => Promise<unknown>;
}

export function ReturnStatusCard({
  status,
  reasonCode,
  note,
  returnImages,
  canApprove,
  canReject,
  canConfirmDelivered,
  isSubmitting,
  onApprove,
  onReject,
  onConfirmDelivered,
}: ReturnStatusCardProps) {
  const { t } = useTranslation();

  if (
    ![
      OrderStatus.RETURN_REQUESTED,
      OrderStatus.RETURN_APPROVED,
      OrderStatus.RETURN_IN_TRANSIT,
      OrderStatus.RETURN_DELIVERED,
      OrderStatus.REFUND_PENDING,
      OrderStatus.REFUNDED,
      OrderStatus.RETURN_REJECTED,
    ].includes(status)
  ) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('orders.returnStatusTitle')}</Text>
      <View style={styles.statusRow}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{t(`orderStatuses.${status}`)}</Text>
        </View>
      </View>
      {reasonCode ? (
        <Text style={styles.note}>{t(`orders.returnReasons.${reasonCode}`)}</Text>
      ) : null}
      {note ? <Text style={styles.body}>{note}</Text> : null}
      
      {returnImages && returnImages.length > 0 ? (
        <View>
          <Text style={styles.proofImageLabel}>İade Kanıt Görselleri</Text>
          <View style={styles.imagesContainer}>
            {returnImages.map((url, idx) => (
              <Image
                key={`${url}-${idx}`}
                source={{ uri: url }}
                style={styles.proofImage}
                resizeMode="cover"
              />
            ))}
          </View>
        </View>
      ) : null}

      {(canApprove || canReject || canConfirmDelivered) ? (
        <View style={styles.buttonRow}>
          {canApprove ? (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={onApprove}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>{t('orders.approveReturn')}</Text>
              )}
            </TouchableOpacity>
          ) : null}
          {canReject ? (
            <TouchableOpacity
              style={[styles.button, styles.dangerButton, isSubmitting && styles.buttonDisabled]}
              onPress={onReject}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>{t('orders.rejectReturn')}</Text>
            </TouchableOpacity>
          ) : null}
          {canConfirmDelivered ? (
            <TouchableOpacity
              style={[styles.button, styles.neutralButton, isSubmitting && styles.buttonDisabled]}
              onPress={onConfirmDelivered}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>{t('orders.confirmReturnDelivered')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
