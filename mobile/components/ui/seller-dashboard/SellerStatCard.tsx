import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { styles } from './SellerStatCard.styles';

interface SellerStatCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'primary' | 'secondary' | 'accent' | 'neutral';
}

function getIconColor(tone: SellerStatCardProps['tone']) {
  if (tone === 'secondary') return Colors.secondary;
  if (tone === 'accent') return Colors.accent;
  if (tone === 'neutral') return Colors.slate600;
  return Colors.primary;
}

function getIconSurface(tone: SellerStatCardProps['tone']) {
  if (tone === 'secondary') return styles.iconSecondary;
  if (tone === 'accent') return styles.iconAccent;
  if (tone === 'neutral') return styles.iconNeutral;
  return styles.iconPrimary;
}

export function SellerStatCard({
  label,
  value,
  icon,
  tone,
}: SellerStatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, getIconSurface(tone)]}>
        <Ionicons name={icon} size={18} color={getIconColor(tone)} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}
