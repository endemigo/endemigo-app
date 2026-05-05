import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import type { ProductStatus } from '../../../../shared-types/enums/product-status.enum.ts';
import { Colors } from '../../../constants/theme';
import { useProductCreateWizard, canContinueProductCreateStep, isProductCreateReadyToSubmit } from '../../../hooks/useProductCreateWizard.ts';
import { useModalStore } from '../../../store/modalStore';
import type { Category, Product } from '../../../types';
import {
  PRODUCT_CREATE_AUCTION_TYPES,
  PRODUCT_CREATE_LISTING_TYPES,
  type ProductCreateImageDraft,
  type ProductCreateWizardStep,
} from '../../../types/productCreate.ts';
import { resolveApiErrorMessage } from '../../../utils/apiError';
import { getCategoryIcon, getCategoryMockImage } from '../../../utils/productCreateCategoryPresentation.ts';
import { AUCTION_DURATION_PRESETS, AUCTION_START_DELAY_PRESETS, buildAuctionSchedule } from '../../../utils/productCreateSchedule.ts';
import { MAX_PRODUCT_IMAGE_COUNT, mapPickerAssetToProductImage } from '../../../utils/productImageUpload.ts';
import { submitProductCreateWizard } from '../../../services/productCreateService.ts';
import { ProductCreateProgress } from './ProductCreateProgress';
import { ProductTypeSegment } from './ProductTypeSegment';
import { styles } from './ProductCreateWizard.styles';

interface ProductCreateWizardProps {
  categories: Category[];
  recentProducts: Product[];
  totalProducts: number;
  isProductsLoading: boolean;
  onCreated: () => Promise<unknown> | void;
}

const STEP_TITLE_KEYS: Record<ProductCreateWizardStep, string> = {
  1: 'listing.stepBasics',
  2: 'listing.stepPricing',
  3: 'listing.stepDetails',
  4: 'listing.stepImages',
  5: 'listing.stepReview',
};

export function ProductCreateWizard({
  categories,
  recentProducts,
  totalProducts,
  isProductsLoading,
  onCreated,
}: ProductCreateWizardProps) {
  const { t } = useTranslation();
  const { showModal } = useModalStore();
  const { state, updateField, patchState, reset } = useProductCreateWizard();
  const [currentStep, setCurrentStep] = useState<ProductCreateWizardStep>(1);
  const [images, setImages] = useState<ProductCreateImageDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedRootCategoryId, setSelectedRootCategoryId] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [showAuctionAdvanced, setShowAuctionAdvanced] = useState(false);

  const rootCategories = useMemo(
    () => categories.filter((category) => Boolean(category.id)),
    [categories],
  );

  const selectedCategory = useMemo(() => {
    for (const rootCategory of rootCategories) {
      if (rootCategory.id === state.categoryId) return rootCategory;
      const childCategory = rootCategory.children?.find((child) => child.id === state.categoryId);
      if (childCategory) return childCategory;
    }

    return null;
  }, [rootCategories, state.categoryId]);

  const selectedCategoryLabel = useMemo(() => {
    if (!selectedCategory) return t('listing.categoryPlaceholder');

    for (const rootCategory of rootCategories) {
      if (rootCategory.id === selectedCategory.id) return rootCategory.name;
      const childCategory = rootCategory.children?.find((child) => child.id === selectedCategory.id);
      if (childCategory) return `${rootCategory.name} > ${childCategory.name}`;
    }

    return selectedCategory.name;
  }, [rootCategories, selectedCategory, t]);

  const selectedRootCategory = useMemo(
    () => rootCategories.find((category) => category.id === selectedRootCategoryId) || null,
    [rootCategories, selectedRootCategoryId],
  );

  const activeSubcategories = useMemo(() => {
    if (!selectedRootCategory) return [];
    if (selectedRootCategory.children?.length) return selectedRootCategory.children;
    return [selectedRootCategory];
  }, [selectedRootCategory]);

  const filteredSubcategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return activeSubcategories;
    return activeSubcategories.filter((category) => category.name.toLowerCase().includes(query));
  }, [activeSubcategories, categorySearch]);

  const canContinue = canContinueProductCreateStep(currentStep, state, images.length);
  const canSubmit = isProductCreateReadyToSubmit(state, images.length);

  useEffect(() => {
    if (!selectedRootCategoryId && rootCategories.length > 0) {
      setSelectedRootCategoryId(rootCategories[0].id);
    }
  }, [rootCategories, selectedRootCategoryId]);

  useEffect(() => {
    if (!state.categoryId || rootCategories.length === 0) return;

    const matchedRootCategory = rootCategories.find(
      (rootCategory) =>
        rootCategory.id === state.categoryId
        || Boolean(rootCategory.children?.some((child) => child.id === state.categoryId)),
    );

    if (matchedRootCategory && matchedRootCategory.id !== selectedRootCategoryId) {
      setSelectedRootCategoryId(matchedRootCategory.id);
    }
  }, [rootCategories, selectedRootCategoryId, state.categoryId]);

  async function handlePickImages() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showModal({
        title: t('common.error'),
        message: t('listing.imagePermissionRequired'),
        type: 'error',
      });
      return;
    }

    const remainingSelectionCount = MAX_PRODUCT_IMAGE_COUNT - images.length;
    if (remainingSelectionCount <= 0) {
      showModal({
        title: t('common.error'),
        message: t('listing.maxImagesReached', { count: MAX_PRODUCT_IMAGE_COUNT }),
        type: 'error',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSelectionCount,
      quality: 0.82,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    setImages((currentImages) => {
      const mappedImages = result.assets.map(mapPickerAssetToProductImage);
      return [...currentImages, ...mappedImages].slice(0, MAX_PRODUCT_IMAGE_COUNT);
    });
  }

  function handleRemoveImage(imageId: string) {
    setImages((currentImages) => currentImages.filter((image) => image.id !== imageId));
  }

  function handleApplyAuctionPreset(startDelayHours: number, durationHours?: number) {
    const nextDuration = durationHours ?? state.selectedAuctionDurationHours ?? AUCTION_DURATION_PRESETS[0];
    const schedule = buildAuctionSchedule(startDelayHours, nextDuration);
    patchState({
      auctionStartTime: schedule.startTime,
      auctionEndTime: schedule.endTime,
      selectedAuctionStartDelayHours: startDelayHours,
      selectedAuctionDurationHours: nextDuration,
    });
  }

  function handleApplyAuctionDuration(durationHours: number) {
    const nextStartDelay = state.selectedAuctionStartDelayHours ?? AUCTION_START_DELAY_PRESETS[0];
    const schedule = buildAuctionSchedule(nextStartDelay, durationHours);
    patchState({
      auctionStartTime: schedule.startTime,
      auctionEndTime: schedule.endTime,
      selectedAuctionStartDelayHours: nextStartDelay,
      selectedAuctionDurationHours: durationHours,
    });
  }

  function handleGoNext() {
    if (!canContinue || currentStep === 5) return;
    setCurrentStep((step) => (step + 1) as ProductCreateWizardStep);
  }

  function handleGoBack() {
    if (currentStep === 1) return;
    setCurrentStep((step) => (step - 1) as ProductCreateWizardStep);
  }

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await submitProductCreateWizard(state, images);
      reset();
      setImages([]);
      setCurrentStep(1);
      setCategorySearch('');
      setShowAdvancedDetails(false);
      setShowAuctionAdvanced(false);
      await onCreated();

      showModal({
        title: t('common.success'),
        message: t(
          state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION
            ? 'listing.auctionCreatedSuccess'
            : 'listing.publishedSuccess',
        ),
        type: 'success',
      });
    } catch (error: unknown) {
      showModal({
        title: t('common.error'),
        message: resolveApiErrorMessage(error, t, 'common.genericError'),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderBasicsStep() {
    return (
      <>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('listing.productMode')} *</Text>
          <ProductTypeSegment
            value={state.listingType}
            onChange={(value) => patchState({
              listingType: value,
              askPriceEnabled: value === PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE ? state.askPriceEnabled : false,
            })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('listing.title')} *</Text>
          <TextInput
            style={styles.input}
            value={state.title}
            onChangeText={(value) => updateField('title', value)}
            placeholder={t('listing.titlePlaceholder')}
            placeholderTextColor={Colors.slate400}
            maxLength={200}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('listing.category')} *</Text>
          <TouchableOpacity
            style={styles.categorySelector}
            activeOpacity={0.85}
            onPress={() => setCategoryModalVisible(true)}
          >
            <View style={styles.categorySelectorLeft}>
              {selectedCategory ? (
                <View style={styles.categoryMediaWrap}>
                  <Image
                    source={{ uri: getCategoryMockImage(selectedCategory.slug) }}
                    style={styles.categoryMediaImage}
                    contentFit="cover"
                  />
                </View>
              ) : null}
              <Text
                style={selectedCategory ? styles.categorySelectorText : styles.categorySelectorPlaceholder}
                numberOfLines={1}
              >
                {selectedCategoryLabel}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={Colors.slate500} />
          </TouchableOpacity>
          <Text style={styles.helperText}>{t('listing.categoryHelp')}</Text>
        </View>
      </>
    );
  }

  function renderPricingStep() {
    const isAuction = state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION;

    return (
      <>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t(isAuction ? 'listing.startPrice' : 'listing.price')} *
          </Text>
          <TextInput
            style={styles.input}
            value={isAuction ? state.auctionStartPrice : state.directSalePrice}
            onChangeText={(value) => {
              if (isAuction) {
                updateField('auctionStartPrice', value);
                return;
              }

              updateField('directSalePrice', value);
            }}
            placeholder="0"
            placeholderTextColor={Colors.slate400}
            keyboardType="decimal-pad"
          />
          <Text style={styles.helperText}>
            {t(isAuction ? 'listing.startPriceHelp' : 'listing.priceHelp')}
          </Text>
        </View>

        {isAuction ? null : (
          <>
            <TouchableOpacity
              style={styles.toggleCard}
              activeOpacity={0.85}
              onPress={() => patchState({ askPriceEnabled: !state.askPriceEnabled, askPriceMinAmount: !state.askPriceEnabled ? state.askPriceMinAmount : '' })}
            >
              <View>
                <Text style={styles.toggleTitle}>{t('listing.askPriceEnabled')}</Text>
                <Text style={styles.toggleSub}>{t('listing.askPriceHint')}</Text>
              </View>
              <View style={[styles.checkbox, state.askPriceEnabled && styles.checkboxChecked]}>
                {state.askPriceEnabled ? <Ionicons name="checkmark" size={14} color={Colors.white} /> : null}
              </View>
            </TouchableOpacity>

            {state.askPriceEnabled ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('listing.askPriceMinAmount')} *</Text>
                <TextInput
                  style={styles.input}
                  value={state.askPriceMinAmount}
                  onChangeText={(value) => updateField('askPriceMinAmount', value)}
                  placeholder="0"
                  placeholderTextColor={Colors.slate400}
                  keyboardType="decimal-pad"
                />
              </View>
            ) : null}
          </>
        )}
      </>
    );
  }

  function renderDetailsStep() {
    return (
      <>
        <View style={styles.infoCard}>
          <View style={styles.infoCardLeft}>
            <Ionicons name="sparkles-outline" size={18} color={Colors.primary} />
            <View>
              <Text style={styles.infoCardTitle}>{t('listing.productConditionLabel')}</Text>
              <Text style={styles.infoCardSubtitle}>{t('listing.newProductOnly')}</Text>
            </View>
          </View>
          <Text style={styles.infoCardValue}>{t('listing.conditionAutoNew')}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('listing.description')} *</Text>
          <TextInput
            style={[styles.input, styles.textareaInput]}
            value={state.description}
            onChangeText={(value) => updateField('description', value)}
            placeholder={t('listing.descriptionPlaceholder')}
            placeholderTextColor={Colors.slate400}
            multiline
            maxLength={1200}
          />
        </View>

        <View style={styles.inlineRow}>
          <View style={styles.inlineBlock}>
            <Text style={styles.inputLabel}>{t('listing.stock')} *</Text>
            <TextInput
              style={styles.input}
              value={state.stockQuantity}
              onChangeText={(value) => updateField('stockQuantity', value)}
              placeholder="1"
              placeholderTextColor={Colors.slate400}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.inlineBlock}>
            <Text style={styles.inputLabel}>{t('listing.originCountry')}</Text>
            <TextInput
              style={styles.input}
              value={state.originCountry}
              onChangeText={(value) => updateField('originCountry', value)}
              placeholder="TR"
              placeholderTextColor={Colors.slate400}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('listing.originRegion')}</Text>
          <TextInput
            style={styles.input}
            value={state.originRegion}
            onChangeText={(value) => updateField('originRegion', value)}
            placeholder={t('listing.originRegionPlaceholder')}
            placeholderTextColor={Colors.slate400}
          />
        </View>

        <TouchableOpacity
          style={styles.advancedToggle}
          activeOpacity={0.85}
          onPress={() => setShowAdvancedDetails(!showAdvancedDetails)}
        >
          <Ionicons name={showAdvancedDetails ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.primary} />
          <Text style={styles.advancedToggleText}>{t('listing.moreDetails')}</Text>
        </TouchableOpacity>

        {showAdvancedDetails ? (
          <>
            <View style={styles.inlineRow}>
              <View style={styles.inlineBlock}>
                <Text style={styles.inputLabel}>{t('listing.sku')}</Text>
                <TextInput
                  style={styles.input}
                  value={state.sku}
                  onChangeText={(value) => updateField('sku', value)}
                  placeholder="SKU-001"
                  placeholderTextColor={Colors.slate400}
                />
              </View>
              <View style={styles.inlineBlock}>
                <Text style={styles.inputLabel}>{t('listing.weight')}</Text>
                <TextInput
                  style={styles.input}
                  value={state.weight}
                  onChangeText={(value) => updateField('weight', value)}
                  placeholder="0"
                  placeholderTextColor={Colors.slate400}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.inlineRow}>
              <View style={styles.inlineBlock}>
                <Text style={styles.inputLabel}>{t('listing.width')}</Text>
                <TextInput
                  style={styles.input}
                  value={state.dimensionWidth}
                  onChangeText={(value) => updateField('dimensionWidth', value)}
                  placeholder="0"
                  placeholderTextColor={Colors.slate400}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.inlineBlock}>
                <Text style={styles.inputLabel}>{t('listing.height')}</Text>
                <TextInput
                  style={styles.input}
                  value={state.dimensionHeight}
                  onChangeText={(value) => updateField('dimensionHeight', value)}
                  placeholder="0"
                  placeholderTextColor={Colors.slate400}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.inlineRow}>
              <View style={styles.inlineBlock}>
                <Text style={styles.inputLabel}>{t('listing.depth')}</Text>
                <TextInput
                  style={styles.input}
                  value={state.dimensionDepth}
                  onChangeText={(value) => updateField('dimensionDepth', value)}
                  placeholder="0"
                  placeholderTextColor={Colors.slate400}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.inlineBlock}>
                <Text style={styles.inputLabel}>{t('listing.geoIndicationCertNo')}</Text>
                <TextInput
                  style={styles.input}
                  value={state.geoIndicationCertNo}
                  onChangeText={(value) => updateField('geoIndicationCertNo', value)}
                  placeholder="CI-2024-001"
                  placeholderTextColor={Colors.slate400}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('listing.geoIndicationRegion')}</Text>
              <TextInput
                style={styles.input}
                value={state.geoIndicationRegion}
                onChangeText={(value) => updateField('geoIndicationRegion', value)}
                placeholder={t('listing.geoIndicationRegionPlaceholder')}
                placeholderTextColor={Colors.slate400}
              />
            </View>
          </>
        ) : null}
      </>
    );
  }

  function renderImagesStep() {
    return (
      <>
        <TouchableOpacity
          style={styles.imagePickerButton}
          activeOpacity={0.88}
          onPress={handlePickImages}
        >
          <Ionicons name="images-outline" size={26} color={Colors.primary} />
          <Text style={styles.imagePickerTitle}>{t('listing.addImages')}</Text>
          <Text style={styles.imagePickerSub}>
            {t('listing.imagePickerHint', { count: MAX_PRODUCT_IMAGE_COUNT })}
          </Text>
        </TouchableOpacity>

        {images.length > 0 ? (
          <View style={styles.imageGrid}>
            {images.map((image) => (
              <View key={image.id} style={styles.imageCard}>
                <Image source={{ uri: image.uri }} style={styles.imagePreview} contentFit="cover" />
                <TouchableOpacity
                  style={styles.imageRemoveButton}
                  activeOpacity={0.85}
                  onPress={() => handleRemoveImage(image.id)}
                >
                  <Ionicons name="close" size={14} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
      </>
    );
  }

  function renderAuctionReviewFields() {
    return (
      <>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('listing.auctionStartsWhen')} *</Text>
          <View style={styles.chipRow}>
            {AUCTION_START_DELAY_PRESETS.map((hours) => (
              <TouchableOpacity
                key={`auction-start-${hours}`}
                style={[styles.chip, state.selectedAuctionStartDelayHours === hours && styles.chipActive]}
                activeOpacity={0.85}
                onPress={() => handleApplyAuctionPreset(hours)}
              >
                <Text style={[styles.chipText, state.selectedAuctionStartDelayHours === hours && styles.chipTextActive]}>
                  {t('listing.hoursLater', { count: hours })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('listing.auctionDuration')} *</Text>
          <View style={styles.chipRow}>
            {AUCTION_DURATION_PRESETS.map((hours) => (
              <TouchableOpacity
                key={`auction-duration-${hours}`}
                style={[styles.chip, state.selectedAuctionDurationHours === hours && styles.chipActive]}
                activeOpacity={0.85}
                onPress={() => handleApplyAuctionDuration(hours)}
              >
                <Text style={[styles.chipText, state.selectedAuctionDurationHours === hours && styles.chipTextActive]}>
                  {t('listing.durationHours', { count: hours })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inlineRow}>
          <View style={styles.inlineBlock}>
            <Text style={styles.inputLabel}>{t('listing.auctionType')}</Text>
            <View style={styles.chipRow}>
              {[PRODUCT_CREATE_AUCTION_TYPES.REALTIME, PRODUCT_CREATE_AUCTION_TYPES.TIMED].map((auctionType) => (
                <TouchableOpacity
                  key={auctionType}
                  style={[styles.chip, state.auctionType === auctionType && styles.chipActive]}
                  activeOpacity={0.85}
                  onPress={() => updateField('auctionType', auctionType)}
                >
                  <Text style={[styles.chipText, state.auctionType === auctionType && styles.chipTextActive]}>
                    {t(`listing.auctionTypes.${auctionType}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('listing.minIncrement')} *</Text>
          <TextInput
            style={styles.input}
            value={state.auctionMinIncrement}
            onChangeText={(value) => updateField('auctionMinIncrement', value)}
            placeholder="1"
            placeholderTextColor={Colors.slate400}
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity
          style={styles.advancedToggle}
          activeOpacity={0.85}
          onPress={() => setShowAuctionAdvanced(!showAuctionAdvanced)}
        >
          <Ionicons name={showAuctionAdvanced ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.primary} />
          <Text style={styles.advancedToggleText}>{t('listing.moreAuctionSettings')}</Text>
        </TouchableOpacity>

        {showAuctionAdvanced ? (
          <>
            <TouchableOpacity
              style={styles.toggleCard}
              activeOpacity={0.85}
              onPress={() => updateField('antiSnipingEnabled', !state.antiSnipingEnabled)}
            >
              <View>
                <Text style={styles.toggleTitle}>{t('listing.antiSnipingEnabled')}</Text>
                <Text style={styles.toggleSub}>{t('listing.antiSnipingHint')}</Text>
              </View>
              <View style={[styles.checkbox, state.antiSnipingEnabled && styles.checkboxChecked]}>
                {state.antiSnipingEnabled ? <Ionicons name="checkmark" size={14} color={Colors.white} /> : null}
              </View>
            </TouchableOpacity>

            <View style={styles.inlineRow}>
              <View style={styles.inlineBlock}>
                <Text style={styles.inputLabel}>{t('listing.extensionSeconds')}</Text>
                <TextInput
                  style={styles.input}
                  value={state.extensionSeconds}
                  onChangeText={(value) => updateField('extensionSeconds', value)}
                  placeholder="60"
                  placeholderTextColor={Colors.slate400}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.inlineBlock}>
                <Text style={styles.inputLabel}>{t('listing.maxExtensions')}</Text>
                <TextInput
                  style={styles.input}
                  value={state.maxExtensions}
                  onChangeText={(value) => updateField('maxExtensions', value)}
                  placeholder="5"
                  placeholderTextColor={Colors.slate400}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </>
        ) : null}
      </>
    );
  }

  function renderReviewStep() {
    return (
      <>
        {state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION ? renderAuctionReviewFields() : null}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t('listing.summaryMode')}</Text>
          <Text style={styles.summaryValue}>
            {t(state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION ? 'listing.auction' : 'listing.directSale')}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t('listing.summaryTitle')}</Text>
          <Text style={styles.summaryValue}>{state.title}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t('listing.summaryCategory')}</Text>
          <Text style={styles.summaryValue}>{selectedCategoryLabel}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t('listing.summaryPrice')}</Text>
          <Text style={styles.summaryValue}>
            {state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION ? state.auctionStartPrice : state.directSalePrice}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t('listing.summaryImages')}</Text>
          <Text style={styles.summaryValue}>{t('listing.imageCount', { count: images.length })}</Text>
        </View>
      </>
    );
  }

  function renderCurrentStep() {
    if (currentStep === 1) return renderBasicsStep();
    if (currentStep === 2) return renderPricingStep();
    if (currentStep === 3) return renderDetailsStep();
    if (currentStep === 4) return renderImagesStep();
    return renderReviewStep();
  }

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroBadge}>{t('listing.heroBadge')}</Text>
            <View style={styles.heroCountPill}>
              <Ionicons name="cube-outline" size={14} color={Colors.primary} />
              <Text style={styles.heroCountText}>
                {t('listing.totalProducts', { count: totalProducts })}
              </Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{t('listing.wizardHeroTitle')}</Text>
          <Text style={styles.heroSub}>{t('listing.wizardHeroSub')}</Text>
        </View>

        <View style={styles.productsCard}>
          <View style={styles.productsCardHeader}>
            <View>
              <Text style={styles.productsCardTitle}>{t('listing.myProductsTitle')}</Text>
              <Text style={styles.productsCardSubtitle}>
                {t('listing.totalProducts', { count: totalProducts })}
              </Text>
            </View>
            {isProductsLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
          </View>
          {recentProducts.map((item) => (
            <View key={item.id} style={styles.productRow}>
              <View style={styles.productRowInfo}>
                <Text style={styles.productRowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.productRowSub}>
                  {item.price ? `₺${Number(item.price).toLocaleString('tr-TR')}` : '₺0'}
                </Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>
                  {t(`productStatuses.${(item.status || 'DRAFT') as ProductStatus}`, { defaultValue: item.status || 'DRAFT' })}
                </Text>
              </View>
            </View>
          ))}
          {recentProducts.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Text style={styles.emptyProductsText}>{t('listing.emptyProducts')}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.stepCard}>
          <ProductCreateProgress
            currentStep={currentStep}
            totalSteps={5}
            titleKey={STEP_TITLE_KEYS[currentStep]}
          />
          {renderCurrentStep()}
        </View>

        <View style={styles.navigationRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={handleGoBack}
            disabled={currentStep === 1 || isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>{t('listing.previous')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              ((!canContinue && currentStep !== 5) || (!canSubmit && currentStep === 5) || isSubmitting)
                && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.88}
            onPress={currentStep === 5 ? handleSubmit : handleGoNext}
            disabled={((!canContinue && currentStep !== 5) || (!canSubmit && currentStep === 5) || isSubmitting)}
          >
            {isSubmitting ? <ActivityIndicator color={Colors.white} /> : null}
            {!isSubmitting ? (
              <>
                <Ionicons
                  name={currentStep === 5 ? 'checkmark-circle-outline' : 'arrow-forward'}
                  size={18}
                  color={Colors.white}
                />
                <Text style={styles.primaryButtonText}>
                  {t(currentStep === 5 ? 'listing.publish' : 'listing.next')}
                </Text>
              </>
            ) : null}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={isCategoryModalVisible}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.categoryModalScreen}>
          <View style={styles.categoryModalHeader}>
            <Text style={styles.categoryModalTitle}>{t('listing.categoryModalTitle')}</Text>
            <TouchableOpacity
              style={styles.categoryModalCloseButton}
              onPress={() => setCategoryModalVisible(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={18} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>
          <View style={styles.categorySearchWrapper}>
            <Ionicons name="search-outline" size={16} color={Colors.slate500} />
            <TextInput
              style={styles.categorySearchInput}
              value={categorySearch}
              onChangeText={setCategorySearch}
              placeholder={t('listing.categorySearchPlaceholder')}
              placeholderTextColor={Colors.slate400}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rootCategoryRow}
          >
            {rootCategories.map((rootCategory) => {
              const isRootSelected = rootCategory.id === selectedRootCategoryId;
              return (
                <TouchableOpacity
                  key={rootCategory.id}
                  style={[styles.rootCategoryChip, isRootSelected && styles.rootCategoryChipSelected]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedRootCategoryId(rootCategory.id)}
                >
                  <Ionicons
                    name={getCategoryIcon(rootCategory.slug).icon}
                    size={14}
                    color={isRootSelected ? Colors.primary : Colors.slate500}
                  />
                  <Text
                    style={[
                      styles.rootCategoryChipText,
                      isRootSelected && styles.rootCategoryChipTextSelected,
                    ]}
                  >
                    {rootCategory.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.subcategoryTitle}>{t('listing.subcategoryTitle')}</Text>
          <FlatList
            data={filteredSubcategories}
            keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.categoryListContent}
              renderItem={({ item }) => {
                const isSelected = item.id === state.categoryId;
                return (
                <TouchableOpacity
                  style={[styles.categoryListItem, isSelected && styles.categoryListItemSelected]}
                  activeOpacity={0.85}
                  onPress={() => {
                    patchState({ categoryId: item.id });
                    setCategoryModalVisible(false);
                  }}
                >
                  <View style={styles.categoryListItemLeft}>
                    <View style={styles.categoryMediaWrapLarge}>
                      <Image
                        source={{ uri: getCategoryMockImage(item.slug) }}
                        style={styles.categoryMediaImage}
                        contentFit="cover"
                      />
                    </View>
                    <Text style={[styles.categoryListItemText, isSelected && styles.categoryListItemTextSelected]}>
                      {item.name}
                    </Text>
                  </View>
                  {isSelected ? <Ionicons name="checkmark" size={16} color={Colors.primary} /> : null}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={(
              <View style={styles.categoryEmptyState}>
                <Text style={styles.categoryEmptyStateText}>{t('listing.categoryEmpty')}</Text>
              </View>
              )}
            />
        </View>
      </Modal>
    </>
  );
}
