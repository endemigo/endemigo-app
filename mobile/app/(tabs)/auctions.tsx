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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuctions } from '../../hooks/useAuctions';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

function formatTimeLeft(ms: number, t: (k: string) => string) {
  if (ms <= 0) return t('auctions.ended');
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function AuctionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, refetch, isRefetching } = useAuctions(1);
  const [now, setNow] = useState(Date.now());

  const statusConfig = {
    pending: { label: t('auctions.waiting'), color: '#FDCB6E', bg: '#FDCB6E1A' },
    active: { label: t('auctions.live'), color: '#DC2626', bg: '#DC26261A' },
    ended: { label: t('auctions.ended'), color: Colors.slate500, bg: Colors.slate100 },
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.auctionGreen} />
        <Text style={styles.loadingText}>{t('auctions.loading')}</Text>
      </View>
    );
  }

  if (!data?.items?.length) {
    return (
      <View style={styles.center}>
        <Ionicons name="hammer-outline" size={64} color={Colors.slate300} />
        <Text style={styles.emptyText}>{t('auctions.empty')}</Text>
        <Text style={styles.emptySubtext}>{t('auctions.emptySub')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('auctions.title')}</Text>
        <TouchableOpacity>
          <Text style={styles.headerAction}>{t('auctions.joinAll')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.auctionGreen}
          />
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
              <View style={styles.cardImage}>
                <Image
                  source={{ uri: item.productImage || `https://placehold.co/100x100/F8F9FA/42b94b?text=${encodeURIComponent(t('tabs.auctions'))}` }}
                  style={styles.image}
                />
                {item.status === 'active' && (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>{t('auctions.live')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.productTitle}
                  </Text>
                </View>
                <Text style={styles.timer}>
                  {t('auctions.endTime', { time: formatTimeLeft(timeLeft, t) })}
                </Text>
                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceLabel}>{t('auctions.highestBid')}</Text>
                    <Text style={styles.price}>
                      ₺{Number(item.currentPrice).toLocaleString('tr-TR')}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.bidButton} activeOpacity={0.8}>
                    <Text style={styles.bidButtonText}>{t('auctions.bid')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.metaRow}>
                  <View style={[styles.statusBadge, { backgroundColor: st?.bg }]}>
                    <Text style={[styles.statusText, { color: st?.color }]}>{st?.label}</Text>
                  </View>
                  <Text style={styles.bidCount}>{t('auctions.bidCount', { count: item.bidCount })}</Text>
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  loadingText: {
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.md,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyMedium,
  },
  emptyText: {
    color: Colors.onSurface,
    fontSize: FontSize.titleSm,
    fontFamily: FontFamily.headline,
    fontWeight: '700',
    marginTop: Spacing.base,
  },
  emptySubtext: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    fontSize: FontSize.subheading,
    color: Colors.onSurface,
  },
  headerAction: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.auctionGreen,
    textDecorationLine: 'underline',
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 100,
  },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.slate100,
    height: 128,
    ...Shadows.sm,
  },
  cardImage: {
    width: 112,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceContainerLow,
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.white,
  },
  liveText: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },

  // Card Body
  cardBody: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: FontSize.body,
    color: Colors.onSurface,
    flex: 1,
  },
  timer: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.onSurfaceVariant,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 10,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
  price: {
    color: Colors.auctionGreen,
    fontSize: FontSize.body,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
  },
  bidButton: {
    backgroundColor: Colors.auctionGreen,
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    ...Shadows.colored(Colors.auctionGreen),
  },
  bidButtonText: {
    color: Colors.white,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  bidCount: {
    fontSize: 10,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
});
