import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.8;

export interface EditorialBanner {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  cta: string;
  bg: string;
  accent: string;
  image: string;
}

interface Props {
  banners: EditorialBanner[];
  onPress?: (banner: EditorialBanner) => void;
}

/**
 * EditorialBannerRow — yatay kaydırmalı kampanya/editör banner satırı.
 * Ana sayfada iki ayrı satır olarak kullanılır (Editörün Seçimi, Kampanyalar).
 */
export function EditorialBannerRow({ banners, onPress }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      decelerationRate="fast"
      snapToInterval={CARD_WIDTH + Spacing.md}
      snapToAlignment="start"
    >
      {banners.map((banner) => (
        <TouchableOpacity
          key={banner.id}
          style={[styles.card, { backgroundColor: banner.bg }]}
          activeOpacity={0.88}
          onPress={() => onPress?.(banner)}
        >
          <Image source={{ uri: banner.image }} style={styles.bgImage} resizeMode="cover" />
          <View style={styles.content}>
            <View style={[styles.label, { backgroundColor: banner.accent }]}>
              <Text style={styles.labelText}>{banner.label}</Text>
            </View>
            <Text style={styles.title}>{banner.title}</Text>
            <Text style={styles.subtitle}>{banner.subtitle}</Text>
            <View style={styles.cta}>
              <Text style={styles.ctaText}>{banner.cta}</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.white} />
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingLeft: Spacing.base,
    paddingRight: Spacing.base,
    gap: Spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    ...Shadows.md,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  label: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xs,
  },
  labelText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: Colors.white,
    fontSize: FontSize.titleSm,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    lineHeight: 26,
  },
  subtitle: {
    color: `${Colors.white}BF`,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  ctaText: {
    color: Colors.white,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
