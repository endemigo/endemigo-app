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
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { styles } from '../../styles/auth/register.styles';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const { showModal } = useModalStore();
  const { t } = useTranslation();
  
  const handleRegister = async () => {
    if (!email || !password) {
      showModal({ title: t('common.error'), message: t('auth.loginError'), type: 'error' });
      return;
    }
    if (password.length < 8) {
      showModal({ title: t('common.error'), message: t('auth.registerError'), type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, firstName.trim(), lastName.trim());
      router.replace('/(tabs)');
    } catch (err: unknown) {
      let message = 'Kayıt başarısız';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
        message = axiosErr.response?.data?.error?.message || message;
      }
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
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor={Colors.slate400}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
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
