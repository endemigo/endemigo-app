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
import { useProduct } from '../../hooks/useProducts';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
        <Text style={styles.errorText}>Ürün bulunamadı</Text>
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
              <Text style={styles.sellerLabel}>Satıcı</Text>
              <Text style={styles.sellerName}>
                {product.sellerName || 'Bilinmiyor'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ürün Açıklaması</Text>
              <View style={styles.descriptionCard}>
                <Text style={styles.description}>{product.description}</Text>
              </View>
            </View>
          )}

          {/* Trust Badges */}
          <View style={styles.trustRow}>
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.secondary} />
              <Text style={styles.trustText}>Orijinal</Text>
            </View>
            <View style={styles.trustBadge}>
              <Ionicons name="flash" size={16} color={Colors.accent} />
              <Text style={styles.trustText}>Hızlı Kargo</Text>
            </View>
            <View style={styles.trustBadge}>
              <Ionicons name="return-down-back" size={16} color={Colors.primary} />
              <Text style={styles.trustText}>İade Garantisi</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceLabel}>Fiyat</Text>
          <Text style={styles.bottomPriceValue}>
            ₺{Number(product.price).toLocaleString('tr-TR')}
          </Text>
        </View>
        <TouchableOpacity style={styles.addToCartButton} activeOpacity={0.8}>
          <Ionicons name="cart" size={20} color={Colors.white} />
          <Text style={styles.addToCartText}>Hemen Al</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyMedium,
  },

  // Image
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 320,
    backgroundColor: Colors.surfaceContainerLow,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: Spacing.base,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  shareButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    right: Spacing.base,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },

  // Content
  content: {
    padding: Spacing.lg,
  },
  categoryBadge: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  categoryText: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  title: {
    color: Colors.onSurface,
    fontSize: FontSize.titleLg,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    lineHeight: 30,
  },
  price: {
    color: Colors.primary,
    fontSize: FontSize.heading,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    marginBottom: Spacing.lg,
  },

  // Seller
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: `${Colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
  sellerName: {
    color: Colors.onSurface,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },

  // Section
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.meta,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  descriptionCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  description: {
    color: Colors.onSurface,
    fontSize: FontSize.bodyLg,
    fontFamily: FontFamily.body,
    lineHeight: 24,
  },

  // Trust Badges
  trustRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  trustBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  trustText: {
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.base,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    ...Shadows.tabBar,
  },
  bottomPrice: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
  bottomPriceValue: {
    fontSize: FontSize.title,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    color: Colors.primary,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.xl,
    ...Shadows.colored(Colors.accent),
  },
  addToCartText: {
    color: Colors.white,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '700',
  },
});
