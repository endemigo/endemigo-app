import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuction, useAuctionBids, usePlaceBid } from '../../hooks/useAuctions';
import { useWalletBalance } from '../../hooks/useWallet';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { useTranslation } from 'react-i18next';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({ spacer: { height: 40 } });
export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { showModal } = useModalStore();
  const { t } = useTranslation();
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
        <ActivityIndicator size="large" color={Colors.auctionGreen} />
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
      showModal({ title: t('common.error') || 'Hata', message: `Minimum teklif: ${minBid.toFixed(2)}₺`, type: 'error' });
      return;
    }
    try {
      await placeBid.mutateAsync({ auctionId: id, amount });
      showModal({ title: 'Başarılı! 🎉', message: `${amount.toLocaleString('tr-TR')}₺ teklifiniz kabul edildi.`, type: 'success' });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Teklif verilemedi';
      showModal({ title: t('common.error') || 'Hata', message: msg, type: 'error' });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: auction.productImage || 'https://placehold.co/400x300/F8F9FA/F26838?text=Müzayede' }}
            style={styles.image}
          />
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
          {isActive && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>CANLI</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{auction.productTitle}</Text>

          {/* Price + Timer Card */}
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Güncel Fiyat</Text>
              <Text style={styles.priceValue}>
                ₺{Number(auction.currentPrice).toLocaleString('tr-TR')}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                Alıcı Primi (%{(Number(auction.buyerPremiumRate) * 100).toFixed(0)})
              </Text>
              <Text style={styles.premiumValue}>
                +₺{(Number(auction.currentPrice) * Number(auction.buyerPremiumRate)).toLocaleString('tr-TR')}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.timerRow}>
              <View style={styles.timerLeft}>
                <Ionicons
                  name={isEnded ? 'stop-circle' : 'time'}
                  size={18}
                  color={isEnded ? Colors.error : Colors.secondary}
                />
                <Text style={styles.timerLabel}>
                  {isEnded ? 'Müzayede Bitti' : 'Kalan Süre'}
                </Text>
              </View>
              <Text style={[styles.timerValue, isEnded && styles.timerEnded]}>
                {formatCountdown(timeLeft)}
              </Text>
            </View>
            <View style={styles.bidCountRow}>
              <Ionicons name="stats-chart" size={14} color={Colors.onSurfaceVariant} />
              <Text style={styles.bidCount}>{auction.bidCount} teklif</Text>
            </View>
          </View>

          {/* Bid Form */}
          {isActive && !isSeller && (
            <View style={styles.bidCard}>
              <View style={styles.bidHeader}>
                <Text style={styles.bidHeaderTitle}>Teklif Ver</Text>
                <Text style={styles.bidMinLabel}>Min: ₺{minBid.toLocaleString('tr-TR')}</Text>
              </View>
              {wallet && (
                <View style={styles.walletRow}>
                  <Ionicons name="wallet" size={14} color={Colors.secondary} />
                  <Text style={styles.walletInfo}>
                    Bakiye: {wallet.available.toLocaleString('tr-TR')}₺
                  </Text>
                </View>
              )}
              <View style={styles.bidInputRow}>
                <View style={styles.bidInputWrapper}>
                  <Text style={styles.bidCurrency}>₺</Text>
                  <TextInput
                    style={styles.bidInput}
                    value={bidAmount}
                    onChangeText={setBidAmount}
                    keyboardType="numeric"
                    placeholder={minBid.toString()}
                    placeholderTextColor={Colors.slate400}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.bidButton, placeBid.isPending && styles.bidButtonDisabled]}
                  onPress={handleBid}
                  disabled={placeBid.isPending}
                  activeOpacity={0.8}
                >
                  {placeBid.isPending ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="hammer" size={18} color={Colors.white} />
                      <Text style={styles.bidButtonText}>TEKLİF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {premium > 0 && (
                <Text style={styles.premiumInfo}>
                  Alıcı primi dahil toplam: ₺{(parseFloat(bidAmount || '0') + premium).toLocaleString('tr-TR')}
                </Text>
              )}
            </View>
          )}

          {isEnded && (
            <TouchableOpacity
              style={styles.resultButton}
              onPress={() => router.push(`/auction/${id}/result` as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="trophy" size={22} color={Colors.white} />
              <Text style={styles.resultButtonText}>Sonucu Gör</Text>
            </TouchableOpacity>
          )}

          {isSeller && (
            <View style={styles.sellerNote}>
              <Ionicons name="storefront" size={18} color={Colors.primary} />
              <Text style={styles.sellerNoteText}>Bu sizin müzayedeniz</Text>
            </View>
          )}

          {/* Bid History */}
          <Text style={styles.sectionTitle}>Son Teklifler</Text>
          {bids?.length ? (
            bids.map((bid: any, idx: number) => (
              <View key={bid.id} style={[styles.bidItem, idx === 0 && styles.bidItemFirst]}>
                <View style={styles.bidItemLeft}>
                  <View style={[styles.bidRank, idx === 0 && styles.bidRankFirst]}>
                    <Text style={[styles.bidRankText, idx === 0 && styles.bidRankTextFirst]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <Text style={styles.bidName}>{bid.bidderName}</Text>
                </View>
                <Text style={[styles.bidAmount, idx === 0 && styles.bidAmountFirst]}>
                  ₺{Number(bid.amount).toLocaleString('tr-TR')}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.noBidsContainer}>
              <Ionicons name="chatbubble-outline" size={32} color={Colors.slate300} />
              <Text style={styles.noBids}>Henüz teklif yok</Text>
            </View>
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  // Image
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 280, backgroundColor: Colors.surfaceContainerLow },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: Spacing.base,
    width: 40, height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.sm,
  },
  liveIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 44,
    right: Spacing.base,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white },
  liveText: { color: Colors.white, fontSize: 10, fontFamily: FontFamily.bodyBold, fontWeight: '700' },

  content: { padding: Spacing.lg },
  title: { color: Colors.onSurface, fontSize: FontSize.titleLg, fontFamily: FontFamily.headlineBlack, fontWeight: '800', marginBottom: Spacing.base },

  // Price Card
  priceCard: { backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: BorderRadius['2xl'], marginBottom: Spacing.base, borderWidth: 1, borderColor: Colors.slate100, ...Shadows.sm },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  priceLabel: { color: Colors.onSurfaceVariant, fontSize: FontSize.body, fontFamily: FontFamily.body },
  priceValue: { color: Colors.auctionGreen, fontSize: FontSize.heading, fontFamily: FontFamily.headlineBlack, fontWeight: '900' },
  premiumValue: { color: '#F59E0B', fontSize: FontSize.bodyXl, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.slate100, marginVertical: Spacing.md },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  timerLabel: { color: Colors.onSurfaceVariant, fontSize: FontSize.body, fontFamily: FontFamily.body },
  timerValue: { color: Colors.secondary, fontSize: FontSize.titleSm, fontFamily: FontFamily.headlineBlack, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timerEnded: { color: Colors.error },
  bidCountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
  bidCount: { color: Colors.onSurfaceVariant, fontSize: FontSize.meta, fontFamily: FontFamily.body },

  // Bid Card
  bidCard: { backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: BorderRadius['2xl'], marginBottom: Spacing.base, borderLeftWidth: 4, borderLeftColor: Colors.auctionGreen, ...Shadows.sm },
  bidHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  bidHeaderTitle: { fontSize: FontSize.bodyXl, fontFamily: FontFamily.headlineBlack, fontWeight: '800', color: Colors.onSurface },
  bidMinLabel: { fontSize: FontSize.caption, fontFamily: FontFamily.body, color: Colors.onSurfaceVariant },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  walletInfo: { color: Colors.secondary, fontSize: FontSize.body, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  bidInputRow: { flexDirection: 'row', gap: Spacing.md },
  bidInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outlineVariant, paddingHorizontal: Spacing.base },
  bidCurrency: { fontSize: FontSize.subheading, fontFamily: FontFamily.headlineBlack, fontWeight: '800', color: Colors.onSurfaceVariant, marginRight: Spacing.xs },
  bidInput: { flex: 1, paddingVertical: 14, color: Colors.onSurface, fontSize: FontSize.subheading, fontFamily: FontFamily.headlineBlack, fontWeight: '700' },
  bidButton: { flexDirection: 'row', backgroundColor: Colors.auctionGreen, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, ...Shadows.colored(Colors.auctionGreen) },
  bidButtonDisabled: { opacity: 0.5 },
  bidButtonText: { color: Colors.white, fontSize: FontSize.body, fontFamily: FontFamily.headlineBlack, fontWeight: '800' },
  premiumInfo: { color: '#F59E0B', fontSize: FontSize.caption, fontFamily: FontFamily.body, marginTop: Spacing.sm },

  resultButton: { flexDirection: 'row', backgroundColor: Colors.auctionGreen, padding: Spacing.lg, borderRadius: BorderRadius['2xl'], alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.base, ...Shadows.colored(Colors.auctionGreen) },
  resultButtonText: { color: Colors.white, fontSize: FontSize.subheading, fontFamily: FontFamily.headlineBlack, fontWeight: '700' },

  sellerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: `${Colors.primary}1A`, padding: Spacing.base, borderRadius: BorderRadius.xl, marginBottom: Spacing.base },
  sellerNoteText: { color: Colors.primary, fontSize: FontSize.body, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },

  // Bid History
  sectionTitle: { color: Colors.onSurfaceVariant, fontSize: FontSize.meta, fontFamily: FontFamily.bodySemiBold, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md },
  bidItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, padding: Spacing.base, borderRadius: BorderRadius.xl, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.slate100 },
  bidItemFirst: { borderColor: Colors.auctionGreen, borderWidth: 1.5 },
  bidItemLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bidRank: { width: 28, height: 28, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center' },
  bidRankFirst: { backgroundColor: Colors.auctionGreen },
  bidRankText: { fontSize: FontSize.caption, fontFamily: FontFamily.bodyBold, fontWeight: '700', color: Colors.onSurfaceVariant },
  bidRankTextFirst: { color: Colors.white },
  bidName: { color: Colors.onSurface, fontSize: FontSize.body, fontFamily: FontFamily.bodyMedium },
  bidAmount: { color: Colors.onSurface, fontSize: FontSize.bodyXl, fontFamily: FontFamily.headlineBlack, fontWeight: '700' },
  bidAmountFirst: { color: Colors.auctionGreen },
  noBidsContainer: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  noBids: { color: Colors.slate400, fontSize: FontSize.body, fontFamily: FontFamily.body },
});
