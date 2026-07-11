import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDefaultMobileExperienceConfig } from '@endemigo/shared';
import { useAuctions, useInfiniteAuctionEvents } from '../../hooks/useAuctions';
import { useCategories } from '../../hooks/useProducts';
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
import { getEventLifeStatus, formatStartsIn, type EventLifeStatus } from '../../utils/auctionEventStatus';
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

const SingleAuctionCard = React.memo(({
  item,
  now,
  statusConfig,
  auctionCardConfig,
  locale,
  t,
  onPress,
}: {
  item: Auction;
  now: number;
  statusConfig: any;
  auctionCardConfig: any;
  locale: any;
  t: any;
  onPress: (id: string) => void;
}) => {
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
      onPress={() => onPress(item.id)}
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
              : item.isUntimed && !hasEndedByTime
                ? t('auctions.untimed', { defaultValue: 'Süresiz' })
                : t('auctions.endTime', { time: formatTimeLeft(timeLeft, t) })}
          </Text>
        ) : null}
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>{t('auctions.highestBid')}</Text>
            <Text style={styles.price}>
              {formatCurrency(item.currentPrice, item.currency)}
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
});

// Canlı salon: büyük hero kart + tek CTA.
const LiveEventHero = React.memo(({
  item,
  t,
  onPress,
}: {
  item: AuctionEvent;
  t: any;
  onPress: (id: string) => void;
}) => (
  <TouchableOpacity style={styles.heroCard} onPress={() => onPress(item.id)} activeOpacity={0.85}>
    <View style={styles.heroCover}>
      <Image
        source={{ uri: item.coverImageUrl || `https://placehold.co/600x300/F8F9FA/0097D8?text=${encodeURIComponent(item.title)}` }}
        style={styles.image}
      />
      <View style={styles.heroLiveBadge}>
        <View style={styles.heroLiveDot} />
        <Text style={styles.heroLiveText}>{t('auctions.live').toLocaleUpperCase('tr-TR')}</Text>
      </View>
    </View>
    <View style={styles.heroInfo}>
      <Text style={styles.heroTitle} numberOfLines={1}>{item.title}</Text>
      <View style={styles.heroMetaRow}>
        {item.lotCount !== undefined && (
          <Text style={styles.heroMetaText}>
            <Ionicons name="hammer-outline" size={13} color={Colors.slate500} />
            {' '}{t('auctions.eventCount', { count: item.lotCount, defaultValue: `${item.lotCount} Lot` })}
          </Text>
        )}
        <Text style={styles.heroMetaText}>
          <Ionicons name="radio-outline" size={13} color={Colors.slate500} />
          {' '}{t('auctions.liveNow', { defaultValue: 'Şu an yayında' })}
        </Text>
      </View>
      <View style={styles.heroCta}>
        <Text style={styles.heroCtaText}>{t('auctions.enterRoom', { defaultValue: 'Salona Gir' })}</Text>
      </View>
    </View>
  </TouchableOpacity>
));

// Yaklaşan: kompakt satır kartı — ekrana 4-5 tanesi sığar.
const UpcomingEventRow = React.memo(({
  item,
  now,
  locale,
  t,
  onPress,
}: {
  item: AuctionEvent;
  now: number;
  locale: string;
  t: any;
  onPress: (id: string) => void;
}) => (
  <TouchableOpacity style={styles.compactCard} onPress={() => onPress(item.id)} activeOpacity={0.75}>
    <Image
      source={{ uri: item.coverImageUrl || `https://placehold.co/144x112/F8F9FA/0097D8?text=%20` }}
      style={styles.compactThumb}
    />
    <View style={styles.compactBody}>
      <Text style={styles.compactTitle} numberOfLines={1}>{item.title}</Text>
      <View style={styles.compactMetaRow}>
        <Text style={styles.compactCountdown}>
          <Ionicons name="time-outline" size={12} color={Colors.primary} />
          {' '}{formatStartsIn(new Date(item.startTime).getTime(), now, locale, t)}
        </Text>
        {item.lotCount !== undefined && (
          <Text style={styles.compactMetaText}>
            {t('auctions.lotCountShort', { defaultValue: `${item.lotCount} lot`, count: item.lotCount })}
          </Text>
        )}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={18} color={Colors.slate300} />
  </TouchableOpacity>
));

// Geçmiş: sönük tek satır — yer kaplamaz, sonuçlara götürür.
const PastEventRow = React.memo(({
  item,
  t,
  onPress,
}: {
  item: AuctionEvent;
  t: any;
  onPress: (id: string) => void;
}) => (
  <TouchableOpacity style={styles.pastRow} onPress={() => onPress(item.id)} activeOpacity={0.7}>
    <Text style={styles.pastTitle} numberOfLines={1}>{item.title}</Text>
    <Text style={styles.pastMeta}>
      {item.lotCount !== undefined
        ? t('auctions.pastMeta', { defaultValue: `${item.lotCount} lot · Sonuçlar`, count: item.lotCount })
        : t('auctions.results', { defaultValue: 'Sonuçlar' })}
    </Text>
  </TouchableOpacity>
));

export default function AuctionsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const showModal = useModalStore((state) => state.showModal);
  
  // Tek chip satırı hem sekmeyi hem durumu yönetir: Tümü/Canlı/Yaklaşan/Bitti
  // etkinlikleri filtreler, Tekli ayrı listeye geçer.
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'ended' | 'single'>('all');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  const activeTab: 'single' | 'events' = filter === 'single' ? 'single' : 'events';

  // Data fetching hooks
  const { data: categoriesData, isLoading: isCategoriesLoading } = useCategories();
  const { data, isLoading, refetch } = useAuctions(1);
  const {
    data: eventsInfiniteData,
    isLoading: isEventsLoading,
    refetch: refetchEvents,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteAuctionEvents();

  const eventsData = useMemo(() => {
    const items = eventsInfiniteData?.pages.flatMap((page) => page.items) ?? [];
    return items.filter((item: AuctionEvent) => item.status !== 'APPLICATION');
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

  // Tekli müzayedeler: arama + kategori filtresi (ürün kategorisi gerçek).
  const filteredSingles = useMemo(() => {
    if (activeTab !== 'single' || !data?.items) return [];
    const query = searchQuery.trim().toLowerCase();
    return data.items.filter((item: Auction) => {
      if (query && !(item.productTitle || '').toLowerCase().includes(query)) return false;
      if (selectedCategoryId && item.categoryId !== selectedCategoryId) return false;
      return true;
    });
  }, [activeTab, data?.items, searchQuery, selectedCategoryId]);

  // Etkinlikler: durum tek yardımcıdan hesaplanır, bölümlere ayrılır.
  // Canlı üstte hero, yaklaşanlar tarihe göre artan, geçmiş en altta sönük.
  type EventRow =
    | { key: string; kind: 'section'; title: string }
    | { key: string; kind: EventLifeStatus; item: AuctionEvent };

  const eventRows = useMemo<EventRow[]>(() => {
    if (activeTab !== 'events' || !eventsData) return [];
    const query = searchQuery.trim().toLowerCase();

    const matching = eventsData.filter((item: AuctionEvent) => {
      if (!query) return true;
      return (
        (item.title || '').toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query)
      );
    });

    const live: AuctionEvent[] = [];
    const upcoming: AuctionEvent[] = [];
    const ended: AuctionEvent[] = [];
    for (const item of matching) {
      const status = getEventLifeStatus(item, now);
      if (status === 'live') live.push(item);
      else if (status === 'upcoming') upcoming.push(item);
      else ended.push(item);
    }
    upcoming.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    ended.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

    const rows: EventRow[] = [];
    if (filter === 'all' || filter === 'live') {
      for (const item of live) rows.push({ key: `live-${item.id}`, kind: 'live', item });
    }
    if (filter === 'all' || filter === 'upcoming') {
      if (upcoming.length > 0) {
        rows.push({
          key: 'section-upcoming',
          kind: 'section',
          title: t('auctions.sectionUpcoming', { defaultValue: 'YAKLAŞAN' }),
        });
        for (const item of upcoming) rows.push({ key: `up-${item.id}`, kind: 'upcoming', item });
      }
    }
    if (filter === 'all' || filter === 'ended') {
      if (ended.length > 0) {
        rows.push({
          key: 'section-past',
          kind: 'section',
          title: t('auctions.sectionPast', { defaultValue: 'GEÇMİŞ' }),
        });
        for (const item of ended) rows.push({ key: `past-${item.id}`, kind: 'ended', item });
      }
    }
    return rows;
  }, [activeTab, eventsData, searchQuery, filter, now, t]);

  const handleSingleAuctionPress = React.useCallback((id: string) => {
    router.push(`/auction/${id}` as never);
  }, [router]);

  const handleAuctionEventPress = React.useCallback((id: string) => {
    router.push(`/auction/event/${id}` as never);
  }, [router]);

  const renderSingleAuction = React.useCallback(({ item }: { item: Auction }) => (
    <SingleAuctionCard
      item={item}
      now={now}
      statusConfig={statusConfig}
      auctionCardConfig={auctionCardConfig}
      locale={locale}
      t={t}
      onPress={handleSingleAuctionPress}
    />
  ), [now, statusConfig, auctionCardConfig, locale, t, handleSingleAuctionPress]);

  const renderEventRow = React.useCallback(({ item: row }: { item: EventRow }) => {
    if (row.kind === 'section') {
      return <Text style={styles.sectionLabel}>{row.title}</Text>;
    }
    if (row.kind === 'live') {
      return <LiveEventHero item={row.item} t={t} onPress={handleAuctionEventPress} />;
    }
    if (row.kind === 'upcoming') {
      return (
        <UpcomingEventRow
          item={row.item}
          now={now}
          locale={locale}
          t={t}
          onPress={handleAuctionEventPress}
        />
      );
    }
    return <PastEventRow item={row.item} t={t} onPress={handleAuctionEventPress} />;
  }, [now, locale, t, handleAuctionEventPress]);

  const isCurrentLoading = activeTab === 'single' ? isLoading : isEventsLoading;
  const listIsEmpty = activeTab === 'single' ? filteredSingles.length === 0 : eventRows.length === 0;

  const filterChips: { key: typeof filter; label: string; dot?: boolean }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'live', label: t('auctions.live'), dot: true },
    { key: 'upcoming', label: t('auctions.waiting') },
    { key: 'ended', label: t('auctions.ended') },
    { key: 'single', label: t('auctions.singleTabShort', { defaultValue: 'Tekli' }) },
  ];

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
              onPress={() => {
                setSearchVisible((v) => {
                  if (v) setSearchQuery('');
                  return !v;
                });
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.search')}
            >
              <Ionicons
                name={searchVisible ? 'close-outline' : 'search-outline'}
                size={19}
                color={Colors.primary}
              />
            </TouchableOpacity>
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

      {/* Arama: başlıktaki ikonla açılır — kalıcı yer kaplamaz */}
      {searchVisible && (
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={Colors.slate400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('common.search')}
            placeholderTextColor={Colors.slate400}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={16} color={Colors.slate400} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tek chip satırı: durum + tekli/salon geçişi bir arada */}
      <View style={styles.chipRow}>
        {filterChips.map((chip) => {
          const isActive = filter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.statusChip, isActive && styles.statusChipActive]}
              onPress={() => {
                setFilter(chip.key);
                if (chip.key !== 'single') setSelectedCategoryId(null);
              }}
              activeOpacity={0.8}
            >
              {chip.dot && (
                <View style={[styles.statusDot, { backgroundColor: Colors.error }]} />
              )}
              <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Kategori: sadece tekli listede anlamlı (ürün kategorisi) */}
      {activeTab === 'single' && (
        <View style={styles.dropdownsRow}>
          <TouchableOpacity
            style={styles.dropdownSelector}
            onPress={() => setIsCategoryModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dropdownSelectorText,
                selectedCategoryId ? styles.dropdownSelectorActiveText : null
              ]}
              numberOfLines={1}
            >
              {selectedCategoryId
                ? categoriesData?.find(c => c.id === selectedCategoryId)?.name
                : t('auction.filterCategory')}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={selectedCategoryId ? Colors.primary : Colors.slate400}
            />
          </TouchableOpacity>
        </View>
      )}

      {isCurrentLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.auctionGreen} />
          <Text style={styles.loadingText}>{t('auctions.loading')}</Text>
        </View>
      ) : listIsEmpty ? (
        <View style={styles.center}>
          <Ionicons name="hammer-outline" size={64} color={Colors.slate300} />
          <Text style={styles.emptyText}>
            {activeTab === 'single' ? t('auctions.empty') : t('auctions.eventEmpty', { defaultValue: 'Aktif etkinlik bulunmuyor' })}
          </Text>
          <Text style={styles.emptySubtext}>
            {t('auctions.eventEmptySub', { defaultValue: 'Aradığınız kriterlere uygun müzayede bulunamadı.' })}
          </Text>
        </View>
      ) : activeTab === 'single' ? (
        <FlatList
          data={filteredSingles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={manualRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.auctionGreen}
            />
          }
          renderItem={renderSingleAuction}
        />
      ) : (
        <FlatList
          data={eventRows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={styles.eventListContent}
          initialNumToRender={8}
          maxToRenderPerBatch={12}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={manualRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.auctionGreen}
            />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator size="small" color={Colors.auctionGreen} style={{ paddingVertical: Spacing.md }} />
            ) : null
          }
          renderItem={renderEventRow}
        />
      )}

      {/* Category Selection Modal */}
      <Modal
        visible={isCategoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('auction.selectCategoryTitle')}</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton} 
                onPress={() => setIsCategoryModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={Colors.slate500} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  !selectedCategoryId ? styles.modalItemActive : null
                ]}
                onPress={() => {
                  setSelectedCategoryId(null);
                  setIsCategoryModalVisible(false);
                }}
              >
                <Text 
                  style={[
                    styles.modalItemText,
                    !selectedCategoryId ? styles.modalItemTextActive : null
                  ]}
                >
                  {t('common.all')}
                </Text>
                {!selectedCategoryId && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>
              {categoriesData?.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.modalItem,
                    selectedCategoryId === cat.id ? styles.modalItemActive : null
                  ]}
                  onPress={() => {
                    setSelectedCategoryId(cat.id);
                    setIsCategoryModalVisible(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.modalItemText,
                      selectedCategoryId === cat.id ? styles.modalItemTextActive : null
                    ]}
                  >
                    {cat.name}
                  </Text>
                  {selectedCategoryId === cat.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}
