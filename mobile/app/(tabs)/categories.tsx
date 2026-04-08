import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../hooks/useProducts';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { styles } from './categories.styles';

// Icon mapping by category slug — no hardcoded data, just visual hints
const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
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

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const { data: categories, isLoading, isError, refetch } = useCategories();

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
      <View style={styles.grid}>
        {categories.map((cat) => {
          const { icon, color } = getCategoryIcon(cat.slug);
          return (
            <TouchableOpacity key={cat.id} style={styles.card} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: `${color}1A` }]}>
                <Ionicons name={icon as any} size={28} color={color} />
              </View>
              <Text style={styles.cardName} numberOfLines={2}>{cat.name}</Text>
              {(cat as any).productCount != null && (
                <Text style={styles.cardCount}>
                  {t('categories.productCount_other', { count: (cat as any).productCount })}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}
