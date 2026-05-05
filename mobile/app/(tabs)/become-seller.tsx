import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { useCategories, useMyProducts } from '../../hooks/useProducts';
import api from '../../lib/api';
import { resolveApiErrorMessage } from '../../utils/apiError';
import { Colors } from '../../constants/theme';
import { ProductCreateWizard } from '../../components/forms/product-create/ProductCreateWizard';
import { styles } from '../../styles/tabs/become-seller.styles';

export default function BecomeSellerScreen() {
  const { user, setUser } = useAuthStore();
  const { showModal } = useModalStore();
  const { t } = useTranslation();
  const router = useRouter();
  const isSeller = Boolean(user?.isSeller);

  const { data: categories } = useCategories();
  const {
    data: myProductsData,
    isFetching: isMyProductsLoading,
    refetch: refetchMyProducts,
  } = useMyProducts(1, isSeller);

  const [businessName, setBusinessName] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [iban, setIban] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSellerApplicationValid = businessName.trim().length >= 2 && agreementAccepted;

  const handleSellerApplication = async () => {
    if (!isSellerApplicationValid) return;

    try {
      setLoading(true);
      await api.post('/users/become-seller', {
        businessName: businessName.trim(),
        taxOffice: taxOffice.trim() || undefined,
        taxNumber: taxNumber.trim() || undefined,
        iban: iban.trim() || undefined,
        agreementAccepted: true,
      });

      if (user) {
        setUser({ ...user, isSeller: true });
      }

      showModal({
        title: '🎉',
        message: t('seller.registrationSuccess'),
        type: 'success',
      });
      router.back();
    } catch (error: unknown) {
      showModal({
        title: t('common.error'),
        message: resolveApiErrorMessage(error, t, 'common.genericError'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isSeller) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('seller.becomeSellerTitle')}</Text>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.infoBanner}>
              <Ionicons name="storefront" size={24} color={Colors.primary} />
              <Text style={styles.infoBannerText}>{t('seller.infoText')}</Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('seller.businessName')} *</Text>
                <TextInput
                  style={styles.input}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder={t('seller.businessNamePlaceholder')}
                  placeholderTextColor={Colors.slate400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('seller.taxOffice')}</Text>
                <TextInput
                  style={styles.input}
                  value={taxOffice}
                  onChangeText={setTaxOffice}
                  placeholder={t('seller.taxOfficePlaceholder')}
                  placeholderTextColor={Colors.slate400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('seller.taxNumber')}</Text>
                <TextInput
                  style={styles.input}
                  value={taxNumber}
                  onChangeText={setTaxNumber}
                  placeholder={t('seller.taxNumberPlaceholder')}
                  placeholderTextColor={Colors.slate400}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('seller.iban')}</Text>
                <TextInput
                  style={styles.input}
                  value={iban}
                  onChangeText={setIban}
                  placeholder={t('seller.ibanPlaceholder')}
                  placeholderTextColor={Colors.slate400}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.agreementRow}
              onPress={() => setAgreementAccepted(!agreementAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreementAccepted && styles.checkboxChecked]}>
                {agreementAccepted ? <Ionicons name="checkmark" size={14} color={Colors.white} /> : null}
              </View>
              <Text style={styles.agreementText}>{t('seller.agreementText')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, !isSellerApplicationValid && styles.submitButtonDisabled]}
              onPress={handleSellerApplication}
              disabled={loading || !isSellerApplicationValid}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="storefront" size={20} color={Colors.white} />
                  <Text style={styles.submitButtonText}>{t('seller.registerButton')}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('listing.pageTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ProductCreateWizard
          categories={categories || []}
          recentProducts={(myProductsData?.items || []).slice(0, 6)}
          totalProducts={myProductsData?.total || 0}
          isProductsLoading={isMyProductsLoading}
          onCreated={refetchMyProducts}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
