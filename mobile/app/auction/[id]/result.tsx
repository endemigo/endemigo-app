import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuctionResult } from '../../../hooks/useAuctions';
import { useAuthStore } from '../../../store/authStore';
import { Colors } from '../../../constants/theme';
import { formatCurrency } from '../../../utils/transactionFormatters';
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
      <View
        style={[
          styles.iconCircle,
          isWinner ? styles.iconCircleWinner : result.winner ? styles.iconCircleEnded : styles.iconCircleEmpty,
        ]}
      >
        <Ionicons
          name={isWinner ? 'trophy' : result.winner ? 'close-circle' : 'stop-circle'}
          size={56}
          color={isWinner ? Colors.secondary : result.winner ? Colors.auctionGreen : Colors.slate500}
        />
      </View>

      <Text style={styles.title}>
        {isWinner ? t('auction.resultTitleWinner') : result.winner ? t('auction.resultTitleEnded') : t('auction.resultTitleNoBid')}
      </Text>
      <Text style={styles.subtitle}>
        {result.product?.title || t('auction.resultProductFallback')}
      </Text>

      {/* Result Card */}
      <View style={styles.resultCard}>
        <View style={styles.row}>
          <Text style={styles.label}>{t('auction.finalPrice')}</Text>
          <Text style={styles.value}>{formatCurrency(result.finalPrice)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('auction.buyerPremium')}</Text>
          <Text style={styles.premiumVal}>+{formatCurrency(result.buyerPremium)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.totalLabel}>{t('auction.totalLabel')}</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalCost)}</Text>
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
                {isWinner ? t('auction.you') : result.winner.name}
              </Text>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => router.replace('/(tabs)/auctions')}
        activeOpacity={0.8}
      >
        <Ionicons name="hammer" size={20} color={Colors.white} />
        <Text style={styles.homeButtonText}>{t('auction.backToAuctions')}</Text>
      </TouchableOpacity>
    </View>
  );
}
