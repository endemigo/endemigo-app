import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { styles } from './BiddingLimitModal.styles';
import { CardDetails } from './CardVerificationModal';
import { formatCurrency } from '../../utils/transactionFormatters';

interface BiddingLimitModalProps {
  onClose: () => void;
  onPayDeposit: (amount: number, cardDetails?: CardDetails) => Promise<void>;
  currentLimit: number;
  requiredLimit: number;
  requiredDeposit: number;
  isPending: boolean;
  hasSavedCard: boolean;
}

export function BiddingLimitModal({
  onClose,
  onPayDeposit,
  currentLimit,
  requiredLimit,
  requiredDeposit,
  isPending,
  hasSavedCard,
}: BiddingLimitModalProps) {
  const { t } = useTranslation();
  const [useNewCard, setUseNewCard] = useState(!hasSavedCard);

  // New card state
  const [cardHolder, setCardHolder] = useState('');
  const [cardNo, setCardNo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const matched = cleaned.match(/.{1,4}/g);
    return matched ? matched.join(' ').substring(0, 19) : cleaned;
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const handlePay = () => {
    if (useNewCard) {
      const rawCardNo = cardNo.replace(/\s/g, '');
      const [month, year] = expiry.split('/');
      const fullYear = year && year.length === 2 ? `20${year}` : year;

      onPayDeposit(requiredDeposit, {
        cardHolderName: cardHolder.trim(),
        cardNumber: rawCardNo,
        expireMonth: month,
        expireYear: fullYear,
        cvc,
      });
    } else {
      onPayDeposit(requiredDeposit);
    }
  };

  const isFormValid = useNewCard
    ? cardHolder.trim().length > 2 &&
      cardNo.replace(/\s/g, '').length >= 15 &&
      expiry.length === 5 &&
      cvc.length >= 3
    : true;

  return (
    <View style={styles.shell}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('auction.limitExceededTitle')}</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          disabled={isPending}
        >
          <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        {t('auction.limitExceededMessage', { limit: currentLimit.toLocaleString('tr-TR') })}
      </Text>

      <View style={styles.limitInfoBox}>
        <View style={styles.limitItem}>
          <Text style={styles.limitLabel}>Mevcut Limit</Text>
          <Text style={styles.limitValue}>{formatCurrency(currentLimit)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.limitItem}>
          <Text style={styles.limitLabel}>Gerekli Limit</Text>
          <Text style={[styles.limitValue, { color: Colors.error }]}>
            {formatCurrency(requiredLimit)}
          </Text>
        </View>
      </View>

      <View style={styles.depositBanner}>
        <Ionicons name="card-outline" size={24} color={Colors.primary} />
        <View style={styles.depositTextContainer}>
          <Text style={styles.depositTitle}>{t('auction.requiredDeposit')}</Text>
          <Text style={styles.depositAmount}>{formatCurrency(requiredDeposit)}</Text>
        </View>
      </View>

      <View style={styles.form}>
        {useNewCard && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auction.cardHolderName')}</Text>
              <View style={styles.inputShell}>
                <TextInput
                  style={styles.input}
                  placeholder="Ahmet Yılmaz"
                  placeholderTextColor={Colors.slate400}
                  value={cardHolder}
                  onChangeText={setCardHolder}
                  autoCapitalize="words"
                  editable={!isPending}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auction.cardNumber')}</Text>
              <View style={styles.inputShell}>
                <TextInput
                  style={styles.input}
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor={Colors.slate400}
                  keyboardType="number-pad"
                  value={cardNo}
                  onChangeText={(text) => setCardNo(formatCardNumber(text))}
                  maxLength={19}
                  editable={!isPending}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.col, styles.inputGroup]}>
                <Text style={styles.inputLabel}>{t('auction.cardExpiry')}</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    style={styles.input}
                    placeholder="AA/YY"
                    placeholderTextColor={Colors.slate400}
                    keyboardType="number-pad"
                    value={expiry}
                    onChangeText={(text) => setExpiry(formatExpiry(text))}
                    maxLength={5}
                    editable={!isPending}
                  />
                </View>
              </View>

              <View style={[styles.col, styles.inputGroup]}>
                <Text style={styles.inputLabel}>{t('auction.cardCvc')}</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    style={styles.input}
                    placeholder="000"
                    placeholderTextColor={Colors.slate400}
                    keyboardType="number-pad"
                    secureTextEntry
                    value={cvc}
                    onChangeText={(text) => setCvc(text.replace(/\D/g, ''))}
                    maxLength={4}
                    editable={!isPending}
                  />
                </View>
              </View>
            </View>
          </>
        )}

        {hasSavedCard && (
          <TouchableOpacity
            style={styles.toggleCardButton}
            onPress={() => setUseNewCard(!useNewCard)}
            disabled={isPending}
          >
            <Text style={styles.toggleCardText}>
              {useNewCard ? 'Kayıtlı Kartı Kullan' : 'Yeni Kart ile Öde'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, !isFormValid && styles.actionButtonDisabled]}
          onPress={handlePay}
          disabled={!isFormValid || isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={18} color={Colors.white} />
              <Text style={styles.actionButtonText}>
                {t('auction.depositPayCta', { amount: requiredDeposit.toLocaleString('tr-TR') })}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
