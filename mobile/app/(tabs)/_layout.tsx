import React, { useState } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text, Image, Linking, Modal, PanResponder, Animated as RNAnimated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useRoleModeStore } from '../../store/roleModeStore';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import ENV from '../../lib/config';
import { styles, TAB_BAR_CONTENT_HEIGHT } from '../../styles/tabs/_layout.styles';
import { styles as entryModeStyles } from '../../components/forms/product-create/ProductCreateWizard.styles';

const AnimatedSafeAreaView = RNAnimated.createAnimatedComponent(SafeAreaView);

export default function TabLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const isProfileScreen = pathname === '/profile';
  const insets = useSafeAreaInsets();
  const getSubpageOptions = (titleKey: string, fallbackRoute = '/(tabs)/profile') => ({
    href: null,
    headerTitle: () => (
      <Text style={styles.headerProfileTitle}>{t(titleKey)}</Text>
    ),
    headerLeft: () => (
      <TouchableOpacity
        style={{ marginLeft: 16, padding: 8 }}
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace(fallbackRoute as any);
          }
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.onSurface} />
      </TouchableOpacity>
    ),
    headerRight: () => null,
  });
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const isSellerMode = activeMode === 'seller';
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [isEntryModeModalVisible, setIsEntryModeModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState<'main' | 'auctionType' | 'auctionProductCount' | 'jointInfo' | 'independentInfo'>('main');

  const panY = React.useMemo(() => new RNAnimated.Value(0), []);

  const resetPositionAnim = React.useMemo(
    () =>
      RNAnimated.timing(panY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    [panY]
  );

  const closeAnim = React.useMemo(
    () =>
      RNAnimated.timing(panY, {
        toValue: 600,
        duration: 200,
        useNativeDriver: true,
      }),
    [panY]
  );

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dy) > 10 && gestureState.dy > 0 && Math.abs(gestureState.dx) < 30;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            panY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 0.5) {
            closeAnim.start(() => {
              setIsEntryModeModalVisible(false);
              setModalStep('main');
              panY.setValue(0);
            });
          } else {
            resetPositionAnim.start();
          }
        },
      }),
    [panY, closeAnim, resetPositionAnim]
  );

  const handleSelectEntryMode = (mode: 'MARKETPLACE' | 'AUCTION', auctionType?: 'REALTIME' | 'TIMED') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setIsEntryModeModalVisible(false);
    setModalStep('main');
    router.push({
      pathname: '/(tabs)/become-seller',
      params: { mode, auctionType }
    });
  };

  return (
    <>
      <Tabs
        initialRouteName="home"
      backBehavior="initialRoute"
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.slate400,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [
          styles.tabBar,
          {
            // Home indicator / gesture bar payı tek yerden: inset varsa o,
            // yoksa minimum iç boşluk. İçerik yüksekliği sabit kalır.
            height: TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, Spacing.sm),
            paddingBottom: Math.max(insets.bottom, Spacing.sm),
          },
        ],
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
              onPress={() => {
                if (!isLoggedIn) {
                  useModalStore.getState().showModal({
                    title: t('common.authRequiredTitle'),
                    message: t('notifications.authRequiredMessage'),
                    type: 'info',
                    confirmText: t('auth.login'),
                    cancelText: t('common.cancel'),
                    onConfirm: () => {
                      useModalStore.getState().hideModal();
                      router.push('/(auth)/login');
                    },
                    onCancel: () => {
                      useModalStore.getState().hideModal();
                    }
                  });
                  return;
                }
                router.push('/(tabs)/notifications');
              }}
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
          // Tab bar'dan gizli; ekrana ana sayfa araması ve banner linkleriyle gidiliyor
          href: null,
          title: t('tabs.search'),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="buy-now"
        options={{
          title: t('tabs.buyNow'),
          headerShown: false,
          href: isSellerMode ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'bag-handle' : 'bag-handle-outline'}
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
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
            if (!isLoggedIn) {
              useModalStore.getState().showModal({
                title: t('common.authRequiredTitle'),
                message: t('common.authRequiredMessage'),
                type: 'info',
                confirmText: t('auth.login'),
                cancelText: t('common.cancel'),
                onConfirm: () => {
                  useModalStore.getState().hideModal();
                  router.push('/(auth)/login');
                },
                onCancel: () => {
                  useModalStore.getState().hideModal();
                }
              });
              return;
            }
            setModalStep('main');
            setIsEntryModeModalVisible(true);
          }
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
          tabBarActiveTintColor: Colors.auctionGreen,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'hammer' : 'hammer-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="settings" options={getSubpageOptions('settings.title')} />
      <Tabs.Screen name="edit-profile" options={getSubpageOptions('profile.editProfile')} />
      <Tabs.Screen name="wallet" options={getSubpageOptions('wallet.title')} />
      <Tabs.Screen
        name="orders"
        options={{
          ...getSubpageOptions(activeMode === 'seller' ? 'orders.sellerHeaderTitle' : 'orders.buyerHeaderTitle'),
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="orders/[orderId]"
        options={{
          ...getSubpageOptions('orders.detailTitle', '/(tabs)/orders'),
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen name="notifications" options={getSubpageOptions('notifications.title')} />
      <Tabs.Screen name="notification-preferences" options={getSubpageOptions('notifications.preferencesTitle', '/(tabs)/notifications')} />
      <Tabs.Screen
        name="categories"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="categories/[id]" options={getSubpageOptions('categories.title')} />
      <Tabs.Screen name="messages" options={getSubpageOptions('negotiation.list.title')} />
      <Tabs.Screen name="membership" options={getSubpageOptions('paketim.title')} />
      <Tabs.Screen name="seller-campaigns" options={getSubpageOptions('sellerCampaigns.title')} />
      <Tabs.Screen name="addresses" options={getSubpageOptions('addresses.title')} />
      <Tabs.Screen name="profile" options={getSubpageOptions('tabs.profile', '/(tabs)/explore')} />
    </Tabs>
 
    <Modal
      visible={isEntryModeModalVisible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent
    >
      <View style={entryModeStyles.entryModeModalBackdrop}>
        <TouchableOpacity
          style={entryModeStyles.entryModeModalDismissArea}
          activeOpacity={1}
          onPress={() => {
            setIsEntryModeModalVisible(false);
            setModalStep('main');
          }}
        />
        <AnimatedSafeAreaView style={[entryModeStyles.entryModeModalContainer, { transform: [{ translateY: panY }] }]} edges={['bottom']} {...panResponder.panHandlers}>
          <View style={entryModeStyles.entryModeModalHandle} />
 
          {modalStep === 'main' && (
            <View style={entryModeStyles.entryModeHeaderArea}>
              <Text style={entryModeStyles.entryModeTitle}>{t('listing.entryModeTitle')}</Text>
              <Text style={entryModeStyles.entryModeSubtitle}>{t('listing.entryModeSubtitle')}</Text>
            </View>
          )}

          {modalStep === 'auctionProductCount' && (
            <View style={entryModeStyles.entryModeHeaderArea}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                <TouchableOpacity
                  onPress={() => setModalStep('main')}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: BorderRadius.full,
                    backgroundColor: Colors.slate100,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color={Colors.onSurface} />
                </TouchableOpacity>
              </View>
              <Text style={entryModeStyles.entryModeTitle}>{t('listing.auctionProductCountTitle')}</Text>
              <Text style={entryModeStyles.entryModeSubtitle}>{t('listing.auctionProductCountSubtitle')}</Text>
            </View>
          )}

          {modalStep === 'independentInfo' && (
            <View style={entryModeStyles.entryModeHeaderArea}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                <TouchableOpacity
                  onPress={() => setModalStep('auctionProductCount')}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: BorderRadius.full,
                    backgroundColor: Colors.slate100,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color={Colors.onSurface} />
                </TouchableOpacity>
              </View>
              <Text style={entryModeStyles.entryModeTitle}>{t('listing.independentInfoTitle')}</Text>
            </View>
          )}

          {modalStep === 'jointInfo' && (
            <View style={entryModeStyles.entryModeHeaderArea}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                <TouchableOpacity
                  onPress={() => setModalStep('auctionProductCount')}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: BorderRadius.full,
                    backgroundColor: Colors.slate100,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color={Colors.onSurface} />
                </TouchableOpacity>
              </View>
              <Text style={entryModeStyles.entryModeTitle}>{t('listing.jointInfoTitle')}</Text>
            </View>
          )}

          {modalStep === 'auctionType' && (
            <View style={entryModeStyles.entryModeHeaderArea}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                <TouchableOpacity
                  onPress={() => setModalStep('auctionProductCount')}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: BorderRadius.full,
                    backgroundColor: Colors.slate100,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color={Colors.onSurface} />
                </TouchableOpacity>
              </View>
              <Text style={entryModeStyles.entryModeTitle}>{t('listing.auctionType')}</Text>
              <Text style={entryModeStyles.entryModeSubtitle}>{t('listing.entryModeSubtitle')}</Text>
            </View>
          )}
 
          <View style={entryModeStyles.entryModeOptions}>
            {modalStep === 'main' && (
              <>
                <Animated.View entering={FadeInUp.delay(100).duration(600)}>
                  <TouchableOpacity
                    style={[entryModeStyles.entryModeOption, entryModeStyles.entryModeOptionMarketplace]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectEntryMode('MARKETPLACE')}
                  >
                    <View style={[entryModeStyles.entryModeIconContainer, entryModeStyles.entryModeIconContainerMarketplace]}>
                      <Ionicons name="storefront-outline" size={24} color={Colors.primary} />
                    </View>
                    <View style={entryModeStyles.entryModeOptionTextWrap}>
                      <View style={entryModeStyles.entryModeOptionHeaderRow}>
                        <Text style={entryModeStyles.entryModeOptionTitle}>{t('listing.entryModeMarketplace')}</Text>
                      </View>
                      <Text style={entryModeStyles.entryModeOptionBody}>{t('listing.entryModeMarketplaceBody')}</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={20} color={Colors.slate400} style={entryModeStyles.entryModeOptionChevron} />
                  </TouchableOpacity>
                </Animated.View>
 
                <Animated.View entering={FadeInUp.delay(250).duration(600)}>
                  <TouchableOpacity
                    style={[entryModeStyles.entryModeOption, entryModeStyles.entryModeOptionAuction]}
                    activeOpacity={0.7}
                    onPress={() => setModalStep('auctionProductCount')}
                  >
                    <View style={[entryModeStyles.entryModeIconContainer, entryModeStyles.entryModeIconContainerAuction]}>
                      <Ionicons name="hammer-outline" size={24} color={Colors.secondary} />
                    </View>
                    <View style={entryModeStyles.entryModeOptionTextWrap}>
                      <View style={entryModeStyles.entryModeOptionHeaderRow}>
                        <Text style={entryModeStyles.entryModeOptionTitle}>{t('listing.entryModeAuction')}</Text>
                      </View>
                      <Text style={entryModeStyles.entryModeOptionBody}>{t('listing.entryModeAuctionBody')}</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={20} color={Colors.slate400} style={entryModeStyles.entryModeOptionChevron} />
                  </TouchableOpacity>
                </Animated.View>
              </>
            )}

            {modalStep === 'auctionProductCount' && (
              <>
                <Animated.View entering={FadeInUp.delay(100).duration(600)}>
                  <TouchableOpacity
                    style={[entryModeStyles.entryModeOption, entryModeStyles.entryModeOptionAuction]}
                    activeOpacity={0.7}
                    onPress={() => setModalStep('auctionType')}
                  >
                    <View style={[entryModeStyles.entryModeIconContainer, entryModeStyles.entryModeIconContainerAuction]}>
                      <Ionicons name="cube-outline" size={24} color={Colors.secondary} />
                    </View>
                    <View style={entryModeStyles.entryModeOptionTextWrap}>
                      <Text style={entryModeStyles.entryModeOptionTitle}>{t('listing.optionSingleTitle')}</Text>
                      <Text style={entryModeStyles.entryModeOptionBody}>{t('listing.optionSingleDesc')}</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={20} color={Colors.slate400} style={entryModeStyles.entryModeOptionChevron} />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(180).duration(600)}>
                  <TouchableOpacity
                    style={[entryModeStyles.entryModeOption, entryModeStyles.entryModeOptionAuction]}
                    activeOpacity={0.7}
                    onPress={() => setModalStep('jointInfo')}
                  >
                    <View style={[entryModeStyles.entryModeIconContainer, entryModeStyles.entryModeIconContainerAuction]}>
                      <Ionicons name="people-outline" size={24} color={Colors.secondary} />
                    </View>
                    <View style={entryModeStyles.entryModeOptionTextWrap}>
                      <Text style={entryModeStyles.entryModeOptionTitle}>{t('listing.optionJointTitle')}</Text>
                      <Text style={entryModeStyles.entryModeOptionBody}>{t('listing.optionJointDesc')}</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={20} color={Colors.slate400} style={entryModeStyles.entryModeOptionChevron} />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(260).duration(600)}>
                  <TouchableOpacity
                    style={[entryModeStyles.entryModeOption, entryModeStyles.entryModeOptionAuction]}
                    activeOpacity={0.7}
                    onPress={() => setModalStep('independentInfo')}
                  >
                    <View style={[entryModeStyles.entryModeIconContainer, entryModeStyles.entryModeIconContainerAuction]}>
                      <Ionicons name="business-outline" size={24} color={Colors.secondary} />
                    </View>
                    <View style={entryModeStyles.entryModeOptionTextWrap}>
                      <Text style={entryModeStyles.entryModeOptionTitle}>{t('listing.optionIndependentTitle')}</Text>
                      <Text style={entryModeStyles.entryModeOptionBody}>{t('listing.optionIndependentDesc')}</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={20} color={Colors.slate400} style={entryModeStyles.entryModeOptionChevron} />
                  </TouchableOpacity>
                </Animated.View>
              </>
            )}

            {modalStep === 'jointInfo' && (
              <>
                <View style={entryModeStyles.independentInfoBox}>
                  <Text style={entryModeStyles.independentInfoBody}>{t('listing.jointInfoBody')}</Text>
                </View>

                {/* Toplu yükleme mobilde yok — kullanıcı web satıcı paneline yönlendirilir. */}
                <TouchableOpacity
                  style={[entryModeStyles.primaryButton, entryModeStyles.primaryButtonAuction]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setIsEntryModeModalVisible(false);
                    Linking.openURL(ENV.SELLER_WEB_URL).catch(() => undefined);
                  }}
                >
                  <Ionicons name="open-outline" size={16} color={Colors.white} style={{ marginRight: 8 }} />
                  <Text style={entryModeStyles.primaryButtonText}>{t('listing.continueOnWeb')}</Text>
                </TouchableOpacity>
              </>
            )}

            {modalStep === 'independentInfo' && (
              <>
                <View style={entryModeStyles.independentInfoBox}>
                  <Text style={entryModeStyles.independentInfoBody}>{t('listing.independentInfoBody')}</Text>
                </View>

                {/* Toplu yükleme mobilde yok — kullanıcı web satıcı paneline yönlendirilir. */}
                <TouchableOpacity
                  style={[entryModeStyles.primaryButton, entryModeStyles.primaryButtonAuction]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setIsEntryModeModalVisible(false);
                    Linking.openURL(ENV.SELLER_WEB_URL).catch(() => undefined);
                  }}
                >
                  <Ionicons name="open-outline" size={16} color={Colors.white} style={{ marginRight: 8 }} />
                  <Text style={entryModeStyles.primaryButtonText}>{t('listing.continueOnWeb')}</Text>
                </TouchableOpacity>
              </>
            )}

            {modalStep === 'auctionType' && (
              <>
                <Animated.View entering={FadeInUp.delay(100).duration(600)}>
                  <TouchableOpacity
                    style={[entryModeStyles.entryModeOption, entryModeStyles.entryModeOptionAuction, { borderColor: `${Colors.secondary}33` }]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectEntryMode('AUCTION', 'REALTIME')}
                  >
                    <View style={[entryModeStyles.entryModeIconContainer, entryModeStyles.entryModeIconContainerAuction, { backgroundColor: `${Colors.secondary}12` }]}>
                      <Ionicons name="flash-outline" size={24} color={Colors.secondary} />
                    </View>
                    <View style={entryModeStyles.entryModeOptionTextWrap}>
                      <View style={entryModeStyles.entryModeOptionHeaderRow}>
                        <Text style={entryModeStyles.entryModeOptionTitle}>{t('listing.entryModeAuctionRealtime')}</Text>
                      </View>
                      <Text style={entryModeStyles.entryModeOptionBody}>{t('listing.entryModeAuctionRealtimeBody')}</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={20} color={Colors.slate400} style={entryModeStyles.entryModeOptionChevron} />
                  </TouchableOpacity>
                </Animated.View>
 
                <Animated.View entering={FadeInUp.delay(200).duration(600)}>
                  <TouchableOpacity
                    style={[entryModeStyles.entryModeOption, { borderColor: Colors.slate200 }]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectEntryMode('AUCTION', 'TIMED')}
                  >
                    <View style={[entryModeStyles.entryModeIconContainer, { backgroundColor: Colors.slate100 }]}>
                      <Ionicons name="time-outline" size={24} color={Colors.slate600} />
                    </View>
                    <View style={entryModeStyles.entryModeOptionTextWrap}>
                      <View style={entryModeStyles.entryModeOptionHeaderRow}>
                        <Text style={entryModeStyles.entryModeOptionTitle}>{t('listing.entryModeAuctionTimed')}</Text>
                      </View>
                      <Text style={entryModeStyles.entryModeOptionBody}>{t('listing.entryModeAuctionTimedBody')}</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={20} color={Colors.slate400} style={entryModeStyles.entryModeOptionChevron} />
                  </TouchableOpacity>
                </Animated.View>
              </>
            )}
          </View>
 
          {modalStep === 'main' && (
            <View style={entryModeStyles.entryModeFooter}>
              <Text style={entryModeStyles.entryModeFooterText}>{t('listing.sellerAssurance')}</Text>
            </View>
          )}
        </AnimatedSafeAreaView>
      </View>
    </Modal>
  </>
);
}
