import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NegotiationMessageType, type NegotiationMessage } from '../../types';
import { OfferCard } from './OfferCard';
import { styles } from './MessageBubble.styles';

interface MessageBubbleProps {
  message: NegotiationMessage;
  isOwn: boolean;
  canRespondToOffer: boolean;
  actionPending?: boolean;
  onAcceptOffer: (offerId: string) => void;
  onRejectOffer: (offerId: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  canRespondToOffer,
  actionPending = false,
  onAcceptOffer,
  onRejectOffer,
}: MessageBubbleProps) {
  const { t } = useTranslation();

  const isOfferMessage = message.type === NegotiationMessageType.OFFER
    || message.type === NegotiationMessageType.COUNTER_OFFER;

  if (isOfferMessage && message.offer) {
    return (
      <View style={styles.offerWrapper}>
        <OfferCard
          offer={message.offer}
          canRespond={canRespondToOffer}
          isPending={actionPending}
          onAccept={() => onAcceptOffer(message.offer?.id ?? '')}
          onReject={() => onRejectOffer(message.offer?.id ?? '')}
        />
      </View>
    );
  }

  const isSystem = message.type === NegotiationMessageType.SYSTEM
    || message.type === NegotiationMessageType.VIOLATION;

  return (
    <View style={[
      styles.row,
      isOwn ? styles.rowOwn : styles.rowOther,
      isSystem ? styles.rowSystem : undefined,
    ]}>
      <View style={[
        styles.bubble,
        isOwn ? styles.bubbleOwn : styles.bubbleOther,
        isSystem ? styles.bubbleSystem : undefined,
      ]}>
        <Text style={[
          styles.body,
          isOwn ? styles.bodyOwn : styles.bodyOther,
          isSystem ? styles.bodySystem : undefined,
        ]}>
          {message.body || t('negotiation.message.empty')}
        </Text>
        <Text style={[
          styles.time,
          isOwn ? styles.timeOwn : styles.timeOther,
          isSystem ? styles.timeSystem : undefined,
        ]}>
          {new Date(message.createdAt).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}
