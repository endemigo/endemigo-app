import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useWalletBalance } from '../../hooks/useWallet';
import api from '../../lib/api';

export default function ProfileScreen() {
  const { user, logout, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const { data: wallet } = useWalletBalance();

  const handleBecomeSeller = async () => {
    try {
      setLoading(true);
      const { data } = await api.patch('/users/become-seller');
      setUser({ ...user!, isSeller: true });
      Alert.alert('Tebrikler! 🎉', 'Artık satıcı hesabınız aktif.');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Bir hata oluştu';
      Alert.alert('Hata', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>👤 Profil</Text>

      <View style={styles.infoCard}>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, user?.isSeller ? styles.sellerBadge : styles.buyerBadge]}>
            <Text style={styles.badgeText}>
              {user?.isSeller ? '🏪 Satıcı' : '🛒 Alıcı'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.walletCard}>
        <Text style={styles.walletTitle}>💰 Cüzdanım</Text>
        <Text style={styles.walletBalance}>
          {wallet ? `${wallet.available.toLocaleString('tr-TR')} ₺` : '...'}
        </Text>
        {wallet && wallet.held > 0 && (
          <Text style={styles.walletHeld}>
            🔒 Hold: {wallet.held.toLocaleString('tr-TR')} ₺
          </Text>
        )}
        {wallet && (
          <Text style={styles.walletHint}>
            Toplam: {wallet.balance.toLocaleString('tr-TR')} ₺
          </Text>
        )}
      </View>

      {!user?.isSeller && (
        <TouchableOpacity
          style={styles.sellerButton}
          onPress={handleBecomeSeller}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.sellerButtonText}>🏪 Satıcı Ol</Text>
              <Text style={styles.sellerButtonSub}>Ürün eklemeye başla</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#1A1A2E',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  email: {
    color: '#A0A0B0',
    fontSize: 14,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sellerBadge: {
    backgroundColor: '#2d3436',
    borderColor: '#6C5CE7',
    borderWidth: 1,
  },
  buyerBadge: {
    backgroundColor: '#2d3436',
    borderColor: '#00b894',
    borderWidth: 1,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  walletCard: {
    backgroundColor: '#1A1A2E',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6C5CE7',
  },
  walletTitle: {
    color: '#A0A0B0',
    fontSize: 14,
    fontWeight: '600',
  },
  walletBalance: {
    color: '#6C5CE7',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },
  walletHint: {
    color: '#555',
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  walletHeld: {
    color: '#FDCB6E',
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 6,
  },
  sellerButton: {
    backgroundColor: '#6C5CE7',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  sellerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sellerButtonSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
