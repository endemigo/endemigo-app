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
import { styles } from './CardVerificationModal.styles';

export interface CardDetails {
  cardHolderName: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
}

interface CardVerificationModalProps {
  onClose: () => void;
  onVerify: (details: CardDetails) => Promise<void>;
  isPending: boolean;
  requiredDeposit?: number;
}

export function CardVerificationModal({
  onClose,
  onVerify,
  isPending,
  requiredDeposit = 0,
}: CardVerificationModalProps) {
  const { t } = useTranslation();
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

  const handleVerify = () => {
    const rawCardNo = cardNo.replace(/\s/g, '');
    const [month, year] = expiry.split('/');
    // Year can be 2 digits in MM/YY format. We pad it to 4 digits if needed (e.g. 26 -> 2026)
    const fullYear = year && year.length === 2 ? `20${year}` : year;

    onVerify({
      cardHolderName: cardHolder.trim(),
      cardNumber: rawCardNo,
      expireMonth: month,
      expireYear: fullYear,
      cvc,
    });
  };

  const isFormValid =
    cardHolder.trim().length > 2 &&
    cardNo.replace(/\s/g, '').length >= 15 &&
    expiry.length === 5 &&
    cvc.length >= 3;

  return (
    <View style={styles.shell}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {requiredDeposit > 0
            ? t('auction.entryDepositRequiredTitle', { defaultValue: 'Giriş Depozitosu Gerekli' })
            : t('auction.cardVerificationTitle')}
        </Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          disabled={isPending}
        >
          <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        {requiredDeposit > 0
          ? t('auction.entryDepositRequiredMessage', {
              amount: requiredDeposit.toLocaleString('tr-TR'),
              defaultValue: `Bu yüksek değerli müzayedeye katılabilmek için ${requiredDeposit.toLocaleString('tr-TR')}₺ giriş depozitosu ödemeniz gerekmektedir. Ödeme sonrasında katılımınız onaylanacaktır.`,
            })
          : t('auction.cardVerificationSubtitle')}
      </Text>

      <View style={styles.infoBanner}>
        <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          {requiredDeposit > 0
            ? t('auction.entryDepositRequiredInfo', {
                amount: requiredDeposit.toLocaleString('tr-TR'),
                defaultValue: `Giriş depozitosu olarak ${requiredDeposit.toLocaleString('tr-TR')} TL çekilecektir.`,
              })
            : t('auction.cardVerificationInfo', {
                defaultValue: 'Doğrulama için 1 TL çekilecek ve anında cüzdanınıza/kartınıza iade edilecektir.',
              })}
        </Text>
      </View>

      <View style={styles.form}>
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

        <TouchableOpacity
          style={[styles.actionButton, !isFormValid && styles.actionButtonDisabled]}
          onPress={handleVerify}
          disabled={!isFormValid || isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="card" size={18} color={Colors.white} />
              <Text style={styles.actionButtonText}>
                {requiredDeposit > 0
                  ? t('auction.entryDepositPayCta', {
                      amount: requiredDeposit.toLocaleString('tr-TR'),
                      defaultValue: `${requiredDeposit.toLocaleString('tr-TR')}₺ Giriş Depozitosu Öde`,
                    })
                  : t('auction.cardVerifyCta')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
