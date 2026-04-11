import { Bid } from '@/types';
import { AuctionStatus } from '@endemigo/shared';
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
import { useAuctionSocket } from '../../hooks/useAuctionSocket';
import { useWalletBalance } from '../../hooks/useWallet';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { CountdownTimer } from '../../components/auction/CountdownTimer';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { styles } from './[id].styles';

export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { showModal } = useModalStore();
  const { data: auction, isLoading, refetch } = useAuction(id);
  const { data: bids, refetch: refetchBids } = useAuctionBids(id);
  const { data: wallet } = useWalletBalance();
  const placeBid = usePlaceBid();

  // ─── Socket.IO Real-time (Phase 5) ────────────────────
  const socket = useAuctionSocket(id);

  const [bidAmount, setBidAmount] = useState('');

  // Merge socket state with API data
  const currentPrice = socket.currentPrice || Number(auction?.currentPrice || 0);
  const bidCount = socket.bidCount || auction?.bidCount || 0;
  const endTime = socket.endTime || auction?.endTime || '';
  const serverTime = socket.serverTime || auction?.serverTime || '';

  // Refetch API data when socket reports new bid (for bid history)
  useEffect(() => {
    if (socket.lastBid) {
      refetchBids();
    }
  }, [socket.lastBid]);

  // Refetch when auction ends via socket
  useEffect(() => {
    if (socket.auctionEnded) {
      refetch();
      refetchBids();
    }
  }, [socket.auctionEnded]);

  useEffect(() => {
    if (auction) {
      const minBid = currentPrice + Number(auction.minIncrement);
      setBidAmount(minBid.toString());
    }
  }, [currentPrice, auction?.minIncrement]);

  if (isLoading || !auction) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.auctionGreen} />
      </View>
    );
  }

  const isEnded =
    auction.status === AuctionStatus.ENDED ||
    auction.status === AuctionStatus.COMPLETED ||
    socket.auctionEnded;
  const isActive = auction.status === AuctionStatus.ACTIVE && !isEnded;
  const isSeller = user?.id === auction.sellerId;
  const minBid = currentPrice + Number(auction.minIncrement);
  const premium = Number(bidAmount || 0) * Number(auction.buyerPremiumRate);

  const handleBid = async () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minBid) {
      showModal({
        title: t('common.error') || 'Hata',
        message: `Minimum teklif: ${minBid.toFixed(2)}₺`,
        type: 'error',
      });
      return;
    }
    try {
      await placeBid.mutateAsync({ auctionId: id, amount });
      showModal({
        title: 'Başarılı! 🎉',
        message: `${amount.toLocaleString('tr-TR')}₺ teklifiniz kabul edildi.`,
        type: 'success',
      });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Teklif verilemedi';
      showModal({
        title: t('common.error') || 'Hata',
        message: msg,
        type: 'error',
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri:
                auction.productImage ||
                'https://placehold.co/400x300/F8F9FA/F26838?text=Müzayede',
            }}
            style={styles.image}
          />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
          {isActive && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t('auction.live')}</Text>
            </View>
          )}
          {/* Viewer Count + Connection Status */}
          {(socket.viewerCount > 0 || socket.isConnected) && (
            <View style={localStyles.viewerBadge}>
              <Ionicons name="eye" size={14} color="#fff" />
              <Text style={localStyles.viewerText}>
                {socket.viewerCount || '–'}
              </Text>
              <View
                style={[
                  localStyles.connectionDot,
                  { backgroundColor: socket.isConnected ? '#4ade80' : '#ef4444' },
                ]}
              />
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* LOT Number */}
          {auction.lotNumber && (
            <Text style={localStyles.lotNumber}>{auction.lotNumber}</Text>
          )}
          <Text style={styles.title}>{auction.productTitle}</Text>

          {/* Price + Timer Card */}
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {t('auction.currentPrice')}
              </Text>
              <Text style={styles.priceValue}>
                ₺{currentPrice.toLocaleString('tr-TR')}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                Alıcı Primi (
                %{(Number(auction.buyerPremiumRate) * 100).toFixed(0)})
              </Text>
              <Text style={styles.premiumValue}>
                +₺
                {(
                  currentPrice * Number(auction.buyerPremiumRate)
                ).toLocaleString('tr-TR')}
              </Text>
            </View>
            <View style={styles.divider} />

            {/* CountdownTimer (D-06: server time sync) */}
            {isActive && endTime ? (
              <CountdownTimer
                endTime={endTime}
                serverTime={serverTime}
              />
            ) : (
              <View style={styles.timerRow}>
                <View style={styles.timerLeft}>
                  <Ionicons name="stop-circle" size={18} color={Colors.error} />
                  <Text style={styles.timerLabel}>Müzayede Bitti</Text>
                </View>
                <Text style={[styles.timerValue, styles.timerEnded]}>
                  00:00:00
                </Text>
              </View>
            )}

            <View style={styles.bidCountRow}>
              <Ionicons
                name="stats-chart"
                size={14}
                color={Colors.onSurfaceVariant}
              />
              <Text style={styles.bidCount}>{bidCount} teklif</Text>
            </View>
          </View>

          {/* Live Update Indicator */}
          {socket.lastBid && isActive && (
            <View style={localStyles.lastBidBanner}>
              <Ionicons name="flash" size={16} color="#f59e0b" />
              <Text style={localStyles.lastBidText}>
                {socket.lastBid.bidderName} — ₺
                {socket.lastBid.amount.toLocaleString('tr-TR')}
              </Text>
            </View>
          )}

          {/* Bid Form */}
          {isActive && !isSeller && (
            <View style={styles.bidCard}>
              <View style={styles.bidHeader}>
                <Text style={styles.bidHeaderTitle}>
                  {t('auction.placeBid')}
                </Text>
                <Text style={styles.bidMinLabel}>
                  {t('auction.minBid', {
                    amount: minBid.toLocaleString('tr-TR'),
                  })}
                </Text>
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
                  style={[
                    styles.bidButton,
                    placeBid.isPending && styles.bidButtonDisabled,
                  ]}
                  onPress={handleBid}
                  disabled={placeBid.isPending}
                  activeOpacity={0.8}
                >
                  {placeBid.isPending ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="hammer" size={18} color={Colors.white} />
                      <Text style={styles.bidButtonText}>
                        {t('auction.bidButton')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {premium > 0 && (
                <Text style={styles.premiumInfo}>
                  Alıcı primi dahil toplam: ₺
                  {(parseFloat(bidAmount || '0') + premium).toLocaleString(
                    'tr-TR',
                  )}
                </Text>
              )}
            </View>
          )}

          {/* Winner Result */}
          {isEnded && socket.isWinner && (
            <View style={localStyles.winnerBanner}>
              <Text style={localStyles.winnerEmoji}>🏆</Text>
              <Text style={localStyles.winnerTitle}>Tebrikler!</Text>
              <Text style={localStyles.winnerText}>
                Müzayedeyi ₺
                {(socket.finalPrice || currentPrice).toLocaleString('tr-TR')}{' '}
                ile kazandınız!
              </Text>
            </View>
          )}

          {isEnded && !socket.isWinner && socket.auctionEnded && (
            <View style={localStyles.loserBanner}>
              <Text style={localStyles.loserText}>
                Müzayede sona erdi. Holdunuz iade edildi.
              </Text>
            </View>
          )}

          {isEnded && !socket.auctionEnded && (
            <TouchableOpacity
              style={styles.resultButton}
              onPress={() =>
                router.push(`/auction/${id}/result` as never)
              }
              activeOpacity={0.8}
            >
              <Ionicons name="trophy" size={22} color={Colors.white} />
              <Text style={styles.resultButtonText}>
                {t('auction.seeResult')}
              </Text>
            </TouchableOpacity>
          )}

          {isSeller && (
            <View style={styles.sellerNote}>
              <Ionicons
                name="storefront"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.sellerNoteText}>
                {t('auction.yourAuction')}
              </Text>
            </View>
          )}

          {/* Bid History */}
          <Text style={styles.sectionTitle}>
            {t('auction.lastBidsTitle')}
          </Text>
          {bids?.length ? (
            bids.map((bid: Bid, idx: number) => (
              <View
                key={bid.id}
                style={[styles.bidItem, idx === 0 && styles.bidItemFirst]}
              >
                <View style={styles.bidItemLeft}>
                  <View
                    style={[styles.bidRank, idx === 0 && styles.bidRankFirst]}
                  >
                    <Text
                      style={[
                        styles.bidRankText,
                        idx === 0 && styles.bidRankTextFirst,
                      ]}
                    >
                      {idx + 1}
                    </Text>
                  </View>
                  <Text style={styles.bidName}>{bid.bidderName}</Text>
                </View>
                <Text
                  style={[
                    styles.bidAmount,
                    idx === 0 && styles.bidAmountFirst,
                  ]}
                >
                  ₺{Number(bid.amount).toLocaleString('tr-TR')}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.noBidsContainer}>
              <Ionicons
                name="chatbubble-outline"
                size={32}
                color={Colors.slate300}
              />
              <Text style={styles.noBids}>{t('auction.noBidsYet')}</Text>
            </View>
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  viewerBadge: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  viewerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 2,
  },
  lotNumber: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  lastBidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  lastBidText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
  },
  winnerBanner: {
    alignItems: 'center',
    backgroundColor: '#065f46',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  winnerEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  winnerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  winnerText: {
    color: '#d1fae5',
    fontSize: 14,
    textAlign: 'center',
  },
  loserBanner: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  loserText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
});
