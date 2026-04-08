import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { styles } from './BannerCarousel.styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Spacing.base * 2;

export interface BannerSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  bg: string;
  image: string;
}

interface Props {
  slides: BannerSlide[];
  autoScrollInterval?: number;
  onSlidePress?: (slide: BannerSlide) => void;
}

/**
 * BannerCarousel — otomatik dönen, dokunulabilir, dot indikatörlü carousel.
 * Ana sayfa üstünde ve kampanya alanlarında kullanılır.
 */
export function BannerCarousel({ slides, autoScrollInterval = 3500, onSlidePress }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<FlatList>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % slides.length;
        ref.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, autoScrollInterval);
    return () => clearInterval(timer);
  }, [slides.length, autoScrollInterval]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + Spacing.base));
    setActiveIndex(idx);
  };

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={ref}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + Spacing.base}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ gap: Spacing.base }}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH + Spacing.base,
          offset: (CARD_WIDTH + Spacing.base) * index,
          index,
        })}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: item.bg }]}
            activeOpacity={onSlidePress ? 0.85 : 1}
            onPress={() => onSlidePress?.(item)}
          >
            <Image source={{ uri: item.image }} style={styles.bgImage} resizeMode="cover" />
            <View style={styles.overlay}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      {/* Dot indicators */}
      {slides.length > 1 && (
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}
