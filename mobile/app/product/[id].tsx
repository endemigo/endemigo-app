import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useProduct } from '../../hooks/useProducts';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { styles } from './[id].styles';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: product, isLoading } = useProduct(id);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{t('product.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Section */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.imageUrl || 'https://placehold.co/400x300/F8F9FA/0097D8?text=Ürün' }}
            style={styles.image}
            resizeMode="cover"
          />
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
          {/* Share Button */}
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-outline" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {product.categoryName && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{product.categoryName}</Text>
            </View>
          )}

          <Text style={styles.title}>{product.title}</Text>

          <Text style={styles.price}>
            ₺{Number(product.price).toLocaleString('tr-TR')}
          </Text>

          {/* Seller Card */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              <Ionicons name="storefront" size={20} color={Colors.primary} />
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerLabel}>{t('product.seller')}</Text>
              <Text style={styles.sellerName}>
                {product.sellerName || 'Bilinmiyor'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('product.descriptionTitle')}</Text>
              <View style={styles.descriptionCard}>
                <Text style={styles.description}>{product.description}</Text>
              </View>
            </View>
          )}

          {/* Trust Badges */}
          <View style={styles.trustRow}>
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.secondary} />
              <Text style={styles.trustText}>{t('product.trust_original')}</Text>
            </View>
            <View style={styles.trustBadge}>
              <Ionicons name="flash" size={16} color={Colors.accent} />
              <Text style={styles.trustText}>{t('product.trust_shipping')}</Text>
            </View>
            <View style={styles.trustBadge}>
              <Ionicons name="return-down-back" size={16} color={Colors.primary} />
              <Text style={styles.trustText}>{t('product.trust_return')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceLabel}>{t('product.priceLabel')}</Text>
          <Text style={styles.bottomPriceValue}>
            ₺{Number(product.price).toLocaleString('tr-TR')}
          </Text>
        </View>
        <TouchableOpacity style={styles.addToCartButton} activeOpacity={0.8}>
          <Ionicons name="cart" size={20} color={Colors.white} />
          <Text style={styles.addToCartText}>{t('product.buyNow')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
