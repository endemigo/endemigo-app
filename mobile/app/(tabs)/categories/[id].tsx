import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { styles as layoutStyles } from '../../../styles/tabs/_layout.styles';
import { useInfiniteProducts, useCategories, Product, Category } from '../../../hooks/useProducts';
import { Colors, Spacing } from '../../../constants/theme';
import { ProductCard } from '../../../components/ui';
import { styles } from '../../../styles/tabs/categories/[id].styles';

export default function CategoryDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProducts({ categoryId: id });
  const { data: categories } = useCategories();

  const currentCategory = React.useMemo(() => {
    const findRecursive = (list: Category[], targetId: string): Category | null => {
      for (const cat of list) {
        if (cat.id === targetId) return cat;
        if (cat.children) {
          const found = findRecursive(cat.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    return findRecursive(categories || [], id);
  }, [categories, id]);

  const parentCategory = React.useMemo(() => {
    const findParentRecursive = (
      list: Category[],
      targetId: string,
      parent: Category | null = null
    ): Category | null => {
      for (const cat of list) {
        if (cat.id === targetId) return parent;
        if (cat.children) {
          const found = findParentRecursive(cat.children, targetId, cat);
          if (found) return found;
        }
      }
      return null;
    };
    return findParentRecursive(categories || [], id);
  }, [categories, id]);

  const filterChips = React.useMemo(() => {
    if (!currentCategory) return [];

    const parent = parentCategory || currentCategory;
    const siblingList = parent.children ?? [];

    const allChip = {
      id: parent.id,
      name: t('common.all'),
      slug: parent.slug,
      productCount: parent.productCount,
    };

    return [allChip, ...siblingList];
  }, [currentCategory, parentCategory, t]);

  const products = React.useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data]);

  const renderProduct = React.useCallback(({ item }: { item: Product }) => (
    <View style={styles.cardWrap}>
      <ProductCard item={item} onPress={() => router.push(`/product/${item.id}`)} />
    </View>
  ), [router]);

  const handleChipPress = (chip: { id: string; name: string; slug?: string }) => {
    router.push({
      pathname: '/(tabs)/categories/[id]',
      params: { id: chip.id, name: chip.name, slug: chip.slug },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={46} color={Colors.error} />
        <Text style={styles.emptyText}>{t('common.error')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.8}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Tabs.Screen
        options={{
          headerTitle: () => (
            <Text style={layoutStyles.headerProfileTitle} numberOfLines={1}>
              {name || t('categories.title')}
            </Text>
          ),
        }}
      />

      {filterChips.length > 1 && (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.subcategoriesScroll}
            contentContainerStyle={styles.subcategoriesContent}
          >
            {filterChips.map((chip) => {
              const isActive = id === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.subcategoryChip, isActive && styles.subcategoryChipActive]}
                  activeOpacity={0.8}
                  onPress={() => handleChipPress(chip)}
                >
                  <Text style={[styles.subcategoryChipText, isActive && styles.subcategoryChipTextActive]}>
                    {chip.name}
                  </Text>
                  {chip.productCount !== undefined && chip.productCount > 0 && (
                    <View style={[styles.subcategoryCountBadge, isActive && styles.subcategoryCountBadgeActive]}>
                      <Text style={[styles.subcategoryCountText, isActive && styles.subcategoryCountTextActive]}>
                        {chip.productCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {!products.length ? (
        <View style={styles.center}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="cube-outline" size={42} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t('categories.emptyCategory')}</Text>
          <Text style={styles.emptyDescription}>{t('favoritesScreen.emptyBody')}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/explore' as never)}
          >
            <Ionicons name="compass-outline" size={18} color={Colors.white} />
            <Text style={styles.primaryButtonText}>{t('favoritesScreen.browse')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
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
            <>
              {isFetchingNextPage ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ paddingVertical: Spacing.md }} />
              ) : null}
              <View style={styles.bottomSpacer} />
            </>
          }
          renderItem={renderProduct}
        />
      )}
    </View>
  );
}

