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
    icon: keyof typeof Ionicons.glyphMap;
    route: '/(tabs)/home' | '/(tabs)/explore' | '/(tabs)/favoriler' | '/buy-now' | '/(tabs)/auctions';
    color?: string;
  }> = [
    { key: 'home', label: t('tabs.home'), icon: 'home-outline', route: '/(tabs)/home' },
    { key: 'search', label: t('tabs.search'), icon: 'search-outline', route: '/(tabs)/explore' },
    { key: 'favorites', label: t('tabs.favorites'), icon: 'heart-outline', route: '/(tabs)/favoriler' },
    { key: 'shopping', label: t('tabs.buyNow'), icon: 'bag-outline', route: '/buy-now' },
    { key: 'auctions', label: t('tabs.auctions'), icon: 'hammer-outline', route: '/(tabs)/auctions', color: Colors.auctionGreen },
  ];

  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const iconColor = tab.color ?? Colors.primary;
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
            <Ionicons name={tab.icon} size={20} color={iconColor} />
            <Text style={[styles.label, isActive ? styles.labelActive : null]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
