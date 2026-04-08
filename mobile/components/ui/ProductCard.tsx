import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface Product {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  categoryName?: string;
  [key: string]: any;
}

interface Props {
  item: Product;
  onPress: () => void;
  /** variant: 'grid' (2-col, default) | 'square' (1-row horizontal) */
  variant?: 'grid' | 'square';
}

const SQUARE_SIZE = 148;

/**
 * ProductCard — ürün kartı, iki farklı variant destekler:
 *  - 'grid'   : ana sayfadaki 2 sütunlu grid için
 *  - 'square' : kategori satırlarındaki kare kart için
 */
export function ProductCard({ item, onPress, variant = 'grid' }: Props) {
  if (variant === 'square') {
    return (
      <TouchableOpacity style={styles.squareCard} onPress={onPress} activeOpacity={0.75}>
        <Image
          source={{
            uri: item.imageUrl || 'https://placehold.co/148x148/F8F9FA/0097D8?text=Ürün',
          }}
          style={styles.squareImage}
          resizeMode="cover"
        />
        <View style={styles.squareBody}>
          <Text style={styles.squareTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.squarePrice}>₺{Number(item.price).toLocaleString('tr-TR')}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.gridCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.gridImageContainer}>
        <Image
          source={{
            uri: item.imageUrl || 'https://placehold.co/200x200/F8F9FA/0097D8?text=Ürün',
          }}
          style={styles.gridImage}
          resizeMode="cover"
        />
      </View>
      <View style={styles.gridBody}>
        <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
        {item.categoryName && (
          <Text style={styles.gridCategory}>{item.categoryName}</Text>
        )}
        <View style={styles.gridFooter}>
          <Text style={styles.gridPrice}>
            ₺{Number(item.price).toLocaleString('tr-TR')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ─── Square variant ───
  squareCard: {
    width: SQUARE_SIZE,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  squareImage: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    backgroundColor: Colors.surfaceContainerLow,
  },
  squareBody: {
    padding: Spacing.sm,
  },
  squareTitle: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.onSurface,
    lineHeight: 16,
    marginBottom: 2,
  },
  squarePrice: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    color: Colors.primary,
  },

  // ─── Grid variant ───
  gridCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  gridImageContainer: {
    height: 160,
    backgroundColor: Colors.surfaceContainerLow,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridBody: {
    padding: Spacing.md,
  },
  gridTitle: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  gridCategory: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridPrice: {
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    color: Colors.primary,
  },
});
