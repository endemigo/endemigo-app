import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7; // Shows about 1.2 cards on screen to indicate horizontal scroll

interface Props {
  item: any;
  onPress: () => void;
}

export function BlogCard({ item, onPress }: Props) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{item.category}</Text>
          <View style={styles.dot} />
          <Text style={styles.metaText}>{item.readTime}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.excerpt} numberOfLines={2}>
          {item.excerpt}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.readMore}>{t('home.readMore')}</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  image: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.slate200,
  },
  content: {
    padding: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  category: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.caption,
    color: Colors.accent,
    textTransform: 'uppercase',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.slate300,
    marginHorizontal: Spacing.sm,
  },
  metaText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: Colors.slate500,
  },
  title: {
    fontFamily: FontFamily.headline,
    fontWeight: '700',
    fontSize: FontSize.bodyLg,
    color: Colors.onSurface,
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },
  excerpt: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  readMore: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.body,
    color: Colors.primary,
  },
});
