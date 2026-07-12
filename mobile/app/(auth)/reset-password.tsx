import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { useModalStore } from '../../store/modalStore';
import { Colors } from '../../constants/theme';
import { styles } from '../../styles/auth/reset-password.styles';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { resolveApiErrorMessage } from '../../utils/apiError';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_.#\-])[A-Za-z\d@$!%*?&_.#\-]{8,}$/;

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showModal } = useModalStore();
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!token) {
      showModal({ title: t('common.error'), message: t('auth.resetPasswordInvalidLink'), type: 'error' });
      return;
    }
    if (!password || !confirmPassword) {
      showModal({ title: t('common.error'), message: t('auth.passwordRequired'), type: 'error' });
      return;
    }
    if (password !== confirmPassword) {
      showModal({ title: t('common.error'), message: t('auth.passwordMismatch'), type: 'error' });
      return;
    }
    if (password.length < 8 || !PASSWORD_REGEX.test(password)) {
      showModal({ title: t('common.error'), message: t('auth.passwordPolicy'), type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      showModal({
        title: t('common.success'),
        message: t('auth.resetPasswordSuccess'),
        type: 'success',
      });
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      const message = resolveApiErrorMessage(err, t, 'auth.resetPasswordError');
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
          <Text style={styles.title}>{t('auth.resetPasswordTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.resetPasswordSub')}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>{t('auth.newPassword')}</Text>
          <PasswordInput
            wrapperStyle={styles.inputWrapper}
            inputStyle={styles.input}
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor={Colors.slate400}
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
          <PasswordInput
            wrapperStyle={styles.inputWrapper}
            inputStyle={styles.input}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            placeholderTextColor={Colors.slate400}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Text style={styles.hint}>{t('auth.passwordPolicy')}</Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.resetPasswordButton')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.linkText}>
              {t('auth.rememberedPassword')} <Text style={styles.linkBold}>{t('auth.loginLink')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
