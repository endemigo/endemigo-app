import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.firstName?.[0]?.toUpperCase() || '?'}
        </Text>
      </View>

      <Text style={styles.name}>
        {user?.firstName} {user?.lastName}
      </Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.role}>
        {user?.isSeller ? '🏪 Satıcı' : '🛒 Alıcı'}
      </Text>

      <View style={styles.walletCard}>
        <Text style={styles.walletTitle}>💰 Cüzdanım</Text>
        <Text style={styles.walletBalance}>10.000,00 ₺</Text>
        <Text style={styles.walletSubtext}>
          Mock bakiye — gerçek cüzdan Phase 2'de
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    alignItems: 'center',
    paddingTop: 40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  email: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  role: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  walletCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  walletBalance: {
    fontSize: 32,
    fontWeight: '800',
    color: '#16a34a',
    marginTop: 8,
  },
  walletSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  logoutButton: {
    marginTop: 32,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 10,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
