import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { useOpenAuctionEvents, type AuctionEvent, type ApplyToEventInput } from '../../hooks/useAuctions';
import type { Product } from '../../types';
import { formatPriceInput, parsePriceInput } from '../../utils/priceInputMask';
import { checkLotPrices } from '../../utils/auctionLot';
import { styles } from './ApplyToEventSheet.styles';

interface ApplyToEventSheetProps {
  product: Product | null;
  visible: boolean;
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (input: ApplyToEventInput) => void;
}

// Son başvuru tarihi geçmiş etkinlikleri seçim listesinden düşürür; kullanıcı
// backend reddini son adımda yaşamasın (assertEventApplicationAllowed).
function isEventOpen(event: AuctionEvent): boolean {
  if (!event.submissionDeadline) return true;
  return new Date(event.submissionDeadline).getTime() > Date.now();
}

export function ApplyToEventSheet({
  product,
  visible,
  isPending = false,
  onClose,
  onSubmit,
}: ApplyToEventSheetProps) {
  const { t } = useTranslation();
  const eventsQuery = useOpenAuctionEvents(visible);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [startPrice, setStartPrice] = useState('');
  const [minIncrement, setMinIncrement] = useState('');
  const [reservePrice, setReservePrice] = useState('');
  const [guaranteeAccepted, setGuaranteeAccepted] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedEventId(null);
      setStartPrice(product?.price ? formatPriceInput(String(product.price)) : '');
      setMinIncrement('');
      setReservePrice('');
      setGuaranteeAccepted(false);
    }
  }, [product?.price, visible]);

  const openEvents = useMemo(
    () => (eventsQuery.data ?? []).filter(isEventOpen),
    [eventsQuery.data],
  );

  // Fiyat kuralları paylaşılan helper'dan (wizard ile tek kaynak).
  const lot = checkLotPrices(startPrice, reservePrice);
  const reserveInvalid = lot.reserveBelowStart;

  const canSubmit = useMemo(() => {
    return (
      !!selectedEventId &&
      lot.startValid &&
      !lot.reserveBelowStart &&
      guaranteeAccepted &&
      !isPending
    );
  }, [selectedEventId, lot.startValid, lot.reserveBelowStart, guaranteeAccepted, isPending]);

  const handleSubmit = () => {
    if (!canSubmit || !selectedEventId || !product) return;
    const parsedIncrement = minIncrement.trim() ? parsePriceInput(minIncrement) : undefined;
    onSubmit({
      eventId: selectedEventId,
      productId: product.id,
      startPrice: lot.startValue,
      ...(parsedIncrement && parsedIncrement > 0 ? { minIncrement: parsedIncrement } : {}),
      ...(lot.reserveValue !== null ? { reservePrice: lot.reserveValue } : {}),
      guaranteeAccepted: true,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>{t('applyToEvent.eyebrow')}</Text>
              <Text style={styles.title}>{t('applyToEvent.title')}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {product ? (
            <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionLabel}>{t('applyToEvent.selectEvent')}</Text>

            {eventsQuery.isLoading ? (
              <View style={styles.emptyBox}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : openEvents.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-outline" size={32} color={Colors.slate300} />
                <Text style={styles.emptyText}>{t('applyToEvent.noEvents')}</Text>
              </View>
            ) : (
              <View style={styles.eventList}>
                {openEvents.map((event) => {
                  const active = event.id === selectedEventId;
                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={[styles.eventItem, active ? styles.eventItemActive : undefined]}
                      activeOpacity={0.85}
                      onPress={() => setSelectedEventId(event.id)}
                    >
                      <Text style={styles.eventItemTitle} numberOfLines={1}>{event.title}</Text>
                      {event.submissionDeadline ? (
                        <Text style={styles.eventItemMeta}>
                          {t('applyToEvent.deadline', {
                            date: new Date(event.submissionDeadline).toLocaleDateString('tr-TR'),
                          })}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.fieldRow}>
              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>{t('applyToEvent.startPrice')}</Text>
                <TextInput
                  style={styles.input}
                  value={startPrice}
                  onChangeText={(val) => setStartPrice(formatPriceInput(val))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.slate400}
                />
              </View>
              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>{t('applyToEvent.minIncrement')}</Text>
                <TextInput
                  style={styles.input}
                  value={minIncrement}
                  onChangeText={(val) => setMinIncrement(formatPriceInput(val))}
                  keyboardType="decimal-pad"
                  placeholder={t('applyToEvent.optional')}
                  placeholderTextColor={Colors.slate400}
                />
              </View>
            </View>

            <View style={[styles.fieldCol, { marginTop: 8 }]}>
              <Text style={styles.fieldLabel}>{t('applyToEvent.reservePrice')}</Text>
              <TextInput
                style={styles.input}
                value={reservePrice}
                onChangeText={(val) => setReservePrice(formatPriceInput(val))}
                keyboardType="decimal-pad"
                placeholder={t('applyToEvent.optional')}
                placeholderTextColor={Colors.slate400}
              />
              {reserveInvalid ? (
                <Text style={styles.helperError}>{t('applyToEvent.reserveTooLow')}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.guaranteeRow, { marginTop: 12 }]}
              activeOpacity={0.8}
              onPress={() => setGuaranteeAccepted((prev) => !prev)}
            >
              <View style={[styles.checkbox, guaranteeAccepted ? styles.checkboxChecked : undefined]}>
                {guaranteeAccepted ? <Ionicons name="checkmark" size={16} color={Colors.white} /> : null}
              </View>
              <Text style={styles.guaranteeText}>{t('applyToEvent.guarantee')}</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, !canSubmit ? styles.disabledButton : undefined, { marginTop: 4 }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.86}
          >
            <Ionicons name="hammer-outline" size={18} color={Colors.white} />
            <Text style={styles.submitText}>
              {isPending ? t('applyToEvent.submitting') : t('applyToEvent.submit')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
