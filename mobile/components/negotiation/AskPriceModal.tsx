import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { detectNegotiationPolicyViolation } from '../../hooks/useNegotiations';
import type { Product, StartNegotiationInput } from '../../types';
import { formatAmount } from '../../utils/transactionFormatters';
import { formatPriceInput, parsePriceInput } from '../../utils/priceInputMask';
import { styles } from './AskPriceModal.styles';

interface AskPriceModalProps {
  product: Product;
  visible: boolean;
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (input: StartNegotiationInput) => void;
  onPolicyViolation: () => void;
}

export function AskPriceModal({
  product,
  visible,
  isPending = false,
  onClose,
  onSubmit,
  onPolicyViolation,
}: AskPriceModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const minimumAmount = product.askPriceMinAmount ?? 0;

  useEffect(() => {
    if (visible) {
      setAmount(minimumAmount > 0 ? formatPriceInput(String(minimumAmount)) : '');
      setQuantity('1');
      setNote('');
    }
  }, [minimumAmount, visible]);

  const canSubmit = useMemo(() => {
    const parsedAmount = parsePriceInput(amount) ?? 0;
    return parsedAmount > 0 && parsedAmount >= minimumAmount && Number(quantity) > 0 && !isPending;
  }, [amount, isPending, minimumAmount, quantity]);

  const handleSubmit = () => {
    const trimmedNote = note.trim();
    if (!canSubmit) return;
    if (trimmedNote && detectNegotiationPolicyViolation(trimmedNote)) {
      onPolicyViolation();
      return;
    }
    onSubmit({
      productId: product.id,
      amount: parsePriceInput(amount) ?? 0,
      quantity: Number(quantity),
      note: trimmedNote || undefined,
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
              <Text style={styles.eyebrow}>{t('negotiation.askPrice.eyebrow')}</Text>
              <Text style={styles.title}>{t('negotiation.askPrice.title')}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>

          {minimumAmount > 0 ? (
            <Text style={styles.minimumText}>
              {t('negotiation.askPrice.minimum', {
                amount: formatAmount(minimumAmount),
              })}
            </Text>
          ) : null}

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.amountInput]}
              value={amount}
              onChangeText={(val) => setAmount(formatPriceInput(val))}
              keyboardType="decimal-pad"
              placeholder={t('negotiation.askPrice.amountPlaceholder')}
              placeholderTextColor={Colors.slate400}
            />
            <TextInput
              style={[styles.input, styles.quantityInput]}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder={t('negotiation.askPrice.quantityPlaceholder')}
              placeholderTextColor={Colors.slate400}
            />
          </View>

          <TextInput
            style={[styles.input, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder={t('negotiation.askPrice.notePlaceholder')}
            placeholderTextColor={Colors.slate400}
          />

          <TouchableOpacity
            style={[styles.submitButton, !canSubmit ? styles.disabledButton : undefined]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.86}
          >
            <Ionicons name="cash-outline" size={18} color={Colors.white} />
            <Text style={styles.submitText}>
              {isPending ? t('negotiation.askPrice.sending') : t('product.askPrice')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
