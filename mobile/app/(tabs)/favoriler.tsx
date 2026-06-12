import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ProductCard } from '../../components/ui';
import { Colors, Spacing } from '../../constants/theme';
import { useToggleFavorite, useFavorites } from '../../hooks/useSearch';
import { useToastStore } from '../../store/toastStore';
import { formatShortDate } from '../../utils/transactionFormatters';
import { styles } from '../../styles/tabs/FavoritesScreen.styles';

export default function FavorilerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const favorites = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const showToast = useToastStore((state) => state.showToast);

  const handleRemove = async (productId: string) => {
    try {
      const response = await toggleFavorite.mutateAsync(productId);
      showToast({
        message: t(`api.${response.code}`, { defaultValue: response.message }),
        type: 'success',
      });
    } catch {
      showToast({
        message: t('favoritesScreen.loadError'),
        type: 'error',
      });
    }
  };

  if (favorites.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.centerBody}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (favorites.isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="heart-dislike-outline" size={42} color={Colors.slate400} />
        <Text style={styles.centerTitle}>{t('favoritesScreen.loadError')}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => favorites.refetch()}
        >
          <Ionicons name="refresh" size={18} color={Colors.onPrimary} />
          <Text style={styles.primaryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const items = favorites.data?.items ?? [];

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="heart-outline" size={48} color={Colors.slate400} />
        <Text style={styles.centerTitle}>{t('favoritesScreen.emptyTitle')}</Text>
        <Text style={styles.centerBody}>{t('favoritesScreen.emptyBody')}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/explore' as never)}
        >
          <Ionicons name="compass-outline" size={18} color={Colors.onPrimary} />
          <Text style={styles.primaryButtonText}>{t('favoritesScreen.browse')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.base },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.title}>{t('favoritesScreen.title')}</Text>
        <Text style={styles.subtitle}>{t('favoritesScreen.subtitle')}</Text>
        <Text style={styles.count}>{`${items.length} ${t('tabs.favorites')}`}</Text>
      </View>

      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <ProductCard
              item={item}
              onPress={() => router.push(`/product/${item.id}` as never)}
            />
            <View style={styles.listActions}>
              <Text style={styles.savedAt}>
                {t('favoritesScreen.savedAt')}: {formatShortDate(item.favoritedAt)}
              </Text>
              <TouchableOpacity
                style={styles.removeButton}
                activeOpacity={0.85}
                onPress={() => handleRemove(item.id)}
              >
                <Ionicons name="heart-dislike-outline" size={16} color={Colors.error} />
                <Text style={styles.removeButtonText}>{t('favoritesScreen.remove')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
