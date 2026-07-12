import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, FlatList, Linking, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBanner } from '../../hooks/useBanners';
import { useModalStore } from '../../store/modalStore';
import { styles, CARD_WIDTH } from './DynamicBannerWidget.styles';
import { resolveLocalizedText, resolveMediaUrl } from '../../utils/mobileConfig';
import type { BannerItem } from '@endemigo/shared';

interface Props {
  bannerId: string;
  title?: string;
}

export function DynamicBannerWidget({ bannerId, title }: Props) {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { data: banner, isLoading } = useBanner(bannerId);
  const showModal = useModalStore((state) => state.showModal);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const locale = i18n.language.startsWith('en') ? 'en' : 'tr';

  // Autoscroll timer for multiple slides
  useEffect(() => {
    if (!banner || banner.items.length <= 1) return;
    const interval = banner.slideDuration || 3000;
    
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % banner.items.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [banner]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
    setActiveIndex(idx);
  };

  if (isLoading) {
    // Return loading placeholder matched to default ratio (16:9)
    return (
      <View style={styles.wrapper}>
        <View style={[styles.loadingContainer, { aspectRatio: 16 / 9 }]}>
          <ActivityIndicator color="#0066cc" />
        </View>
      </View>
    );
  }

  if (!banner || banner.items.length === 0) {
    return null;
  }

  // Parse aspect ratio
  const [w, h] = banner.aspectRatio.split(':').map(Number);
  const aspectRatio = w / h;

  // Handles actual routing when clicked or after confirmation
  const executeAction = (item: BannerItem) => {
    const { actionType, actionValue } = item;

    switch (actionType) {
      case 'CATEGORY':
        router.push({
          pathname: '/(tabs)/categories/[id]',
          params: { id: actionValue },
        } as any);
        break;
      case 'PRODUCT':
        router.push(`/product/${actionValue}` as any);
        break;
      case 'PRODUCTS':
        // Navigate to buy-now with a comma-separated list of product IDs
        router.push({
          pathname: '/buy-now',
          params: { productIds: actionValue },
        } as any);
        break;
      case 'EXTERNAL_URL':
        Linking.openURL(actionValue).catch(() => {});
        break;
      case 'CAMPAIGNS':
        router.push('/(tabs)/seller-campaigns' as any);
        break;
      case 'AUCTIONS':
        if (actionValue && actionValue !== '/') {
          router.push(`/auction/event/${actionValue}` as any);
        } else {
          router.push('/(tabs)/auctions' as any);
        }
        break;
      case 'SEARCH':
        router.push({
          pathname: '/(tabs)/explore',
          params: { search: actionValue },
        } as any);
        break;
      case 'CUSTOM_ROUTE':
        router.push(actionValue as any);
        break;
      default:
        break;
    }
  };

  // Triggers click and handles modal popup if requireConfirmation is true
  const handleItemPress = (item: BannerItem) => {
    if (item.requireConfirmation && item.confirmationText) {
      const msg = resolveLocalizedText(item.confirmationText, locale, '');
      const modalTitle = resolveLocalizedText(item.title, locale, 'Bilgilendirme');
      const confirmText = resolveLocalizedText(item.confirmationButtonText, locale, 'Devam Et');

      showModal({
        title: modalTitle,
        message: msg,
        type: 'info',
        confirmText,
        cancelText: locale === 'tr' ? 'İptal' : 'Cancel',
        onConfirm: () => executeAction(item),
      });
    } else {
      executeAction(item);
    }
  };

  return (
    <View style={styles.wrapper}>
      {title ? (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      ) : null}

      <View style={[styles.carouselContainer, { aspectRatio }]}>
        <FlatList
          ref={flatListRef}
          data={banner.items}
          keyExtractor={(item) => item.id}
          horizontal
          style={styles.flatList}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 12}
          snapToAlignment="start"
          decelerationRate="fast"
          onMomentumScrollEnd={onScrollEnd}
          getItemLayout={(_, index) => ({
            length: CARD_WIDTH + 12,
            offset: (CARD_WIDTH + 12) * index,
            index,
          })}
          renderItem={({ item }) => {
            const slideTitle = resolveLocalizedText(item.title, locale, '');
            const slideSubtitle = resolveLocalizedText(item.subtitle, locale, '');

            return (
              <TouchableOpacity
                style={[styles.slideTouch, { width: CARD_WIDTH, aspectRatio }]}
                activeOpacity={0.9}
                onPress={() => handleItemPress(item)}
              >
                <Image
                  source={{ uri: resolveMediaUrl(item.imageUrl) }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
                
                {/* Overlay with Title & Subtitle if present */}
                {(slideTitle || slideSubtitle) ? (
                  <View style={styles.textOverlay}>
                    {slideTitle ? <Text style={styles.titleText}>{slideTitle}</Text> : null}
                    {slideSubtitle ? <Text style={styles.subtitleText}>{slideSubtitle}</Text> : null}
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Slide Dot Indicators */}
      {banner.items.length > 1 && (
        <View style={styles.dotsRow}>
          {banner.items.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}
