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
import { useAuthStore } from '../../store/authStore';
import { styles } from './AuthRegisterWizardModal.styles';
import { CardDetails } from '../auction/CardVerificationModal';

interface AuthRegisterWizardModalProps {
  onClose: () => void;
  onVerifyAndRegister: (cardDetails: CardDetails) => Promise<void>;
  onLoginComplete: () => Promise<void>;
  isPending: boolean;
  requiredDeposit?: number;
}

export function AuthRegisterWizardModal({
  onClose,
  onVerifyAndRegister,
  onLoginComplete,
  isPending,
  requiredDeposit = 0,
}: AuthRegisterWizardModalProps) {
  const { t } = useTranslation();
  const registerFn = useAuthStore((s) => s.register);
  const loginFn = useAuthStore((s) => s.login);

  const [step, setStep] = useState<1 | 2>(1);
  const [isLoginMode, setIsLoginMode] = useState(false);

  // Account details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Card details
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

  const handleNextStepOrSubmit = async () => {
    setAuthError('');
    if (step === 1) {
      if (isLoginMode) {
        // Authenticate
        try {
          await loginFn(email.trim().toLowerCase(), password);
          // Once logged in, check card verification status
          await onLoginComplete();
        } catch (err: any) {
          setAuthError(err.message || t('auth.loginError'));
        }
      } else {
        // Validate Step 1 locally
        if (!email || !password || !firstName || !lastName) {
          setAuthError(t('validation.allFieldsRequired', { defaultValue: 'Tüm alanlar zorunludur' }));
          return;
        }
        if (password.length < 8) {
          setAuthError(t('validation.passwordMin', { defaultValue: 'Şifre en az 8 karakter olmalıdır' }));
          return;
        }
        setStep(2);
      }
    } else {
      // Step 2: Register account + card
      try {
        // 1. Create account
        await registerFn(email.trim().toLowerCase(), password, firstName.trim(), lastName.trim());

        // 2. Perform 1 TL verification and register card
        const rawCardNo = cardNo.replace(/\s/g, '');
        const [month, year] = expiry.split('/');
        const fullYear = year && year.length === 2 ? `20${year}` : year;

        await onVerifyAndRegister({
          cardHolderName: cardHolder.trim(),
          cardNumber: rawCardNo,
          expireMonth: month,
          expireYear: fullYear,
          cvc,
        });
      } catch (err: any) {
        setAuthError(err.message || t('auth.registerError'));
      }
    }
  };

  const isStep1Valid = isLoginMode
    ? email.length > 3 && password.length >= 8
    : firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      email.includes('@') &&
      password.length >= 8;

  const isStep2Valid =
    cardHolder.trim().length > 2 &&
    cardNo.replace(/\s/g, '').length >= 15 &&
    expiry.length === 5 &&
    cvc.length >= 3;

  const isFormValid = step === 1 ? isStep1Valid : isStep2Valid;

  return (
    <View style={styles.shell}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {isLoginMode ? t('auth.login') : t('auth.registerTitle')}
        </Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          disabled={isPending}
        >
          <Ionicons name="close" size={24} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {!isLoginMode && (
        <View style={styles.stepsIndicatorRow}>
          <View style={[styles.stepIndicator, styles.stepIndicatorActive]} />
          <View style={[styles.stepIndicator, step === 2 && styles.stepIndicatorActive]} />
        </View>
      )}

      {authError ? (
        <View style={[styles.infoBanner, { backgroundColor: `${Colors.error}08`, borderColor: `${Colors.error}20` }]}>
          <Ionicons name="alert-circle-outline" size={20} color={Colors.error} />
          <Text style={[styles.infoText, { color: Colors.error }]}>{authError}</Text>
        </View>
      ) : null}

      {step === 1 ? (
        // Step 1: Account Info (Register or Login)
        <View style={styles.form}>
          {!isLoginMode && (
            <View style={styles.row}>
              <View style={[styles.col, styles.inputGroup]}>
                <Text style={styles.inputLabel}>{t('auth.firstName')}</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.firstNamePlaceholder')}
                    placeholderTextColor={Colors.slate400}
                    value={firstName}
                    onChangeText={setFirstName}
                    editable={!isPending}
                  />
                </View>
              </View>

              <View style={[styles.col, styles.inputGroup]}>
                <Text style={styles.inputLabel}>{t('auth.lastName')}</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.lastNamePlaceholder')}
                    placeholderTextColor={Colors.slate400}
                    value={lastName}
                    onChangeText={setLastName}
                    editable={!isPending}
                  />
                </View>
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('auth.email')}</Text>
            <View style={styles.inputShell}>
              <TextInput
                style={styles.input}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={Colors.slate400}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!isPending}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('auth.password')}</Text>
            <View style={styles.inputShell}>
              <TextInput
                style={styles.input}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={Colors.slate400}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!isPending}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, !isFormValid && styles.actionButtonDisabled]}
            onPress={handleNextStepOrSubmit}
            disabled={!isFormValid || isPending}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Text style={styles.actionButtonText}>
                  {isLoginMode ? t('auth.login') : t('auction.authNextStep')}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsLoginMode(!isLoginMode);
              setAuthError('');
            }}
            disabled={isPending}
          >
            <Text style={styles.loginText}>
              {isLoginMode ? t('auth.noAccount') : t('auth.alreadyAccount')}{' '}
              <Text style={styles.loginBold}>
                {isLoginMode ? t('auth.register') : t('auth.loginLink')}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Step 2: Card Verification (Only for Registration)
        <View style={styles.form}>
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
            onPress={handleNextStepOrSubmit}
            disabled={!isFormValid || isPending}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                <Text style={styles.actionButtonText}>
                  {requiredDeposit > 0
                    ? t('auction.entryDepositPayCta', {
                        amount: requiredDeposit.toLocaleString('tr-TR'),
                        defaultValue: `${requiredDeposit.toLocaleString('tr-TR')}₺ Giriş Depozitosu Öde`,
                      })
                    : t('auction.authComplete')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
