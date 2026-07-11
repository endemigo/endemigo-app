import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { styles } from './FullscreenImageViewer.styles';

interface Props {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

// Lot/ürün görselleri için tam ekran görüntüleyici: sayfalı kaydırma,
// iOS'ta pinch-zoom (ScrollView maximumZoomScale), sayaç ve kapat düğmesi.
export function FullscreenImageViewer({ visible, images, initialIndex = 0, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<string>>(null);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    if (visible) setActiveIndex(initialIndex);
  }, [visible, initialIndex]);

  if (!images.length) return null;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.min(Math.max(index, 0), images.length - 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(item, idx) => `${item}-${idx}`}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          renderItem={({ item }) => (
            <ScrollView
              style={{ width, height }}
              contentContainerStyle={styles.zoomContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
              bouncesZoom
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              centerContent
            >
              <Image
                source={{ uri: item }}
                style={{ width, height: height * 0.8 }}
                resizeMode="contain"
              />
            </ScrollView>
          )}
        />

        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>

        {images.length > 1 ? (
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {activeIndex + 1} / {images.length}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
