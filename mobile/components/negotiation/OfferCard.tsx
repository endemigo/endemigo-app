import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { NegotiationOfferStatus, type NegotiationOffer } from '../../types';
import { styles } from './OfferCard.styles';

interface OfferCardProps {
  offer: NegotiationOffer;
  canRespond: boolean;
  isPending?: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function OfferCard({
  offer,
  canRespond,
  isPending = false,
  onAccept,
  onReject,
}: OfferCardProps) {
  const { t } = useTranslation();
  const isOpen = offer.status === NegotiationOfferStatus.PENDING;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <Ionicons name="pricetag" size={16} color={Colors.primary} />
        </View>
        <Text style={styles.title}>{t('negotiation.offer.title')}</Text>
        <Text style={[styles.status, isOpen ? styles.statusOpen : styles.statusClosed]}>
          {t(`negotiation.offer.status.${offer.status}`)}
        </Text>
      </View>

      <Text style={styles.amount}>
        ₺{Number(offer.amount).toLocaleString('tr-TR')}
      </Text>
      <Text style={styles.meta}>
        {t('negotiation.offer.quantity', { count: offer.quantity })}
      </Text>
      {offer.expiresAt ? (
        <Text style={styles.meta}>
          {t('negotiation.offer.expiresAt', {
            date: new Date(offer.expiresAt).toLocaleString('tr-TR'),
          })}
        </Text>
      ) : null}

      {canRespond ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={onReject}
            activeOpacity={0.8}
            disabled={isPending}
          >
            <Ionicons name="close" size={16} color={Colors.error} />
            <Text style={styles.rejectText}>{t('negotiation.actions.reject')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={onAccept}
            activeOpacity={0.8}
            disabled={isPending}
          >
            <Ionicons name="checkmark" size={16} color={Colors.white} />
            <Text style={styles.acceptText}>{t('negotiation.actions.accept')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
