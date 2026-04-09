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
import { AuctionStatus } from '@endemigo/shared';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { styles } from './auctions.styles';

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
    [AuctionStatus.DRAFT]: { label: t('auctions.waiting'), color: Colors.accent, bg: `${Colors.accent}1A` },
    [AuctionStatus.PUBLISHED]: { label: t('auctions.waiting'), color: Colors.accent, bg: `${Colors.accent}1A` },
    [AuctionStatus.ACTIVE]: { label: t('auctions.live'), color: Colors.error, bg: `${Colors.error}1A` },
    [AuctionStatus.ENDED]: { label: t('auctions.ended'), color: Colors.slate500, bg: Colors.slate100 },
    [AuctionStatus.COMPLETED]: { label: t('auctions.ended'), color: Colors.slate500, bg: Colors.slate100 },
    [AuctionStatus.CANCELLED]: { label: t('auctions.ended'), color: Colors.slate500, bg: Colors.slate100 },
    [AuctionStatus.FAILED]: { label: t('auctions.ended'), color: Colors.slate500, bg: Colors.slate100 },
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
              onPress={() => router.push(`/auction/${item.id}` as never)}
              activeOpacity={0.7}
            >
              <View style={styles.cardImage}>
                <Image
                  source={{ uri: item.productImage || `https://placehold.co/100x100/F8F9FA/42b94b?text=${encodeURIComponent(t('tabs.auctions'))}` }}
                  style={styles.image}
                />
                {item.status === AuctionStatus.ACTIVE && (
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
