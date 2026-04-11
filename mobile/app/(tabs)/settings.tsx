import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';
import { styles } from '../../styles/tabs/settings.styles';

interface KvkkConsent {
  id: string;
  consentType: string;
  isAccepted: boolean;
  acceptedAt: string;
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { showModal } = useModalStore();
  const { t } = useTranslation();
  const router = useRouter();

  const [consents, setConsents] = useState<KvkkConsent[]>([]);
  const [loadingConsents, setLoadingConsents] = useState(true);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    try {
      const { data } = await api.get('/users/consents');
      setConsents(data);
    } catch {
      // Silent fail — consents may not exist yet
    } finally {
      setLoadingConsents(false);
    }
  };

  const toggleConsent = async (consentType: string, currentValue: boolean) => {
    try {
      await api.post('/users/consents', {
        consentType,
        isAccepted: !currentValue,
      });
      await loadConsents();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showModal({
        title: t('common.error'),
        message: error.response?.data?.message || t('common.genericError'),
        type: 'error',
      });
    }
  };

  const getConsentValue = (type: string): boolean => {
    const latest = consents.find((c) => c.consentType === type);
    return latest?.isAccepted ?? false;
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword || deletePassword.length < 6) {
      showModal({
        title: t('common.error'),
        message: t('settings.passwordRequired'),
        type: 'error',
      });
      return;
    }
    try {
      setDeleting(true);
      await api.delete('/users/account', { data: { password: deletePassword } });
      showModal({
        title: t('settings.accountDeleted'),
        message: t('settings.accountDeletedMessage'),
        type: 'success',
      });
      await logout();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showModal({
        title: t('common.error'),
        message: error.response?.data?.message || t('common.genericError'),
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* KVKK Section */}
      <Text style={styles.sectionTitle}>{t('settings.kvkkTitle')}</Text>
      <View style={styles.card}>
        {/* Data Processing — Zorunlu */}
        <View style={styles.consentRow}>
          <View style={styles.consentInfo}>
            <Text style={styles.consentTitle}>{t('settings.dataProcessing')}</Text>
            <Text style={styles.consentDesc}>{t('settings.dataProcessingDesc')}</Text>
          </View>
          <Switch
            value={true}
            disabled={true}
            trackColor={{ false: Colors.slate300, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>
        <Text style={styles.consentRequired}>{t('settings.required')}</Text>

        <View style={styles.divider} />

        {/* Marketing */}
        <View style={styles.consentRow}>
          <View style={styles.consentInfo}>
            <Text style={styles.consentTitle}>{t('settings.marketing')}</Text>
            <Text style={styles.consentDesc}>{t('settings.marketingDesc')}</Text>
          </View>
          <Switch
            value={getConsentValue('MARKETING')}
            onValueChange={() => toggleConsent('MARKETING', getConsentValue('MARKETING'))}
            trackColor={{ false: Colors.slate300, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>

        <View style={styles.divider} />

        {/* Third Party Sharing */}
        <View style={styles.consentRow}>
          <View style={styles.consentInfo}>
            <Text style={styles.consentTitle}>{t('settings.thirdParty')}</Text>
            <Text style={styles.consentDesc}>{t('settings.thirdPartyDesc')}</Text>
          </View>
          <Switch
            value={getConsentValue('THIRD_PARTY_SHARING')}
            onValueChange={() => toggleConsent('THIRD_PARTY_SHARING', getConsentValue('THIRD_PARTY_SHARING'))}
            trackColor={{ false: Colors.slate300, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>
      </View>

      {/* Danger Zone */}
      <Text style={styles.sectionTitleDanger}>{t('settings.dangerZone')}</Text>
      <View style={styles.dangerCard}>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => setShowDeleteSection(!showDeleteSection)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
          <Text style={styles.dangerButtonText}>{t('settings.deleteAccount')}</Text>
          <Ionicons
            name={showDeleteSection ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Colors.slate400}
          />
        </TouchableOpacity>

        {showDeleteSection && (
          <View style={styles.deleteSection}>
            <Text style={styles.deleteWarning}>{t('settings.deleteWarning')}</Text>
            <TextInput
              style={styles.deleteInput}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder={t('settings.passwordPlaceholder')}
              placeholderTextColor={Colors.slate400}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.deleteConfirmBtn, (!deletePassword || deleting) && styles.deleteConfirmBtnDisabled]}
              onPress={handleDeleteAccount}
              disabled={!deletePassword || deleting}
              activeOpacity={0.8}
            >
              {deleting ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.deleteConfirmText}>{t('settings.confirmDelete')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}
