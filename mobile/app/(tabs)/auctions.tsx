import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDefaultMobileExperienceConfig } from '@endemigo/shared';
import { useAuctions, useInfiniteAuctionEvents } from '../../hooks/useAuctions';
import { useAuctionsSocket } from '../../hooks/useAuctionsSocket';
import { useMobileConfig } from '../../hooks/useMobileConfig';
import type { Auction, AuctionEvent } from '../../hooks/useAuctions';
import { AuctionStatus } from '@endemigo/shared';
import { Colors, Spacing } from '../../constants/theme';
import { storage } from '../../lib/storage';
import { useAuthStore } from '../../store/authStore';
import { useRoleModeStore } from '../../store/roleModeStore';
import { useModalStore } from '../../store/modalStore';
import { styles } from '../../styles/tabs/auctions.styles';
import {
  getAudienceScopedAuctionCardConfig,
  resolveLocalizedText,
  resolveMobileAudience,
} from '../../utils/mobileConfig';
import { formatCurrency } from '../../utils/transactionFormatters';


function formatTimeLeft(ms: number, t: (k: string) => string) {
  if (ms <= 0) return t('auctions.ended');
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function getReserveBadgeConfig(
  reservePrice: number | null | undefined,
  reserveMet: boolean | null | undefined,
  t: (key: string) => string,
) {
  if (reservePrice === null || reservePrice === undefined) {
    return null;
  }

  return reserveMet
    ? {
        label: `${t('auctions.reserve')}: ${t('auction.reserveMet')}`,
        backgroundColor: Colors.secondaryContainer,
        textColor: Colors.onSecondaryContainer,
      }
    : {
        label: `${t('auctions.reserve')}: ${t('auction.reserveNotMet')}`,
        backgroundColor: Colors.errorContainer,
        textColor: Colors.onErrorContainer,
      };
}

export default function AuctionsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const showModal = useModalStore((state) => state.showModal);
  const [activeTab, setActiveTab] = useState<'single' | 'events'>('events');
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const { data, isLoading, refetch } = useAuctions(1);
  const {
    data: eventsInfiniteData,
    isLoading: isEventsLoading,
    refetch: refetchEvents,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteAuctionEvents();

  const eventsData = React.useMemo(() => {
    return eventsInfiniteData?.pages.flatMap((page) => page.items) ?? [];
  }, [eventsInfiniteData]);

  useAuctionsSocket(data?.items);

  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      if (activeTab === 'single') {
        await refetch();
      } else {
        await refetchEvents();
      }
    } finally {
      setManualRefreshing(false);
    }
  };

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

  const eventStatusConfig = {
    DRAFT: { label: t('auctions.waiting'), color: Colors.accent, bg: `${Colors.accent}1A` },
    APPLICATION: { label: t('auctions.waiting'), color: Colors.accent, bg: `${Colors.accent}1A` },
    UPCOMING: { label: t('auctions.waiting'), color: Colors.accent, bg: `${Colors.accent}1A` },
    ACTIVE: { label: t('auctions.live'), color: Colors.error, bg: `${Colors.error}1A` },
    ENDED: { label: t('auctions.ended'), color: Colors.slate500, bg: Colors.slate100 },
    COMPLETED: { label: t('auctions.ended'), color: Colors.slate500, bg: Colors.slate100 },
    CANCELLED: { label: t('auctions.ended'), color: Colors.slate500, bg: Colors.slate100 },
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

  const renderSingleAuction = ({ item }: { item: Auction }) => {
    const endMs = new Date(item.endTime).getTime();
    const startMs = new Date(item.startTime).getTime();
    const startLeft = Math.max(0, startMs - now);
    const isUpcoming =
      (item.status === AuctionStatus.PUBLISHED ||
        item.status === AuctionStatus.DRAFT) &&
      startLeft > 0;

    const timeLeft = Math.max(0, endMs - now);
    const hasEndedByTime = timeLeft <= 0;
    const canBid = item.status === AuctionStatus.ACTIVE && !hasEndedByTime;
    const st = hasEndedByTime
      ? statusConfig[AuctionStatus.ENDED]
      : statusConfig[item.status as keyof typeof statusConfig];
    const reserveBadge = getReserveBadgeConfig(
      item.reservePrice,
      item.reserveMet,
      t,
    );

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
              {isUpcoming
                ? t('auctions.startTime', { time: formatTimeLeft(startLeft, t) })
                : t('auctions.endTime', { time: formatTimeLeft(timeLeft, t) })}
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
              {reserveBadge ? (
                <View
                  style={[
                    styles.reserveBadge,
                    { backgroundColor: reserveBadge.backgroundColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.reserveBadgeText,
                      { color: reserveBadge.textColor },
                    ]}
                    numberOfLines={1}
                  >
                    {reserveBadge.label}
                  </Text>
                </View>
              ) : null}
              {auctionCardConfig.showBidCount ? (
                <Text style={styles.bidCount}>{t('auctions.bidCount', { count: item.bidCount })}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderAuctionEvent = ({ item }: { item: AuctionEvent }) => {
    const eventEndMs = new Date(item.endTime).getTime();
    const hasEventEnded = eventEndMs <= now || item.status === 'ENDED' || item.status === 'COMPLETED';
    const est = hasEventEnded
      ? eventStatusConfig.ENDED
      : (eventStatusConfig[item.status as keyof typeof eventStatusConfig] || eventStatusConfig.DRAFT);
    const isLive = item.status === 'ACTIVE' && !hasEventEnded;

    const formattedDate = new Date(item.startTime).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => router.push(`/auction/event/${item.id}` as never)}
        activeOpacity={0.8}
      >
        <View style={styles.eventCover}>
          <Image
            source={{ uri: item.coverImageUrl || `https://placehold.co/600x300/F8F9FA/0097D8?text=${encodeURIComponent(item.title)}` }}
            style={styles.image}
          />
          <View style={[styles.eventBadge, { backgroundColor: est.bg }]}>
            <Text style={[styles.eventBadgeText, { color: est.color }]}>{est.label}</Text>
          </View>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.eventDescription} numberOfLines={2}>
            {item.description || t('auction.storyFallback')}
          </Text>
          <View style={styles.eventMetaRow}>
            <Text style={styles.eventMetaText}>
              <Ionicons name="calendar-outline" size={14} color={Colors.slate400} />
              {formattedDate}
            </Text>
            {item.lotCount !== undefined && (
              <Text style={styles.eventMetaText}>
                <Ionicons name="list-outline" size={14} color={Colors.slate400} />
                {t('auctions.eventCount', { count: item.lotCount, defaultValue: `${item.lotCount} Ürün` })}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const isCurrentLoading = activeTab === 'single' ? isLoading : isEventsLoading;
  const currentItems = activeTab === 'single' ? data?.items : eventsData;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.base }]}>
        <View style={styles.headerTopRow}>
          <Image
            source={require('../../assets/images/endemigo-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityRole="button"
              accessibilityLabel={t('tabs.profile')}
            >
              <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              activeOpacity={0.85}
              onPress={() => {
                if (!isLoggedIn) {
                  showModal({
                    title: t('common.authRequiredTitle'),
                    message: t('notifications.authRequiredMessage'),
                    type: 'info',
                    confirmText: t('auth.login'),
                    cancelText: t('common.cancel'),
                    onConfirm: () => {
                      router.push('/(auth)/login');
                    }
                  });
                  return;
                }
                router.push('/(tabs)/notifications');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('tabs.notifications')}
            >
              <Ionicons name="notifications-outline" size={19} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerTitle}>{t('auctions.title')}</Text>
      </View>

      {/* Tabs Selector hidden for now
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'single' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('single')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentButtonText, activeTab === 'single' && styles.segmentButtonTextActive]}>
            {t('auctions.singleTab', { defaultValue: 'Tekli Müzayedeler' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'events' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('events')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentButtonText, activeTab === 'events' && styles.segmentButtonTextActive]}>
            {t('auctions.eventsTab', { defaultValue: 'Canlı Salonlar' })}
          </Text>
        </TouchableOpacity>
      </View>
      */}

      {isCurrentLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.auctionGreen} />
          <Text style={styles.loadingText}>{t('auctions.loading')}</Text>
        </View>
      ) : !currentItems?.length ? (
        <View style={styles.center}>
          <Ionicons name="hammer-outline" size={64} color={Colors.slate300} />
          <Text style={styles.emptyText}>
            {activeTab === 'single' ? t('auctions.empty') : t('auctions.eventEmpty', { defaultValue: 'Aktif etkinlik bulunmuyor' })}
          </Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'single' ? t('auctions.emptySub') : t('auctions.eventEmptySub', { defaultValue: 'Yeni müzayede salonları planlandığında burada görünecek' })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={manualRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.auctionGreen}
            />
          }
          onEndReached={() => {
            if (activeTab === 'events' && hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            activeTab === 'events' && isFetchingNextPage ? (
              <ActivityIndicator size="small" color={Colors.auctionGreen} style={{ paddingVertical: Spacing.md }} />
            ) : null
          }
          renderItem={activeTab === 'single' ? renderSingleAuction : renderAuctionEvent as any}
        />
      )}
    </View>
  );
}
