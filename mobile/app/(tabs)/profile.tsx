import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useWalletBalance } from '../../hooks/useWallet';
import api from '../../lib/api';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export default function ProfileScreen() {
  const { user, logout, setUser } = useAuthStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { data: wallet } = useWalletBalance();

  const handleBecomeSeller = async () => {
    try {
      setLoading(true);
      const { data } = await api.patch('/users/become-seller');
      setUser({ ...user!, isSeller: true });
      Alert.alert('🎉', t('profile.sellerActivated') || 'Artık satıcı hesabınız aktif.');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Bir hata oluştu';
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
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
        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: `${Colors.primary}1A` }]}>
            <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
          </View>
          <Text style={styles.menuText}>{t('profile.orders')}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: `${Colors.accent}1A` }]}>
            <Ionicons name="hammer-outline" size={18} color={Colors.accent} />
          </View>
          <Text style={styles.menuText}>{t('auctions.title')}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: `${Colors.secondary}1A` }]}>
            <Ionicons name="heart-outline" size={18} color={Colors.secondary} />
          </View>
          <Text style={styles.menuText}>{t('profile.favorites')}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity style={styles.menuItem}>
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
          onPress={handleBecomeSeller}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="storefront" size={22} color={Colors.white} />
              <View style={styles.sellerButtonContent}>
                <Text style={styles.sellerButtonText}>Satıcı Ol</Text>
                <Text style={styles.sellerButtonSub}>Ürün eklemeye başla</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.base,
  },

  // Profile Header
  profileHeader: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Shadows.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.colored(Colors.primary),
  },
  avatarText: {
    fontSize: FontSize.heading,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    color: Colors.white,
  },
  name: {
    color: Colors.onSurface,
    fontSize: FontSize.title,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
  },
  email: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    marginTop: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  sellerBadge: {
    backgroundColor: `${Colors.primary}1A`,
  },
  buyerBadge: {
    backgroundColor: `${Colors.secondary}1A`,
  },
  badgeText: {
    fontSize: FontSize.meta,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },

  // Wallet
  walletCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    marginBottom: Spacing.base,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    ...Shadows.sm,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  walletIconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: `${Colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletTitle: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  walletBalance: {
    color: Colors.primary,
    fontSize: FontSize.display,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    marginBottom: Spacing.xs,
  },
  walletHeldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  walletHeld: {
    color: '#F59E0B',
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  walletHint: {
    color: Colors.slate400,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },

  // Menu
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xs,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginHorizontal: Spacing.base,
  },

  // Seller Button
  sellerButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.colored(Colors.primary),
  },
  sellerButtonContent: {
    flex: 1,
  },
  sellerButtonText: {
    color: Colors.white,
    fontSize: FontSize.subheading,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
  },
  sellerButtonSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.meta,
    fontFamily: FontFamily.body,
    marginTop: Spacing.xs,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorContainer,
    padding: Spacing.base,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.sm,
  },
  logoutText: {
    color: Colors.error,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
