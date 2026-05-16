import React from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { useRoleModeStore } from '../../store/roleModeStore';
import { styles } from '../../styles/tabs/_layout.styles';

export default function TabLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const isProfileScreen = pathname === '/profile';
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const isSellerMode = activeMode === 'seller';

  return (
    <Tabs
      initialRouteName="home"
      backBehavior="initialRoute"
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.slate400,
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTintColor: Colors.onSurface,
        headerTitleStyle: styles.headerTitle,
        headerTitleAlign: 'center',
        headerTitle: () => (isProfileScreen ? (
          <Text style={styles.headerProfileTitle}>{t('tabs.profile')}</Text>
        ) : (
          <Image
            source={require('../../assets/images/endemigo-icon.png')}
            style={styles.headerGoatIcon}
            resizeMode="contain"
          />
        )),
        headerLeft: () => null,
        headerRight: () => (
          <View style={styles.headerActions}>
            {!isProfileScreen ? (
              <>
                <TouchableOpacity
                  style={styles.headerActionButtonCompact}
                  onPress={() => router.push('/(tabs)/profile')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t('tabs.profile')}
                >
                  <Ionicons name="person-outline" size={18} color={Colors.primary} />
                  <Text style={styles.headerActionText}>{t('tabs.profile')}</Text>
                </TouchableOpacity>
                <View style={styles.headerDivider} />
              </>
            ) : null}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/(tabs)/notifications')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('tabs.notifications')}
            >
              <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.search'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="become-seller"
        options={{
          title: t('tabs.listing'),
          headerShown: false,
          tabBarStyle: { display: 'none' },
          href: isSellerMode ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'add-circle' : 'add-circle-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="seller-dashboard"
        options={{
          title: t('tabs.sellerDashboard'),
          headerShown: false,
          href: isSellerMode ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'speedometer' : 'speedometer-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favoriler"
        options={{
          title: t('tabs.favorites'),
          headerShown: false,
          href: isSellerMode ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="seller-ads"
        options={{
          title: t('tabs.sellerAds'),
          headerShown: false,
          href: isSellerMode ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'megaphone' : 'megaphone-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="auctions"
        options={{
          title: t('tabs.auctions'),
          headerShown: false,
          tabBarStyle: { display: 'none' },
          tabBarActiveTintColor: Colors.auctionGreen,
          tabBarInactiveTintColor: `${Colors.auctionGreen}99`,
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.tabBarLabel, { color: focused ? Colors.auctionGreen : `${Colors.auctionGreen}99` }]}>
              {t('tabs.auctions')}
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'hammer' : 'hammer-outline'}
              size={24}
              color={Colors.auctionGreen}
            />
          ),
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="orders/[orderId]" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="notification-preferences" options={{ href: null }} />
      <Tabs.Screen
        name="categories"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="categories/[id]" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="membership" options={{ href: null }} />
      <Tabs.Screen name="seller-campaigns" options={{ href: null }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
