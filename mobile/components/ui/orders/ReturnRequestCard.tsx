import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/theme';
import { styles } from './ReturnRequestCard.styles';

interface ReturnRequestCardProps {
  canRequestReturn: boolean;
  isSubmitting: boolean;
  onSubmit: (payload: { reasonCode: string; note?: string }) => Promise<unknown>;
}

const REASON_CODES = [
  'DAMAGED',
  'NOT_AS_DESCRIBED',
  'WRONG_ITEM',
  'MISSING_PARTS',
  'OTHER',
] as const;

export function ReturnRequestCard({
  canRequestReturn,
  isSubmitting,
  onSubmit,
}: ReturnRequestCardProps) {
  const { t } = useTranslation();
  const [reasonCode, setReasonCode] = useState<(typeof REASON_CODES)[number]>('DAMAGED');
  const [note, setNote] = useState('');

  const submitDisabled = useMemo(
    () => isSubmitting || !reasonCode,
    [isSubmitting, reasonCode],
  );

  if (!canRequestReturn) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('orders.returnRequestTitle')}</Text>
      <Text style={styles.body}>{t('orders.returnRequestBody')}</Text>
      <View style={styles.chipRow}>
        {REASON_CODES.map((code) => {
          const isActive = code === reasonCode;
          return (
            <TouchableOpacity
              key={code}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setReasonCode(code)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {t(`orders.returnReasons.${code}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        multiline
        placeholder={t('orders.returnNotePlaceholder')}
        placeholderTextColor={Colors.slate400}
      />
      <TouchableOpacity
        style={[styles.button, submitDisabled && styles.buttonDisabled]}
        onPress={() => onSubmit({ reasonCode, note })}
        disabled={submitDisabled}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.buttonText}>{t('orders.createReturnRequest')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
