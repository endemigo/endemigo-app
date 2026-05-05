import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Colors } from '../../constants/theme';
import { useCartStore } from '../../store/cartStore';
import { useToastStore } from '../../store/toastStore';
import { styles } from '../../styles/tabs/cart.styles';

export default function CartScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity);
  const showToast = useToastStore((state) => state.showToast);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 1500 ? 0 : 89;
  const serviceFee = Math.round(subtotal * 0.02);
  const grandTotal = subtotal + shipping + serviceFee;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleRemoveItem = (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    removeItem(itemId)
      .then(() => {
        showToast({ message: t('cart.itemRemoved'), type: 'info' });
      })
      .catch(() => undefined);
  };

  const handleQuantityChange = (itemId: string, currentQty: number, delta: number) => {
    const nextQty = currentQty + delta;
    if (nextQty < 1 || nextQty > 99) return;
    Haptics.selectionAsync().catch(() => undefined);
    updateItemQuantity(itemId, nextQty).catch(() => undefined);
  };

  if (!items.length) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.iconCircle}>
            <Ionicons name="cart-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{t('cart.empty')}</Text>
          <Text style={styles.subtitle}>{t('cart.emptySub')}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/(tabs)/home')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{t('cart.startShopping')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroTitle}>{t('cart.title')}</Text>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color={Colors.white} />
            <Text style={styles.heroBadgeText}>{t('cart.premiumLabel')}</Text>
          </View>
        </View>
        <Text style={styles.heroMeta}>{t('cart.selectedItems', { count: totalQuantity })}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Swipeable
            overshootRight={false}
            renderRightActions={() => (
              <TouchableOpacity
                style={styles.swipeDeleteAction}
                onPress={() => handleRemoveItem(item.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="trash" size={18} color={Colors.white} />
                <Text style={styles.swipeDeleteText}>{t('cart.remove')}</Text>
              </TouchableOpacity>
            )}
          >
            <View style={styles.itemCard}>
              <Image
                source={{ uri: item.imageUrl || 'https://placehold.co/96x96/F8F9FA/0097D8?text=Endemigo' }}
                style={styles.itemImage}
              />
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.itemMeta}>{t('cart.unitPrice')}: ₺{item.price.toLocaleString('tr-TR')}</Text>
                <View style={styles.bottomRow}>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleQuantityChange(item.id, item.quantity, -1)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="remove" size={14} color={Colors.onSurface} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleQuantityChange(item.id, item.quantity, 1)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={14} color={Colors.onSurface} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemPrice}>₺{(item.price * item.quantity).toLocaleString('tr-TR')}</Text>
                </View>
              </View>
            </View>
          </Swipeable>
        )}
      />

      <View style={styles.summaryCard}>
        <View style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>{t('cart.subtotal')}</Text>
          <Text style={styles.summaryLabel}>₺{subtotal.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>{t('cart.shipping')}</Text>
          <Text style={styles.summaryLabel}>{shipping === 0 ? t('cart.free') : `₺${shipping.toLocaleString('tr-TR')}`}</Text>
        </View>
        <View style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>{t('cart.serviceFee')}</Text>
          <Text style={styles.summaryLabel}>₺{serviceFee.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryValueLabel}>{t('cart.total')}</Text>
          <Text style={styles.summaryValue}>₺{grandTotal.toLocaleString('tr-TR')}</Text>
        </View>

        <View style={styles.summaryActions}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              clearCart().then(() => showToast({ message: t('cart.cleared'), type: 'info' })).catch(() => undefined);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.clearButtonText}>{t('cart.clear')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.checkoutButton} activeOpacity={0.8}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.white} />
            <Text style={styles.checkoutButtonText}>{t('cart.checkout')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.secureHint}>{t('cart.secureCheckout')}</Text>
      </View>
    </View>
  );
}
