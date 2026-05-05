import React, { useMemo } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MessageBubble, NegotiationComposer, NegotiationStatusBadge } from '../../components/negotiation';
import { Colors } from '../../constants/theme';
import {
  useCanRespondToOffer,
  useNegotiation,
  useNegotiationActions,
  useNegotiationMessages,
  useNegotiationRealtime,
  useNegotiationStoreMessages,
} from '../../hooks/useNegotiations';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { NegotiationStatus } from '../../types';
import { styles } from '../../styles/negotiation/[id].styles';

const CLOSED_STATUSES = [
  NegotiationStatus.ACCEPTED,
  NegotiationStatus.PAYMENT_PENDING,
  NegotiationStatus.COMPLETED,
  NegotiationStatus.REJECTED,
  NegotiationStatus.EXPIRED,
  NegotiationStatus.CANCELLED,
  NegotiationStatus.ARCHIVED,
];

export default function NegotiationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const showModal = useModalStore((state) => state.showModal);
  const { data: negotiation, isLoading } = useNegotiation(id);
  const { isLoading: messagesLoading } = useNegotiationMessages(id);
  const messages = useNegotiationStoreMessages(id);
  const actions = useNegotiationActions();
  const canRespondToOffer = useCanRespondToOffer(user?.id);
  useNegotiationRealtime(id);

  const conversationClosed = useMemo(
    () => Boolean(negotiation && CLOSED_STATUSES.includes(negotiation.status)),
    [negotiation],
  );

  const handlePolicyViolation = () => {
    showModal({
      title: t('negotiation.policy.title'),
      message: t('negotiation.policy.message'),
      type: 'error',
    });
  };

  const handleClose = () => {
    if (!id) return;
    showModal({
      title: t('negotiation.close.title'),
      message: t('negotiation.close.message'),
      type: 'info',
      cancelText: t('common.cancel'),
      confirmText: t('negotiation.actions.close'),
      onCancel: () => {},
      onConfirm: () => actions.closeNegotiation.mutate(id),
    });
  };

  if (isLoading || messagesLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.centerText}>{t('negotiation.detail.loading')}</Text>
      </View>
    );
  }

  if (!negotiation || !id) {
    return (
      <View style={styles.center}>
        <Ionicons name="chatbubble-ellipses-outline" size={44} color={Colors.primary} />
        <Text style={styles.centerText}>{t('negotiation.detail.notFound')}</Text>
        <TouchableOpacity style={styles.backAction} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.backActionText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={1}>{negotiation.product.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{negotiation.seller.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleClose}
          activeOpacity={0.8}
          disabled={conversationClosed || actions.isPending}
        >
          <Ionicons name="close-circle-outline" size={20} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <NegotiationStatusBadge status={negotiation.status} />
      </View>

      <ScrollView
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyThread}>
            <Text style={styles.emptyTitle}>{t('negotiation.detail.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('negotiation.detail.emptyText')}</Text>
          </View>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === user?.id}
              canRespondToOffer={canRespondToOffer(message.offer)}
              actionPending={actions.isPending}
              onAcceptOffer={(offerId) => actions.acceptOffer.mutate({ negotiationId: id, offerId })}
              onRejectOffer={(offerId) => actions.rejectOffer.mutate({ negotiationId: id, offerId })}
            />
          ))
        )}
      </ScrollView>

      <NegotiationComposer
        negotiationId={id}
        disabled={conversationClosed || actions.isPending}
        onSendMessage={(input) => actions.sendMessage.mutate(input)}
        onCreateOffer={(input) => actions.createOffer.mutate(input)}
        onPolicyViolation={handlePolicyViolation}
      />
    </KeyboardAvoidingView>
  );
}
