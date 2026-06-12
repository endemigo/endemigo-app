import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useProducts, useCategories, Product, Category } from '../../../hooks/useProducts';
import { Colors, Spacing } from '../../../constants/theme';
import { ProductCard } from '../../../components/ui';
import { styles } from '../../../styles/tabs/categories/[id].styles';

export default function CategoryDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useProducts(1);
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

  const subcategories = React.useMemo(() => {
    return currentCategory?.children ?? [];
  }, [currentCategory]);

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

  const allCategoryIds = React.useMemo(() => {
    const ids = [id];
    subcategories.forEach((child) => {
      ids.push(child.id);
      if (child.children) {
        child.children.forEach((subChild) => {
          ids.push(subChild.id);
        });
      }
    });
    return ids;
  }, [subcategories, id]);

  const products = React.useMemo(() => {
    const items = data?.items || [];
    return items.filter(
      (item) => allCategoryIds.includes(item.categoryId) || item.categoryName === name
    );
  }, [data?.items, allCategoryIds, name]);

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
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.base }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name || t('categories.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

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
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.grid}>
            {products.map((item: Product) => (
              <View key={item.id} style={styles.cardWrap}>
                <ProductCard item={item} onPress={() => router.push(`/product/${item.id}`)} />
              </View>
            ))}
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </View>
  );
}

