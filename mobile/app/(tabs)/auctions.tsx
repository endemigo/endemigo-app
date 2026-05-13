import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDefaultMobileExperienceConfig } from '@endemigo/shared';
import { useAuctions } from '../../hooks/useAuctions';
import { useMobileConfig } from '../../hooks/useMobileConfig';
import type { Auction } from '../../hooks/useAuctions';
import { AuctionStatus } from '@endemigo/shared';
import { Colors } from '../../constants/theme';
import { storage } from '../../lib/storage';
import { useAuthStore } from '../../store/authStore';
import { useRoleModeStore } from '../../store/roleModeStore';
import { styles } from '../../styles/tabs/auctions.styles';
import {
  getAudienceScopedAuctionCardConfig,
  resolveLocalizedText,
  resolveMobileAudience,
} from '../../utils/mobileConfig';
import { formatCurrency } from '../../utils/transactionFormatters';
import { HomeQuickTabBar } from '../../components/ui';

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
  const { t, i18n } = useTranslation();
  const { data, isLoading, refetch, isRefetching } = useAuctions(1);
  const { data: mobileConfigData } = useMobileConfig();
  const user = useAuthStore((state) => state.user);
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const [now, setNow] = useState(Date.now());
  const mobileConfig = mobileConfigData ?? getDefaultMobileExperienceConfig();
  const locale = i18n.language.startsWith('en') ? 'en' : 'tr';
  const audience = resolveMobileAudience(user, activeMode);
  const auctionCardConfig = getAudienceScopedAuctionCardConfig(
    mobileConfig.auctions.listCard,
    audience,
  );

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

  useEffect(() => {
    const launchImages = data?.items
      ?.map((item: Auction) => item.productImage)
      .filter((value: string): value is string => typeof value === 'string' && value.trim().length > 0);

    if (!launchImages?.length) {
      return;
    }

    storage.setLaunchSplashImages(launchImages).catch(() => {});
  }, [data?.items]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator size="large" color={Colors.auctionGreen} />
        <Text style={styles.loadingText}>{t('auctions.loading')}</Text>
        <HomeQuickTabBar activeTab="auctions" />
      </SafeAreaView>
    );
  }

  if (!data?.items?.length) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <Ionicons name="hammer-outline" size={64} color={Colors.slate300} />
        <Text style={styles.emptyText}>{t('auctions.empty')}</Text>
        <Text style={styles.emptySubtext}>{t('auctions.emptySub')}</Text>
        <HomeQuickTabBar activeTab="auctions" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('auctions.title')}</Text>
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
          const hasEndedByTime = timeLeft <= 0;
          const canBid = item.status === AuctionStatus.ACTIVE && !hasEndedByTime;
          const st = hasEndedByTime
            ? statusConfig[AuctionStatus.ENDED]
            : statusConfig[item.status as keyof typeof statusConfig];

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
                {canBid && auctionCardConfig.liveBadgeLabel && (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>
                      {resolveLocalizedText(auctionCardConfig.liveBadgeLabel, locale, t('auctions.live'))}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.productTitle}
                  </Text>
                </View>
                {auctionCardConfig.showTimer ? (
                  <Text style={styles.timer}>
                    {t('auctions.endTime', { time: formatTimeLeft(timeLeft, t) })}
                  </Text>
                ) : null}
                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceLabel}>{t('auctions.highestBid')}</Text>
                    <Text style={styles.price}>
                      {formatCurrency(item.currentPrice)}
                    </Text>
                  </View>
                  {canBid ? (
                    <TouchableOpacity style={styles.bidButton} activeOpacity={0.8}>
                      <Text style={styles.bidButtonText}>
                        {resolveLocalizedText(auctionCardConfig.ctaLabel, locale, t('auctions.bid'))}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {(auctionCardConfig.showStatusBadge || auctionCardConfig.showBidCount) ? (
                  <View style={styles.metaRow}>
                    {auctionCardConfig.showStatusBadge ? (
                      <View style={[styles.statusBadge, { backgroundColor: st?.bg }]}>
                        <Text style={[styles.statusText, { color: st?.color }]}>{st?.label}</Text>
                      </View>
                    ) : <View />}
                    {auctionCardConfig.showBidCount ? (
                      <Text style={styles.bidCount}>{t('auctions.bidCount', { count: item.bidCount })}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <HomeQuickTabBar activeTab="auctions" />
    </SafeAreaView>
  );
}
