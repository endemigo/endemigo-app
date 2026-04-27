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

function getStepState(status: OrderStatus, step: OrderStatus) {
  const currentIndex = STATUS_ORDER.indexOf(status);
  const stepIndex = STATUS_ORDER.indexOf(step);
  if (currentIndex > stepIndex) return 'done';
  if (currentIndex === stepIndex) return 'active';
  return 'pending';
}

export function OrderStatusTimeline({ status, createdAt, updatedAt }: OrderStatusTimelineProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('orders.timelineTitle')}</Text>
      {STATUS_ORDER.map((step, index) => {
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
