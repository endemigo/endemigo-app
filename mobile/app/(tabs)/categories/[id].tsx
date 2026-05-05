import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useProducts, Product } from '../../../hooks/useProducts';
import { Colors } from '../../../constants/theme';
import { ProductCard } from '../../../components/ui';
import { styles } from '../../../styles/tabs/categories/[id].styles';

export default function CategoryDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useProducts(1);

  const products = (data?.items || []).filter((item) => item.categoryId === id || item.categoryName === name);

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name || t('categories.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {!products.length ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={46} color={Colors.slate300} />
          <Text style={styles.emptyText}>{t('categories.emptyCategory')}</Text>
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

