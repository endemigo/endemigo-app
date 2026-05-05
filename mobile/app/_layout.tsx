import { useEffect, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, TouchableOpacity, Animated, Easing, Text } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '../lib/queryClient';
import { storage } from '../lib/storage';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { Colors } from '../constants/theme';
import { GlobalModal, GlobalToast } from '../components/ui';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { styles } from '../styles/_layout.styles';
import { Ionicons } from '@expo/vector-icons';
import { LaunchSplash } from '../components/ui/LaunchSplash';
import { createLaunchSplashImageItems } from '../utils/launchSplashImages';
import '../i18n'; // initialize i18n before any screen renders

import {
  OpenSans_400Regular,
  OpenSans_600SemiBold,
} from '@expo-google-fonts/open-sans';
import { Oxygen_300Light, Oxygen_400Regular, Oxygen_700Bold } from '@expo-google-fonts/oxygen';
import { Raleway_400Regular, Raleway_600SemiBold } from '@expo-google-fonts/raleway';
import { Ubuntu_300Light } from '@expo-google-fonts/ubuntu';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const CART_VISIBLE_ROUTE_PREFIXES = [
  '/home',
  '/explore',
  '/categories',
  '/favoriler',
  '/product',
  '/buy-now',
];

function AuthGate({ children }: { children: ReactNode }) {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hydrateCart = useCartStore((s) => s.hydrateCart);
  const mergeGuestCartToBackend = useCartStore((s) => s.mergeGuestCartToBackend);
  const pathname = usePathname();
  const router = useRouter();

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const requiresAuth = [
    '/profile',
    '/edit-profile',
    '/wallet',
    '/orders',
    '/messages',
    '/membership',
    '/seller-ads',
    '/seller-campaigns',
    '/become-seller',
    '/favoriler',
    '/notifications',
    '/notification-preferences',
  ].some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isLoggedIn) {
      mergeGuestCartToBackend().catch(() => {
        hydrateCart();
      });
      return;
    }
    hydrateCart();
  }, [hydrateCart, isLoggedIn, mergeGuestCartToBackend]);

  useEffect(() => {
    if (isLoading) return;

    if (!isLoggedIn && requiresAuth) {
      router.replace('/(auth)/login');
      return;
    }

    if (isLoggedIn && isAuthRoute) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthRoute, isLoading, isLoggedIn, pathname, requiresAuth, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [showLaunchSplash, setShowLaunchSplash] = useState(true);
  const [storedLaunchImages, setStoredLaunchImages] = useState<string[]>([]);
  const items = useCartStore((state) => state.items);
  const cartCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );
  const shake = useRef(new Animated.Value(0)).current;
  const isCartRoute = pathname === '/cart';
  const isShoppingRoute = CART_VISIBLE_ROUTE_PREFIXES.some((route) => pathname.startsWith(route));
  const shouldShowFloatingCart = !showLaunchSplash && cartCount > 0 && isShoppingRoute && !isCartRoute;

  const [fontsLoaded] = useFonts({
    'OpenSans-Regular': OpenSans_400Regular,
    'OpenSans-SemiBold': OpenSans_600SemiBold,
    'Oxygen-Light': Oxygen_300Light,
    'Oxygen-Regular': Oxygen_400Regular,
    'Oxygen-Bold': Oxygen_700Bold,
    'Raleway-Regular': Raleway_400Regular,
    'Raleway-SemiBold': Raleway_600SemiBold,
    'Ubuntu-Light': Ubuntu_300Light,
  });

  useEffect(() => {
    let isActive = true;

    storage.getLaunchSplashImages()
      .then((images) => {
        if (isActive) {
          setStoredLaunchImages(images);
        }
      })
      .catch(() => {
        if (isActive) {
          setStoredLaunchImages([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    const timer = setTimeout(() => {
      setShowLaunchSplash(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  const launchSplashImages = useMemo(
    () => createLaunchSplashImageItems({ storedImages: storedLaunchImages }),
    [storedLaunchImages],
  );

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (!shouldShowFloatingCart) {
      shake.stopAnimation();
      shake.setValue(0);
      return;
    }

    const runShake = () => {
      shake.setValue(0);
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 1, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 1, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    };

    const interval = setInterval(runShake, 5000);
    runShake();
    return () => clearInterval(interval);
  }, [shake, shouldShowFloatingCart]);

  const shakeStyle = {
    transform: [
      {
        rotate: shake.interpolate({
          inputRange: [-1, 1],
          outputRange: ['-10deg', '10deg'],
        }),
      },
    ],
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex1}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <AuthGate>
            <View style={styles.flex1} onLayout={onLayoutRootView}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
              {shouldShowFloatingCart ? (
                <TouchableOpacity
                  style={styles.globalFloatingCartButton}
                  activeOpacity={0.9}
                  onPress={() => router.push('/(tabs)/cart')}
                >
                  <Animated.View style={shakeStyle}>
                    <Ionicons name="cart" size={18} color={Colors.white} />
                  </Animated.View>
                  {cartCount > 0 ? (
                    <View style={styles.globalCartBadge}>
                      <Text style={styles.globalCartBadgeText}>{cartCount > 99 ? '99+' : String(cartCount)}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ) : null}
              <StatusBar style="dark" />
              <GlobalModal />
              <GlobalToast />
              {showLaunchSplash ? <LaunchSplash images={launchSplashImages} /> : null}
            </View>
          </AuthGate>
        </ErrorBoundary>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
