import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { Colors } from '../../constants/theme';
import { styles } from '../../styles/auth/register.styles';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { resolveApiErrorMessage } from '../../utils/apiError';

// K1 (backend RegisterDto): OWASP şifre politikası ile birebir aynı regex
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_.#\-])[A-Za-z\d@$!%*?&_.#\-]{8,}$/;

const PASSWORD_RULES = [
  { key: 'auth.passwordRuleMinLength', test: (value: string) => value.length >= 8 },
  { key: 'auth.passwordRuleLowercase', test: (value: string) => /[a-z]/.test(value) },
  { key: 'auth.passwordRuleUppercase', test: (value: string) => /[A-Z]/.test(value) },
  { key: 'auth.passwordRuleDigit', test: (value: string) => /\d/.test(value) },
  { key: 'auth.passwordRuleSpecial', test: (value: string) => /[@$!%*?&_.#\-]/.test(value) },
] as const;

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const { showModal } = useModalStore();
  const { t } = useTranslation();

  const isPasswordValid = PASSWORD_REGEX.test(password);

  const handleRegister = async () => {
    if (!email || !password) {
      showModal({ title: t('common.error'), message: t('auth.loginError'), type: 'error' });
      return;
    }
    if (!isPasswordValid) {
      showModal({ title: t('common.error'), message: t('auth.passwordRulesError'), type: 'error' });
      return;
    }
    if (!kvkkAccepted) {
      showModal({ title: t('common.error'), message: t('auth.kvkkRequired'), type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, firstName.trim(), lastName.trim(), true);
      router.replace('/(tabs)/home');
    } catch (err: unknown) {
      const message = resolveApiErrorMessage(err, t, 'auth.registerError');
      showModal({ title: t('common.error'), message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <Text style={styles.title}>{t('auth.registerTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.registerSub')}</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>{t('auth.firstName')}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.firstNamePlaceholder')}
                  placeholderTextColor={Colors.slate400}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>{t('auth.lastName')}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.lastNamePlaceholder')}
                  placeholderTextColor={Colors.slate400}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>
          </View>

          <Text style={styles.label}>{t('auth.email')}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={Colors.slate400}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>{t('auth.password')}</Text>
          <PasswordInput
            wrapperStyle={styles.inputWrapper}
            inputStyle={styles.input}
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor={Colors.slate400}
            value={password}
            onChangeText={setPassword}
          />

          {password.length > 0 && (
            <View style={styles.rulesContainer}>
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(password);
                return (
                  <View key={rule.key} style={styles.ruleRow}>
                    <Ionicons
                      name={met ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={met ? Colors.secondary : Colors.slate400}
                    />
                    <Text style={[styles.ruleText, met && styles.ruleTextMet]}>
                      {t(rule.key)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={styles.kvkkRow}
            onPress={() => setKvkkAccepted(!kvkkAccepted)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={kvkkAccepted ? 'checkbox' : 'square-outline'}
              size={22}
              color={kvkkAccepted ? Colors.primary : Colors.slate400}
            />
            <Text style={styles.kvkkText}>
              {t('auth.kvkkConsentPrefix')}
              <Text
                style={styles.kvkkLink}
                onPress={() => router.push('/legal/privacy' as never)}
              >
                {t('auth.kvkkConsentLink')}
              </Text>
              {t('auth.kvkkConsentSuffix')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, (loading || !kvkkAccepted) && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading || !kvkkAccepted}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.registerButton')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.back()}
          >
            <Text style={styles.linkText}>
              {t('auth.alreadyHaveAccount')} <Text style={styles.linkBold}>{t('auth.loginLink')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
