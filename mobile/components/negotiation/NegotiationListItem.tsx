import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Negotiation } from '../../types';
import { Colors } from '../../constants/theme';
import { NegotiationStatusBadge } from './NegotiationStatusBadge';
import { styles } from './NegotiationListItem.styles';

const NEGOTIATION_PLACEHOLDER = 'https://placehold.co/96x96/F8F9FA/0097D8?text=Endemigo';

interface NegotiationListItemProps {
  negotiation: Negotiation;
  onPress: () => void;
}

export function NegotiationListItem({ negotiation, onPress }: NegotiationListItemProps) {
  const { t } = useTranslation();
  const latestText = negotiation.latestOffer
    ? t('negotiation.list.latestOffer', {
      amount: Number(negotiation.latestOffer.amount).toLocaleString('tr-TR'),
    })
    : negotiation.latestMessage?.body ?? t('negotiation.list.noMessage');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.78}>
      <Image
        source={{ uri: negotiation.product.imageUrl ?? NEGOTIATION_PLACEHOLDER }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>{negotiation.product.title}</Text>
          {negotiation.unreadCount ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{negotiation.unreadCount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {negotiation.seller.name}
        </Text>
        <Text style={styles.latest} numberOfLines={2}>{latestText}</Text>
        <View style={styles.footerRow}>
          <NegotiationStatusBadge status={negotiation.status} />
          <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
