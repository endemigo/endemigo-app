import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBlogs } from '../../hooks/useProducts';
import { Colors } from '../../constants/theme';
import { formatShortDate } from '../../utils/transactionFormatters';
import { styles } from '../../styles/blog/BlogDetailScreen.styles';

const BLOG_PLACEHOLDER =
  'https://placehold.co/1000x600/F8F9FA/0097D8?text=Endemigo';

function formatHtmlToText(html: string) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p>/gi, '')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<h[1-6]>/gi, '')
    .replace(/<li>/gi, ' • ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/?[a-z0-9]+[^>]*>/gi, '') // Tüm diğer HTML etiketlerini temizle
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export default function BlogDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const blogs = useBlogs();

  const blog = React.useMemo(() => {
    const items = blogs.data ?? [];
    return items.find(
      (item) => item.slug === id || String(item.id) === String(id),
    );
  }, [blogs.data, id]);

  if (blogs.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.centerBody}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!blog) {
    return (
      <View style={styles.center}>
        <Ionicons name="newspaper-outline" size={42} color={Colors.slate400} />
        <Text style={styles.centerTitle}>{t('blogDetail.storyNotFound')}</Text>
        <Text style={styles.centerBody}>
          {t('blogDetail.storyNotFoundBody')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={{ uri: blog.image || BLOG_PLACEHOLDER }}
        style={styles.heroImage}
      />
      <View style={styles.body}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.85}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          <Text style={styles.backText}>{t('blogDetail.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{blog.title}</Text>
        <Text style={styles.meta}>
          {t('blogDetail.publishedAt')}:{' '}
          {formatShortDate(blog.publishedAt)}
        </Text>
        <Text style={styles.excerpt}>{blog.excerpt}</Text>
        <Text style={styles.paragraph}>{formatHtmlToText(blog.body || blog.excerpt)}</Text>
      </View>
    </ScrollView>
  );
}
