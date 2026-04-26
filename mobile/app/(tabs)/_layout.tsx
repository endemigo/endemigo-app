import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, Image } from 'react-native';
import { Colors } from '../../constants/theme';
import { styles } from '../../styles/tabs/_layout.styles';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.slate400,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTintColor: Colors.onSurface,
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
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
        name="categories"
        options={{
          title: 'Kategoriler',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="auctions"
        options={{
          title: 'Müzayede',
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.tabBarLabel, { color: Colors.auctionGreen, opacity: focused ? 1 : 0.6 }]}>
              Müzayede
            </Text>
          ),
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../assets/images/endemigo-icon.png')}
              style={[
                styles.auctionIcon,
                { tintColor: Colors.auctionGreen, opacity: focused ? 1 : 0.6 },
              ]}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Sepetim',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={focused ? 'cart' : 'cart-outline'}
                size={24}
                color={color}
              />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>0</Text>
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="become-seller" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
    </Tabs>
  );
}
