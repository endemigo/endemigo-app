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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);

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

  // Client-side filtering logic
  const filteredItems = useMemo(() => {
    const currentItems = activeTab === 'single' ? data?.items : eventsData;
    if (!currentItems) return [];

    return currentItems.filter((item: any) => {
      // 1. Text Search Filter
      const query = searchQuery.trim().toLowerCase();
      let matchesSearch = true;
      if (query) {
        if (activeTab === 'single') {
          matchesSearch = (item.productTitle || '').toLowerCase().includes(query);
        } else {
          matchesSearch =
            (item.title || '').toLowerCase().includes(query) ||
            (item.description || '').toLowerCase().includes(query);
        }
      }

      // 2. Category Filter
      let matchesCategory = true;
      if (selectedCategoryId) {
        matchesCategory = item.categoryId === selectedCategoryId;
      }

      // 3. Status Filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const nowMs = now;
        if (activeTab === 'single') {
          const endMs = new Date(item.endTime).getTime();
          const startMs = new Date(item.startTime).getTime();
          const isLive = item.status === AuctionStatus.ACTIVE && endMs > nowMs;
          const isUpcoming = (item.status === AuctionStatus.PUBLISHED || item.status === AuctionStatus.DRAFT) && startMs > nowMs;
          const isEnded = endMs <= nowMs || item.status === AuctionStatus.ENDED || item.status === AuctionStatus.COMPLETED;

          if (statusFilter === 'live') matchesStatus = isLive;
          else if (statusFilter === 'upcoming') matchesStatus = isUpcoming;
          else if (statusFilter === 'ended') matchesStatus = isEnded;
        } else {
          const eventEndMs = new Date(item.endTime).getTime();
          const eventStartMs = new Date(item.startTime).getTime();
          const isLive = item.status === 'ACTIVE' && eventEndMs > nowMs;
          const isUpcoming = (item.status === 'UPCOMING' || item.status === 'DRAFT') && eventStartMs > nowMs;
          const isEnded = eventEndMs <= nowMs || item.status === 'ENDED' || item.status === 'COMPLETED';

          if (statusFilter === 'live') matchesStatus = isLive;
          else if (statusFilter === 'upcoming') matchesStatus = isUpcoming;
          else if (statusFilter === 'ended') matchesStatus = isEnded;
        }
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [activeTab, data?.items, eventsData, searchQuery, selectedCategoryId, statusFilter, now]);

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
          {item.categoryName && (
            <View style={styles.eventCategoryBadge}>
              <Text style={styles.eventCategoryBadgeText}>{item.categoryName}</Text>
            </View>
          )}
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

      {/* Modern Search Input */}
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
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={16} color={Colors.slate400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs Selector */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'events' && styles.segmentButtonActive]}
          onPress={() => {
            setActiveTab('events');
            setSelectedCategoryId(null);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentButtonText, activeTab === 'events' && styles.segmentButtonTextActive]}>
            {t('auctions.eventsTab', { defaultValue: 'Canlı Salonlar' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'single' && styles.segmentButtonActive]}
          onPress={() => {
            setActiveTab('single');
            setSelectedCategoryId(null);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentButtonText, activeTab === 'single' && styles.segmentButtonTextActive]}>
            {t('auctions.singleTab', { defaultValue: 'Tekli Müzayedeler' })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dropdown Filter Selector */}
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

        <TouchableOpacity
          style={styles.dropdownSelector}
          onPress={() => setIsStatusModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text 
            style={[
              styles.dropdownSelectorText,
              statusFilter !== 'all' ? styles.dropdownSelectorActiveText : null
            ]}
            numberOfLines={1}
          >
            {statusFilter === 'live' 
              ? t('auctions.live') 
              : statusFilter === 'upcoming' 
              ? t('auctions.waiting') 
              : statusFilter === 'ended' 
              ? t('auctions.ended') 
              : t('auction.filterStatus')}
          </Text>
          <Ionicons 
            name="chevron-down" 
            size={16} 
            color={statusFilter !== 'all' ? Colors.primary : Colors.slate400} 
          />
        </TouchableOpacity>
      </View>

      {isCurrentLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.auctionGreen} />
          <Text style={styles.loadingText}>{t('auctions.loading')}</Text>
        </View>
      ) : !filteredItems?.length ? (
        <View style={styles.center}>
          <Ionicons name="hammer-outline" size={64} color={Colors.slate300} />
          <Text style={styles.emptyText}>
            {activeTab === 'single' ? t('auctions.empty') : t('auctions.eventEmpty', { defaultValue: 'Aktif etkinlik bulunmuyor' })}
          </Text>
          <Text style={styles.emptySubtext}>
            {t('auctions.eventEmptySub', { defaultValue: 'Aradığınız kriterlere uygun müzayede bulunamadı.' })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
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

      {/* Status Selection Modal */}
      <Modal
        visible={isStatusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('auction.selectStatusTitle')}</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton} 
                onPress={() => setIsStatusModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={Colors.slate500} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              {/* All Option */}
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  statusFilter === 'all' ? styles.modalItemActive : null
                ]}
                onPress={() => {
                  setStatusFilter('all');
                  setIsStatusModalVisible(false);
                }}
              >
                <Text 
                  style={[
                    styles.modalItemText,
                    statusFilter === 'all' ? styles.modalItemTextActive : null
                  ]}
                >
                  {t('common.all')}
                </Text>
                {statusFilter === 'all' && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>

              {/* Live Option */}
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  statusFilter === 'live' ? styles.modalItemActive : null
                ]}
                onPress={() => {
                  setStatusFilter('live');
                  setIsStatusModalVisible(false);
                }}
              >
                <Text 
                  style={[
                    styles.modalItemText,
                    statusFilter === 'live' ? styles.modalItemTextActive : null
                  ]}
                >
                  {t('auctions.live')}
                </Text>
                {statusFilter === 'live' && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>

              {/* Upcoming Option */}
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  statusFilter === 'upcoming' ? styles.modalItemActive : null
                ]}
                onPress={() => {
                  setStatusFilter('upcoming');
                  setIsStatusModalVisible(false);
                }}
              >
                <Text 
                  style={[
                    styles.modalItemText,
                    statusFilter === 'upcoming' ? styles.modalItemTextActive : null
                  ]}
                >
                  {t('auctions.waiting')}
                </Text>
                {statusFilter === 'upcoming' && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>

              {/* Ended Option */}
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  statusFilter === 'ended' ? styles.modalItemActive : null
                ]}
                onPress={() => {
                  setStatusFilter('ended');
                  setIsStatusModalVisible(false);
                }}
              >
                <Text 
                  style={[
                    styles.modalItemText,
                    statusFilter === 'ended' ? styles.modalItemTextActive : null
                  ]}
                >
                  {t('auctions.ended')}
                </Text>
                {statusFilter === 'ended' && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
