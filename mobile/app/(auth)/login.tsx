import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/ui/AppIcon';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { Colors } from '../../constants/theme';
import { styles } from '../../styles/auth/login.styles';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { resolveApiErrorMessage } from '../../utils/apiError';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const { showModal } = useModalStore();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) {
      showModal({ title: t('common.error'), message: t('auth.loginError'), type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)/home');
    } catch (err: unknown) {
      const message = resolveApiErrorMessage(err, t, 'auth.loginError');
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
      {/* Geri: guest tarayarak login'e itildiyse (canGoBack) dönebilsin.
          Login kök ekransa (giriş zorunlu akış) buton gizli kalır. */}
      {router.canGoBack() && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 16,
            zIndex: 10,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.22)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Geri' })}
        >
          <AppIcon name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
      )}

      {/* Header with gradient-like primary background */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image
            source={require('../../assets/images/endemigo-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>{t('auth.slogan')}</Text>
        </View>
      </View>

      {/* Form Card */}
      <View style={styles.formContainer}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{t('auth.loginWelcome')}</Text>
          <Text style={styles.formSubtitle}>{t('auth.loginSub')}</Text>

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
              autoCorrect={false}
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

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.login')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.linkText}>
              {t('auth.noAccount')} <Text style={styles.linkBold}>{t('auth.register')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
