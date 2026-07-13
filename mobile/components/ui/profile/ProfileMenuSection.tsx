import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/theme';
import type { RoleMode } from '../../../types/transactionFlows';
import { styles } from './ProfileMenuSection.styles';

export interface ProfileMenuItemConfig {
  key: string;
  labelKey: string;
  icon: AppIconName;
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
        <TouchableOpacity
          key={item.key}
          style={[styles.item, index < visibleItems.length - 1 && styles.itemBordered]}
          activeOpacity={0.75}
          onPress={() => onNavigate(item.route)}
        >
          <AppIcon
            name={item.icon}
            size={22}
            color={Colors.slate500}
            style={{ width: 24, textAlign: 'center' }}
          />
          <Text style={styles.text}>{t(item.labelKey)}</Text>
          <AppIcon name="chevron-forward" size={18} color={Colors.slate400} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
