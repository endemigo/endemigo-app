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
import { useAuctionResult } from '../../../hooks/useAuctions';
import { useAuthStore } from '../../../store/authStore';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../../constants/theme';

export default function AuctionResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
        <Text style={styles.backText}>Geri</Text>
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
          <Text style={styles.label}>Final Fiyat</Text>
          <Text style={styles.value}>₺{result.finalPrice.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Alıcı Primi</Text>
          <Text style={styles.premiumVal}>+₺{result.buyerPremium.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.totalLabel}>Toplam</Text>
          <Text style={styles.totalValue}>₺{totalCost.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Toplam Teklif</Text>
          <Text style={styles.value}>{result.bidCount}</Text>
        </View>
        {result.winner && (
          <View style={styles.row}>
            <Text style={styles.label}>Kazanan</Text>
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
        onPress={() => router.replace('/(tabs)/auctions')}
        activeOpacity={0.8}
      >
        <Ionicons name="hammer" size={20} color={Colors.white} />
        <Text style={styles.homeButtonText}>Müzayedelere Dön</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  backText: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyMedium,
  },
  iconCircle: {
    width: 108,
    height: 108,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.onSurface,
    fontSize: FontSize.heading,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  resultCard: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: BorderRadius['3xl'],
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  label: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
  },
  value: {
    color: Colors.onSurface,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  premiumVal: {
    color: '#F59E0B',
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginVertical: Spacing.sm,
  },
  totalLabel: {
    color: Colors.onSurface,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '700',
  },
  totalValue: {
    color: Colors.primary,
    fontSize: FontSize.titleLg,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  winnerBadgeActive: {
    backgroundColor: `${Colors.secondary}1A`,
  },
  winnerText: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  winnerTextActive: {
    color: Colors.secondary,
  },
  homeButton: {
    flexDirection: 'row',
    backgroundColor: Colors.auctionGreen,
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: 'auto',
    ...Shadows.colored(Colors.auctionGreen),
  },
  homeButtonText: {
    color: Colors.white,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '700',
  },
});
