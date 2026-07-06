import React, { useMemo } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageBubble, NegotiationComposer, NegotiationStatusBadge } from '../../components/negotiation';
import { Colors, Spacing } from '../../constants/theme';
import {
  useCanRespondToOffer,
  useNegotiation,
  useNegotiationActions,
  useNegotiationMessages,
  useNegotiationRealtime,
  useNegotiationStoreMessages,
} from '../../hooks/useNegotiations';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useModalStore } from '../../store/modalStore';
import { NegotiationStatus, NegotiationOfferStatus } from '../../types';
import { Image } from 'react-native';
import { styles } from '../../styles/negotiation/[id].styles';
import { resolveApiErrorMessage } from '../../utils/apiError';
import { formatAmount } from '../../utils/transactionFormatters';

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
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const showModal = useModalStore((state) => state.showModal);
  const { data: negotiation, isLoading } = useNegotiation(id);
  const { isLoading: messagesLoading } = useNegotiationMessages(id);
  const messages = useNegotiationStoreMessages(id);
  const actions = useNegotiationActions();
  const canRespondToOffer = useCanRespondToOffer(user?.id);
  const { realtimeDown } = useNegotiationRealtime(id);

  const conversationClosed = useMemo(
    () => Boolean(
      negotiation &&
        (CLOSED_STATUSES.includes(negotiation.status) ||
          negotiation.policy?.lockedByPolicy),
    ),
    [negotiation],
  );

  const handlePolicyViolation = () => {
    showModal({
      title: t('negotiation.policy.title'),
      message: t('negotiation.policy.message'),
      type: 'error',
    });
  };

  const handleActionError = (error: unknown) => {
    showModal({
      title: t('common.error'),
      message: resolveApiErrorMessage(error, t, 'common.genericError'),
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
      onConfirm: () => actions.closeNegotiation.mutate(id, { onError: handleActionError }),
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
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.base }]}>
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

      {realtimeDown && (
        <View style={styles.realtimeBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={Colors.error} />
          <Text style={styles.realtimeBannerText}>
            {t('negotiation.detail.realtimeDown')}
          </Text>
        </View>
      )}

      {/* Ürün bağlam kartı: alıcı neyi pazarlık ettiğini her an görür */}
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.8}
        onPress={() => router.push(`/product/${negotiation.product.id}` as never)}
      >
        <Image
          source={{ uri: negotiation.product.imageUrl || 'https://placehold.co/96x96/F8F9FA/0097D8?text=%20' }}
          style={styles.productCardImage}
        />
        <View style={styles.productCardBody}>
          <Text style={styles.productCardTitle} numberOfLines={1}>
            {negotiation.product.title}
          </Text>
          <Text style={styles.productCardSubtitle} numberOfLines={1}>
            {negotiation.seller.name}
          </Text>
        </View>
        <View style={styles.productCardLink}>
          <Text style={styles.productCardLinkText}>
            {t('negotiation.viewProduct', { defaultValue: 'Ürüne Git' })}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </View>
      </TouchableOpacity>

      {/* Aktif teklif bandı: teklif mesaj akışında kaybolmaz, üstte sabit durur */}
      {negotiation.latestOffer && negotiation.latestOffer.status === NegotiationOfferStatus.PENDING ? (
        <View style={styles.offerBand}>
          <View style={styles.offerBandInfo}>
            <Text style={styles.offerBandLabel}>
              {t('negotiation.currentOffer', { defaultValue: 'Güncel Teklif' })}
            </Text>
            <Text style={styles.offerBandAmount}>
              {formatAmount(negotiation.latestOffer.amount)} ₺
            </Text>
          </View>
          {canRespondToOffer(negotiation.latestOffer) ? (
            <View style={styles.offerBandActions}>
              <TouchableOpacity
                style={styles.offerBandAccept}
                activeOpacity={0.85}
                disabled={actions.isPending}
                onPress={() => actions.acceptOffer.mutate(
                  { negotiationId: id, offerId: negotiation.latestOffer!.id },
                  {
                    onSuccess: () => {
                      // Kabul edilen teklif sepete eklenir; alıcı sepetten öder.
                      void useCartStore.getState().hydrateCart();
                      router.push('/cart');
                    },
                    onError: handleActionError,
                  },
                )}
              >
                <Text style={styles.offerBandAcceptText}>
                  {t('negotiation.actions.accept', { defaultValue: 'Kabul Et' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.offerBandReject}
                activeOpacity={0.85}
                disabled={actions.isPending}
                onPress={() => actions.rejectOffer.mutate(
                  { negotiationId: id, offerId: negotiation.latestOffer!.id },
                  { onError: handleActionError },
                )}
              >
                <Text style={styles.offerBandRejectText}>
                  {t('negotiation.actions.reject', { defaultValue: 'Reddet' })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.offerBandWaiting}>
              {t('negotiation.offerWaiting', { defaultValue: 'Yanıt bekleniyor' })}
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.statusRow}>
        <NegotiationStatusBadge status={negotiation.status} />
        {negotiation.policy?.hasViolation ? (
          <View style={[
            styles.policyBadge,
            negotiation.policy.lockedByPolicy && styles.policyBadgeLocked,
          ]}>
            <Ionicons
              name={negotiation.policy.lockedByPolicy ? 'lock-closed' : 'shield-checkmark'}
              size={14}
              color={Colors.error}
            />
            <Text style={styles.policyBadgeText}>
              {t(
                negotiation.policy.lockedByPolicy
                  ? 'negotiation.policy.locked'
                  : 'negotiation.policy.badge',
                { count: negotiation.policy.violationCount },
              )}
            </Text>
          </View>
        ) : null}
        {negotiation.product.askPriceMinAmount ? (
          <Text style={styles.minimumHint}>
            {t('negotiation.askPrice.minimum', {
              amount: formatAmount(negotiation.product.askPriceMinAmount),
            })}
          </Text>
        ) : null}
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
              onAcceptOffer={(offerId) => actions.acceptOffer.mutate({ negotiationId: id, offerId }, {
                onSuccess: () => {
                  // Kabul edilen teklif sepete eklenir; alıcı sepetten öder.
                  void useCartStore.getState().hydrateCart();
                  router.push('/cart');
                },
                onError: handleActionError
              })}
              onRejectOffer={(offerId) => actions.rejectOffer.mutate({ negotiationId: id, offerId }, { onError: handleActionError })}
            />
          ))
        )}
      </ScrollView>

      <NegotiationComposer
        negotiationId={id}
        minimumAmount={negotiation.product.askPriceMinAmount}
        disabled={conversationClosed || actions.isPending}
        showOfferAction={user?.id === negotiation.seller.id}
        onSendMessage={(input) => actions.sendMessage.mutate(input, { onError: handleActionError })}
        onCreateOffer={(input) => actions.createOffer.mutate(input, { onError: handleActionError })}
        onPolicyViolation={handlePolicyViolation}
      />
    </KeyboardAvoidingView>
  );
}
