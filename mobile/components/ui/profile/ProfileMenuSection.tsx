import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/theme';
import type { RoleMode } from '../../../types/transactionFlows';
import { styles } from './ProfileMenuSection.styles';

export interface ProfileMenuItemConfig {
  key: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  sellerOnly?: boolean;
  order: number;
  tone: 'primary' | 'secondary' | 'accent' | 'neutral';
}

interface ProfileMenuSectionProps {
  activeMode: RoleMode;
  items: ProfileMenuItemConfig[];
  onNavigate: (route: string) => void;
}

function getIconStyle(tone: ProfileMenuItemConfig['tone']) {
  if (tone === 'secondary') return styles.iconSecondary;
  if (tone === 'accent') return styles.iconAccent;
  if (tone === 'neutral') return styles.iconNeutral;
  return styles.iconPrimary;
}

function getIconColor(tone: ProfileMenuItemConfig['tone']) {
  if (tone === 'secondary') return Colors.secondary;
  if (tone === 'accent') return Colors.accent;
  if (tone === 'neutral') return Colors.slate600;
  return Colors.primary;
}

export function ProfileMenuSection({ activeMode, items, onNavigate }: ProfileMenuSectionProps) {
  const { t } = useTranslation();
  const visibleItems = items
    .filter((item) => !item.sellerOnly || activeMode === 'seller')
    .sort((a, b) => a.order - b.order);

  return (
    <View style={styles.card}>
      {visibleItems.map((item, index) => (
        <React.Fragment key={item.key}>
          <TouchableOpacity
            style={styles.item}
            activeOpacity={0.75}
            onPress={() => onNavigate(item.route)}
          >
            <View style={[styles.icon, getIconStyle(item.tone)]}>
              <Ionicons name={item.icon} size={18} color={getIconColor(item.tone)} />
            </View>
            <Text style={styles.text}>{t(item.labelKey)}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
          </TouchableOpacity>
          {index < visibleItems.length - 1 && <View style={styles.divider} />}
        </React.Fragment>
      ))}
    </View>
  );
}
