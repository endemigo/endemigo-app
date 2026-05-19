import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OrderStatus } from '@endemigo/shared';
import { formatShortDate } from '../../../utils/transactionFormatters';
import { styles } from './OrderStatusTimeline.styles';

interface OrderStatusTimelineProps {
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

const STATUS_ORDER: OrderStatus[] = [
  OrderStatus.ESCROW_HELD,
  OrderStatus.PREPARING_SHIPMENT,
  OrderStatus.IN_TRANSIT,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

const RETURN_STATUS_ORDER: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.RETURN_REQUESTED,
  OrderStatus.RETURN_APPROVED,
  OrderStatus.RETURN_IN_TRANSIT,
  OrderStatus.RETURN_DELIVERED,
  OrderStatus.REFUND_PENDING,
  OrderStatus.REFUNDED,
];

function resolveStatusOrder(status: OrderStatus) {
  if (RETURN_STATUS_ORDER.includes(status)) {
    return RETURN_STATUS_ORDER;
  }

  return STATUS_ORDER;
}

function getStepState(status: OrderStatus, step: OrderStatus) {
  const resolvedOrder = resolveStatusOrder(status);
  const currentIndex = resolvedOrder.indexOf(status);
  const stepIndex = resolvedOrder.indexOf(step);
  if (currentIndex > stepIndex) return 'done';
  if (currentIndex === stepIndex) return 'active';
  return 'pending';
}

export function OrderStatusTimeline({ status, createdAt, updatedAt }: OrderStatusTimelineProps) {
  const { t } = useTranslation();
  const statusOrder = resolveStatusOrder(status);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('orders.timelineTitle')}</Text>
      {statusOrder.map((step, index) => {
        const state = getStepState(status, step);
        return (
          <View key={step} style={styles.step}>
            <View style={[
              styles.marker,
              state === 'active' && styles.markerActive,
              state === 'done' && styles.markerDone,
            ]}>
              <Text style={styles.markerText}>{index + 1}</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.stepTitle}>{t(`orderStatuses.${step}`)}</Text>
              <Text style={styles.stepMeta}>
                {state === 'pending' ? t('orders.status') : formatShortDate(state === 'done' ? createdAt : updatedAt)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
