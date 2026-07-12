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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { useCategories, useMyProducts } from '../../hooks/useProducts';
import api from '../../lib/api';
import { resolveApiErrorMessage } from '../../utils/apiError';
import { Colors } from '../../constants/theme';
import { ProductCreateWizard } from '../../components/forms/product-create/ProductCreateWizard';
import { styles } from '../../styles/tabs/become-seller.styles';

interface SellerApplication {
  id: string;
  businessName: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'TERMINATED';
}

type SellerType = 'INDIVIDUAL' | 'CORPORATE';

// TC Kimlik No: 11 hane, 0 ile başlayamaz
const IDENTITY_NUMBER_REGEX = /^[1-9]\d{10}$/;

export default function BecomeSellerScreen() {
  const { user } = useAuthStore();
  const { showModal } = useModalStore();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mode, auctionType } = useLocalSearchParams<{ mode?: string; auctionType?: string }>();
  const isSeller = Boolean(user?.isSeller);

  // Onay bekleyen başvuru varken formu tekrar göstermemek için mevcut başvuru durumu
  const { data: application } = useQuery<SellerApplication | null>({
    queryKey: ['seller-application', user?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/users/seller-profile');
        return (res.data?.sellerProfile as SellerApplication) ?? null;
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(user) && !isSeller,
  });

  const { data: categories } = useCategories();
  const {
    data: myProductsData,
    isFetching: isMyProductsLoading,
    refetch: refetchMyProducts,
  } = useMyProducts(1, isSeller);

  const [sellerType, setSellerType] = useState<SellerType>('INDIVIDUAL');
  // Bireysel: ad soyad profilden otomatik doldurulur, düzenlenebilir
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [identityNumber, setIdentityNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [iban, setIban] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const isIndividual = sellerType === 'INDIVIDUAL';
  const isSellerApplicationValid =
    agreementAccepted &&
    (isIndividual
      ? firstName.trim().length > 0 &&
        lastName.trim().length > 0 &&
        IDENTITY_NUMBER_REGEX.test(identityNumber.trim())
      : businessName.trim().length >= 2);

  const handleSellerApplication = async () => {
    if (!isSellerApplicationValid) return;

    try {
      setLoading(true);
      await api.post(
        '/users/become-seller',
        isIndividual
          ? {
              sellerType,
              businessName: `${firstName.trim()} ${lastName.trim()}`,
              identityNumber: identityNumber.trim(),
              iban: iban.trim() || undefined,
              agreementAccepted: true,
            }
          : {
              sellerType,
              businessName: businessName.trim(),
              taxOffice: taxOffice.trim() || undefined,
              taxNumber: taxNumber.trim() || undefined,
              iban: iban.trim() || undefined,
              agreementAccepted: true,
            },
      );

      // Backend başvuruyu PENDING olarak açar; satıcı yetkisi admin onayıyla gelir.
      // isSeller lokal olarak true YAPILMAZ — onay öncesi satıcı paneli açılmamalı.
      await queryClient.invalidateQueries({ queryKey: ['seller-application', user?.id] });

      showModal({
        title: t('seller.applicationPendingTitle'),
        message: t('seller.applicationPendingMessage'),
        type: 'success',
      });
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

  if (!isSeller && (application?.status === 'PENDING' || application?.status === 'SUSPENDED')) {
    const isPending = application.status === 'PENDING';
    // Başvuru sonrası bekleme ekranı: geri oku yok, tek çıkış "Tamam" → ana sayfa.
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: `${Colors.primary}14`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Ionicons
              name={isPending ? 'hourglass-outline' : 'alert-circle-outline'}
              size={44}
              color={Colors.primary}
            />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: Colors.onSurface,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {isPending
              ? t('seller.applicationPendingTitle')
              : t('seller.applicationSuspendedTitle')}
          </Text>
          <Text
            style={{
              fontSize: 15,
              lineHeight: 22,
              color: Colors.onSurfaceVariant,
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            {isPending
              ? t('seller.applicationPendingMessage')
              : t('seller.applicationSuspendedMessage')}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: Colors.primary,
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 24,
              alignSelf: 'stretch',
              alignItems: 'center',
            }}
            activeOpacity={0.85}
            onPress={() => router.replace('/home' as never)}
          >
            <Text style={{ color: Colors.white, fontSize: 16, fontWeight: '700' }}>
              {t('common.ok')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

            {application?.status === 'TERMINATED' ? (
              <View style={styles.infoBanner}>
                <Ionicons name="refresh-circle-outline" size={24} color={Colors.primary} />
                <Text style={styles.infoBannerText}>{t('seller.applicationRejectedNotice')}</Text>
              </View>
            ) : null}

            <View style={styles.typeSwitchRow}>
              {(['INDIVIDUAL', 'CORPORATE'] as const).map((type) => {
                const selected = sellerType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeSwitchOption, selected && styles.typeSwitchOptionActive]}
                    onPress={() => setSellerType(type)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={type === 'INDIVIDUAL' ? 'person-outline' : 'business-outline'}
                      size={18}
                      color={selected ? Colors.primary : Colors.onSurfaceVariant}
                    />
                    <Text style={[styles.typeSwitchText, selected && styles.typeSwitchTextActive]}>
                      {type === 'INDIVIDUAL' ? t('seller.typeIndividual') : t('seller.typeCorporate')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.formCard}>
              {isIndividual ? (
                <>
                  <View style={styles.inlineInputRow}>
                    <View style={[styles.inputGroup, styles.inlineInputBlock]}>
                      <Text style={styles.inputLabel}>{t('seller.firstName')} *</Text>
                      <TextInput
                        style={styles.input}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder={t('seller.firstNamePlaceholder')}
                        placeholderTextColor={Colors.slate400}
                      />
                    </View>
                    <View style={[styles.inputGroup, styles.inlineInputBlock]}>
                      <Text style={styles.inputLabel}>{t('seller.lastName')} *</Text>
                      <TextInput
                        style={styles.input}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder={t('seller.lastNamePlaceholder')}
                        placeholderTextColor={Colors.slate400}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t('seller.identityNumber')} *</Text>
                    <TextInput
                      style={styles.input}
                      value={identityNumber}
                      onChangeText={setIdentityNumber}
                      placeholder={t('seller.identityNumberPlaceholder')}
                      placeholderTextColor={Colors.slate400}
                      keyboardType="number-pad"
                      maxLength={11}
                    />
                  </View>
                </>
              ) : (
                <>
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
                      maxLength={10}
                    />
                  </View>
                </>
              )}

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
          initialEntryMode={mode as never}
          initialAuctionType={auctionType}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
