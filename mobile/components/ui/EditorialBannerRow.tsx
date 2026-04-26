import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { styles } from './EditorialBannerRow.styles';

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
