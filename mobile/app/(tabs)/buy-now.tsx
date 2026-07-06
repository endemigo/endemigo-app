import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteProducts, useCategories, Product, Category } from '../../hooks/useProducts';
import { ProductCard } from '../../components/ui';
import { Colors, Spacing } from '../../constants/theme';
import { styles } from '../../styles/buy-now.styles';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  elektronik: { icon: 'desktop', color: Colors.primary },
  antika_koleksiyon: { icon: 'library', color: Colors.secondary },
  sanat: { icon: 'color-palette', color: Colors.accent },
  hali_kilim: { icon: 'grid', color: Colors.tertiaryContainer },
  mucevher_saat: { icon: 'diamond', color: Colors.accent },
  mobilya_dekor: { icon: 'bed', color: Colors.tertiary },
  kiyafet_aksesuar: { icon: 'shirt', color: Colors.surfaceTint },
  spor_outdoor: { icon: 'bicycle', color: Colors.auctionGreen },
  default: { icon: 'cube-outline', color: Colors.slate500 }
};

function getCategoryIcon(slug: string) {
  const normalized = slug?.toLowerCase().replace(/[- ]/g, '_');
  return CATEGORY_ICONS[normalized] || CATEGORY_ICONS.default;
}

export default function BuyNowScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = React.useState<string | null>(null);
  const [categoryImageErrors, setCategoryImageErrors] = React.useState<Record<string, boolean>>({});

  const handleSelectCategory = (id: string | null) => {
    setSelectedCategoryId(id);
    setSelectedSubcategoryId(null);
  };

  const {
    data: productsData,
    isLoading: isProductsLoading,
    isError: isProductsError,
    refetch: refetchProducts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProducts({ categoryId: selectedSubcategoryId ?? selectedCategoryId ?? undefined });
  const { data: categoriesData } = useCategories();

  const filteredProducts = React.useMemo(() => {
    const items = productsData?.pages.flatMap((page) => page.items) ?? [];
    return items.filter((item) => {
      // 1. Filter out auctions (Hemen Al screen only shows direct sale products)
      if (item.listingType === 'AUCTION') return false;

      // 2. Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLocaleLowerCase('tr-TR');
        const titleMatches = item.title.toLocaleLowerCase('tr-TR').includes(query);
        const categoryMatches = item.categoryName?.toLocaleLowerCase('tr-TR').includes(query);
        if (!titleMatches && !categoryMatches) return false;
      }

      return true;
    });
  }, [productsData, searchQuery]);

  const renderProduct = React.useCallback(({ item }: { item: Product }) => (
    <View style={styles.productCardWrap}>
      <ProductCard
        item={item}
        onPress={() => router.push(`/product/${item.id}`)}
      />
    </View>
  ), [router]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.base }]}>
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            {!searchQuery ? (
              <View pointerEvents="none" style={styles.searchLogoOverlay}>
                <Image
                  source={require('../../assets/images/endemigo-logo.png')}
                  style={styles.searchLogoPlaceholder}
                  resizeMode="contain"
                />
              </View>
            ) : null}
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                style={styles.searchClearButton}
                activeOpacity={0.7}
                onPress={() => setSearchQuery('')}
              >
                <Ionicons name="close-circle" size={18} color={Colors.slate400} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.searchActions}>
            <TouchableOpacity
              style={[styles.searchActionButton, styles.profileActionButton]}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityRole="button"
              accessibilityLabel={t('tabs.profile')}
            >
              <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.searchActionButton, styles.notificationActionButton]}
              activeOpacity={0.85}
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
              accessibilityRole="button"
              accessibilityLabel={t('tabs.notifications')}
            >
              <Ionicons name="notifications-outline" size={19} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Categories Sticky Ribbon (fixed at the top, just like Home screen style) */}
      {categoriesData && categoriesData.length > 0 && (
        <View style={styles.categoriesRibbonContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            <TouchableOpacity
              style={styles.categoryItem}
              activeOpacity={0.7}
              onPress={() => handleSelectCategory(null)}
            >
              <View style={[styles.categoryIcon, selectedCategoryId === null && styles.categoryIconActive]}>
                <Ionicons
                  name="grid-outline"
                  size={24}
                  color={selectedCategoryId === null ? Colors.primary : Colors.slate500}
                />
              </View>
              <Text style={[styles.categoryName, selectedCategoryId === null && styles.categoryNameActive]}>
                {t('common.all')}
              </Text>
            </TouchableOpacity>

            {categoriesData.map((category: Category) => {
              const isSelected = selectedCategoryId === category.id;
              const config = getCategoryIcon(category.slug);
              const hasImage = Boolean(category.imageUrl) && !categoryImageErrors[category.id];
              return (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryItem}
                  activeOpacity={0.7}
                  onPress={() => handleSelectCategory(category.id)}
                >
                  {hasImage ? (
                    <Image
                      source={{ uri: category.imageUrl ?? undefined }}
                      style={[styles.categoryImage, isSelected && styles.categoryImageActive]}
                      resizeMode="cover"
                      onError={() => setCategoryImageErrors((prev) => ({ ...prev, [category.id]: true }))}
                    />
                  ) : (
                    <View style={[styles.categoryIcon, isSelected && styles.categoryIconActive]}>
                      <Ionicons
                        name={config.icon as any}
                        size={24}
                        color={isSelected ? Colors.primary : config.color}
                      />
                    </View>
                  )}
                  <Text
                    style={[styles.categoryName, isSelected && styles.categoryNameActive]}
                    numberOfLines={1}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {(() => {
        const selectedCat = categoriesData?.find((c) => c.id === selectedCategoryId);
        const subcategories = selectedCat?.children || [];
        if (subcategories.length === 0) return null;
        
        return (
          <View style={styles.subcategoriesRibbonContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subcategoriesScroll}
            >
              <TouchableOpacity
                style={[styles.subcategoryChip, selectedSubcategoryId === null && styles.subcategoryChipActive]}
                activeOpacity={0.7}
                onPress={() => setSelectedSubcategoryId(null)}
              >
                <Text style={[styles.subcategoryChipText, selectedSubcategoryId === null && styles.subcategoryChipTextActive]}>
                  {t('common.all')}
                </Text>
              </TouchableOpacity>
              {subcategories.map((sub: Category) => {
                const isSubSelected = selectedSubcategoryId === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.subcategoryChip, isSubSelected && styles.subcategoryChipActive]}
                    activeOpacity={0.7}
                    onPress={() => setSelectedSubcategoryId(sub.id)}
                  >
                    <Text style={[styles.subcategoryChipText, isSubSelected && styles.subcategoryChipTextActive]}>
                      {sub.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );
      })()}

      {isProductsLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isProductsError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={46} color={Colors.error} />
          <Text style={styles.emptyText}>{t('common.error')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetchProducts()} activeOpacity={0.8}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={[styles.section, styles.scrollContent]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ paddingVertical: Spacing.md }} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={42} color={Colors.slate300} />
              <Text style={styles.emptyText}>{t('categories.emptyCategory')}</Text>
            </View>
          }
          renderItem={renderProduct}
        />
      )}
    </View>
  );
}
