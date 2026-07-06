import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';
import { styles } from '../../styles/auth/verify-email.styles';
import { resolveApiErrorMessage } from '../../utils/apiError';

type VerifyStatus = 'verifying' | 'success' | 'error';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [status, setStatus] = useState<VerifyStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const { t } = useTranslation();

  const verify = useCallback(async () => {
    if (!token) {
      setErrorMessage(t('auth.verifyEmailInvalidLink'));
      setStatus('error');
      return;
    }
    setStatus('verifying');
    try {
      await api.post('/auth/verify-email', { token });
      setStatus('success');
    } catch (err: unknown) {
      setErrorMessage(resolveApiErrorMessage(err, t, 'auth.verifyEmailError'));
      setStatus('error');
    }
  }, [token, t]);

  useEffect(() => {
    verify();
  }, [verify]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {status === 'verifying' && (
          <>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.verifyingTitle}>{t('auth.verifyEmailVerifying')}</Text>
            <Text style={styles.message}>{t('auth.verifyEmailVerifyingSub')}</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={Colors.auctionGreen}
              style={styles.icon}
            />
            <Text style={styles.title}>{t('auth.verifyEmailSuccessTitle')}</Text>
            <Text style={styles.message}>{t('auth.verifyEmailSuccessMessage')}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace('/(auth)/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{t('auth.goToLogin')}</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'error' && (
          <>
            <Ionicons name="close-circle" size={64} color={Colors.error} style={styles.icon} />
            <Text style={styles.title}>{t('auth.verifyEmailErrorTitle')}</Text>
            <Text style={styles.message}>{errorMessage}</Text>
            <TouchableOpacity style={styles.button} onPress={verify} activeOpacity={0.8}>
              <Text style={styles.buttonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.linkText}>
                <Text style={styles.linkBold}>{t('auth.goToLogin')}</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
