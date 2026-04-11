import React from 'react';
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
import { useWalletBalance } from '../../hooks/useWallet';
import { Colors } from '../../constants/theme';
import { styles } from '../../styles/tabs/profile.styles';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: wallet } = useWalletBalance();

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
              color={user?.isSeller ? Colors.primary : Colors.secondary}
            />
            <Text style={[styles.badgeText, {
              color: user?.isSeller ? Colors.primary : Colors.secondary,
            }]}>
              {user?.isSeller ? t('profile.seller') : t('profile.buyer')}
            </Text>
          </View>
        </View>

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
          {wallet ? `${wallet.available.toLocaleString('tr-TR')} ₺` : '...'}
        </Text>
        {wallet && wallet.held > 0 && (
          <View style={styles.walletHeldRow}>
            <Ionicons name="lock-closed" size={12} color="#F59E0B" />
            <Text style={styles.walletHeld}>
              Hold: {wallet.held.toLocaleString('tr-TR')} ₺
            </Text>
          </View>
        )}
        {wallet && (
          <Text style={styles.walletHint}>
            {t('profile.walletBalance')}: {wallet.balance.toLocaleString('tr-TR')} ₺
          </Text>
        )}
      </View>

      {/* Menu Items */}
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: `${Colors.primary}1A` }]}>
            <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
          </View>
          <Text style={styles.menuText}>{t('profile.orders')}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: `${Colors.accent}1A` }]}>
            <Ionicons name="hammer-outline" size={18} color={Colors.accent} />
          </View>
          <Text style={styles.menuText}>{t('auctions.title')}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: `${Colors.secondary}1A` }]}>
            <Ionicons name="heart-outline" size={18} color={Colors.secondary} />
          </View>
          <Text style={styles.menuText}>{t('profile.favorites')}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <View style={[styles.menuIcon, { backgroundColor: Colors.slate100 }]}>
            <Ionicons name="settings-outline" size={18} color={Colors.slate600} />
          </View>
          <Text style={styles.menuText}>{t('profile.settings')}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
        </TouchableOpacity>
      </View>

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
      <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}
