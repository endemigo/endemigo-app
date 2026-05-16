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
            <View style={[styles.icon, styles.iconPrimary]}>
              <Ionicons name={item.icon} size={18} color={Colors.primary} />
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
