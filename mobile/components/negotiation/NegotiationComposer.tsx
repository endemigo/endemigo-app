import React, { useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { detectNegotiationPolicyViolation } from '../../hooks/useNegotiations';
import type { CreateNegotiationOfferInput, SendNegotiationMessageInput } from '../../types';
import { styles } from './NegotiationComposer.styles';

const EXPIRY_OPTIONS = [12, 24, 48, 72] as const;

interface NegotiationComposerProps {
  negotiationId: string;
  disabled?: boolean;
  onSendMessage: (input: SendNegotiationMessageInput) => void;
  onCreateOffer: (input: CreateNegotiationOfferInput) => void;
  onPolicyViolation: () => void;
}

export function NegotiationComposer({
  negotiationId,
  disabled = false,
  onSendMessage,
  onCreateOffer,
  onPolicyViolation,
}: NegotiationComposerProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [offerVisible, setOfferVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [expiresInHours, setExpiresInHours] = useState<(typeof EXPIRY_OPTIONS)[number]>(24);

  const canSendMessage = useMemo(() => message.trim().length > 0 && !disabled, [disabled, message]);
  const canCreateOffer = useMemo(() => {
    return Number(amount) > 0 && Number(quantity) > 0 && !disabled;
  }, [amount, disabled, quantity]);

  const handleSendMessage = () => {
    const body = message.trim();
    if (!body) return;
    if (detectNegotiationPolicyViolation(body)) {
      onPolicyViolation();
      return;
    }
    onSendMessage({ negotiationId, body });
    setMessage('');
  };

  const handleCreateOffer = () => {
    const trimmedNote = note.trim();
    if (!canCreateOffer) return;
    if (trimmedNote && detectNegotiationPolicyViolation(trimmedNote)) {
      onPolicyViolation();
      return;
    }
    onCreateOffer({
      negotiationId,
      amount: Number(amount),
      quantity: Number(quantity),
      expiresInHours,
      note: trimmedNote || undefined,
    });
    setAmount('');
    setQuantity('1');
    setNote('');
    setOfferVisible(false);
  };

  return (
    <View style={styles.container}>
      {offerVisible ? (
        <View style={styles.offerPanel}>
          <View style={styles.offerHeader}>
            <Text style={styles.offerTitle}>{t('negotiation.composer.offerTitle')}</Text>
            <TouchableOpacity onPress={() => setOfferVisible(false)} style={styles.iconButton}>
              <Ionicons name="close" size={18} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.flexInput]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder={t('negotiation.composer.amountPlaceholder')}
              placeholderTextColor={Colors.slate400}
            />
            <TextInput
              style={[styles.input, styles.quantityInput]}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder={t('negotiation.composer.quantityPlaceholder')}
              placeholderTextColor={Colors.slate400}
            />
          </View>
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder={t('negotiation.composer.notePlaceholder')}
            placeholderTextColor={Colors.slate400}
          />
          <View style={styles.expiryRow}>
            {EXPIRY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.expiryChip,
                  expiresInHours === option ? styles.expiryChipActive : styles.expiryChipInactive,
                ]}
                onPress={() => setExpiresInHours(option)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.expiryChipText,
                  expiresInHours === option ? styles.expiryChipTextActive : styles.expiryChipTextInactive,
                ]}>
                  {t('negotiation.composer.expiryHours', { count: option })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.offerButton, !canCreateOffer ? styles.disabledButton : undefined]}
            onPress={handleCreateOffer}
            activeOpacity={0.85}
            disabled={!canCreateOffer}
          >
            <Text style={styles.offerButtonText}>{t('negotiation.composer.sendOffer')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.messageRow}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setOfferVisible((visible) => !visible)}
          activeOpacity={0.8}
          disabled={disabled}
        >
          <Ionicons name="pricetag-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.messageInput}
          value={message}
          onChangeText={setMessage}
          placeholder={t('negotiation.composer.messagePlaceholder')}
          placeholderTextColor={Colors.slate400}
          multiline
          editable={!disabled}
        />
        <TouchableOpacity
          style={[styles.sendButton, !canSendMessage ? styles.disabledButton : undefined]}
          onPress={handleSendMessage}
          activeOpacity={0.8}
          disabled={!canSendMessage}
        >
          <Ionicons name="send" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
