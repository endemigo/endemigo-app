import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { OrderStatus } from '@endemigo/shared';
import { Colors } from '../../../constants/theme';
import type { OrderListItem as OrderListItemModel } from '../../../types/transactionFlows';
import { formatCurrency, formatShortDate } from '../../../utils/transactionFormatters';
import { styles } from './OrderListItem.styles';

interface OrderListItemProps {
  item: OrderListItemModel;
  onPress: () => void;
}

function getStatusStyle(status: OrderStatus) {
  if (status === OrderStatus.PAYMENT_PENDING || status === OrderStatus.ESCROW_HELD) {
    return styles.statusPayment;
  }
  if (status === OrderStatus.PREPARING_SHIPMENT || status === OrderStatus.IN_TRANSIT) {
    return styles.statusProgress;
  }
  if (
    status === OrderStatus.RETURN_REQUESTED ||
    status === OrderStatus.RETURN_APPROVED ||
    status === OrderStatus.RETURN_IN_TRANSIT ||
    status === OrderStatus.RETURN_DELIVERED ||
    status === OrderStatus.REFUND_PENDING
  ) {
    return styles.statusProgress;
  }
  if (status === OrderStatus.DELIVERED || status === OrderStatus.COMPLETED) {
    return styles.statusSuccess;
  }
  if (status === OrderStatus.REFUNDED) {
    return styles.statusSuccess;
  }
  if (status === OrderStatus.CANCELLED || status === OrderStatus.FAILED) {
    return styles.statusDanger;
  }
  return styles.statusDefault;
}

export function OrderListItem({ item, onPress }: OrderListItemProps) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.imageBox}>
        {item.productImage ? (
          <Image source={{ uri: item.productImage }} style={styles.image} resizeMode="cover" />
        ) : (
          <Ionicons name="cube-outline" size={26} color={Colors.primary} />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.code}>{item.orderCode}</Text>
          <Text style={styles.amount}>{formatCurrency(item.amount, item.currency)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <View style={styles.bottomRow}>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{t(`orderStatuses.${item.status}`)}</Text>
          </View>
          <Text style={styles.updatedAt}>{formatShortDate(item.updatedAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
