import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, FontFamily } from '../../constants/theme';

export default function AuthLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        gestureEnabled: true,
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontFamily: FontFamily.headline,
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="register" options={{ title: t('auth.registerTitle') }} />
      <Stack.Screen name="forgot-password" options={{ title: t('auth.forgotPasswordTitle') }} />
      <Stack.Screen name="reset-password" options={{ title: t('auth.resetPasswordTitle') }} />
      <Stack.Screen name="verify-email" options={{ title: t('auth.verifyEmailTitle') }} />
    </Stack>
  );
}
