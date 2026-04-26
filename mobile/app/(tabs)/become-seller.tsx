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
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';
import { styles } from '../../styles/tabs/become-seller.styles';

export default function BecomeSellerScreen() {
  const { user, setUser } = useAuthStore();
  const { showModal } = useModalStore();
  const { t } = useTranslation();
  const router = useRouter();

  const [businessName, setBusinessName] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [iban, setIban] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = businessName.trim().length >= 2 && agreementAccepted;

  const handleSubmit = async () => {
    if (!isValid) return;
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
    } catch (err: unknown) {
      let msg = t('common.genericError');
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { code?: string; message?: string } } };
        msg = axiosErr.response?.data?.message || msg;
      }
      showModal({ title: t('common.error'), message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Zaten satıcıysa geri gönder
  if (user?.isSeller) {
    return (
      <View style={styles.container}>
        <View style={styles.alreadySellerCard}>
          <Ionicons name="checkmark-circle" size={48} color={Colors.secondary} />
          <Text style={styles.alreadySellerText}>{t('seller.alreadySeller')}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('seller.becomeSellerTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="storefront" size={24} color={Colors.primary} />
          <Text style={styles.infoBannerText}>{t('seller.infoText')}</Text>
        </View>

        {/* Form */}
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
              placeholder="TR33 0006 1005 1978 6457 8413 26"
              placeholderTextColor={Colors.slate400}
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Agreement */}
        <TouchableOpacity
          style={styles.agreementRow}
          onPress={() => setAgreementAccepted(!agreementAccepted)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreementAccepted && styles.checkboxChecked]}>
            {agreementAccepted && <Ionicons name="checkmark" size={14} color={Colors.white} />}
          </View>
          <Text style={styles.agreementText}>
            {t('seller.agreementText')}
          </Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !isValid}
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
  );
}
