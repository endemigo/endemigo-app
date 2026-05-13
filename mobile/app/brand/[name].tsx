import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/theme';
import { useProductsByBrand } from '../../hooks/useProducts';
import { ProductCard } from '../../components/ui';
import { styles } from './_name.styles';

export default function BrandProductsScreen() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const decodedBrandName = React.useMemo(
    () => decodeURIComponent(String(name ?? '')).trim(),
    [name],
  );
  const { data, isLoading, isError, refetch } = useProductsByBrand(decodedBrandName, 1);
  const products = data?.items ?? [];

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
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.85}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} activeOpacity={0.85} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('product.brandProductsTitle', { brand: decodedBrandName })}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {products.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={46} color={Colors.slate300} />
          <Text style={styles.emptyText}>{t('product.brandProductsEmpty')}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          <View style={styles.grid}>
            {products.map((item) => (
              <View key={item.id} style={styles.cardWrap}>
                <ProductCard item={item} onPress={() => router.push(`/product/${item.id}`)} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
