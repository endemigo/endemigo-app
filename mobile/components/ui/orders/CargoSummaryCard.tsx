import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CargoShipmentSummary } from '../../../types/transactionFlows';
import { formatShortDateTime } from '../../../utils/transactionFormatters';
import { styles } from './CargoSummaryCard.styles';

interface CargoSummaryCardProps {
  shipments: CargoShipmentSummary[];
}

export function CargoSummaryCard({ shipments }: CargoSummaryCardProps) {
  const { t } = useTranslation();

  if (shipments.length === 0) {
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
      {shipments.map((shipment) => (
        <View key={shipment.id} style={styles.shipmentCard}>
          <Text style={styles.shipmentTitle}>
            {shipment.shipmentType === 'RETURN'
              ? t('cargo.returnShipment')
              : t('cargo.forwardShipment')}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{t(`cargoStatuses.${shipment.status}`)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('cargo.provider')}</Text>
            <Text style={styles.value}>{shipment.provider}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('cargo.trackingNumber')}</Text>
            <Text style={styles.value}>{shipment.trackingNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('cargo.status')}</Text>
            <Text style={styles.value}>{formatShortDateTime(shipment.updatedAt)}</Text>
          </View>
          {shipment.timeline.map((event) => (
            <View key={event.id} style={styles.timelineItem}>
              <Text style={styles.timelineTitle}>{event.title}</Text>
              <Text style={styles.timelineMeta}>
                {event.detail} • {formatShortDateTime(event.createdAt)}
              </Text>
            </View>
          ))}
        </View>
      ))}
      <Text style={styles.emptyText}>{t('cargo.mockProviderNote')}</Text>
    </View>
  );
}
