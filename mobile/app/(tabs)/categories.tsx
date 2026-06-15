import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Category } from '../../types';
import { useCategories } from '../../hooks/useProducts';
import { Colors } from '../../constants/theme';
import { styles } from '../../styles/tabs/categories.styles';

// Icon mapping by category slug — no hardcoded data, just visual hints
const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  elektronik: { icon: 'desktop', color: Colors.primary },
  antika_koleksiyon: { icon: 'library', color: Colors.secondary },
  sanat: { icon: 'color-palette', color: Colors.accent },
  hali_kilim: { icon: 'grid', color: Colors.tertiaryContainer },
  mucevher_saat: { icon: 'diamond', color: Colors.accent },
  mobilya_dekor: { icon: 'bed', color: Colors.tertiary },
  kiyafet_aksesuar: { icon: 'shirt', color: Colors.surfaceTint },
  spor_outdoor: { icon: 'bicycle', color: Colors.auctionGreen },
  yoresel_urunler: { icon: 'leaf', color: Colors.primary },
  gida: { icon: 'restaurant', color: Colors.primary },
  zeytinyagi: { icon: 'leaf', color: Colors.secondary },
  taki: { icon: 'diamond', color: Colors.accent },
  giyim: { icon: 'shirt', color: Colors.tertiaryContainer },
  aricilik: { icon: 'flower', color: Colors.auctionGreen },
  el_sanatlari: { icon: 'color-palette', color: Colors.surfaceTint },
  mobilya: { icon: 'bed', color: Colors.tertiary },
  bahce: { icon: 'rose', color: Colors.auctionGreen },
  kozmetik: { icon: 'sparkles', color: Colors.primary },
  seramik: { icon: 'flask', color: Colors.secondaryContainer },
  kurutulmus: { icon: 'nutrition', color: Colors.accent },
  default: { icon: 'ellipsis-horizontal', color: Colors.slate500 },
};

function getCategoryIcon(slug: string) {
  const normalized = slug?.toLowerCase().replace(/[- ]/g, '_');
  return CATEGORY_ICONS[normalized] || CATEGORY_ICONS.default;
}

type CategorySortKey = 'POPULAR' | 'A_Z';

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: categories, isLoading, isError, refetch } = useCategories();
  const [imageErrors, setImageErrors] = React.useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortKey, setSortKey] = React.useState<CategorySortKey>('POPULAR');

  const visibleCategories = React.useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const filtered = (categories ?? []).filter((item) => {
      if (!query) return true;
      return item.name.toLocaleLowerCase().includes(query);
    });

    const sorted = [...filtered].sort((left, right) => {
      if (sortKey === 'A_Z') {
        return left.name.localeCompare(right.name, 'tr');
      }
      return (right.productCount ?? 0) - (left.productCount ?? 0);
    });

    return sorted;
  }, [categories, searchQuery, sortKey]);

  const featuredCategories = React.useMemo(
    () => visibleCategories.slice(0, 3),
    [visibleCategories],
  );
  const gridCategories = React.useMemo(
    () => visibleCategories.slice(3),
    [visibleCategories],
  );

  function handleOpenCategory(cat: Category) {
    router.push({
      pathname: '/(tabs)/categories/[id]',
      params: { id: cat.id, name: cat.name, slug: cat.slug },
    });
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isError || !categories?.length) {
    return (
      <View style={styles.center}>
        <Ionicons name="grid-outline" size={48} color={Colors.slate300} />
        <Text style={styles.emptyText}>{t('categories.empty')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.8}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.headerSection}>
        <Text style={styles.headerEyebrow}>{t('categories.premiumBadge')}</Text>
        <Text style={styles.headerTitle}>{t('categories.heroTitle')}</Text>
        <Text style={styles.headerSubtitle}>{t('categories.heroSubtitle')}</Text>
        <View style={styles.searchBarWrap}>
          <Ionicons name="search" size={18} color={Colors.slate500} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('categories.searchPlaceholder')}
            placeholderTextColor={Colors.slate400}
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
      </View>

      <View style={styles.sortSection}>
        <TouchableOpacity
          style={[styles.sortButton, sortKey === 'POPULAR' && styles.sortButtonActive]}
          activeOpacity={0.85}
          onPress={() => setSortKey('POPULAR')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'POPULAR' && styles.sortButtonTextActive]}>
            {t('categories.sortPopular')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortKey === 'A_Z' && styles.sortButtonActive]}
          activeOpacity={0.85}
          onPress={() => setSortKey('A_Z')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'A_Z' && styles.sortButtonTextActive]}>
            {t('categories.sortAlphabetic')}
          </Text>
        </TouchableOpacity>
      </View>

      {featuredCategories.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('categories.featuredTitle')}</Text>
          </View>
          <View style={styles.featuredList}>
            {featuredCategories.map((cat) => {
              const { icon, color } = getCategoryIcon(cat.slug);
              const hasImage = Boolean(cat.imageUrl) && !imageErrors[cat.id];
              return (
                <TouchableOpacity
                  key={`featured-${cat.id}`}
                  style={[styles.featuredCard, { borderLeftWidth: 4, borderLeftColor: color }]}
                  activeOpacity={0.86}
                  onPress={() => handleOpenCategory(cat)}
                >
                  {hasImage ? (
                    <Image
                      source={{ uri: cat.imageUrl ?? undefined }}
                      style={styles.featuredImage}
                      onError={() => setImageErrors((prev) => ({ ...prev, [cat.id]: true }))}
                    />
                  ) : (
                    <View style={[styles.featuredIconWrap, { backgroundColor: `${color}15` }]}>
                      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color={color} />
                    </View>
                  )}
                  <View style={styles.featuredContent}>
                    <Text style={styles.featuredName} numberOfLines={1}>{cat.name}</Text>
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredBadgeText}>
                        {t('categories.productCount_other', { count: cat.productCount ?? 0 })}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('categories.allCategoriesTitle')}</Text>
      </View>
      <View style={styles.grid}>
        {gridCategories.map((cat) => {
          const { icon, color } = getCategoryIcon(cat.slug);
          const hasImage = Boolean(cat.imageUrl) && !imageErrors[cat.id];
          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.gridCard}
              activeOpacity={0.7}
              onPress={() => handleOpenCategory(cat)}
            >
              {cat.productCount != null && (
                <View style={styles.gridCardBadge}>
                  <Text style={styles.gridCardBadgeText}>
                    {cat.productCount}
                  </Text>
                </View>
              )}
              {hasImage ? (
                <Image
                  source={{ uri: cat.imageUrl ?? undefined }}
                  style={styles.gridImage}
                  onError={() => setImageErrors((prev) => ({ ...prev, [cat.id]: true }))}
                />
              ) : (
                <View style={[styles.gridIconWrap, { backgroundColor: `${color}15` }]}>
                  <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={28} color={color} />
                </View>
              )}
              <Text style={styles.gridCardName} numberOfLines={2}>{cat.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {visibleCategories.length === 0 ? (
        <View style={styles.emptySearchState}>
          <Ionicons name="search-outline" size={26} color={Colors.slate400} />
          <Text style={styles.emptySearchText}>{t('categories.emptySearch')}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
