import { Bid } from '@/types';
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
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuction, useAuctionBids, usePlaceBid } from '../../hooks/useAuctions';
import { useWalletBalance } from '../../hooks/useWallet';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { styles } from './[id].styles';

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
  const { t } = useTranslation();
    const { user } = useAuthStore();
  const { showModal } = useModalStore();
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
    } catch (err: unknown) {
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
              <Text style={styles.liveText}>{t('auction.live')}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{auction.productTitle}</Text>

          {/* Price + Timer Card */}
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('auction.currentPrice')}</Text>
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
                <Text style={styles.bidHeaderTitle}>{t('auction.placeBid')}</Text>
                <Text style={styles.bidMinLabel}>{t('auction.minBid', { amount: minBid.toLocaleString('tr-TR') })}</Text>
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
                      <Text style={styles.bidButtonText}>{t('auction.bidButton')}</Text>
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
              onPress={() => router.push(`/auction/${id}/result` as never)}
              activeOpacity={0.8}
            >
              <Ionicons name="trophy" size={22} color={Colors.white} />
              <Text style={styles.resultButtonText}>{t('auction.seeResult')}</Text>
            </TouchableOpacity>
          )}

          {isSeller && (
            <View style={styles.sellerNote}>
              <Ionicons name="storefront" size={18} color={Colors.primary} />
              <Text style={styles.sellerNoteText}>{t('auction.yourAuction')}</Text>
            </View>
          )}

          {/* Bid History */}
          <Text style={styles.sectionTitle}>{t('auction.lastBidsTitle')}</Text>
          {bids?.length ? (
            bids.map((bid: Bid, idx: number) => (
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
              <Text style={styles.noBids}>{t('auction.noBidsYet')}</Text>
            </View>
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}
