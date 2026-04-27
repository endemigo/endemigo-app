import React, { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PayoutRequestItem, PayoutRequestPayload } from '../../../types/transactionFlows';
import { useRoleModeStore } from '../../../store/roleModeStore';
import { useModalStore } from '../../../store/modalStore';
import { Colors } from '../../../constants/theme';
import { formatCurrency, formatShortDate, getApiErrorMessage } from '../../../utils/transactionFormatters';
import { styles } from './SellerPayoutCard.styles';

interface SellerPayoutCardProps {
  available: number;
  payoutRequests?: PayoutRequestItem[];
  isSubmitting: boolean;
  onSubmit: (payload: PayoutRequestPayload) => Promise<unknown>;
}

export function SellerPayoutCard({
  available,
  payoutRequests = [],
  isSubmitting,
  onSubmit,
}: SellerPayoutCardProps) {
  const { t } = useTranslation();
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const { showModal } = useModalStore();
  const [amount, setAmount] = useState('');
  const [iban, setIban] = useState('');
  const [note, setNote] = useState('');

  if (activeMode !== 'seller') {
    return null;
  }

  const handleSubmit = async () => {
    const normalizedAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0 || normalizedAmount > available) {
      showModal({
        title: t('wallet.payoutErrorTitle'),
        message: t('common.genericError'),
        type: 'error',
      });
      return;
    }

    try {
      await onSubmit({
        amount: normalizedAmount,
        currency: 'TRY',
        idempotencyKey: `mobile-payout-${Date.now()}`,
        payoutMethodMetadata: {
          iban: iban.trim(),
          note: note.trim(),
        },
      });
      setAmount('');
      setIban('');
      setNote('');
      showModal({
        title: t('wallet.payoutSuccessTitle'),
        message: t('wallet.payoutSuccessMessage'),
        type: 'success',
      });
    } catch (error) {
      showModal({
        title: t('wallet.payoutErrorTitle'),
        message: getApiErrorMessage(error, t('common.genericError')),
        type: 'error',
      });
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('wallet.sellerPayoutTitle')}</Text>
      <Text style={styles.description}>{t('wallet.sellerPayoutDescription')}</Text>

      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={t('wallet.payoutAmountPlaceholder')}
          placeholderTextColor={Colors.slate400}
        />
        <TextInput
          style={styles.input}
          value={iban}
          onChangeText={setIban}
          autoCapitalize="characters"
          placeholder={t('wallet.payoutIbanPlaceholder')}
          placeholderTextColor={Colors.slate400}
        />
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder={t('wallet.payoutNotePlaceholder')}
          placeholderTextColor={Colors.slate400}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        activeOpacity={0.8}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <Text style={styles.submitText}>{t('wallet.requestPayout')}</Text>
        )}
      </TouchableOpacity>

      {payoutRequests.length > 0 && (
        <View style={styles.latestBox}>
          <Text style={styles.latestTitle}>{t('wallet.latestPayouts')}</Text>
          {payoutRequests.slice(0, 2).map((request) => (
            <View key={request.id} style={styles.payoutRow}>
              <View>
                <Text style={styles.payoutAmount}>
                  {formatCurrency(request.amount, request.currency ?? 'TRY')}
                </Text>
                <Text style={styles.payoutDate}>{formatShortDate(request.createdAt)}</Text>
              </View>
              <Text style={styles.payoutStatus}>
                {t(`payoutStatuses.${request.status}`)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
