import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuctions } from '../../hooks/useAuctions';

function formatTimeLeft(ms: number) {
  if (ms <= 0) return 'Bitti';
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}s ${mins}dk`;
  if (mins > 0) return `${mins}dk ${secs}sn`;
  return `${secs}sn`;
}

const statusConfig = {
  pending: { label: 'Bekliyor', color: '#FDCB6E' },
  active: { label: 'Canlı', color: '#00B894' },
  ended: { label: 'Bitti', color: '#FF6B6B' },
};

export default function AuctionsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useAuctions(1);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Müzayedeler yükleniyor...</Text>
      </View>
    );
  }

  if (!data?.items?.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🔨</Text>
        <Text style={styles.emptyText}>Henüz müzayede yok</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🔨 Müzayedeler</Text>
      <FlatList
        data={data.items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        renderItem={({ item }) => {
          const endMs = new Date(item.endTime).getTime();
          const timeLeft = Math.max(0, endMs - now);
          const st = statusConfig[item.status as keyof typeof statusConfig];

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/auction/${item.id}` as any)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: item.productImage || 'https://placehold.co/100x100?text=Ürün' }}
                style={styles.image}
              />
              <View style={styles.cardBody}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.productTitle || 'Ürün'}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: st.color + '22', borderColor: st.color }]}>
                    <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <Text style={styles.price}>
                  {Number(item.currentPrice).toLocaleString('tr-TR')} ₺
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>⏱ {formatTimeLeft(timeLeft)}</Text>
                  <Text style={styles.meta}>📊 {item.bidCount} teklif</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A', paddingTop: 60 },
  header: { fontSize: 28, fontWeight: '800', color: '#FFF', paddingHorizontal: 16, marginBottom: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1A' },
  loadingText: { color: '#A0A0B0', marginTop: 12, fontSize: 16 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1A1A2E',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: { width: 100, height: 100, backgroundColor: '#2A2A3E' },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#FFF', fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  price: { color: '#6C5CE7', fontSize: 22, fontWeight: '900', marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
  meta: { color: '#A0A0B0', fontSize: 12 },
});
