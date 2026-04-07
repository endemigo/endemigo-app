import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProduct } from '../../hooks/useProducts';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading } = useProduct(id);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Ürün bulunamadı</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Geri</Text>
      </TouchableOpacity>

      <Image
        source={{ uri: product.imageUrl || 'https://placehold.co/400x300?text=Ürün' }}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={styles.content}>
        <Text style={styles.title}>{product.title}</Text>

        <Text style={styles.price}>
          {Number(product.price).toLocaleString('tr-TR')} ₺
        </Text>

        {product.categoryName && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.categoryName}</Text>
          </View>
        )}

        {product.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Açıklama</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Satıcı</Text>
          <View style={styles.sellerCard}>
            <Text style={styles.sellerIcon}>🏪</Text>
            <Text style={styles.sellerName}>
              {product.sellerName || 'Bilinmiyor'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.auctionButton} disabled>
          <Text style={styles.auctionButtonText}>🔨 Müzayedeye Git</Text>
          <Text style={styles.comingSoon}>Yakında</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(15, 15, 26, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: '#2A2A3E',
  },
  content: {
    padding: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  price: {
    color: '#6C5CE7',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#2A2A3E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  categoryText: {
    color: '#A0A0B0',
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#A0A0B0',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  description: {
    color: '#D0D0E0',
    fontSize: 15,
    lineHeight: 22,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    padding: 16,
    borderRadius: 12,
  },
  sellerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sellerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  auctionButton: {
    backgroundColor: '#2A2A3E',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
    opacity: 0.5,
  },
  auctionButtonText: {
    color: '#A0A0B0',
    fontSize: 18,
    fontWeight: '700',
  },
  comingSoon: {
    color: '#6C5CE7',
    fontSize: 12,
    marginTop: 4,
  },
});
