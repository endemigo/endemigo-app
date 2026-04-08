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

// Icon mapping by category slug — no hardcoded data, just visual hints
const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  gida: { icon: 'restaurant', color: Colors.primary },
  zeytinyagi: { icon: 'leaf', color: Colors.secondary },
  taki: { icon: 'diamond', color: Colors.accent },
  giyim: { icon: 'shirt', color: '#9333EA' },
  aricilik: { icon: 'flower', color: '#F59E0B' },
  el_sanatlari: { icon: 'color-palette', color: '#EC4899' },
  mobilya: { icon: 'bed', color: '#3B82F6' },
  bahce: { icon: 'rose', color: '#16A34A' },
  kozmetik: { icon: 'sparkles', color: '#D946EF' },
  seramik: { icon: 'flask', color: '#B45309' },
  kurutulmus: { icon: 'nutrition', color: '#DC2626' },
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
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
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
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.onSurfaceVariant,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.sm,
  },
  retryText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  card: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardName: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  cardCount: {
    fontSize: 10,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
});
