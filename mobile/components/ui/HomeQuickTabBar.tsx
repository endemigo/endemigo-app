import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { styles } from './HomeQuickTabBar.styles';

type HomeQuickTabKey = 'home' | 'search' | 'favorites' | 'shopping' | 'auctions';

interface HomeQuickTabBarProps {
  activeTab: HomeQuickTabKey;
}

export function HomeQuickTabBar({ activeTab }: HomeQuickTabBarProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const tabs: Array<{
    key: HomeQuickTabKey;
    label: string;
    iconActive: keyof typeof Ionicons.glyphMap;
    iconInactive: keyof typeof Ionicons.glyphMap;
    route: '/(tabs)/home' | '/(tabs)/explore' | '/(tabs)/favoriler' | '/buy-now' | '/(tabs)/auctions';
    color?: string;
  }> = [
    { key: 'home', label: t('tabs.home'), iconActive: 'home', iconInactive: 'home-outline', route: '/(tabs)/home' },
    { key: 'search', label: t('tabs.search'), iconActive: 'search', iconInactive: 'search-outline', route: '/(tabs)/explore' },
    { key: 'favorites', label: t('tabs.favorites'), iconActive: 'heart', iconInactive: 'heart-outline', route: '/(tabs)/favoriler' },
    { key: 'shopping', label: t('tabs.buyNow'), iconActive: 'bag-handle', iconInactive: 'bag-handle-outline', route: '/buy-now' },
    { key: 'auctions', label: t('tabs.auctions'), iconActive: 'hammer', iconInactive: 'hammer-outline', route: '/(tabs)/auctions', color: Colors.auctionGreen },
  ];

  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const activeColor = tab.color ?? Colors.primary;
        const itemColor = isActive ? activeColor : Colors.slate400;
        const iconName = isActive ? tab.iconActive : tab.iconInactive;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.item}
            activeOpacity={0.8}
            onPress={() => {
              if (isActive) return;
              router.replace(tab.route);
            }}
          >
            <Ionicons name={iconName} size={20} color={itemColor} />
            <Text style={[styles.label, { color: itemColor }, isActive ? styles.labelActive : null]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
