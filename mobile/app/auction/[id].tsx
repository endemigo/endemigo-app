import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuction, useAuctionBids, usePlaceBid } from '../../hooks/useAuctions';
import { useWalletBalance } from '../../hooks/useWallet';
import { useAuthStore } from '../../store/authStore';

function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: auction, isLoading } = useAuction(id);
  const { data: bids } = useAuctionBids(id);
  const { data: wallet } = useWalletBalance();
  const placeBid = usePlaceBid();

  const [bidAmount, setBidAmount] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (auction) {
      const minBid = Number(auction.currentPrice) + Number(auction.minIncrement);
      setBidAmount(minBid.toString());
    }
  }, [auction?.currentPrice]);

  if (isLoading || !auction) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  const endTime = new Date(auction.endTime).getTime();
  const timeLeft = Math.max(0, endTime - now);
  const isEnded = auction.status === 'ended' || timeLeft <= 0;
  const isActive = auction.status === 'active' && timeLeft > 0;
  const isSeller = user?.id === auction.sellerId;
  const minBid = Number(auction.currentPrice) + Number(auction.minIncrement);
  const premium = Number(bidAmount || 0) * Number(auction.buyerPremiumRate);

  const handleBid = async () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minBid) {
      Alert.alert('Hata', `Minimum teklif: ${minBid.toFixed(2)}₺`);
      return;
    }
    try {
      await placeBid.mutateAsync({ auctionId: id, amount });
      Alert.alert('Başarılı! 🎉', `${amount.toLocaleString('tr-TR')}₺ teklifiniz kabul edildi.`);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Teklif verilemedi';
      Alert.alert('Hata', msg);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Geri</Text>
      </TouchableOpacity>

      <Image
        source={{ uri: auction.productImage || 'https://placehold.co/400x300?text=Müzayede' }}
        style={styles.image}
      />

      <View style={styles.content}>
        <Text style={styles.title}>{auction.productTitle}</Text>

        {/* Price + Timer */}
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Güncel Fiyat</Text>
            <Text style={styles.priceValue}>
              {Number(auction.currentPrice).toLocaleString('tr-TR')} ₺
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Alıcı Primi (%{(Number(auction.buyerPremiumRate) * 100).toFixed(0)})</Text>
            <Text style={styles.premiumValue}>
              +{(Number(auction.currentPrice) * Number(auction.buyerPremiumRate)).toLocaleString('tr-TR')} ₺
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.timerRow}>
            <Text style={styles.timerLabel}>{isEnded ? 'Müzayede Bitti' : 'Kalan Süre'}</Text>
            <Text style={[styles.timerValue, isEnded && styles.timerEnded]}>
              {isEnded ? '⏹' : '⏱'} {formatCountdown(timeLeft)}
            </Text>
          </View>
          <Text style={styles.bidCount}>📊 {auction.bidCount} teklif</Text>
        </View>

        {/* Bid Form */}
        {isActive && !isSeller && (
          <View style={styles.bidCard}>
            <Text style={styles.bidLabel}>Min. Teklif: {minBid.toLocaleString('tr-TR')}₺</Text>
            {wallet && (
              <Text style={styles.walletInfo}>
                💰 Bakiye: {wallet.available.toLocaleString('tr-TR')}₺
              </Text>
            )}
            <View style={styles.bidRow}>
              <TextInput
                style={styles.bidInput}
                value={bidAmount}
                onChangeText={setBidAmount}
                keyboardType="numeric"
                placeholder={minBid.toString()}
                placeholderTextColor="#555"
              />
              <TouchableOpacity
                style={[styles.bidButton, placeBid.isPending && styles.bidButtonDisabled]}
                onPress={handleBid}
                disabled={placeBid.isPending}
              >
                {placeBid.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.bidButtonText}>TEKLİF VER</Text>
                )}
              </TouchableOpacity>
            </View>
            {premium > 0 && (
              <Text style={styles.premiumInfo}>
                Alıcı primi dahil toplam: {(parseFloat(bidAmount || '0') + premium).toLocaleString('tr-TR')}₺
              </Text>
            )}
          </View>
        )}

        {isEnded && (
          <TouchableOpacity
            style={styles.resultButton}
            onPress={() => router.push(`/auction/${id}/result` as any)}
          >
            <Text style={styles.resultButtonText}>🏆 Sonucu Gör</Text>
          </TouchableOpacity>
        )}

        {isSeller && (
          <View style={styles.sellerNote}>
            <Text style={styles.sellerNoteText}>🏪 Bu sizin müzayedeniz</Text>
          </View>
        )}

        {/* Bid History */}
        <Text style={styles.sectionTitle}>Son Teklifler</Text>
        {bids?.length ? (
          bids.map((bid, idx) => (
            <View key={bid.id} style={[styles.bidItem, idx === 0 && styles.bidItemFirst]}>
              <Text style={styles.bidName}>{bid.bidderName}</Text>
              <Text style={[styles.bidAmount, idx === 0 && styles.bidAmountFirst]}>
                {Number(bid.amount).toLocaleString('tr-TR')} ₺
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noBids}>Henüz teklif yok</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1A' },
  back: { position: 'absolute', top: 50, left: 16, zIndex: 10, backgroundColor: 'rgba(15,15,26,0.7)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  backText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  image: { width: '100%', height: 250, backgroundColor: '#2A2A3E' },
  content: { padding: 20 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  priceCard: { backgroundColor: '#1A1A2E', padding: 20, borderRadius: 16, marginBottom: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priceLabel: { color: '#A0A0B0', fontSize: 14 },
  priceValue: { color: '#6C5CE7', fontSize: 28, fontWeight: '900' },
  premiumValue: { color: '#FDCB6E', fontSize: 16, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#2A2A3E', marginVertical: 12 },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerLabel: { color: '#A0A0B0', fontSize: 14 },
  timerValue: { color: '#00B894', fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timerEnded: { color: '#FF6B6B' },
  bidCount: { color: '#A0A0B0', fontSize: 13, marginTop: 8 },
  bidCard: { backgroundColor: '#1A1A2E', padding: 20, borderRadius: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#6C5CE7' },
  bidLabel: { color: '#A0A0B0', fontSize: 13, marginBottom: 4 },
  walletInfo: { color: '#00B894', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  bidRow: { flexDirection: 'row', gap: 12 },
  bidInput: { flex: 1, backgroundColor: '#2A2A3E', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#FFF', fontSize: 18, fontWeight: '700' },
  bidButton: { backgroundColor: '#6C5CE7', borderRadius: 12, paddingHorizontal: 24, justifyContent: 'center' },
  bidButtonDisabled: { opacity: 0.5 },
  bidButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  premiumInfo: { color: '#FDCB6E', fontSize: 12, marginTop: 8 },
  resultButton: { backgroundColor: '#6C5CE7', padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  resultButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  sellerNote: { backgroundColor: '#2d3436', padding: 16, borderRadius: 12, marginBottom: 16 },
  sellerNoteText: { color: '#FDCB6E', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { color: '#A0A0B0', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  bidItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1A1A2E', padding: 14, borderRadius: 12, marginBottom: 8 },
  bidItemFirst: { borderLeftWidth: 3, borderLeftColor: '#6C5CE7' },
  bidName: { color: '#D0D0E0', fontSize: 14 },
  bidAmount: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  bidAmountFirst: { color: '#6C5CE7' },
  noBids: { color: '#555', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
