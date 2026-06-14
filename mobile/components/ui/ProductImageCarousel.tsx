import React, { useState } from 'react';
import { View, FlatList, Image, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ProductImage } from '../../types';
import { styles } from './ProductImageCarousel.styles';

interface Props {
  images?: ProductImage[];
  fallbackImage: string;
  height: number;
}

export function ProductImageCarousel({ images = [], fallbackImage, height }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);

  // Sort images by sortOrder ASC
  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const slides = sortedImages.length > 0 ? sortedImages.map(img => img.url) : [fallbackImage];

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / containerWidth);
    setActiveIndex(index);
  };

  const handleLayout = (e: any) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  return (
    <View 
      style={[styles.wrapper, { height }]} 
      onLayout={handleLayout}
    >
      <FlatList
        data={slides}
        keyExtractor={(item, idx) => `${item}-${idx}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.listContainer}
        renderItem={({ item }) => (
          <View style={[styles.imageContainer, { width: containerWidth, height }]}>
            <Image 
              source={{ uri: item }} 
              style={styles.image} 
              resizeMode="cover" 
            />
          </View>
        )}
      />
      {slides.length > 1 && (
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View 
              key={i} 
              style={[styles.dot, i === activeIndex && styles.dotActive]} 
            />
          ))}
        </View>
      )}
    </View>
  );
}
