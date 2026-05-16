import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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

  const sellerItems = useMemo<ProfileMenuItemConfig[]>(() => [
    {
      key: 'seller-dashboard',
      labelKey: 'profileMenu.sellerDashboard',
      icon: 'speedometer-outline',
      route: '/(tabs)/seller-dashboard',
      order: 1,
      tone: 'primary',
    },
    {
      key: 'seller-orders',
      labelKey: 'profileMenu.sellerOrders',
      icon: 'receipt-outline',
      route: '/(tabs)/orders',
      order: 2,
      tone: 'secondary',
    },
    {
      key: 'seller-operations',
      labelKey: 'profileMenu.sellerOperations',
      icon: 'cube-outline',
      route: '/(tabs)/orders',
      order: 3,
      tone: 'accent',
    },
    {
      key: 'seller-ads',
      labelKey: 'profileMenu.sellerAds',
      icon: 'megaphone-outline',
      route: '/(tabs)/seller-ads',
      order: 4,
      tone: 'accent',
    },
    {
      key: 'seller-campaigns',
      labelKey: 'profileMenu.sellerCampaigns',
      icon: 'pricetags-outline',
      route: '/(tabs)/seller-campaigns',
      order: 5,
      tone: 'secondary',
    },
    {
      key: 'messages',
      labelKey: 'profileMenu.messages',
      icon: 'chatbubble-ellipses-outline',
      route: '/(tabs)/messages',
      order: 6,
      tone: 'primary',
    },
  ], []);

  const commonItems = activeMode === 'seller' ? sellerCommonItems : buyerCommonItems;

  const handleLogout = async () => {
    resetRoleMode();
    await logout();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
        <View style={styles.badgeRow}>
          <View style={[styles.badge, user?.isSeller ? styles.sellerBadge : styles.buyerBadge]}>
            <Ionicons
              name={user?.isSeller ? 'storefront' : 'cart'}
              size={14}
              color={Colors.primary}
            />
            <Text style={[
              styles.badgeText,
              user?.isSeller ? styles.badgeTextSeller : styles.badgeTextBuyer,
            ]}>
              {user?.isSeller ? t('profile.seller') : t('profile.buyer')}
            </Text>
          </View>
        </View>
        <RoleModeSwitch isSeller={Boolean(user?.isSeller)} />

        {/* Edit Profile Button */}
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => router.push('/(tabs)/edit-profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={14} color={Colors.primary} />
          <Text style={styles.editProfileText}>{t('profile.editProfile')}</Text>
        </TouchableOpacity>
      </View>

      {/* Wallet Card */}
      <View style={styles.walletCard}>
        <View style={styles.walletHeader}>
          <View style={styles.walletIconBox}>
            <Ionicons name="wallet" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.walletTitle}>{t('profile.wallet')}</Text>
        </View>
        <Text style={styles.walletBalance}>
          {wallet ? formatCurrency(wallet.available) : t('common.loading')}
        </Text>
        {wallet && wallet.held > 0 && (
          <View style={styles.walletHeldRow}>
            <Ionicons name="lock-closed" size={12} color={Colors.accent} />
            <Text style={styles.walletHeld}>
              {t('wallet.heldBalance')}: {formatCurrency(wallet.held)}
            </Text>
          </View>
        )}
        {wallet && (
          <Text style={styles.walletHint}>
            {t('profile.walletBalance')}: {formatCurrency(wallet.balance)}
          </Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>{t('profile.commonSectionTitle')}</Text>
      <Text style={styles.sectionSubtitle}>{t('profile.commonSectionSubtitle')}</Text>
      <ProfileMenuSection
        activeMode={activeMode}
        items={commonItems}
        onNavigate={(route) => router.push(route as never)}
      />

      <Text style={styles.sectionTitle}>
        {activeMode === 'seller'
          ? t('profile.sellerSectionTitle')
          : t('profile.buyerSectionTitle')}
      </Text>
      <Text style={styles.sectionSubtitle}>
        {activeMode === 'seller'
          ? t('profile.sellerSectionSubtitle')
          : t('profile.buyerSectionSubtitle')}
      </Text>
      <ProfileMenuSection
        activeMode={activeMode}
        items={activeMode === 'seller' ? sellerItems : buyerItems}
        onNavigate={(route) => router.push(route as never)}
      />

      {/* Become Seller Button */}
      {!user?.isSeller && (
        <TouchableOpacity
          style={styles.sellerButton}
          onPress={() => router.push('/(tabs)/become-seller')}
          activeOpacity={0.8}
        >
          <Ionicons name="storefront" size={22} color={Colors.white} />
          <View style={styles.sellerButtonContent}>
            <Text style={styles.sellerButtonText}>{t('profile.becomeSeller')}</Text>
            <Text style={styles.sellerButtonSub}>{t('profile.becomeSellerSub')}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}
