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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MOBILE_LISTING_CREATE_OPTIONAL_FIELDS,
  type MobileListingCreateOptionalField,
} from '@endemigo/shared';
import type { ProductStatus } from '../../../../shared-types/enums/product-status.enum.ts';
import { getTurkishDistrictsByProvinceName, TURKISH_PROVINCES } from '../../../constants/turkishLocations';
import { Colors } from '../../../constants/theme';
import {
  useProductCreateWizard,
  canContinueProductCreateStep,
  isProductCreateReadyToSubmit,
  type ListingFieldVisibilityOptions,
} from '../../../hooks/useProductCreateWizard.ts';
import { useMobileConfig } from '../../../hooks/useMobileConfig';
import { useModalStore } from '../../../store/modalStore';
import type { Category, Product } from '../../../types';
import {
  PRODUCT_CREATE_AUCTION_TYPES,
  PRODUCT_CREATE_LISTING_TYPES,
  PRODUCT_CREATE_PRODUCTION_SEASONS,
  type ProductCreateImageDraft,
  type ProductCreateWizardStep,
} from '../../../types/productCreate.ts';
import { resolveApiErrorMessage } from '../../../utils/apiError';
import { getCategoryIcon, getCategoryMockImage } from '../../../utils/productCreateCategoryPresentation.ts';
import { AUCTION_DURATION_PRESETS, AUCTION_START_DELAY_PRESETS, buildAuctionSchedule } from '../../../utils/productCreateSchedule.ts';
import { MAX_PRODUCT_IMAGE_COUNT, mapPickerAssetToProductImage } from '../../../utils/productImageUpload.ts';
import { formatPriceInput } from '../../../utils/priceInputMask.ts';
import { formatCurrency } from '../../../utils/transactionFormatters';
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
  1: 'listing.stepCore',
  2: 'listing.stepShippingPayment',
  3: 'listing.stepProductStory',
  4: 'listing.stepProductDescriptions',
  5: 'listing.stepProductDetails',
  6: 'listing.stepReview',
};

const DELIVERY_TEMPLATE_OPTIONS = [
  'Yurtiçi Kargo 1-3 gün',
  'Yurtiçi Kargo 3-7 gün',
  'Yurtiçi Ön Sipariş 3-15 gün',
  'Yurtiçi Ön Sipariş 1-1.5 ay',
  'UPS Kargo 1-3 gün',
  'UPS Kargo 3-7 gün',
] as const;

const DESI_OPTIONS = ['0-1', '1-3', '3-5', '5-10', '10-15', '15-20', '20+'] as const;

const FEATURE_BADGE_OPTIONS = [
  'VEGAN',
  'BIO',
  'NATURAL',
  'ECO',
  'PARABEN_FREE',
  'ORGANIC',
  'HALAL',
  'ADDITIVE_FREE',
  'SUGAR_FREE',
  'GLUTEN_FREE',
  'HANDMADE',
  'SLOW_FOOD',
  'COLD_DELIVERY',
] as const;

const GEO_BADGE_OPTIONS = [
  'PDO_RED_TR',
  'PGI_GREEN_TR',
  'TSG_BLUE_TR',
  'PDO_RED_EN',
  'PGI_GREEN_EN',
  'TSG_BLUE_EN',
] as const;
type DesiFieldTarget = 'domestic' | 'international';

const ORIGIN_COUNTRY_OPTIONS = [
  { code: 'TR', label: 'Türkiye' },
  { code: 'DE', label: 'Almanya' },
  { code: 'US', label: 'Amerika Birleşik Devletleri' },
  { code: 'GB', label: 'Birleşik Krallık' },
  { code: 'FR', label: 'Fransa' },
  { code: 'IT', label: 'İtalya' },
  { code: 'ES', label: 'İspanya' },
  { code: 'NL', label: 'Hollanda' },
] as const;

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
  const { data: mobileConfigData } = useMobileConfig();
  const [currentStep, setCurrentStep] = useState<ProductCreateWizardStep>(1);
  const [images, setImages] = useState<ProductCreateImageDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedRootCategoryId, setSelectedRootCategoryId] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [showAuctionAdvanced, setShowAuctionAdvanced] = useState(false);
  const [selectedExistingProductId, setSelectedExistingProductId] = useState<string | null>(null);
  const [isProvinceModalVisible, setProvinceModalVisible] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState('');
  const [isCountryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [isShippingProvinceModalVisible, setShippingProvinceModalVisible] = useState(false);
  const [shippingProvinceSearch, setShippingProvinceSearch] = useState('');
  const [isShippingDistrictModalVisible, setShippingDistrictModalVisible] = useState(false);
  const [shippingDistrictSearch, setShippingDistrictSearch] = useState('');
  const [isDesiModalVisible, setDesiModalVisible] = useState(false);
  const [desiFieldTarget, setDesiFieldTarget] = useState<DesiFieldTarget | null>(null);

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

  const filteredRootCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return rootCategories;
    return rootCategories.filter((category) => category.name.toLowerCase().includes(query));
  }, [categorySearch, rootCategories]);

  const filteredSubcategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return activeSubcategories;
    return activeSubcategories.filter((category) => category.name.toLowerCase().includes(query));
  }, [activeSubcategories, categorySearch]);

  const filteredProvinces = useMemo(() => {
    const query = provinceSearch.trim().toLocaleLowerCase('tr-TR');
    if (!query) return TURKISH_PROVINCES;
    return TURKISH_PROVINCES.filter((province) =>
      province.toLocaleLowerCase('tr-TR').includes(query));
  }, [provinceSearch]);

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLocaleLowerCase('tr-TR');
    if (!query) return ORIGIN_COUNTRY_OPTIONS;
    return ORIGIN_COUNTRY_OPTIONS.filter((country) =>
      country.label.toLocaleLowerCase('tr-TR').includes(query)
      || country.code.toLocaleLowerCase('tr-TR').includes(query));
  }, [countrySearch]);

  const shippingDistrictOptions = useMemo(
    () => getTurkishDistrictsByProvinceName(state.shippingProvince),
    [state.shippingProvince],
  );

  const filteredShippingProvinces = useMemo(() => {
    const query = shippingProvinceSearch.trim().toLocaleLowerCase('tr-TR');
    if (!query) return TURKISH_PROVINCES;
    return TURKISH_PROVINCES.filter((province) =>
      province.toLocaleLowerCase('tr-TR').includes(query));
  }, [shippingProvinceSearch]);

  const filteredShippingDistricts = useMemo(() => {
    const query = shippingDistrictSearch.trim().toLocaleLowerCase('tr-TR');
    if (!query) return shippingDistrictOptions;
    return shippingDistrictOptions.filter((district) =>
      district.toLocaleLowerCase('tr-TR').includes(query));
  }, [shippingDistrictOptions, shippingDistrictSearch]);

  const selectedExistingProduct = useMemo(
    () => recentProducts.find((item) => item.id === selectedExistingProductId) ?? null,
    [recentProducts, selectedExistingProductId],
  );
  const hasSelectedExistingProductImages = Boolean(
    selectedExistingProduct?.images?.length || selectedExistingProduct?.imageUrl || selectedExistingProduct?.thumbnail,
  );
  const effectiveImageCount = images.length > 0 || hasSelectedExistingProductImages ? 1 : 0;
  const listingFieldVisibility = useMemo<ListingFieldVisibilityOptions>(() => {
    const optionalFields = mobileConfigData?.listingCreate?.optionalFields;
    if (!Array.isArray(optionalFields) || optionalFields.length === 0) {
      return { optionalFields: [...MOBILE_LISTING_CREATE_OPTIONAL_FIELDS] };
    }
    return { optionalFields };
  }, [mobileConfigData?.listingCreate?.optionalFields]);
  const isListingFieldVisible = (field: MobileListingCreateOptionalField): boolean =>
    listingFieldVisibility.optionalFields?.includes(field) ?? true;

  const canContinue = canContinueProductCreateStep(currentStep, state, effectiveImageCount, listingFieldVisibility);
  const canSubmit = isProductCreateReadyToSubmit(state, effectiveImageCount, listingFieldVisibility);

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
  }, [rootCategories, state.categoryId]);

  function handleOpenCategoryModal() {
    const matchedRootCategory = rootCategories.find(
      (rootCategory) =>
        rootCategory.id === state.categoryId
        || Boolean(rootCategory.children?.some((child) => child.id === state.categoryId)),
    );

    setCategorySearch('');
    setSelectedRootCategoryId(matchedRootCategory?.id ?? '');
    setCategoryModalVisible(true);
  }

  function handleCloseCategoryModal() {
    setCategorySearch('');
    setSelectedRootCategoryId(selectedCategory ? selectedRootCategoryId : '');
    setCategoryModalVisible(false);
  }

  function handleSelectRootCategory(rootCategoryId: string) {
    setSelectedRootCategoryId(rootCategoryId);
    setCategorySearch('');
  }

  function handleBackToRootCategories() {
    setCategorySearch('');
    setSelectedRootCategoryId('');
  }

  function handleOpenProvinceModal() {
    setProvinceSearch('');
    setProvinceModalVisible(true);
  }

  function handleCloseProvinceModal() {
    setProvinceSearch('');
    setProvinceModalVisible(false);
  }

  function handleOpenCountryModal() {
    setCountrySearch('');
    setCountryModalVisible(true);
  }

  function handleCloseCountryModal() {
    setCountrySearch('');
    setCountryModalVisible(false);
  }

  function handleOpenShippingProvinceModal() {
    setShippingProvinceSearch('');
    setShippingProvinceModalVisible(true);
  }

  function handleCloseShippingProvinceModal() {
    setShippingProvinceSearch('');
    setShippingProvinceModalVisible(false);
  }

  function handleOpenShippingDistrictModal() {
    if (!state.shippingProvince) return;
    setShippingDistrictSearch('');
    setShippingDistrictModalVisible(true);
  }

  function handleCloseShippingDistrictModal() {
    setShippingDistrictSearch('');
    setShippingDistrictModalVisible(false);
  }

  function handleOpenDesiModal(target: DesiFieldTarget) {
    setDesiFieldTarget(target);
    setDesiModalVisible(true);
  }

  function handleCloseDesiModal() {
    setDesiModalVisible(false);
    setDesiFieldTarget(null);
  }

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

  function handleToggleSalesMonth(month: number) {
    const currentMonths = state.salesMonths || [];
    const nextMonths = currentMonths.includes(month)
      ? currentMonths.filter((value) => value !== month)
      : [...currentMonths, month].sort((a, b) => a - b);
    updateField('salesMonths', nextMonths);
  }

  function handleToggleProductionSeason(season: keyof typeof PRODUCT_CREATE_PRODUCTION_SEASONS | string) {
    const currentSeasons = state.productionSeasons || [];
    const nextSeasons = currentSeasons.includes(season as never)
      ? currentSeasons.filter((value) => value !== season)
      : [...currentSeasons, season as never];
    updateField('productionSeasons', nextSeasons as typeof state.productionSeasons);
  }

  function handleToggleFeatureBadge(badge: string) {
    const currentBadges = state.featureBadges || [];
    const nextBadges = currentBadges.includes(badge)
      ? currentBadges.filter((value) => value !== badge)
      : [...currentBadges, badge];
    updateField('featureBadges', nextBadges);
  }

  function handleToggleGeoBadgeSelection(badge: string) {
    const currentSelections = state.geoBadgeSelections || [];
    const nextSelections = currentSelections.includes(badge)
      ? currentSelections.filter((value) => value !== badge)
      : [...currentSelections, badge];
    updateField('geoBadgeSelections', nextSelections);
  }

  function handleGoNext() {
    if (!canContinue || currentStep === 6) return;
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
      await submitProductCreateWizard(state, images, selectedExistingProductId ?? undefined);
      reset();
      setImages([]);
      setCurrentStep(1);
      setCategorySearch('');
      setShowAuctionAdvanced(false);
      setSelectedExistingProductId(null);
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

  function handleSelectExistingProduct(product: Product) {
    const listingType = product.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION
      ? PRODUCT_CREATE_LISTING_TYPES.AUCTION
      : PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE;

    patchState({
      listingType,
      title: product.title ?? '',
      categoryId: product.categoryId ?? '',
      directSalePrice: product.price ? formatPriceInput(String(product.price)) : '',
      auctionStartPrice: product.price ? formatPriceInput(String(product.price)) : '',
      description: product.description ?? '',
      askPriceEnabled: Boolean(product.askPriceEnabled),
      askPriceMinAmount: product.askPriceMinAmount ? formatPriceInput(String(product.askPriceMinAmount)) : '',
    });
    setSelectedExistingProductId(product.id);
    setCurrentStep(1);
  }

  function renderCoreStep() {
    return (
      <>
        {renderBasicsStep()}
        {renderPricingStep()}
        {renderDetailsStep()}
      </>
    );
  }

  function renderGeoIndicationStep() {
    return (
      <>
        {isListingFieldVisible('originCountry') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.originCountry')}</Text>
            <TouchableOpacity
              style={styles.selectorInput}
              activeOpacity={0.85}
              onPress={handleOpenCountryModal}
            >
              <Text
                style={state.originCountry ? styles.selectorInputText : styles.selectorInputPlaceholder}
                numberOfLines={1}
              >
                {state.originCountry || t('listing.originCountryPlaceholder')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.slate500} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.inlineRow}>
          {isListingFieldVisible('shippingProvince') ? (
            <View style={styles.inlineBlock}>
              <Text style={styles.inputLabel}>{t('listing.shippingProvince')}</Text>
              <TouchableOpacity
                style={styles.selectorInput}
                activeOpacity={0.85}
                onPress={handleOpenShippingProvinceModal}
              >
                <Text
                  style={state.shippingProvince ? styles.selectorInputText : styles.selectorInputPlaceholder}
                  numberOfLines={1}
                >
                  {state.shippingProvince || t('listing.shippingProvincePlaceholder')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={Colors.slate500} />
              </TouchableOpacity>
            </View>
          ) : null}
          {isListingFieldVisible('shippingDistrict') ? (
            <View style={styles.inlineBlock}>
              <Text style={styles.inputLabel}>{t('listing.shippingDistrict')}</Text>
              <TouchableOpacity
                style={styles.selectorInput}
                activeOpacity={0.85}
                onPress={handleOpenShippingDistrictModal}
              >
                <Text
                  style={state.shippingDistrict ? styles.selectorInputText : styles.selectorInputPlaceholder}
                  numberOfLines={1}
                >
                  {state.shippingDistrict || t('listing.shippingDistrictPlaceholder')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={Colors.slate500} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {isListingFieldVisible('shippingAddress') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.shippingAddress')}</Text>
            <TextInput
              style={[styles.input, styles.textareaInput]}
              value={state.shippingAddress}
              onChangeText={(value) => updateField('shippingAddress', value)}
              placeholder={t('listing.shippingAddressPlaceholder')}
              placeholderTextColor={Colors.slate400}
              multiline
              maxLength={300}
            />
          </View>
        ) : null}

        {isListingFieldVisible('deliveryTemplateDomestic') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.deliveryTemplateDomestic')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRowScroll}>
              {DELIVERY_TEMPLATE_OPTIONS.map((template) => {
                const isSelected = state.deliveryTemplateDomestic === template;
                return (
                  <TouchableOpacity
                    key={`delivery-domestic-${template}`}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    activeOpacity={0.85}
                    onPress={() => updateField('deliveryTemplateDomestic', template)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{template}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {isListingFieldVisible('deliveryTemplateInternational') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.deliveryTemplateInternational')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRowScroll}>
              {DELIVERY_TEMPLATE_OPTIONS.map((template) => {
                const isSelected = state.deliveryTemplateInternational === template;
                return (
                  <TouchableOpacity
                    key={`delivery-international-${template}`}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    activeOpacity={0.85}
                    onPress={() => updateField('deliveryTemplateInternational', template)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{template}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {isListingFieldVisible('desiDomestic') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.desiDomestic')}</Text>
            <TouchableOpacity
              style={styles.selectorInput}
              activeOpacity={0.85}
              onPress={() => handleOpenDesiModal('domestic')}
            >
              <Text
                style={state.desiDomestic ? styles.selectorInputText : styles.selectorInputPlaceholder}
                numberOfLines={1}
              >
                {state.desiDomestic || t('listing.desiPlaceholder')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.slate500} />
            </TouchableOpacity>
          </View>
        ) : null}

        {isListingFieldVisible('desiInternational') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.desiInternational')}</Text>
            <TouchableOpacity
              style={styles.selectorInput}
              activeOpacity={0.85}
              onPress={() => handleOpenDesiModal('international')}
            >
              <Text
                style={state.desiInternational ? styles.selectorInputText : styles.selectorInputPlaceholder}
                numberOfLines={1}
              >
                {state.desiInternational || t('listing.desiPlaceholder')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.slate500} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.inlineRow}>
          {isListingFieldVisible('wholesalePrice') ? (
            <View style={styles.inlineBlock}>
              <Text style={styles.inputLabel}>{t('listing.wholesalePrice')}</Text>
              <TextInput
                style={styles.input}
                value={state.wholesalePrice}
                onChangeText={(value) => updateField('wholesalePrice', formatPriceInput(value))}
                placeholder="0"
                placeholderTextColor={Colors.slate400}
                keyboardType="decimal-pad"
              />
            </View>
          ) : null}
          {isListingFieldVisible('retailPrice') ? (
            <View style={styles.inlineBlock}>
              <Text style={styles.inputLabel}>{t('listing.retailPrice')}</Text>
              <TextInput
                style={styles.input}
                value={state.retailPrice}
                onChangeText={(value) => updateField('retailPrice', formatPriceInput(value))}
                placeholder="0"
                placeholderTextColor={Colors.slate400}
                keyboardType="decimal-pad"
              />
            </View>
          ) : null}
        </View>
      </>
    );
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
            onPress={handleOpenCategoryModal}
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
                updateField('auctionStartPrice', formatPriceInput(value));
                return;
              }

              updateField('directSalePrice', formatPriceInput(value));
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
                  onChangeText={(value) => updateField('askPriceMinAmount', formatPriceInput(value))}
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
          {isListingFieldVisible('originRegion') ? (
            <View style={styles.inlineBlock}>
              <Text style={styles.inputLabel}>{t('listing.originRegion')}</Text>
              <TouchableOpacity
                style={styles.selectorInput}
                activeOpacity={0.85}
                onPress={handleOpenProvinceModal}
              >
                <Text
                  style={state.originRegion ? styles.selectorInputText : styles.selectorInputPlaceholder}
                  numberOfLines={1}
                >
                  {state.originRegion || t('listing.originRegionPlaceholder')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={Colors.slate500} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </>
    );
  }

  function renderAdditionalStep() {
    return (
      <>
        {isListingFieldVisible('sellerNotes') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.sellerNotes')}</Text>
            <TextInput
              style={[styles.input, styles.textareaInput]}
              value={state.sellerNotes}
              onChangeText={(value) => updateField('sellerNotes', value)}
              placeholder={t('listing.sellerNotesPlaceholder')}
              placeholderTextColor={Colors.slate400}
              multiline
              maxLength={600}
            />
          </View>
        ) : null}

        {isListingFieldVisible('brand') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.brand')}</Text>
            <TextInput
              style={styles.input}
              value={state.brand}
              onChangeText={(value) => updateField('brand', value)}
              placeholder={t('listing.brandPlaceholder')}
              placeholderTextColor={Colors.slate400}
            />
          </View>
        ) : null}

        {isListingFieldVisible('isEndemigoBrandCandidate') ? (
          <TouchableOpacity
            style={styles.toggleCard}
            activeOpacity={0.85}
            onPress={() => updateField('isEndemigoBrandCandidate', !state.isEndemigoBrandCandidate)}
          >
            <View>
              <Text style={styles.toggleTitle}>{t('listing.endemigoBrandQuestion')}</Text>
              <Text style={styles.toggleSub}>{t('listing.endemigoBrandHint')}</Text>
            </View>
            <View style={[styles.checkbox, state.isEndemigoBrandCandidate && styles.checkboxChecked]}>
              {state.isEndemigoBrandCandidate ? <Ionicons name="checkmark" size={14} color={Colors.white} /> : null}
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.inlineRow}>
          {isListingFieldVisible('productionProvince') ? (
            <View style={styles.inlineBlock}>
              <Text style={styles.inputLabel}>{t('listing.productionProvince')}</Text>
              <TextInput
                style={styles.input}
                value={state.productionProvince}
                onChangeText={(value) => updateField('productionProvince', value)}
                placeholder={t('listing.productionProvincePlaceholder')}
                placeholderTextColor={Colors.slate400}
              />
            </View>
          ) : null}
          {isListingFieldVisible('productionDistrict') ? (
            <View style={styles.inlineBlock}>
              <Text style={styles.inputLabel}>{t('listing.productionDistrict')}</Text>
              <TextInput
                style={styles.input}
                value={state.productionDistrict}
                onChangeText={(value) => updateField('productionDistrict', value)}
                placeholder={t('listing.productionDistrictPlaceholder')}
                placeholderTextColor={Colors.slate400}
              />
            </View>
          ) : null}
        </View>

      </>
    );
  }

  function renderLogisticsStep() {
    return (
      <>
        {isListingFieldVisible('productContent') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.productContent')}</Text>
            <TextInput
              style={[styles.input, styles.textareaInput]}
              value={state.productContent}
              onChangeText={(value) => updateField('productContent', value)}
              placeholder={t('listing.productContentPlaceholder')}
              placeholderTextColor={Colors.slate400}
              multiline
              maxLength={600}
            />
          </View>
        ) : null}

        <View style={styles.inlineRow}>
          {isListingFieldVisible('barcodeNo') ? (
            <View style={styles.inlineBlock}>
              <Text style={styles.inputLabel}>{t('listing.barcodeNo')}</Text>
              <TextInput
                style={styles.input}
                value={state.barcodeNo}
                onChangeText={(value) => updateField('barcodeNo', value)}
                placeholder={t('listing.barcodeNoPlaceholder')}
                placeholderTextColor={Colors.slate400}
                keyboardType="number-pad"
              />
            </View>
          ) : null}
          {isListingFieldVisible('geoIndicationReceivedAt') ? (
            <View style={styles.inlineBlock}>
              <Text style={styles.inputLabel}>{t('listing.geoIndicationReceivedAt')}</Text>
              <TextInput
                style={styles.input}
                value={state.geoIndicationReceivedAt}
                onChangeText={(value) => updateField('geoIndicationReceivedAt', value)}
                placeholder="2026-05-07"
                placeholderTextColor={Colors.slate400}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.inlineRow}>
          {isListingFieldVisible('geoIndicationCertNo') ? (
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
          ) : null}
          {isListingFieldVisible('geoIndicationRegion') ? (
            <View style={styles.inlineBlock}>
              <Text style={styles.inputLabel}>{t('listing.geoIndicationRegion')}</Text>
              <TextInput
                style={styles.input}
                value={state.geoIndicationRegion}
                onChangeText={(value) => updateField('geoIndicationRegion', value)}
                placeholder={t('listing.geoIndicationRegionPlaceholder')}
                placeholderTextColor={Colors.slate400}
              />
            </View>
          ) : null}
        </View>

        {isListingFieldVisible('additionalCertificates') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.additionalCertificates')}</Text>
            <TextInput
              style={[styles.input, styles.textareaInput]}
              value={state.additionalCertificates}
              onChangeText={(value) => updateField('additionalCertificates', value)}
              placeholder={t('listing.additionalCertificatesPlaceholder')}
              placeholderTextColor={Colors.slate400}
              multiline
              maxLength={500}
            />
          </View>
        ) : null}

        {isListingFieldVisible('featureBadges') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.featureBadges')}</Text>
            <View style={styles.chipRow}>
              {FEATURE_BADGE_OPTIONS.map((badge) => {
                const isSelected = state.featureBadges.includes(badge);
                return (
                  <TouchableOpacity
                    key={`feature-badge-${badge}`}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    activeOpacity={0.85}
                    onPress={() => handleToggleFeatureBadge(badge)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{badge}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {isListingFieldVisible('geoBadgeSelections') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.geoBadgeSelections')}</Text>
            <View style={styles.chipRow}>
              {GEO_BADGE_OPTIONS.map((badge) => {
                const isSelected = state.geoBadgeSelections.includes(badge);
                return (
                  <TouchableOpacity
                    key={`geo-badge-${badge}`}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    activeOpacity={0.85}
                    onPress={() => handleToggleGeoBadgeSelection(badge)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{badge}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}
      </>
    );
  }

  function renderImagesStep() {
    return (
      <>
        <View style={styles.inlineRow}>
          {isListingFieldVisible('sku') ? (
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
          ) : null}
          {isListingFieldVisible('weight') ? (
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
          ) : null}
        </View>

        <View style={styles.inlineRow}>
          {isListingFieldVisible('dimensionWidth') ? (
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
          ) : null}
          {isListingFieldVisible('dimensionHeight') ? (
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
          ) : null}
        </View>

        {isListingFieldVisible('dimensionDepth') ? (
          <View style={styles.inputGroup}>
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
        ) : null}

        {isListingFieldVisible('productionSeasons') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.productionSeason')}</Text>
            <View style={styles.chipRow}>
              {[
                PRODUCT_CREATE_PRODUCTION_SEASONS.SPRING,
                PRODUCT_CREATE_PRODUCTION_SEASONS.SUMMER,
                PRODUCT_CREATE_PRODUCTION_SEASONS.AUTUMN,
                PRODUCT_CREATE_PRODUCTION_SEASONS.WINTER,
              ].map((season) => {
                const isSelected = state.productionSeasons.includes(season);
                return (
                  <TouchableOpacity
                    key={season}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    activeOpacity={0.85}
                    onPress={() => handleToggleProductionSeason(season)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {t(`listing.productionSeasons.${season}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {isListingFieldVisible('salesMonths') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.salesMonths')}</Text>
            <View style={styles.chipRow}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
                const isSelected = state.salesMonths.includes(month);
                return (
                  <TouchableOpacity
                    key={`sales-month-${month}`}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    activeOpacity={0.85}
                    onPress={() => handleToggleSalesMonth(month)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{month}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {isListingFieldVisible('images') ? (
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
        ) : null}

        {isListingFieldVisible('images') && images.length > 0 ? (
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
            onChangeText={(value) => updateField('auctionMinIncrement', formatPriceInput(value))}
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
    if (currentStep === 1) return renderCoreStep();
    if (currentStep === 2) return renderGeoIndicationStep();
    if (currentStep === 3) return renderAdditionalStep();
    if (currentStep === 4) return renderLogisticsStep();
    if (currentStep === 5) return renderImagesStep();
    return renderReviewStep();
  }

  return (
    <>
      <View style={styles.page}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {currentStep === 1 ? (
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
              <Text style={styles.heroTitle} numberOfLines={2}>{t('listing.wizardHeroTitle')}</Text>
              <Text style={styles.heroSub} numberOfLines={2}>{t('listing.wizardHeroSub')}</Text>
            </View>
          ) : null}

          {currentStep === 1 ? (
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
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.productRow,
                    selectedExistingProductId === item.id && styles.productRowSelected,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleSelectExistingProduct(item)}
                >
                  <View style={styles.productRowInfo}>
                    <Text style={styles.productRowTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.productRowSub}>
                      {item.price ? formatCurrency(item.price) : formatCurrency(0)}
                    </Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>
                      {t(`productStatuses.${(item.status || 'DRAFT') as ProductStatus}`, { defaultValue: item.status || 'DRAFT' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {recentProducts.length === 0 ? (
                <View style={styles.emptyProductsCompact}>
                  <Ionicons name="cube-outline" size={16} color={Colors.slate500} />
                  <Text style={styles.emptyProductsText}>{t('listing.emptyProducts')}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.stepCard}>
            <ProductCreateProgress
              currentStep={currentStep}
              totalSteps={6}
              titleKey={STEP_TITLE_KEYS[currentStep]}
              listingType={state.listingType}
            />
            {renderCurrentStep()}
          </View>
        </ScrollView>

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
              state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION && styles.primaryButtonAuction,
              ((!canContinue && currentStep !== 6) || (!canSubmit && currentStep === 6) || isSubmitting)
                && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.88}
            onPress={currentStep === 6 ? handleSubmit : handleGoNext}
            disabled={((!canContinue && currentStep !== 6) || (!canSubmit && currentStep === 6) || isSubmitting)}
          >
            {isSubmitting ? <ActivityIndicator color={Colors.white} /> : null}
            {!isSubmitting ? (
              <>
                <Ionicons
                  name={currentStep === 6 ? 'checkmark-circle-outline' : 'arrow-forward'}
                  size={18}
                  color={Colors.white}
                />
                <Text style={styles.primaryButtonText}>
                  {t(currentStep === 6 ? 'listing.publish' : 'listing.next')}
                </Text>
              </>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={isCategoryModalVisible}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseCategoryModal}
      >
        <SafeAreaView style={styles.categoryModalSafeArea} edges={['top']}>
          <View style={styles.categoryModalScreen}>
            <View style={styles.categoryModalHeader}>
              <View style={styles.categoryModalHeaderTextWrap}>
                <Text style={styles.categoryModalTitle}>{t('listing.categoryModalTitle')}</Text>
                <Text style={styles.categoryModalSubtitle}>{t('listing.categoryModalSubtitle')}</Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseButton}
                onPress={handleCloseCategoryModal}
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
                placeholder={selectedRootCategoryId ? t('listing.subcategorySearchPlaceholder') : t('listing.rootCategorySearchPlaceholder')}
                placeholderTextColor={Colors.slate400}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {categorySearch.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.categorySearchClearButton}
                  onPress={() => setCategorySearch('')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.slate500} />
                </TouchableOpacity>
              ) : null}
            </View>
            {!selectedRootCategoryId ? (
              <>
                <Text style={styles.rootCategoryTitle}>{t('listing.rootCategoryTitle')}</Text>
                <FlatList
                  data={filteredRootCategories}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.rootCategoryListContent}
                  renderItem={({ item }) => {
                    const rootCategoryIcon = getCategoryIcon(item.slug, item.name);
                    const subcategoryCount = item.children?.length ?? 0;

                    return (
                      <TouchableOpacity
                        style={styles.rootCategoryListItem}
                        activeOpacity={0.85}
                        onPress={() => handleSelectRootCategory(item.id)}
                      >
                        <View
                          style={[
                            styles.rootCategoryListIconWrap,
                            { backgroundColor: `${rootCategoryIcon.color}12` },
                          ]}
                        >
                          <Ionicons name={rootCategoryIcon.icon} size={20} color={rootCategoryIcon.color} />
                        </View>
                        <View style={styles.rootCategoryListContentWrap}>
                          <Text style={styles.rootCategoryListTitle}>{item.name}</Text>
                          <Text style={styles.rootCategoryListMeta}>
                            {t('listing.rootCategoryMeta_other', { count: subcategoryCount })}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={(
                    <View style={styles.categoryEmptyState}>
                      <Text style={styles.categoryEmptyStateText}>{t('listing.categoryEmpty')}</Text>
                    </View>
                  )}
                />
              </>
            ) : (
              <>
                <View style={styles.subcategoryHeader}>
                  <TouchableOpacity
                    style={styles.subcategoryBackButton}
                    activeOpacity={0.85}
                    onPress={handleBackToRootCategories}
                  >
                    <Ionicons name="arrow-back" size={16} color={Colors.primary} />
                    <Text style={styles.subcategoryBackText}>{t('listing.backToRootCategories')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.subcategoryTitle}>{selectedRootCategory?.name ?? t('listing.subcategoryTitle')}</Text>
                </View>
                <FlatList
                  data={filteredSubcategories}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.categoryListContent}
                  renderItem={({ item }) => {
                    const isSelected = item.id === state.categoryId;
                    const categoryImage = getCategoryMockImage(item.slug, item.name);
                    const categoryIcon = getCategoryIcon(item.slug, item.name);
                    return (
                      <TouchableOpacity
                        style={[styles.categoryListItem, isSelected && styles.categoryListItemSelected]}
                        activeOpacity={0.85}
                        onPress={() => {
                          patchState({ categoryId: item.id });
                          handleCloseCategoryModal();
                        }}
                      >
                        <View style={styles.categoryListItemLeft}>
                          {categoryImage ? (
                            <View style={styles.categoryMediaWrapLarge}>
                              <Image
                                source={{ uri: categoryImage }}
                                style={styles.categoryMediaImage}
                                contentFit="cover"
                              />
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.categoryIconWrapLarge,
                                { backgroundColor: `${categoryIcon.color}12` },
                              ]}
                            >
                              <Ionicons name={categoryIcon.icon} size={18} color={categoryIcon.color} />
                            </View>
                          )}
                          <Text style={[styles.categoryListItemText, isSelected && styles.categoryListItemTextSelected]}>
                            {item.name}
                          </Text>
                        </View>
                        {isSelected ? <Ionicons name="checkmark-circle" size={18} color={Colors.primary} /> : null}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={(
                    <View style={styles.categoryEmptyState}>
                      <Text style={styles.categoryEmptyStateText}>{t('listing.categoryEmpty')}</Text>
                    </View>
                  )}
                />
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isCountryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCountryModal}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity style={styles.bottomSheetDismissArea} activeOpacity={1} onPress={handleCloseCountryModal} />
          <SafeAreaView style={styles.bottomSheetContainer} edges={['bottom']}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.categoryModalHeader}>
              <View style={styles.categoryModalHeaderTextWrap}>
                <Text style={styles.categoryModalTitle}>{t('listing.originCountryModalTitle')}</Text>
                <Text style={styles.categoryModalSubtitle}>{t('listing.originCountryModalSubtitle')}</Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseButton}
                onPress={handleCloseCountryModal}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={styles.categorySearchWrapper}>
              <Ionicons name="search-outline" size={16} color={Colors.slate500} />
              <TextInput
                style={styles.categorySearchInput}
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder={t('listing.originCountrySearchPlaceholder')}
                placeholderTextColor={Colors.slate400}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {countrySearch.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.categorySearchClearButton}
                  onPress={() => setCountrySearch('')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.slate500} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.categoryListContent}
              renderItem={({ item }) => {
                const isSelected = item.code === state.originCountry;

                return (
                  <TouchableOpacity
                    style={[styles.categoryListItem, isSelected && styles.categoryListItemSelected]}
                    activeOpacity={0.85}
                    onPress={() => {
                      patchState({ originCountry: item.code });
                      handleCloseCountryModal();
                    }}
                  >
                    <View style={styles.categoryListItemLeft}>
                      <View style={[styles.categoryIconWrapLarge, styles.provinceIconWrap]}>
                        <Ionicons name="earth-outline" size={18} color={Colors.primary} />
                      </View>
                      <Text style={[styles.categoryListItemText, isSelected && styles.categoryListItemTextSelected]}>
                        {item.label} ({item.code})
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={18} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={(
                <View style={styles.categoryEmptyState}>
                  <Text style={styles.categoryEmptyStateText}>{t('listing.originCountryEmpty')}</Text>
                </View>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={isProvinceModalVisible}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseProvinceModal}
      >
        <SafeAreaView style={styles.categoryModalSafeArea} edges={['top']}>
          <View style={styles.categoryModalScreen}>
            <View style={styles.categoryModalHeader}>
              <View style={styles.categoryModalHeaderTextWrap}>
                <Text style={styles.categoryModalTitle}>{t('listing.originRegionModalTitle')}</Text>
                <Text style={styles.categoryModalSubtitle}>{t('listing.originRegionModalSubtitle')}</Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseButton}
                onPress={handleCloseProvinceModal}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={styles.categorySearchWrapper}>
              <Ionicons name="search-outline" size={16} color={Colors.slate500} />
              <TextInput
                style={styles.categorySearchInput}
                value={provinceSearch}
                onChangeText={setProvinceSearch}
                placeholder={t('listing.originRegionSearchPlaceholder')}
                placeholderTextColor={Colors.slate400}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {provinceSearch.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.categorySearchClearButton}
                  onPress={() => setProvinceSearch('')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.slate500} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filteredProvinces}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.categoryListContent}
              renderItem={({ item }) => {
                const isSelected = item === state.originRegion;

                return (
                  <TouchableOpacity
                    style={[styles.categoryListItem, isSelected && styles.categoryListItemSelected]}
                    activeOpacity={0.85}
                    onPress={() => {
                      patchState({ originCountry: 'TR', originRegion: item });
                      handleCloseProvinceModal();
                    }}
                  >
                    <View style={styles.categoryListItemLeft}>
                      <View style={[styles.categoryIconWrapLarge, styles.provinceIconWrap]}>
                        <Ionicons name="location-outline" size={18} color={Colors.primary} />
                      </View>
                      <Text style={[styles.categoryListItemText, isSelected && styles.categoryListItemTextSelected]}>
                        {item}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={18} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={(
                <View style={styles.categoryEmptyState}>
                  <Text style={styles.categoryEmptyStateText}>{t('listing.originRegionEmpty')}</Text>
                </View>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isShippingProvinceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseShippingProvinceModal}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity style={styles.bottomSheetDismissArea} activeOpacity={1} onPress={handleCloseShippingProvinceModal} />
          <SafeAreaView style={styles.bottomSheetContainer} edges={['bottom']}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.categoryModalHeader}>
              <View style={styles.categoryModalHeaderTextWrap}>
                <Text style={styles.categoryModalTitle}>{t('listing.shippingProvinceModalTitle')}</Text>
                <Text style={styles.categoryModalSubtitle}>{t('listing.shippingProvinceModalSubtitle')}</Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseButton}
                onPress={handleCloseShippingProvinceModal}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={styles.categorySearchWrapper}>
              <Ionicons name="search-outline" size={16} color={Colors.slate500} />
              <TextInput
                style={styles.categorySearchInput}
                value={shippingProvinceSearch}
                onChangeText={setShippingProvinceSearch}
                placeholder={t('listing.shippingProvinceSearchPlaceholder')}
                placeholderTextColor={Colors.slate400}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {shippingProvinceSearch.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.categorySearchClearButton}
                  onPress={() => setShippingProvinceSearch('')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.slate500} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filteredShippingProvinces}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.categoryListContent}
              renderItem={({ item }) => {
                const isSelected = item === state.shippingProvince;
                return (
                  <TouchableOpacity
                    style={[styles.categoryListItem, isSelected && styles.categoryListItemSelected]}
                    activeOpacity={0.85}
                    onPress={() => {
                      patchState({ shippingProvince: item, shippingDistrict: '' });
                      handleCloseShippingProvinceModal();
                    }}
                  >
                    <View style={styles.categoryListItemLeft}>
                      <View style={[styles.categoryIconWrapLarge, styles.provinceIconWrap]}>
                        <Ionicons name="location-outline" size={18} color={Colors.primary} />
                      </View>
                      <Text style={[styles.categoryListItemText, isSelected && styles.categoryListItemTextSelected]}>
                        {item}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={18} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={(
                <View style={styles.categoryEmptyState}>
                  <Text style={styles.categoryEmptyStateText}>{t('listing.shippingProvinceEmpty')}</Text>
                </View>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={isShippingDistrictModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseShippingDistrictModal}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity style={styles.bottomSheetDismissArea} activeOpacity={1} onPress={handleCloseShippingDistrictModal} />
          <SafeAreaView style={styles.bottomSheetContainer} edges={['bottom']}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.categoryModalHeader}>
              <View style={styles.categoryModalHeaderTextWrap}>
                <Text style={styles.categoryModalTitle}>{t('listing.shippingDistrictModalTitle')}</Text>
                <Text style={styles.categoryModalSubtitle}>{t('listing.shippingDistrictModalSubtitle')}</Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseButton}
                onPress={handleCloseShippingDistrictModal}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={styles.categorySearchWrapper}>
              <Ionicons name="search-outline" size={16} color={Colors.slate500} />
              <TextInput
                style={styles.categorySearchInput}
                value={shippingDistrictSearch}
                onChangeText={setShippingDistrictSearch}
                placeholder={t('listing.shippingDistrictSearchPlaceholder')}
                placeholderTextColor={Colors.slate400}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {shippingDistrictSearch.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.categorySearchClearButton}
                  onPress={() => setShippingDistrictSearch('')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.slate500} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filteredShippingDistricts}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.categoryListContent}
              renderItem={({ item }) => {
                const isSelected = item === state.shippingDistrict;
                return (
                  <TouchableOpacity
                    style={[styles.categoryListItem, isSelected && styles.categoryListItemSelected]}
                    activeOpacity={0.85}
                    onPress={() => {
                      patchState({ shippingDistrict: item });
                      handleCloseShippingDistrictModal();
                    }}
                  >
                    <View style={styles.categoryListItemLeft}>
                      <View style={[styles.categoryIconWrapLarge, styles.provinceIconWrap]}>
                        <Ionicons name="business-outline" size={18} color={Colors.primary} />
                      </View>
                      <Text style={[styles.categoryListItemText, isSelected && styles.categoryListItemTextSelected]}>
                        {item}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={18} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={(
                <View style={styles.categoryEmptyState}>
                  <Text style={styles.categoryEmptyStateText}>{t('listing.shippingDistrictEmpty')}</Text>
                </View>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={isDesiModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseDesiModal}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity style={styles.bottomSheetDismissArea} activeOpacity={1} onPress={handleCloseDesiModal} />
          <SafeAreaView style={styles.bottomSheetContainer} edges={['bottom']}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.categoryModalHeader}>
              <View style={styles.categoryModalHeaderTextWrap}>
                <Text style={styles.categoryModalTitle}>
                  {t(desiFieldTarget === 'international' ? 'listing.desiInternationalModalTitle' : 'listing.desiDomesticModalTitle')}
                </Text>
                <Text style={styles.categoryModalSubtitle}>{t('listing.desiModalSubtitle')}</Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseButton}
                onPress={handleCloseDesiModal}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={DESI_OPTIONS}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.categoryListContent}
              renderItem={({ item }) => {
                const selectedValue = desiFieldTarget === 'international' ? state.desiInternational : state.desiDomestic;
                const isSelected = selectedValue === item;
                return (
                  <TouchableOpacity
                    style={[styles.categoryListItem, isSelected && styles.categoryListItemSelected]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (desiFieldTarget === 'international') {
                        updateField('desiInternational', item);
                      } else {
                        updateField('desiDomestic', item);
                      }
                      handleCloseDesiModal();
                    }}
                  >
                    <View style={styles.categoryListItemLeft}>
                      <View style={[styles.categoryIconWrapLarge, styles.provinceIconWrap]}>
                        <Ionicons name="cube-outline" size={18} color={Colors.primary} />
                      </View>
                      <Text style={[styles.categoryListItemText, isSelected && styles.categoryListItemTextSelected]}>
                        {item}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={18} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
