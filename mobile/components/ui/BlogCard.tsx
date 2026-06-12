import { Blog } from '@/types';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { styles } from './BlogCard.styles';

interface Props {
  item: Blog;
  onPress: () => void;
}

export function BlogCard({ item, onPress }: Props) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const title = currentLang === 'en' && item.titleEn ? item.titleEn : item.title;
  const excerpt = currentLang === 'en' && item.excerptEn ? item.excerptEn : item.excerpt;
  const readTime = currentLang === 'en' && item.readTimeEn ? item.readTimeEn : item.readTime;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: item.image }} style={styles.image} contentFit="cover" />
      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{t('blogDetail.categoryFallback')}</Text>
          <View style={styles.dot} />
          <Text style={styles.metaText}>{readTime}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.excerpt} numberOfLines={2}>
          {excerpt}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.readMore}>{t('home.readMore')}</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
