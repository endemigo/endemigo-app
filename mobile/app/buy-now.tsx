import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { getDefaultMobileExperienceConfig } from '@endemigo/shared';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMobileConfig } from '../hooks/useMobileConfig';
import { useAuthStore } from '../store/authStore';
import { useRoleModeStore } from '../store/roleModeStore';
import { styles } from '../styles/buy-now.styles';
import {
  resolveLocalizedText,
  resolveMobileAudience,
} from '../utils/mobileConfig';
import { HomeQuickTabBar } from '../components/ui';

export default function BuyNowScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { data: mobileConfigData } = useMobileConfig();
  const user = useAuthStore((state) => state.user);
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const mobileConfig = mobileConfigData ?? getDefaultMobileExperienceConfig();
  const locale = i18n.language.startsWith('en') ? 'en' : 'tr';
  const audience = resolveMobileAudience(user, activeMode);
  const buyNowSurface = mobileConfig.otherSurfaces.find(
    (surface) => surface.surface === 'BUY_NOW' && surface.enabled && surface.audiences.includes(audience),
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {resolveLocalizedText(buyNowSurface?.title, locale, t('tabs.buyNow'))}
        </Text>
        <Text style={styles.subtitle}>
          {resolveLocalizedText(buyNowSurface?.subtitle, locale, t('home.buyNowSub'))}
        </Text>
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.85}
          onPress={() => router.push((buyNowSurface?.cta?.route || '/home') as never)}
        >
          <Text style={styles.buttonText}>
            {resolveLocalizedText(buyNowSurface?.cta?.label, locale, t('home.explore'))}
          </Text>
        </TouchableOpacity>
      </View>
      <HomeQuickTabBar activeTab="shopping" />
    </View>
  );
}
