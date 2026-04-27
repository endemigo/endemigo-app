import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { PaketimBenefitShowcase } from '../../components/ui/paketim/PaketimBenefitShowcase';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { useRoleModeStore } from '../../store/roleModeStore';
import { styles } from '../../styles/tabs/paketim.styles';

export default function PaketimScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const { showModal } = useModalStore();
  const isSellerAccess = activeMode === 'seller' && Boolean(user?.isSeller);

  useEffect(() => {
    if (!isSellerAccess) {
      showModal({
        title: t('paketim.accessDeniedTitle'),
        message: t('paketim.accessDeniedMessage'),
        type: 'info',
      });
      router.replace('/(tabs)/profile' as never);
    }
  }, [isSellerAccess, router, showModal, t]);

  const benefits = useMemo(
    () => [
      t('paketim.benefitVisibility'),
      t('paketim.benefitTrust'),
      t('paketim.benefitPayout'),
      t('paketim.benefitSupport'),
    ],
    [t],
  );

  if (!isSellerAccess) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('paketim.title')}</Text>
        <Text style={styles.subtitle}>{t('paketim.sellerInfoDescription')}</Text>
      </View>

      <PaketimBenefitShowcase
        packageName={t('paketim.standardPackage')}
        benefits={benefits}
        sellerOnly
        highlightedBenefit={t('paketim.benefitPayout')}
      />

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>{t('paketim.sellerInfoTitle')}</Text>
        <Text style={styles.noteBody}>{t('paketim.futureManagementNote')}</Text>
      </View>
    </ScrollView>
  );
}
