import { Product } from '@/types';
import React from 'react';
import { ScrollView, View, StyleSheet, Dimensions } from 'react-native';
import { ProductCard } from './ProductCard';
import { Spacing } from '../../constants/theme';

interface Props {
  data: Product[];
  onPress: (item: Product) => void;
  rows?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.45; // slightly thinner for horizontal scroll

export function HorizontalProductGrid({ data, onPress, rows = 2 }: Props) {
  // Group objects into columns of N rows
  const columns = [];
  for (let i = 0; i < data.length; i += rows) {
    columns.push(data.slice(i, i + rows));
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      snapToInterval={ITEM_WIDTH + Spacing.base}
      snapToAlignment="start"
      decelerationRate="fast"
    >
      {columns.map((col, colIdx) => (
        <View key={`col-${colIdx}`} style={styles.column}>
          {col.map((item) => (
            <View key={item.id} style={styles.cardWrapper}>
              <ProductCard item={item} onPress={() => onPress(item)} variant="grid" />
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingLeft: Spacing.base,
    paddingRight: Spacing.base,
    gap: Spacing.base,
  },
  column: {
    gap: Spacing.base,
    width: ITEM_WIDTH,
  },
  cardWrapper: {
    width: '100%',
  },
});
