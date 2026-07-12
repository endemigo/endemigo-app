import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../../constants/theme';
import { useAuction } from '../../../hooks/useAuctions';
import { useProductForEdit, useUpdateLot, useUpdateProduct } from '../../../hooks/useProductEdit';
import { useAuthStore } from '../../../store/authStore';
import { useModalStore } from '../../../store/modalStore';
import { useRoleModeStore } from '../../../store/roleModeStore';
import { resolveApiErrorMessage } from '../../../utils/apiError';
import {
  buildLotUpdatePayload,
  buildProductUpdatePayload,
  type LotEditFormState,
  type ProductEditFormState,
} from '../../../utils/productEditMapper';

// Sayı → TR para girişi (virgül ondalık) — parsePriceInput ile tutarlı seed.
function moneyToInput(value: number | null | undefined): string {
  return value !== null && value !== undefined ? String(value).replace('.', ',') : '';
}

export default function ProductEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; lotId?: string }>();
  const productId = String(params.id);
  const lotId = params.lotId ? String(params.lotId) : undefined;

  const { user } = useAuthStore();
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const isSellerAccess = activeMode === 'seller' && Boolean(user?.isSeller);
  const { showModal } = useModalStore();

  const productQuery = useProductForEdit(productId, isSellerAccess);
  const lotQuery = useAuction(lotId || '');
  const updateProduct = useUpdateProduct();
  const updateLot = useUpdateLot();

  const [productForm, setProductForm] = useState<ProductEditFormState>({
    title: '',
    description: '',
    price: '',
  });
  const [lotForm, setLotForm] = useState<LotEditFormState>({
    startPrice: '',
    reservePrice: '',
    minIncrement: '',
  });
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Ürün + (varsa) lot yüklenince formu bir kez seed et.
  useEffect(() => {
    if (seeded || !productQuery.data) return;
    if (lotId && !lotQuery.data) return; // lot varsa değerleri de bekle
    const product = productQuery.data;
    setProductForm({
      title: product.title ?? '',
      description: product.description ?? '',
      price: moneyToInput(product.price),
    });
    if (lotQuery.data) {
      setLotForm({
        startPrice: moneyToInput(lotQuery.data.startPrice),
        reservePrice: moneyToInput(lotQuery.data.reservePrice),
        minIncrement: moneyToInput(lotQuery.data.minIncrement),
      });
    }
    setSeeded(true);
  }, [seeded, productQuery.data, lotQuery.data, lotId]);

  const lotEditable = Boolean(lotId) && lotQuery.data?.approvalStatus === 'PENDING';
  const lotLocked = Boolean(lotId) && lotQuery.data && lotQuery.data.approvalStatus !== 'PENDING';

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProduct.mutateAsync({
        productId,
        payload: buildProductUpdatePayload(productForm),
      });
      if (lotEditable && lotId) {
        await updateLot.mutateAsync({ lotId, payload: buildLotUpdatePayload(lotForm) });
      }
      showModal({ title: t('common.success'), message: t('editProduct.saved'), type: 'success' });
      router.back();
    } catch (err: unknown) {
      const msg = resolveApiErrorMessage(err, t, 'common.genericError');
      showModal({ title: t('common.error'), message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const isLoading = productQuery.isLoading || (Boolean(lotId) && lotQuery.isLoading);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('editProduct.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!isSellerAccess ? (
        <View style={styles.center}>
          <Text style={styles.hint}>{t('myProducts.accessDenied')}</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Ürün alanları */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('editProduct.productSection')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('editProduct.fieldTitle')}</Text>
              <TextInput
                style={styles.input}
                value={productForm.title}
                onChangeText={(v) => setProductForm((s) => ({ ...s, title: v }))}
                placeholder={t('editProduct.fieldTitle')}
                placeholderTextColor={Colors.slate400}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('editProduct.fieldDescription')}</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={productForm.description}
                onChangeText={(v) => setProductForm((s) => ({ ...s, description: v }))}
                placeholder={t('editProduct.fieldDescription')}
                placeholderTextColor={Colors.slate400}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('editProduct.fieldPrice')}</Text>
              <TextInput
                style={styles.input}
                value={productForm.price}
                onChangeText={(v) => setProductForm((s) => ({ ...s, price: v }))}
                placeholder="0"
                placeholderTextColor={Colors.slate400}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Lot fiyat alanları — yalnız onay bekleyen lot varsa */}
          {lotEditable ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('editProduct.lotSection')}</Text>
              <Text style={styles.hint}>{t('editProduct.lotHint')}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('editProduct.fieldStartPrice')}</Text>
                <TextInput
                  style={styles.input}
                  value={lotForm.startPrice}
                  onChangeText={(v) => setLotForm((s) => ({ ...s, startPrice: v }))}
                  placeholder="0"
                  placeholderTextColor={Colors.slate400}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('editProduct.fieldReservePrice')}</Text>
                <TextInput
                  style={styles.input}
                  value={lotForm.reservePrice}
                  onChangeText={(v) => setLotForm((s) => ({ ...s, reservePrice: v }))}
                  placeholder={t('editProduct.reserveOptional')}
                  placeholderTextColor={Colors.slate400}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('editProduct.fieldMinIncrement')}</Text>
                <TextInput
                  style={styles.input}
                  value={lotForm.minIncrement}
                  onChangeText={(v) => setLotForm((s) => ({ ...s, minIncrement: v }))}
                  placeholder="1"
                  placeholderTextColor={Colors.slate400}
                  keyboardType="numeric"
                />
              </View>
            </View>
          ) : lotLocked ? (
            <View style={styles.lockedCard}>
              <Ionicons name="lock-closed-outline" size={16} color={Colors.slate500} />
              <Text style={styles.hint}>{t('editProduct.lotLocked')}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.subheading,
    color: Colors.onSurface,
  },
  headerSpacer: { width: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  scroll: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.base,
    ...Shadows.sm,
  },
  sectionTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.subheading, color: Colors.onSurface },
  inputGroup: { gap: Spacing.xs },
  label: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.slate600 },
  input: {
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: Colors.onSurface,
    backgroundColor: Colors.white,
  },
  textarea: { height: 96, textAlignVertical: 'top' },
  hint: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.slate500 },
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontFamily: FontFamily.headline, fontSize: FontSize.body, color: Colors.white },
});
