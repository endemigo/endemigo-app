import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useProducts } from '../../hooks/useProducts';

export default function HomeScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useProducts(1);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Ürünler yükleniyor...</Text>
      </View>
    );
  }

  if (!data?.items?.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={styles.emptyText}>Henüz ürün yok</Text>
        <Text style={styles.emptySubtext}>Satıcılar ürün eklediğinde burada görünecek</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>🛍️ Ürünler</Text>
      <FlatList
        data={data.items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/product/${item.id}`)}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: item.imageUrl || 'https://placehold.co/200x200?text=Ürün' }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.cardBody}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.price}>
                {Number(item.price).toLocaleString('tr-TR')} ₺
              </Text>
              {item.categoryName && (
                <Text style={styles.category}>{item.categoryName}</Text>
              )}
              {item.sellerName && (
                <Text style={styles.seller}>🏪 {item.sellerName}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
  },
  loadingText: {
    color: '#A0A0B0',
    marginTop: 12,
    fontSize: 16,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtext: {
    color: '#A0A0B0',
    fontSize: 14,
    marginTop: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    width: '48%',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 140,
    backgroundColor: '#2A2A3E',
  },
  cardBody: {
    padding: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  price: {
    color: '#6C5CE7',
    fontSize: 18,
    fontWeight: '800',
  },
  category: {
    color: '#A0A0B0',
    fontSize: 11,
    marginTop: 4,
    backgroundColor: '#2A2A3E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  seller: {
    color: '#A0A0B0',
    fontSize: 11,
    marginTop: 4,
  },
});
