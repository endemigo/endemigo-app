import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../../constants/theme';
import { styles } from './ReturnRequestCard.styles';

interface ReturnRequestCardProps {
  canRequestReturn: boolean;
  isSubmitting: boolean;
  onSubmit: (payload: { reasonCode: string; note?: string; localImages?: ImagePicker.ImagePickerAsset[] }) => Promise<unknown>;
}

const REASON_CODES = [
  'DAMAGED',
  'NOT_AS_DESCRIBED',
  'WRONG_ITEM',
  'MISSING_PARTS',
  'OTHER',
] as const;

export function ReturnRequestCard({
  canRequestReturn,
  isSubmitting,
  onSubmit,
}: ReturnRequestCardProps) {
  const { t } = useTranslation();
  const [reasonCode, setReasonCode] = useState<(typeof REASON_CODES)[number]>('DAMAGED');
  const [note, setNote] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const submitDisabled = useMemo(
    () => isSubmitting || !reasonCode,
    [isSubmitting, reasonCode],
  );

  async function handlePickImages() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.error'), t('listing.imagePermissionRequired') || 'Resim izni gereklidir.');
      return;
    }

    const remainingCount = 5 - selectedImages.length;
    if (remainingCount <= 0) {
      Alert.alert(t('common.error'), 'Maksimum 5 görsel yüklenebilir.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingCount,
      quality: 0.82,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    setSelectedImages((prev) => [...prev, ...result.assets].slice(0, 5));
  }

  function handleRemoveImage(index: number) {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== index));
  }

  if (!canRequestReturn) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('orders.returnRequestTitle')}</Text>
      <Text style={styles.body}>{t('orders.returnRequestBody')}</Text>
      <View style={styles.chipRow}>
        {REASON_CODES.map((code) => {
          const isActive = code === reasonCode;
          return (
            <TouchableOpacity
              key={code}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setReasonCode(code)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {t(`orders.returnReasons.${code}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        multiline
        placeholder={t('orders.returnNotePlaceholder')}
        placeholderTextColor={Colors.slate400}
      />

      <View style={styles.imageSection}>
        <Text style={styles.imageLabel}>Kanıt Görselleri (İsteğe bağlı)</Text>
        
        {selectedImages.length > 0 ? (
          <View style={styles.selectedImagesRow}>
            {selectedImages.map((asset, idx) => (
              <View key={`${asset.uri}-${idx}`} style={styles.previewContainer}>
                <Image source={{ uri: asset.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeBadge}
                  onPress={() => handleRemoveImage(idx)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={14} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        {selectedImages.length < 5 ? (
          <TouchableOpacity
            style={styles.imageUploadBtn}
            onPress={handlePickImages}
            activeOpacity={0.75}
          >
            <Ionicons name="camera-outline" size={18} color={Colors.primary} />
            <Text style={styles.imageUploadBtnText}>Fotoğraf Ekle ({selectedImages.length}/5)</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.button, submitDisabled && styles.buttonDisabled]}
        onPress={() => onSubmit({ reasonCode, note, localImages: selectedImages })}
        disabled={submitDisabled}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.buttonText}>{t('orders.createReturnRequest')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
