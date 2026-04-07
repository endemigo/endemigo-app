import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        Merhaba, {user?.firstName || 'Kullanıcı'} 👋
      </Text>
      <Text style={styles.subtitle}>
        Endemigo'ya hoş geldiniz
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏷️ Ürünler</Text>
        <Text style={styles.cardText}>
          Yakında burada ürünler listelenecek...
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔨 Aktif Müzayedeler</Text>
        <Text style={styles.cardText}>
          Yakında burada aktif müzayedeler görünecek...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
