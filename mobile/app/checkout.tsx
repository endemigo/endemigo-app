import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddressType } from '@endemigo/shared';
import { Colors } from '../constants/theme';
import { useAddresses } from '../hooks/useAddresses';
import { useCheckoutCart, useCheckoutQuote } from '../hooks/useOrders';
import { useCartStore } from '../store/cartStore';
import { useModalStore } from '../store/modalStore';
import { useToastStore } from '../store/toastStore';
import { formatCurrency } from '../utils/transactionFormatters';
import { resolveApiErrorMessage } from '../utils/apiError';
import { styles } from '../styles/checkout.styles';

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const showModal = useModalStore((state) => state.showModal);
  const showToast = useToastStore((state) => state.showToast);

  const addresses = useAddresses(AddressType.SHIPPING);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>(undefined);

  const quote = useCheckoutQuote(appliedCoupon);
  const checkoutCart = useCheckoutCart();

  // Varsayılan teslimat adresini otomatik seç.
  useEffect(() => {
    if (selectedAddressId || !addresses.data?.length) return;
    const preferred = addresses.data.find((address) => address.isDefault) ?? addresses.data[0];
    setSelectedAddressId(preferred.id);
  }, [addresses.data, selectedAddressId]);

  // Kupon reddedilirse (quote hatası) kuponu geri al, sepeti bozmadan sürdür.
  useEffect(() => {
    if (quote.isError && appliedCoupon) {
      showToast({
        message: resolveApiErrorMessage(quote.error, t, 'checkout.couponRejected'),
        type: 'error',
      });
      setAppliedCoupon(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.isError]);

  // Quote yüklenene kadar yerel özet göster (sunucu tutarları geldiğinde değişir).
  const localSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  const summary = quote.data ?? {
    items: [],
    subtotal: localSubtotal,
    discountTotal: 0,
    coupon: null,
    discountedSubtotal: localSubtotal,
    shipping: localSubtotal > 1500 ? 0 : 89,
    serviceFee: Math.round(localSubtotal * 0.02),
    grandTotal: 0,
  };
  const grandTotal =
    quote.data?.grandTotal ??
    summary.discountedSubtotal + summary.shipping + summary.serviceFee;

  const selectedAddress = addresses.data?.find(
    (address) => address.id === selectedAddressId,
  );

  const handleApplyCoupon = () => {
    const code = couponInput.trim();
    if (!code) return;
    Haptics.selectionAsync().catch(() => undefined);
    setAppliedCoupon(code);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(undefined);
    setCouponInput('');
  };

  const handleConfirm = () => {
    if (checkoutCart.isPending) return;
    if (!selectedAddress) {
      showToast({
        message: t('checkout.addressRequired', {
          defaultValue: 'Devam etmek için bir teslimat adresi seçin',
        }),
        type: 'error',
      });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

    showModal({
      title: t('cart.checkoutConfirmTitle'),
      message: t('checkout.confirmMessage', {
        defaultValue: '{{total}} tutarındaki siparişi onaylıyor musunuz?',
        total: formatCurrency(grandTotal),
      }),
      type: 'info',
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onConfirm: () => {
        checkoutCart.mutate(
          {
            shippingAddressId: selectedAddress.id,
            couponCode: appliedCoupon,
          },
          {
            onSuccess: () => {
              showModal({
                title: t('cart.checkoutSuccessTitle'),
                message: t('cart.checkoutSuccessMessage'),
                type: 'success',
                confirmText: t('common.ok'),
                onConfirm: () => {
                  router.replace('/(tabs)/orders');
                },
              });
            },
            onError: (error) => {
              showModal({
                title: t('common.error'),
                message: resolveApiErrorMessage(error, t, 'common.genericError'),
                type: 'error',
              });
            },
          },
        );
      },
      onCancel: () => undefined,
    });
  };

  if (!items.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="cart-outline" size={48} color={Colors.slate300} />
          <Text style={styles.sectionTitle}>{t('cart.empty')}</Text>
          <TouchableOpacity
            style={styles.addAddressButton}
            onPress={() => router.replace('/(tabs)/home')}
            activeOpacity={0.8}
          >
            <Text style={styles.addAddressText}>{t('cart.startShopping')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('checkout.title', { defaultValue: 'Siparişi Tamamla' })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Teslimat adresi */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>
              {t('checkout.shippingAddress', { defaultValue: 'Teslimat Adresi' })}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/addresses' as never)}>
              <Text style={styles.sectionAction}>
                {t('checkout.manageAddresses', { defaultValue: 'Adreslerim' })}
              </Text>
            </TouchableOpacity>
          </View>

          {addresses.isLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : addresses.data?.length ? (
            addresses.data.map((address) => {
              const selected = address.id === selectedAddressId;
              return (
                <TouchableOpacity
                  key={address.id}
                  style={[styles.addressOption, selected && styles.addressOptionSelected]}
                  onPress={() => setSelectedAddressId(address.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? Colors.primary : Colors.slate400}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressTitle}>
                      {address.title} · {address.fullName}
                    </Text>
                    <Text style={styles.addressBody} numberOfLines={2}>
                      {address.addressLine}, {address.district}/{address.city}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <>
              <Text style={styles.addressEmpty}>
                {t('checkout.noAddress', {
                  defaultValue: 'Kayıtlı teslimat adresiniz yok. Devam etmek için bir adres ekleyin.',
                })}
              </Text>
              <TouchableOpacity
                style={styles.addAddressButton}
                onPress={() => router.push('/(tabs)/addresses' as never)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={Colors.primary} />
                <Text style={styles.addAddressText}>
                  {t('checkout.addAddress', { defaultValue: 'Adres Ekle' })}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Kupon */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {t('checkout.couponTitle', { defaultValue: 'İndirim Kuponu' })}
          </Text>
          {appliedCoupon && quote.data?.coupon ? (
            <View style={styles.couponApplied}>
              <Text style={styles.couponAppliedText}>
                {quote.data.coupon.code} · -{formatCurrency(quote.data.coupon.discountAmount)}
              </Text>
              <TouchableOpacity onPress={handleRemoveCoupon}>
                <Text style={styles.couponRemoveText}>
                  {t('checkout.removeCoupon', { defaultValue: 'Kaldır' })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponRow}>
              <TextInput
                style={styles.couponInput}
                value={couponInput}
                onChangeText={setCouponInput}
                placeholder={t('checkout.couponPlaceholder', {
                  defaultValue: 'Kupon kodu girin',
                })}
                placeholderTextColor={Colors.slate400}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.couponButton}
                onPress={handleApplyCoupon}
                activeOpacity={0.8}
                disabled={quote.isFetching}
              >
                {quote.isFetching && appliedCoupon ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.couponButtonText}>
                    {t('checkout.applyCoupon', { defaultValue: 'Uygula' })}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Özet */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {t('checkout.summaryTitle', { defaultValue: 'Sipariş Özeti' })}
          </Text>
          {(quote.data?.items ?? []).map((line) => (
            <View key={line.cartItemId} style={styles.itemLine}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {line.title ?? line.productId} × {line.quantity}
              </Text>
              <Text style={styles.itemAmount}>{formatCurrency(line.lineFinal)}</Text>
            </View>
          ))}
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>{t('cart.subtotal')}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.subtotal)}</Text>
          </View>
          {summary.discountTotal > 0 && (
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>
                {t('checkout.discount', { defaultValue: 'İndirim' })}
              </Text>
              <Text style={styles.discountValue}>
                -{formatCurrency(summary.discountTotal)}
              </Text>
            </View>
          )}
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>{t('cart.shipping')}</Text>
            <Text style={styles.summaryValue}>
              {summary.shipping === 0 ? t('cart.free') : formatCurrency(summary.shipping)}
            </Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>{t('cart.serviceFee')}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.serviceFee)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('cart.total')}</Text>
            {quote.isFetching ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!selectedAddress || checkoutCart.isPending) && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          activeOpacity={0.8}
          disabled={checkoutCart.isPending}
        >
          {checkoutCart.isPending ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={16} color={Colors.white} />
              <Text style={styles.confirmButtonText}>
                {t('checkout.confirmButton', { defaultValue: 'Siparişi Onayla' })}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.secureHint}>{t('cart.secureCheckout')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
