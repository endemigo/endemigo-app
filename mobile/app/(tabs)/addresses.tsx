import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { AddressType } from '@endemigo/shared';
import { useTranslation } from 'react-i18next';
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  useUpdateAddress,
} from '../../hooks/useAddresses';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import type { AddressItem, AddressPayload } from '../../types/transactionFlows';
import { resolveApiErrorMessage } from '../../utils/apiError';
import { styles } from './addresses.styles';

const DEFAULT_FORM_STATE: AddressPayload = {
  type: AddressType.SHIPPING,
  title: '',
  fullName: '',
  phone: '',
  city: '',
  district: '',
  neighborhood: '',
  addressLine: '',
  postalCode: '',
  country: 'TR',
  isDefault: false,
};

export default function AddressesScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { showModal } = useModalStore();
  const params = useLocalSearchParams<{ type?: AddressType }>();
  const initialType =
    params.type === AddressType.BILLING ||
    params.type === AddressType.SENDER
      ? params.type
      : AddressType.SHIPPING;
  const [selectedType, setSelectedType] = useState<AddressType>(initialType);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null);
  const [formState, setFormState] = useState<AddressPayload>({
    ...DEFAULT_FORM_STATE,
    type: initialType,
    fullName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
    phone: user?.phone ?? '',
  });

  const addresses = useAddresses(selectedType);
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefaultAddress = useSetDefaultAddress();

  useEffect(() => {
    setFormState((current) => ({
      ...current,
      type: selectedType,
    }));
  }, [selectedType]);

  const availableTypes = user?.isSeller
    ? [AddressType.SHIPPING, AddressType.BILLING, AddressType.SENDER]
    : [AddressType.SHIPPING, AddressType.BILLING];

  const resetForm = () => {
    setEditingAddress(null);
    setIsFormVisible(false);
    setFormState({
      ...DEFAULT_FORM_STATE,
      type: selectedType,
      fullName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
      phone: user?.phone ?? '',
    });
  };

  const handleEdit = (address: AddressItem) => {
    setEditingAddress(address);
    setIsFormVisible(true);
    setFormState({
      type: address.type,
      title: address.title,
      fullName: address.fullName,
      phone: address.phone,
      city: address.city,
      district: address.district,
      neighborhood: address.neighborhood ?? '',
      addressLine: address.addressLine,
      postalCode: address.postalCode ?? '',
      country: address.country,
      isDefault: address.isDefault,
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingAddress) {
        await updateAddress.mutateAsync({
          addressId: editingAddress.id,
          payload: formState,
        });
      } else {
        await createAddress.mutateAsync(formState);
      }
      resetForm();
    } catch (error: unknown) {
      showModal({
        title: t('common.error'),
        message: resolveApiErrorMessage(error, t, 'common.genericError'),
        type: 'error',
      });
    }
  };

  const handleDelete = (address: AddressItem) => {
    showModal({
      title: t('addresses.deleteTitle'),
      message: t('addresses.deleteMessage', { title: address.title }),
      type: 'info',
      confirmText: t('addresses.deleteConfirm'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        try {
          await deleteAddress.mutateAsync({
            addressId: address.id,
            type: address.type,
          });
        } catch (error: unknown) {
          showModal({
            title: t('common.error'),
            message: resolveApiErrorMessage(error, t, 'common.genericError'),
            type: 'error',
          });
        }
      },
    });
  };

  const handleSetDefault = async (address: AddressItem) => {
    try {
      await setDefaultAddress.mutateAsync({
        addressId: address.id,
        type: address.type,
      });
    } catch (error: unknown) {
      showModal({
        title: t('common.error'),
        message: resolveApiErrorMessage(error, t, 'common.genericError'),
        type: 'error',
      });
    }
  };

  if (addresses.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.centerBody}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (addresses.isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="location-outline" size={44} color={Colors.slate300} />
        <Text style={styles.centerTitle}>{t('addresses.loadError')}</Text>
        <Text style={styles.centerBody}>{t('common.genericError')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={addresses.isRefetching}
          onRefresh={addresses.refetch}
          tintColor={Colors.primary}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.title}>{t('addresses.title')}</Text>
        <Text style={styles.subtitle}>{t('addresses.subtitle')}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {availableTypes.map((type) => {
          const isActive = type === selectedType;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setSelectedType(type)}
              activeOpacity={0.82}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {t(`addresses.types.${type}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditingAddress(null);
          setIsFormVisible(true);
        }}
        activeOpacity={0.84}
      >
        <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
        <Text style={styles.addButtonText}>{t('addresses.addAction')}</Text>
      </TouchableOpacity>

      {isFormVisible && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingAddress ? t('addresses.editTitle') : t('addresses.createTitle')}
          </Text>
          <TextInput
            style={styles.input}
            value={formState.title}
            onChangeText={(value) => setFormState((current) => ({ ...current, title: value }))}
            placeholder={t('addresses.fields.title')}
            placeholderTextColor={Colors.slate400}
          />
          <TextInput
            style={styles.input}
            value={formState.fullName}
            onChangeText={(value) => setFormState((current) => ({ ...current, fullName: value }))}
            placeholder={t('addresses.fields.fullName')}
            placeholderTextColor={Colors.slate400}
          />
          <TextInput
            style={styles.input}
            value={formState.phone}
            onChangeText={(value) => setFormState((current) => ({ ...current, phone: value }))}
            placeholder={t('addresses.fields.phone')}
            placeholderTextColor={Colors.slate400}
            keyboardType="phone-pad"
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.rowInput]}
              value={formState.city}
              onChangeText={(value) => setFormState((current) => ({ ...current, city: value }))}
              placeholder={t('addresses.fields.city')}
              placeholderTextColor={Colors.slate400}
            />
            <TextInput
              style={[styles.input, styles.rowInput]}
              value={formState.district}
              onChangeText={(value) => setFormState((current) => ({ ...current, district: value }))}
              placeholder={t('addresses.fields.district')}
              placeholderTextColor={Colors.slate400}
            />
          </View>
          <TextInput
            style={styles.input}
            value={formState.neighborhood ?? ''}
            onChangeText={(value) => setFormState((current) => ({ ...current, neighborhood: value }))}
            placeholder={t('addresses.fields.neighborhood')}
            placeholderTextColor={Colors.slate400}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formState.addressLine}
            onChangeText={(value) => setFormState((current) => ({ ...current, addressLine: value }))}
            placeholder={t('addresses.fields.addressLine')}
            placeholderTextColor={Colors.slate400}
            multiline
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.rowInput]}
              value={formState.postalCode ?? ''}
              onChangeText={(value) => setFormState((current) => ({ ...current, postalCode: value }))}
              placeholder={t('addresses.fields.postalCode')}
              placeholderTextColor={Colors.slate400}
            />
            <TextInput
              style={[styles.input, styles.rowInput]}
              value={formState.country ?? 'TR'}
              onChangeText={(value) => setFormState((current) => ({ ...current, country: value }))}
              placeholder={t('addresses.fields.country')}
              placeholderTextColor={Colors.slate400}
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() =>
              setFormState((current) => ({
                ...current,
                isDefault: !current.isDefault,
              }))
            }
            activeOpacity={0.82}
          >
            <Ionicons
              name={formState.isDefault ? 'checkbox' : 'square-outline'}
              size={20}
              color={formState.isDefault ? Colors.primary : Colors.slate400}
            />
            <Text style={styles.checkboxLabel}>{t('addresses.fields.isDefault')}</Text>
          </TouchableOpacity>

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.ghostButton} onPress={resetForm} activeOpacity={0.82}>
              <Text style={styles.ghostButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSubmit}
              activeOpacity={0.84}
            >
              <Text style={styles.primaryButtonText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.list}>
        {(addresses.data ?? []).map((address) => (
          <View key={address.id} style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <View>
                <Text style={styles.addressTitle}>{address.title}</Text>
                <Text style={styles.addressMeta}>
                  {address.fullName} • {address.phone}
                </Text>
              </View>
              {address.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>{t('addresses.defaultBadge')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.addressBody}>
              {[address.neighborhood, address.district, address.city].filter(Boolean).join(', ')}
            </Text>
            <Text style={styles.addressBody}>{address.addressLine}</Text>
            <View style={styles.addressActions}>
              {!address.isDefault && (
                <TouchableOpacity
                  style={styles.inlineButton}
                  onPress={() => handleSetDefault(address)}
                  activeOpacity={0.82}
                >
                  <Text style={styles.inlineButtonText}>{t('addresses.makeDefault')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.inlineButton}
                onPress={() => handleEdit(address)}
                activeOpacity={0.82}
              >
                <Text style={styles.inlineButtonText}>{t('addresses.editAction')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inlineButtonDanger}
                onPress={() => handleDelete(address)}
                activeOpacity={0.82}
              >
                <Text style={styles.inlineButtonDangerText}>{t('addresses.deleteAction')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {(addresses.data ?? []).length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="map-outline" size={34} color={Colors.slate300} />
          <Text style={styles.emptyTitle}>{t('addresses.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('addresses.emptyBody')}</Text>
        </View>
      )}
    </ScrollView>
  );
}
