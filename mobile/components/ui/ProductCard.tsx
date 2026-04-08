import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { styles } from './ProductCard.styles';

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
