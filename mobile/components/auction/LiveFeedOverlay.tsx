import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import { styles } from './LiveFeedOverlay.styles';

export interface LiveFeedOverlayItem {
  id: string;
  title: string;
  body: string;
  tone: 'accent' | 'error' | 'primary';
}

interface Props {
  // En yeni kayıt başta beklenir (socket feed sırası); ekranda alta yakın durur.
  items: LiveFeedOverlayItem[];
  maxItems?: number;
}

// Instagram canlı yayını tarzı bindirme: lot görselinin alt kısmında son
// olaylar yarı saydam baloncuklar halinde akar; en yenisi en altta belirir.
// pointerEvents="none" — dokunuşlar alttaki görsele (tam ekran) geçer.
export function LiveFeedOverlay({ items, maxItems = 5 }: Props) {
  const visible = items.slice(0, maxItems).reverse();

  if (!visible.length) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {visible.map((item, index) => (
        <FeedBubble
          key={item.id}
          item={item}
          // Üstteki (eski) baloncuklar gittikçe soluklaşır.
          maxOpacity={0.45 + 0.55 * ((index + 1) / visible.length)}
        />
      ))}
    </View>
  );
}

function FeedBubble({ item, maxOpacity }: { item: LiveFeedOverlayItem; maxOpacity: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: maxOpacity, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY, maxOpacity]);

  return (
    <Animated.View style={[styles.bubble, { opacity, transform: [{ translateY }] }]}>
      <Text style={[styles.bubbleTitle, item.tone === 'error' && styles.bubbleTitleAlert]} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.bubbleBody} numberOfLines={2}>
        {item.body}
      </Text>
    </Animated.View>
  );
}
