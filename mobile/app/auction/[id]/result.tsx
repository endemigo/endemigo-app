import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuctionResult } from '../../../hooks/useAuctions';
import { useAuthStore } from '../../../store/authStore';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { styles } from '../../../styles/auction/id/result.styles';

export default function AuctionResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: result, isLoading } = useAuctionResult(id);

  if (isLoading || !result) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.auctionGreen} />
      </View>
    );
  }

  const isWinner = result.winner?.id === user?.id;
  const totalCost = result.finalPrice + result.buyerPremium;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>

      {/* Icon */}
      <View style={[styles.iconCircle, {
        backgroundColor: isWinner ? `${Colors.secondary}1A` : result.winner ? `${Colors.auctionGreen}1A` : Colors.slate100,
      }]}>
        <Ionicons
          name={isWinner ? 'trophy' : result.winner ? 'close-circle' : 'stop-circle'}
          size={56}
          color={isWinner ? Colors.secondary : result.winner ? Colors.auctionGreen : Colors.slate500}
        />
      </View>

      <Text style={styles.title}>
        {isWinner ? 'Tebrikler!' : result.winner ? 'Müzayede Bitti' : 'Teklif Alınamadı'}
      </Text>
      <Text style={styles.subtitle}>
        {result.product?.title || 'Ürün'}
      </Text>

      {/* Result Card */}
      <View style={styles.resultCard}>
        <View style={styles.row}>
          <Text style={styles.label}>{t('auction.finalPrice')}</Text>
          <Text style={styles.value}>₺{result.finalPrice.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('auction.buyerPremium')}</Text>
          <Text style={styles.premiumVal}>+₺{result.buyerPremium.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.totalLabel}>{t('auction.totalLabel')}</Text>
          <Text style={styles.totalValue}>₺{totalCost.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('auction.totalBids')}</Text>
          <Text style={styles.value}>{result.bidCount}</Text>
        </View>
        {result.winner && (
          <View style={styles.row}>
            <Text style={styles.label}>{t('auction.winner')}</Text>
            <View style={[styles.winnerBadge, isWinner && styles.winnerBadgeActive]}>
              <Ionicons
                name={isWinner ? 'trophy' : 'person'}
                size={14}
                color={isWinner ? Colors.secondary : Colors.onSurfaceVariant}
              />
              <Text style={[styles.winnerText, isWinner && styles.winnerTextActive]}>
                {isWinner ? 'Siz!' : result.winner.name}
              </Text>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => router.replace('/(tabs)/auctions' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="hammer" size={20} color={Colors.white} />
        <Text style={styles.homeButtonText}>{t('auction.backToAuctions')}</Text>
      </TouchableOpacity>
    </View>
  );
}
