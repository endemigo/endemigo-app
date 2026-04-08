import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '../../constants/theme';

interface Props {
  title: string;
  accentColor?: string;
  seeAllLabel?: string;
  onSeeAll?: () => void;
  style?: object;
}

/**
 * SectionHeader — başlık + aksent çubuk + "Tümünü Gör" linki.
 * Ana sayfa, kategoriler, müzayedeler ekranlarında tekrar kullanılır.
 */
export function SectionHeader({ title, accentColor, seeAllLabel, onSeeAll, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleRow}>
        <View style={[styles.accentBar, accentColor ? { backgroundColor: accentColor } : null]} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {seeAllLabel && onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.seeAll}>{seeAllLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  accentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  title: {
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    fontSize: FontSize.subheading,
    color: Colors.onSurface,
  },
  seeAll: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.primary,
  },
});
