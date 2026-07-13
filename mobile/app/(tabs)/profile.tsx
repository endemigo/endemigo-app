import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { AppIcon } from '@/components/ui/AppIcon';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useRoleModeStore } from '../../store/roleModeStore';
import { useWalletBalance } from '../../hooks/useWallet';
import { Colors } from '../../constants/theme';
import { RoleModeSwitch } from '../../components/ui/profile/RoleModeSwitch';
import {
  ProfileMenuSection,
  type ProfileMenuItemConfig,
} from '../../components/ui/profile/ProfileMenuSection';
import { formatCurrency } from '../../utils/transactionFormatters';
import { styles } from '../../styles/tabs/profile.styles';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: wallet } = useWalletBalance();
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const syncRoleModeFromUser = useRoleModeStore((state) => state.syncRoleModeFromUser);
  const resetRoleMode = useRoleModeStore((state) => state.resetRoleMode);

  // Bekleyen satıcı başvurusu varken "Satıcı Ol" yerine durum kartı gösterilir.
  const { data: sellerApplication } = useQuery<{ status?: string } | null>({
    queryKey: ['seller-application', user?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/users/seller-profile');
        return res.data?.sellerProfile ?? null;
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(user) && !user?.isSeller,
  });
  const isSellerApplicationPending = sellerApplication?.status === 'PENDING';

  useEffect(() => {
    syncRoleModeFromUser(user);
  }, [syncRoleModeFromUser, user]);

  const buyerCommonItems = useMemo<ProfileMenuItemConfig[]>(() => [
    {
      key: 'wallet',
      labelKey: 'profileMenu.wallet',
      icon: 'wallet-outline',
      route: '/(tabs)/wallet',
      order: 1,
      tone: 'secondary',
    },
    {
      key: 'addresses',
      labelKey: 'profileMenu.addresses',
      icon: 'location-outline',
      route: '/(tabs)/addresses',
      order: 2,
      tone: 'primary',
    },
    {
      key: 'favorites',
      labelKey: 'profileMenu.favorites',
      icon: 'heart-outline',
      route: '/(tabs)/favoriler',
      order: 3,
      tone: 'accent',
    },
    {
      key: 'notifications',
      labelKey: 'profileMenu.notifications',
      icon: 'notifications-outline',
      route: '/(tabs)/notifications',
      order: 4,
      tone: 'accent',
    },
    {
      key: 'settings',
      labelKey: 'profileMenu.settings',
      icon: 'settings-outline',
      route: '/(tabs)/settings',
      order: 5,
      tone: 'neutral',
    },
  ], []);

  const sellerCommonItems = useMemo<ProfileMenuItemConfig[]>(() => [
    {
      key: 'wallet',
      labelKey: 'profileMenu.wallet',
      icon: 'wallet-outline',
      route: '/(tabs)/wallet',
      order: 1,
      tone: 'secondary',
    },
    {
      key: 'sender-addresses',
      labelKey: 'profileMenu.senderAddresses',
      icon: 'business-outline',
      route: '/(tabs)/addresses?type=SENDER',
      order: 2,
      tone: 'primary',
    },
    {
      key: 'membership',
      labelKey: 'profileMenu.membership',
      icon: 'ribbon-outline',
      route: '/(tabs)/membership',
      order: 3,
      tone: 'primary',
    },
    {
      key: 'notifications',
      labelKey: 'profileMenu.notifications',
      icon: 'notifications-outline',
      route: '/(tabs)/notifications',
      order: 4,
      tone: 'accent',
    },
    {
      key: 'settings',
      labelKey: 'profileMenu.settings',
      icon: 'settings-outline',
      route: '/(tabs)/settings',
      order: 5,
      tone: 'neutral',
    },
  ], []);

  const buyerItems = useMemo<ProfileMenuItemConfig[]>(() => [
    {
      key: 'orders',
      labelKey: 'profileMenu.orders',
      icon: 'receipt-outline',
      route: '/(tabs)/orders',
      order: 1,
      tone: 'primary',
    },
    {
      key: 'messages',
      labelKey: 'profileMenu.messages',
      icon: 'chatbubble-ellipses-outline',
      route: '/(tabs)/messages',
      order: 2,
      tone: 'primary',
    },
  ], []);

  // Satıcı nav menüsü (sellerItems) kaldırıldı — satıcı sekmeleri + Panelim
  // hızlı erişim aynı yerlere gidiyordu; profilde tekrar oluşturuyordu.

  const commonItems = activeMode === 'seller' ? sellerCommonItems : buyerCommonItems;

  const handleLogout = async () => {
    resetRoleMode();
    await logout();
  };

  // Guest: profilin tamamı (cüzdan, menü, çıkış) anlamsız; giriş CTA'sı göster.
  // Ayrıca null user ile karmaşık ağacı mount etmeyi de eler.
  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          gap: 12,
        }}
      >
        <AppIcon name="person-circle-outline" size={72} color={Colors.slate300} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.onSurface, textAlign: 'center' }}>
          {t('profile.guestTitle', { defaultValue: 'Hesabına giriş yap' })}
        </Text>
        <Text style={{ fontSize: 14, color: Colors.slate500, textAlign: 'center' }}>
          {t('profile.guestSubtitle', {
            defaultValue: 'Profilini, siparişlerini ve cüzdanını görmek için giriş yapmalısın.',
          })}
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 8,
            backgroundColor: Colors.primary,
            paddingVertical: 14,
            paddingHorizontal: 40,
            borderRadius: 14,
          }}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={{ color: Colors.white, fontWeight: '700', fontSize: 16 }}>
            {t('auth.login', { defaultValue: 'Giriş Yap' })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.firstName?.[0] || 'U').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}
        <RoleModeSwitch isSeller={Boolean(user?.isSeller)} />

        {/* Edit Profile Button */}
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => router.push('/(tabs)/edit-profile')}
          activeOpacity={0.7}
        >
          <AppIcon name="pencil" size={14} color={Colors.primary} />
          <Text style={styles.editProfileText}>{t('profile.editProfile')}</Text>
        </TouchableOpacity>
      </View>

      {/* Wallet Card */}
      <TouchableOpacity
        style={styles.walletCard}
        onPress={() => router.push('/(tabs)/wallet')}
        activeOpacity={0.9}
      >
        <View style={styles.walletHeader}>
          <View style={styles.walletHeaderLeft}>
            <View style={styles.walletIconBox}>
              <AppIcon name="wallet-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.walletTitle}>{t('wallet.title')}</Text>
          </View>
          <AppIcon name="chevron-forward" size={18} color={Colors.slate400} style={styles.walletChevron} />
        </View>

        <Text style={styles.walletBalanceLabel}>{t('wallet.availableBalance')}</Text>
        <Text style={styles.walletBalance}>
          {wallet ? formatCurrency(wallet.available) : t('common.loading')}
        </Text>

        {wallet && (
          <>
            <View style={styles.walletDivider} />
            <View style={styles.walletFooter}>
              <View style={styles.walletFooterItem}>
                <Text style={styles.walletFooterLabel}>{t('wallet.totalBalance')}</Text>
                <Text style={styles.walletFooterValue}>{formatCurrency(wallet.balance)}</Text>
              </View>
              {wallet.held > 0 && (
                <View style={[styles.walletFooterItem, { alignItems: 'flex-end' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <AppIcon name="lock-closed" size={10} color={Colors.accent} />
                    <Text style={styles.walletFooterLabel}>{t('wallet.heldBalance')}</Text>
                  </View>
                  <Text style={styles.walletHeldValue}>{formatCurrency(wallet.held)}</Text>
                </View>
              )}
            </View>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('profile.commonSectionTitle')}</Text>
      <Text style={styles.sectionSubtitle}>{t('profile.commonSectionSubtitle')}</Text>
      <ProfileMenuSection
        activeMode={activeMode}
        items={commonItems}
        onNavigate={(route) => router.push(route as never)}
      />

      {/* Satıcı nav menüsü kaldırıldı — satıcı sekmeleri + Panelim hızlı erişim
          bunları zaten karşılıyor. Alıcı modunda alıcı menüsü gösterilir. */}
      {activeMode !== 'seller' && (
        <>
          <Text style={styles.sectionTitle}>{t('profile.buyerSectionTitle')}</Text>
          <Text style={styles.sectionSubtitle}>{t('profile.buyerSectionSubtitle')}</Text>
          <ProfileMenuSection
            activeMode={activeMode}
            items={buyerItems}
            onNavigate={(route) => router.push(route as never)}
          />
        </>
      )}

      {/* Become Seller Button / Pending Application State */}
      {!user?.isSeller && (
        isSellerApplicationPending ? (
          <View
            style={[
              styles.sellerButton,
              { backgroundColor: Colors.secondaryContainer },
            ]}
          >
            <AppIcon name="hourglass-outline" size={22} color={Colors.onSecondaryContainer} />
            <View style={styles.sellerButtonContent}>
              <Text style={[styles.sellerButtonText, { color: Colors.onSecondaryContainer }]}>
                {t('seller.applicationPendingTitle')}
              </Text>
              <Text style={[styles.sellerButtonSub, { color: Colors.onSecondaryContainer }]}>
                {t('seller.applicationPendingShort')}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.sellerButton}
            onPress={() => router.push('/(tabs)/become-seller')}
            activeOpacity={0.8}
          >
            <AppIcon name="storefront" size={22} color={Colors.white} />
            <View style={styles.sellerButtonContent}>
              <Text style={styles.sellerButtonText}>{t('profile.becomeSeller')}</Text>
              <Text style={styles.sellerButtonSub}>{t('profile.becomeSellerSub')}</Text>
            </View>
          </TouchableOpacity>
        )
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <AppIcon name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
