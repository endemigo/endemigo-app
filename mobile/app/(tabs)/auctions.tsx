import { View, Text, StyleSheet } from 'react-native';

export default function AuctionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Müzayedeler</Text>
      <Text style={styles.subtitle}>
        Aktif müzayedeler burada listelenecek (Phase 2'de implementasyon)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
});
