import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuctionResult } from '../../../hooks/useAuctions';
import { useAuthStore } from '../../../store/authStore';

export default function AuctionResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: result, isLoading } = useAuctionResult(id);

  if (isLoading || !result) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  const isWinner = result.winner?.id === user?.id;
  const totalCost = result.finalPrice + result.buyerPremium;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Geri</Text>
      </TouchableOpacity>

      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{isWinner ? '🏆' : result.winner ? '😔' : '⏹'}</Text>
      </View>

      <Text style={styles.title}>
        {isWinner ? 'Tebrikler!' : result.winner ? 'Müzayede Bitti' : 'Teklif Alınamadı'}
      </Text>

      <Text style={styles.subtitle}>
        {result.product?.title || 'Ürün'}
      </Text>

      <View style={styles.resultCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Final Fiyat</Text>
          <Text style={styles.value}>{result.finalPrice.toLocaleString('tr-TR')} ₺</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Alıcı Primi</Text>
          <Text style={styles.premiumVal}>+{result.buyerPremium.toLocaleString('tr-TR')} ₺</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.totalLabel}>Toplam</Text>
          <Text style={styles.totalValue}>{totalCost.toLocaleString('tr-TR')} ₺</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Toplam Teklif</Text>
          <Text style={styles.value}>{result.bidCount}</Text>
        </View>
        {result.winner && (
          <View style={styles.row}>
            <Text style={styles.label}>Kazanan</Text>
            <Text style={[styles.value, isWinner && styles.winnerText]}>
              {isWinner ? '🏆 Siz!' : result.winner.name}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/(tabs)/auctions')}>
        <Text style={styles.homeButtonText}>Müzayedelere Dön</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A', padding: 20, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1A' },
  back: { marginBottom: 20 },
  backText: { color: '#A0A0B0', fontSize: 16 },
  iconContainer: { alignItems: 'center', marginBottom: 16 },
  icon: { fontSize: 80 },
  title: { color: '#FFF', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#A0A0B0', fontSize: 16, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  resultCard: { backgroundColor: '#1A1A2E', padding: 24, borderRadius: 20, marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { color: '#A0A0B0', fontSize: 14 },
  value: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  premiumVal: { color: '#FDCB6E', fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#2A2A3E', marginVertical: 8 },
  totalLabel: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  totalValue: { color: '#6C5CE7', fontSize: 24, fontWeight: '900' },
  winnerText: { color: '#00B894' },
  homeButton: { backgroundColor: '#6C5CE7', padding: 18, borderRadius: 16, alignItems: 'center' },
  homeButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
