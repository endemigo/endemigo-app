import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '../../constants/theme';
import { styles } from './SectionHeader.styles';

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
