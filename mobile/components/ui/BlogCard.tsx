import { Blog } from '@/types';
import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { styles } from './BlogCard.styles';

interface Props {
  item: Blog;
  onPress: () => void;
}

export function BlogCard({ item, onPress }: Props) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{item.category}</Text>
          <View style={styles.dot} />
          <Text style={styles.metaText}>{item.readTime}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.excerpt} numberOfLines={2}>
          {item.excerpt}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.readMore}>{t('home.readMore')}</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
