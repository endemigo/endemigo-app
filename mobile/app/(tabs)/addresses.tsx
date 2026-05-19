import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  TouchableWithoutFeedback,
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
import { useRoleModeStore } from '../../store/roleModeStore';
import type { AddressItem, AddressPayload } from '../../types/transactionFlows';
import { resolveApiErrorMessage } from '../../utils/apiError';
import { getTurkishDistrictsByProvinceName, TURKISH_PROVINCES } from '../../constants/turkishLocations';
import { styles } from '../../styles/tabs/addresses.styles';

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
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const { showModal } = useModalStore();
  const canUseSenderType = Boolean(user?.isSeller);
  const params = useLocalSearchParams<{ type?: AddressType }>();
  const initialFormType =
    params.type === AddressType.BILLING ||
    (params.type === AddressType.SENDER && canUseSenderType)
      ? params.type
      : AddressType.SHIPPING;
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isCityModalVisible, setCityModalVisible] = useState(false);
  const [isDistrictModalVisible, setDistrictModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null);
  const [formState, setFormState] = useState<AddressPayload>({
    ...DEFAULT_FORM_STATE,
    type: initialFormType,
    fullName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
    phone: user?.phone ?? '',
  });

  const addresses = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefaultAddress = useSetDefaultAddress();

  const availableTypes = user?.isSeller
    ? [AddressType.SHIPPING, AddressType.BILLING, AddressType.SENDER]
    : [AddressType.SHIPPING, AddressType.BILLING];
  const addressTypeBadgeLabel = (type: AddressType) => {
    if (type === AddressType.SHIPPING) {
      const shippingKey = activeMode === 'seller'
        ? 'addresses.badges.SHIPPING_SELLER'
        : 'addresses.badges.SHIPPING_BUYER';
      return t(shippingKey, { defaultValue: t(`addresses.types.${type}`) });
    }
    return t(`addresses.badges.${type}`, { defaultValue: t(`addresses.types.${type}`) });
  };

  const districtOptions = getTurkishDistrictsByProvinceName(formState.city);
  const filteredCities = TURKISH_PROVINCES.filter((city) =>
    city.toLocaleLowerCase('tr-TR').includes(citySearch.trim().toLocaleLowerCase('tr-TR')));
  const filteredDistricts = districtOptions.filter((district) =>
    district.toLocaleLowerCase('tr-TR').includes(districtSearch.trim().toLocaleLowerCase('tr-TR')));

  const resetForm = () => {
    setEditingAddress(null);
    setIsFormVisible(false);
    setCityModalVisible(false);
    setDistrictModalVisible(false);
    setCitySearch('');
    setDistrictSearch('');
    setFormState({
      ...DEFAULT_FORM_STATE,
      type: initialFormType,
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
          <Text style={styles.inlineLabel}>{t('addresses.fields.type')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.formTypeRow}
          >
            {availableTypes.map((type) => {
              const isActive = formState.type === type;
              return (
                <TouchableOpacity
                  key={`form-type-${type}`}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setFormState((current) => ({ ...current, type }))}
                  activeOpacity={0.82}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {t(`addresses.types.${type}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
            <TouchableOpacity
              style={[styles.input, styles.rowInput, styles.selectInput]}
              onPress={() => setCityModalVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={formState.city ? styles.selectInputText : styles.selectInputPlaceholder}>
                {formState.city || t('addresses.fields.city')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.slate500} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.input, styles.rowInput, styles.selectInput]}
              onPress={() => {
                if (!formState.city) {
                  showModal({
                    title: t('common.error'),
                    message: t('addresses.selectProvinceFirst'),
                    type: 'error',
                  });
                  return;
                }
                setDistrictModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={formState.district ? styles.selectInputText : styles.selectInputPlaceholder}>
                {formState.district || t('addresses.fields.district')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.slate500} />
            </TouchableOpacity>
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
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{addressTypeBadgeLabel(address.type)}</Text>
                </View>
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

      <Modal
        visible={isCityModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCityModalVisible(false)}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetCard}>
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>{t('addresses.cityModalTitle')}</Text>
                  <TouchableOpacity onPress={() => setCityModalVisible(false)} activeOpacity={0.8}>
                    <Ionicons name="close" size={20} color={Colors.onSurface} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.bottomSheetSearch}
                  value={citySearch}
                  onChangeText={setCitySearch}
                  placeholder={t('addresses.searchCityPlaceholder')}
                  placeholderTextColor={Colors.slate400}
                />
                <ScrollView style={styles.bottomSheetList}>
                  {filteredCities.map((city) => (
                    <TouchableOpacity
                      key={`city-${city}`}
                      style={styles.bottomSheetItem}
                      onPress={() => {
                        setFormState((current) => ({
                          ...current,
                          city,
                          district: current.city === city ? current.district : '',
                        }));
                        setCityModalVisible(false);
                        setDistrictSearch('');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.bottomSheetItemText}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={isDistrictModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDistrictModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDistrictModalVisible(false)}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetCard}>
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>{t('addresses.districtModalTitle')}</Text>
                  <TouchableOpacity onPress={() => setDistrictModalVisible(false)} activeOpacity={0.8}>
                    <Ionicons name="close" size={20} color={Colors.onSurface} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.bottomSheetSearch}
                  value={districtSearch}
                  onChangeText={setDistrictSearch}
                  placeholder={t('addresses.searchDistrictPlaceholder')}
                  placeholderTextColor={Colors.slate400}
                />
                <ScrollView style={styles.bottomSheetList}>
                  {filteredDistricts.map((district) => (
                    <TouchableOpacity
                      key={`district-${district}`}
                      style={styles.bottomSheetItem}
                      onPress={() => {
                        setFormState((current) => ({ ...current, district }));
                        setDistrictModalVisible(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.bottomSheetItemText}>{district}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}
