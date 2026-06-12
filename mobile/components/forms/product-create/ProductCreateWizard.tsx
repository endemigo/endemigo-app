import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
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
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter, useNavigation } from 'expo-router';
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
  type ProductCreateEntryMode,
  type ProductCreateImageDraft,
  type ProductCreateWizardStep,
} from '../../../types/productCreate.ts';
import { resolveApiErrorMessage } from '../../../utils/apiError';
import { getCategoryIcon, getCategoryMockImage } from '../../../utils/productCreateCategoryPresentation.ts';
import { AUCTION_DURATION_PRESETS, AUCTION_START_DELAY_PRESETS, buildAuctionSchedule } from '../../../utils/productCreateSchedule.ts';
import {
  DEFAULT_MAX_PRODUCT_IMAGE_COUNT,
  mapPickerAssetToProductImage,
} from '../../../utils/productImageUpload.ts';
import { formatPriceInput, parsePriceInput } from '../../../utils/priceInputMask.ts';
import { formatCurrency } from '../../../utils/transactionFormatters';
import { createListingDraft, updateListingDraft } from '../../../services/listingDraftService.ts';
import { submitProductCreateWizard, generateAiContent } from '../../../services/productCreateService.ts';
import api from '../../../lib/api';
import ENV from '../../../lib/config';
import { ProductCreateProgress } from './ProductCreateProgress';
import { ProductTypeSegment } from './ProductTypeSegment';
import { styles } from './ProductCreateWizard.styles';

interface ProductCreateWizardProps {
  categories: Category[];
  recentProducts: Product[];
  totalProducts: number;
  isProductsLoading: boolean;
  onCreated: () => Promise<unknown> | void;
  initialEntryMode?: ProductCreateEntryMode;
  initialAuctionType?: string;
}

const STEP_TITLE_KEYS: Record<ProductCreateWizardStep, string> = {
  1: 'listing.stepCategory',
  2: 'listing.stepCore',
  3: 'listing.stepShippingPayment',
  4: 'listing.stepProductStory',
  5: 'listing.stepProductDescriptions',
  6: 'listing.stepProductDetails',
  7: 'listing.stepReview',
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

const ORIGIN_COUNTRY_OPTIONS = [
  { code: 'TR', label: 'Türkiye' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'IT', label: 'Italy' },
  { code: 'ES', label: 'Spain' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'BE', label: 'Belgium' },
  { code: 'GR', label: 'Greece' },
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

const SEEDED_COLOR_VARIANTS = [
  { id: 'eed3a041-f2e1-49b0-b624-97110d3faff8', nameTr: 'Yağ Yeşili', nameEn: 'Olive Green', hex: '#808000' },
  { id: '257f383d-d4d1-437b-81bd-adce3bcb1e32', nameTr: 'Altın Sarısı', nameEn: 'Gold Yellow', hex: '#E6C200' },
  { id: '1f40ff3f-2e02-42be-8c3d-317647c34b41', nameTr: 'Mor', nameEn: 'Purple', hex: '#6A0DAD' },
  { id: 'ca1aa793-38a4-473b-9805-491ca9e710db', nameTr: 'Ofis Yeşili', nameEn: 'Office Green', hex: '#008A00' },
  { id: '84f50e12-9763-45bb-9906-c2f4ee95cac9', nameTr: 'Berrak Mavi', nameEn: 'Limpid Blue', hex: '#1780A6' },
  { id: '203e4259-7e1f-4448-8dcf-4d03568875ac', nameTr: 'Kırmızı Şarap', nameEn: 'Red Wine', hex: '#B10012' },
  { id: '786bbbb3-0a70-45a1-bdea-c9d13b719a2c', nameTr: 'Koyu Patlıcan', nameEn: 'Dark Eggplant', hex: '#7C005A' },
  { id: '2358fd16-faa5-43d6-9091-45348f956754', nameTr: 'Cam Göbeği', nameEn: 'Turquoise', hex: '#5EA3DC' },
  { id: '68b68e39-b6c6-4875-ba4e-c64bb04217b7', nameTr: 'Turuncu', nameEn: 'Orange', hex: '#FF7A1C' },
  { id: '9def1048-f928-434e-b81c-3110fb83bf77', nameTr: 'Kar', nameEn: 'Snow', hex: '#FFFFFF' },
  { id: 'e125ac1e-bcf5-4c5c-b56c-a65c8c7fe7c5', nameTr: 'Siyah', nameEn: 'Black', hex: '#101010' },
  { id: '66759bdf-2d36-4b6e-91b7-1bfa846dc90a', nameTr: 'Lacivert', nameEn: 'Navy Blue', hex: '#1F2A44' },
  { id: 'fff5eb98-cf21-4d5d-a2d2-29117a5bc8ee', nameTr: 'Bordo', nameEn: 'Burgundy', hex: '#800020' },
];

const SEEDED_SIZE_VARIANTS = [
  { id: '35e7c0ea-a191-4064-96f9-87fe4a1f39ae', nameTr: 'XS', nameEn: 'XS' },
  { id: '752e4d47-5730-4951-9acf-6ab1947a3dcc', nameTr: 'S', nameEn: 'S' },
  { id: '94e0157a-5b63-49bb-b06d-71b8252701ac', nameTr: 'M', nameEn: 'M' },
  { id: '4c3684ef-5d2f-45ce-b6af-8547e6f593d8', nameTr: 'L', nameEn: 'L' },
  { id: 'dd581770-0e63-4d98-84ff-c24b42768acd', nameTr: 'XL', nameEn: 'XL' },
  { id: 'fc3baea0-1598-4f72-9074-8f11eb6d1360', nameTr: 'XXL', nameEn: 'XXL' },
  { id: 'd5c412f3-a722-4bf9-bec8-5e78b65015bb', nameTr: 'XXXL', nameEn: 'XXXL' },
  { id: 'f3961cd2-a49e-42e7-9165-33f4214e7ce7', nameTr: 'Standart', nameEn: 'Standard' },
];

const SEEDED_NUMBER_VARIANTS = [
  { id: '3300727f-dc05-440d-8006-d3bf4d6e58bd', nameTr: '37', nameEn: '37' },
  { id: '75e30968-823c-400d-ba32-c49190b44315', nameTr: '38', nameEn: '38' },
  { id: '8cf7c233-6d0d-4825-a350-5e0fae4b89a4', nameTr: '39', nameEn: '39' },
  { id: 'addf6419-c237-433c-8e26-7ef2c3ffc448', nameTr: '40', nameEn: '40' },
  { id: 'e145bd31-e0b1-4e41-ba61-b851b1850c09', nameTr: '41', nameEn: '41' },
  { id: 'd3b4335f-b3ed-45d4-9e65-66b0ba09a595', nameTr: '42', nameEn: '42' },
  { id: '9dcbdddb-57b7-4e14-8972-db38d93839ca', nameTr: '43', nameEn: '43' },
  { id: '3e4fef76-a108-4208-8cb5-a35488a38429', nameTr: '44', nameEn: '44' },
  { id: 'e46ba6c6-5377-4ec3-9c46-5343a3db7742', nameTr: '45', nameEn: '45' },
];

const findCategoryById = (list: Category[], id: string): Category | null => {
  for (const cat of list) {
    if (cat.id === id) return cat;
    if (cat.children?.length) {
      const found = findCategoryById(cat.children, id);
      if (found) return found;
    }
  }
  return null;
};

const getCategoryPath = (list: Category[], id: string, path: string[] = []): string[] | null => {
  for (const cat of list) {
    const currentPath = [...path, cat.name];
    if (cat.id === id) return currentPath;
    if (cat.children?.length) {
      const found = getCategoryPath(cat.children, id, currentPath);
      if (found) return found;
    }
  }
  return null;
};

const isDescendantOf = (parent: Category, childId: string): boolean => {
  if (!parent.children) return false;
  for (const child of parent.children) {
    if (child.id === childId) return true;
    if (isDescendantOf(child, childId)) return true;
  }
  return false;
};

const findParentCategoryOfId = (list: Category[], id: string, parent: Category | null = null): Category | null => {
  for (const cat of list) {
    if (cat.id === id) return parent;
    if (cat.children?.length) {
      const found = findParentCategoryOfId(cat.children, id, cat);
      if (found) return found;
    }
  }
  return null;
};

export function ProductCreateWizard({
  categories,
  recentProducts,
  totalProducts,
  isProductsLoading,
  onCreated,
  initialEntryMode,
  initialAuctionType,
}: ProductCreateWizardProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { showModal } = useModalStore();
  const { state, updateField, patchState, reset } = useProductCreateWizard();
  const { data: mobileConfigData } = useMobileConfig();
  const navigation = useNavigation();

  const [currentStep, setCurrentStep] = useState<ProductCreateWizardStep>(1);
  const [images, setImages] = useState<ProductCreateImageDraft[]>([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const [auctionEvents, setAuctionEvents] = useState<any[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [geoIndications, setGeoIndications] = useState<Array<{ id: string; name: string; nameEn?: string; code: string; logoUrl: string }>>([]);
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [featureBadges, setFeatureBadges] = useState<Array<{ id: string; name: string; nameEn: string; code: string; logoUrl: string }>>([]);
  const [isFeaturesLoading, setIsFeaturesLoading] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      setIsEventsLoading(true);
      setEventsError(null);
      try {
        if (ENV.USE_MOCK) {
          setAuctionEvents([
            {
              id: 'event-1',
              title: 'Osmanlı Dönemi Eserleri ve Antika Müzayedesi',
              description: 'Osmanlı dönemi fermanlar, gümüş eşyalar ve el yazması eserler için ürün başvuru süreci aktif.',
              coverImageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&auto=format&fit=crop&q=80',
              status: 'APPLICATION',
              submissionDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            }
          ]);
        } else {
          const { data } = await api.get('/auctions/events?status=APPLICATION');
          setAuctionEvents(data.items || []);
        }
      } catch (err) {
        console.error('Error fetching auction events:', err);
        setEventsError('Müzayede etkinlikleri yüklenemedi.');
      } finally {
        setIsEventsLoading(false);
      }
    }
    async function fetchGeoIndications() {
      setIsGeoLoading(true);
      try {
        if (ENV.USE_MOCK) {
          setGeoIndications([
            { id: '1', name: 'Kırmızı (TR)', nameEn: 'Red (EN)', code: 'PDO_RED_TR', logoUrl: '' },
            { id: '2', name: 'Yeşil (TR)', nameEn: 'Green (EN)', code: 'PGI_GREEN_TR', logoUrl: '' },
            { id: '3', name: 'Mavi (TR)', nameEn: 'Blue (EN)', code: 'TSG_BLUE_TR', logoUrl: '' },
          ]);
        } else {
          const { data } = await api.get('/products/geo-indications');
          setGeoIndications(data.geoIndications || []);
        }
      } catch (err) {
        console.error('Error fetching geo indications:', err);
      } finally {
        setIsGeoLoading(false);
      }
    }
    async function fetchFeatureBadges() {
      setIsFeaturesLoading(true);
      try {
        if (ENV.USE_MOCK) {
          setFeatureBadges([
            { id: '1', name: 'Vegan', nameEn: 'Vegan', code: 'VEGAN', logoUrl: '' },
            { id: '2', name: 'Bio', nameEn: 'Bio', code: 'BIO', logoUrl: '' },
            { id: '3', name: 'Organik', nameEn: 'Organic', code: 'ORGANIC', logoUrl: '' },
          ]);
        } else {
          const { data } = await api.get('/products/features');
          setFeatureBadges(data.features || []);
        }
      } catch (err) {
        console.error('Error fetching feature badges:', err);
      } finally {
        setIsFeaturesLoading(false);
      }
    }
    fetchEvents();
    fetchGeoIndications();
    fetchFeatureBadges();
  }, []);

  const handleTitleBlur = async () => {
    if (!state.title || state.title.trim().length < 5) return;

    const isDescriptionEmpty = !state.description || state.description.trim().length === 0;
    const isStoryEmpty = !state.sellerNotes || state.sellerNotes.trim().length === 0;
    const isContentEmpty = !state.productContent || state.productContent.trim().length === 0;

    if (!isDescriptionEmpty && !isStoryEmpty && !isContentEmpty) return;

    try {
      setIsAiGenerating(true);
      const selectedCategoryName = selectedCategory?.name;
      const aiContent = await generateAiContent(state.title.trim(), selectedCategoryName);

      const mergedDescription = isDescriptionEmpty
        ? `${aiContent.description}\n\n${aiContent.story}`
        : state.description;

      patchState({
        description: mergedDescription,
        sellerNotes: mergedDescription,
        productContent: isContentEmpty ? aiContent.productContent : state.productContent,
      });
    } catch (error) {
      console.warn('AI Content Generation failed:', error);
    } finally {
      setIsAiGenerating(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      reset(initialEntryMode, initialAuctionType);
      setCurrentStep(1);
      setImages([]);
      setSelectedExistingProductId(null);
      setEntryMode(initialEntryMode ?? null);
    });

    return unsubscribe;
  }, [navigation, reset, initialEntryMode, initialAuctionType]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryMode, setEntryMode] = useState<ProductCreateEntryMode | null>(initialEntryMode ?? null);
  const [draftId, setDraftId] = useState<string | null>(null);
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
  const [isProductionProvinceModalVisible, setProductionProvinceModalVisible] = useState(false);
  const [productionProvinceSearch, setProductionProvinceSearch] = useState('');
  const [isProductionDistrictModalVisible, setProductionDistrictModalVisible] = useState(false);
  const [productionDistrictSearch, setProductionDistrictSearch] = useState('');
  const [isDesiModalVisible, setDesiModalVisible] = useState(false);
  const [desiFieldTarget, setDesiFieldTarget] = useState<DesiFieldTarget | null>(null);
  const [isProductsCollapsed, setIsProductsCollapsed] = useState(true);
  const [pendingShippingDistrictOpen, setPendingShippingDistrictOpen] = useState<string | null>(null);
  const [pendingProductionDistrictOpen, setPendingProductionDistrictOpen] = useState<string | null>(null);

  // Variant States
  const [hasVariants, setHasVariants] = useState(false);
  const [isAddVariantModalVisible, setAddVariantModalVisible] = useState(false);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [variantSkuCode, setVariantSkuCode] = useState('');
  const [variantStock, setVariantStock] = useState('1');
  const [variantPriceOverride, setVariantPriceOverride] = useState('');
  const [isColorSelectModalVisible, setColorSelectModalVisible] = useState(false);
  const [isSizeSelectModalVisible, setSizeSelectModalVisible] = useState(false);
  const [colorSearch, setColorSearch] = useState('');
  const [sizeSearch, setSizeSearch] = useState('');

  const rootCategories = useMemo(
    () => categories.filter((category) => Boolean(category.id)),
    [categories],
  );

  const selectedCategory = useMemo(() => {
    return findCategoryById(rootCategories, state.categoryId);
  }, [rootCategories, state.categoryId]);
  const selectedListingTemplate = selectedCategory?.listingTemplate ?? null;

  const selectedCategoryLabel = useMemo(() => {
    if (!state.categoryId) return t('listing.categoryPlaceholder');
    const path = getCategoryPath(rootCategories, state.categoryId);
    return path ? path.join(' > ') : t('listing.categoryPlaceholder');
  }, [rootCategories, state.categoryId, t]);

  const selectedRootCategory = useMemo(() => {
    if (!selectedRootCategoryId) return null;
    return findCategoryById(rootCategories, selectedRootCategoryId);
  }, [rootCategories, selectedRootCategoryId]);

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

  const productionDistrictOptions = useMemo(
    () => getTurkishDistrictsByProvinceName(state.productionProvince),
    [state.productionProvince],
  );

  const filteredProductionProvinces = useMemo(() => {
    const query = productionProvinceSearch.trim().toLocaleLowerCase('tr-TR');
    if (!query) return TURKISH_PROVINCES;
    return TURKISH_PROVINCES.filter((province) =>
      province.toLocaleLowerCase('tr-TR').includes(query));
  }, [productionProvinceSearch]);

  const filteredProductionDistricts = useMemo(() => {
    const query = productionDistrictSearch.trim().toLocaleLowerCase('tr-TR');
    if (!query) return productionDistrictOptions;
    return productionDistrictOptions.filter((district) =>
      district.toLocaleLowerCase('tr-TR').includes(query));
  }, [productionDistrictOptions, productionDistrictSearch]);

  const filteredColors = useMemo(() => {
    const query = colorSearch.trim().toLocaleLowerCase('tr-TR');
    if (!query) return SEEDED_COLOR_VARIANTS;
    return SEEDED_COLOR_VARIANTS.filter((c) =>
      c.nameTr.toLocaleLowerCase('tr-TR').includes(query) ||
      c.nameEn.toLocaleLowerCase('tr-TR').includes(query)
    );
  }, [colorSearch]);

  const variantAllowedKinds = selectedListingTemplate?.variant?.allowedKinds ?? [];

  const activeSizeList = useMemo(() => {
    if (variantAllowedKinds.includes('NUMBER')) {
      return SEEDED_NUMBER_VARIANTS;
    }
    return SEEDED_SIZE_VARIANTS;
  }, [variantAllowedKinds]);

  const isColorVariantSupported = useMemo(() => {
    return variantAllowedKinds.includes('COLOR');
  }, [variantAllowedKinds]);

  const isSizeVariantSupported = useMemo(() => {
    return variantAllowedKinds.includes('SIZE') || variantAllowedKinds.includes('NUMBER');
  }, [variantAllowedKinds]);

  const filteredSizes = useMemo(() => {
    const query = sizeSearch.trim().toLocaleLowerCase('tr-TR');
    if (!query) return activeSizeList;
    return activeSizeList.filter((s) =>
      s.nameTr.toLocaleLowerCase('tr-TR').includes(query) ||
      s.nameEn.toLocaleLowerCase('tr-TR').includes(query)
    );
  }, [activeSizeList, sizeSearch]);

  const selectedExistingProduct = useMemo(
    () => recentProducts.find((item) => item.id === selectedExistingProductId) ?? null,
    [recentProducts, selectedExistingProductId],
  );
  const selectedExistingProductImageCount = useMemo(() => {
    if (!selectedExistingProduct) return 0;
    if (Array.isArray(selectedExistingProduct.images) && selectedExistingProduct.images.length > 0) {
      return selectedExistingProduct.images.length;
    }
    if (selectedExistingProduct.imageUrl || selectedExistingProduct.thumbnail) {
      return 1;
    }
    return 0;
  }, [selectedExistingProduct]);
  const effectiveImageCount = images.length > 0 ? images.length : selectedExistingProductImageCount;
  const previewImages = useMemo(() => {
    if (images.length > 0) {
      return images.map((img) => img.uri);
    }
    if (selectedExistingProduct) {
      if (Array.isArray(selectedExistingProduct.images) && selectedExistingProduct.images.length > 0) {
        return selectedExistingProduct.images.map((img) => img.url);
      }
      const singleUrl = selectedExistingProduct.imageUrl || selectedExistingProduct.thumbnail;
      if (singleUrl) {
        return [singleUrl];
      }
    }
    return [];
  }, [images, selectedExistingProduct]);
  const listingFieldVisibility = useMemo<ListingFieldVisibilityOptions>(() => {
    const optionalFields = mobileConfigData?.listingCreate?.optionalFields;
    const categoryFields = (mobileConfigData?.listingCreate as any)?.categoryFields;

    if (state.categoryId && categoryFields && Array.isArray(categoryFields[state.categoryId])) {
      return { optionalFields: categoryFields[state.categoryId] };
    }

    if (!Array.isArray(optionalFields) || optionalFields.length === 0) {
      return { optionalFields: [...MOBILE_LISTING_CREATE_OPTIONAL_FIELDS] };
    }
    return { optionalFields };
  }, [
    mobileConfigData?.listingCreate?.optionalFields,
    (mobileConfigData?.listingCreate as any)?.categoryFields,
    state.categoryId,
  ]);
  const isListingFieldVisible = (field: MobileListingCreateOptionalField): boolean => {
    const enabledByConfig = listingFieldVisibility.optionalFields?.includes(field) ?? true;
    if (!enabledByConfig) return false;

    // Core global shipping, brand, production origin, media, and inventory specs bypass category templates
    const isGlobalCoreField = [
      // Step 3 (Core Shipping)
      'shippingProvince',
      'shippingDistrict',
      'shippingAddress',
      'deliveryTemplateDomestic',
      'desiDomestic',
      // Step 4 (Brand & Origin)
      'brand',
      'sellerNotes',
      'productionProvince',
      'productionDistrict',
      // Step 5 (Description / Story / Logistics)
      'productContent',
      'barcodeNo',
      'geoIndicationReceivedAt',
      'geoIndicationCertNo',
      'geoIndicationRegion',
      'additionalCertificates',
      'featureBadges',
      // Step 6 (Media & Logistics Specs)
      'sku',
      'weight',
      'dimensionWidth',
      'dimensionHeight',
      'dimensionDepth',
      'images',
    ].includes(field);

    if (isGlobalCoreField) return true;

    if (!selectedListingTemplate?.fields?.length) return true;
    return selectedListingTemplate.fields.some((item) => item.key === field);
  };
  const imageUploadLimits = mobileConfigData?.imageUploadLimits ?? {
    min: 1,
    max: DEFAULT_MAX_PRODUCT_IMAGE_COUNT,
  };

  const canContinue = canContinueProductCreateStep(
    currentStep,
    state,
    effectiveImageCount,
    listingFieldVisibility,
    imageUploadLimits.min,
  );
  const canSubmit = isProductCreateReadyToSubmit(
    state,
    effectiveImageCount,
    listingFieldVisibility,
    imageUploadLimits.min,
  );

  useEffect(() => {
    if (!state.categoryId || rootCategories.length === 0) return;

    const matchedRootCategory = rootCategories.find(
      (rootCategory) =>
        rootCategory.id === state.categoryId
        || isDescendantOf(rootCategory, state.categoryId),
    );

    if (matchedRootCategory && matchedRootCategory.id !== selectedRootCategoryId) {
      setSelectedRootCategoryId(matchedRootCategory.id);
    }
  }, [rootCategories, selectedRootCategoryId, state.categoryId]);

  useEffect(() => {
    if (initialEntryMode) {
      setEntryMode(initialEntryMode);
      patchState({
        listingType: initialEntryMode === 'AUCTION'
          ? PRODUCT_CREATE_LISTING_TYPES.AUCTION
          : PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE,
        askPriceEnabled: false,
        auctionType: initialAuctionType === 'TIMED'
          ? PRODUCT_CREATE_AUCTION_TYPES.TIMED
          : PRODUCT_CREATE_AUCTION_TYPES.REALTIME,
      });
    }
  }, [initialEntryMode, initialAuctionType]);

  // Auto-fill delivery/cargo details from the seller's most recent product
  useEffect(() => {
    if (recentProducts.length > 0 && !state.shippingProvince && !state.shippingDistrict && !state.shippingAddress) {
      const recent = recentProducts[0];
      if (recent.shippingProvince) {
        patchState({
          shippingProvince: recent.shippingProvince || '',
          shippingDistrict: recent.shippingDistrict || '',
          shippingAddress: recent.shippingAddress || '',
          deliveryTemplateDomestic: recent.deliveryTemplateDomestic || '',
          deliveryTemplateInternational: recent.deliveryTemplateInternational || '',
          desiDomestic: recent.desiDomestic || '',
          desiInternational: recent.desiInternational || '',
        });
      }
    }
  }, [recentProducts]);

  // Fallback: Auto-fill shipping location from the user's default/business address if they have no recent products
  useEffect(() => {
    async function fetchDefaultAddress() {
      if (recentProducts.length === 0 && !state.shippingProvince && !state.shippingDistrict && !state.shippingAddress) {
        try {
          if (ENV.USE_MOCK) {
            patchState({
              shippingProvince: 'İzmir',
              shippingDistrict: 'Urla',
              shippingAddress: 'Zeytinlik Caddesi No: 45, Urla, İzmir',
              deliveryTemplateDomestic: 'Yurtiçi Kargo 1-3 gün',
              desiDomestic: '1-3',
            });
            return;
          }
          const { data } = await api.get('/users/addresses');
          const addresses = Array.isArray(data) ? data : (data?.addresses || []);
          const defaultAddress = addresses.find((addr: any) => addr.isDefault || addr.type === 'BUSINESS') || addresses[0];
          if (defaultAddress) {
            patchState({
              shippingProvince: defaultAddress.city || '',
              shippingDistrict: defaultAddress.district || '',
              shippingAddress: defaultAddress.addressLine || '',
            });
          }
        } catch (error) {
          console.warn('Failed to fetch default address:', error);
        }
      }
    }
    fetchDefaultAddress();
  }, [recentProducts]);

  function handleOpenCategoryModal() {
    const matchedRootCategory = rootCategories.find(
      (rootCategory) =>
        rootCategory.id === state.categoryId
        || isDescendantOf(rootCategory, state.categoryId),
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
    if (!selectedRootCategoryId) return;
    const parent = findParentCategoryOfId(rootCategories, selectedRootCategoryId);
    setSelectedRootCategoryId(parent ? parent.id : '');
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

  function handleOpenShippingDistrictModal(overrideProvince?: string) {
    const province = overrideProvince || state.shippingProvince;
    if (!province) return;
    setShippingDistrictSearch('');
    setShippingDistrictModalVisible(true);
  }

  function handleCloseShippingDistrictModal() {
    setShippingDistrictSearch('');
    setShippingDistrictModalVisible(false);
  }

  function handleOpenProductionProvinceModal() {
    setProductionProvinceSearch('');
    setProductionProvinceModalVisible(true);
  }

  function handleCloseProductionProvinceModal() {
    setProductionProvinceSearch('');
    setProductionProvinceModalVisible(false);
  }

  function handleOpenProductionDistrictModal(overrideProvince?: string) {
    const province = overrideProvince || state.productionProvince;
    if (!province) return;
    setProductionDistrictSearch('');
    setProductionDistrictModalVisible(true);
  }

  function handleCloseProductionDistrictModal() {
    setProductionDistrictSearch('');
    setProductionDistrictModalVisible(false);
  }

  function handleOpenDesiModal(target: DesiFieldTarget) {
    setDesiFieldTarget(target);
    setDesiModalVisible(true);
  }

  function handleCloseDesiModal() {
    setDesiModalVisible(false);
    setDesiFieldTarget(null);
  }

  function handleSaveVariant() {
    // Dynamic validation requirements depending on active category support
    const isValidationFailed =
      (isColorVariantSupported && isSizeVariantSupported && !selectedColorId && !selectedSizeId) ||
      (isColorVariantSupported && !isSizeVariantSupported && !selectedColorId) ||
      (!isColorVariantSupported && isSizeVariantSupported && !selectedSizeId);

    if (isValidationFailed) {
      showModal({
        title: t('common.error'),
        message: t('listing.variantSelectionRequired'),
        type: 'error',
      });
      return;
    }

    const duplicate = state.variantSkus.some(
      (v) => v.colorVariantNumberId === (selectedColorId || undefined) &&
             v.sizeVariantNumberId === (selectedSizeId || undefined)
    );
    if (duplicate) {
      showModal({
        title: t('common.error'),
        message: t('listing.variantDuplicateError'),
        type: 'error',
      });
      return;
    }

    const priceOverride = parseFloat(variantPriceOverride.replace(/\./g, '').replace(',', '.'));
    const newVariant = {
      colorVariantNumberId: selectedColorId || undefined,
      sizeVariantNumberId: selectedSizeId || undefined,
      skuCode: variantSkuCode.trim() || undefined,
      stockQuantity: parseInt(variantStock, 10) || 0,
      priceOverride: Number.isFinite(priceOverride) && priceOverride > 0 ? priceOverride : undefined,
      isActive: true,
    };

    const updated = [...state.variantSkus, newVariant];
    patchState({ variantSkus: updated });
    
    const sum = updated.reduce((acc, v) => acc + (v.stockQuantity ?? 0), 0);
    updateField('stockQuantity', sum.toString());

    setAddVariantModalVisible(false);
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

    const remainingSelectionCount = imageUploadLimits.max - images.length;
    if (remainingSelectionCount <= 0) {
      showModal({
        title: t('common.error'),
        message: t('listing.maxImagesReached', { count: imageUploadLimits.max }),
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
      return [...currentImages, ...mappedImages].slice(0, imageUploadLimits.max);
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

  function handleSelectEntryMode(nextEntryMode: ProductCreateEntryMode) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setEntryMode(nextEntryMode);
    patchState({
      listingType: nextEntryMode === 'AUCTION'
        ? PRODUCT_CREATE_LISTING_TYPES.AUCTION
        : PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE,
      askPriceEnabled: false,
    });
  }

  async function persistDraft(nextStep: ProductCreateWizardStep) {
    if (!entryMode) return;
    try {
      if (draftId) {
        await updateListingDraft(draftId, state, entryMode, nextStep);
        return;
      }
      const draft = await createListingDraft(state, entryMode, nextStep);
      setDraftId(draft.id);
    } catch {
      // Draft autosave is best-effort; publishing still uses the normal create flow.
    }
  }

  async function handleGoNext() {
    if (!canContinue || currentStep === 7) return;
    const nextStep = (currentStep + 1) as ProductCreateWizardStep;
    await persistDraft(nextStep);
    setCurrentStep(nextStep);
  }

  function handleGoBack() {
    if (currentStep === 1) return;
    setCurrentStep((step) => (step - 1) as ProductCreateWizardStep);
  }

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const product = await submitProductCreateWizard(state, images, selectedExistingProductId ?? undefined);
      reset(initialEntryMode, initialAuctionType);
      setImages([]);
      setCurrentStep(1);
      setEntryMode(initialEntryMode ?? null);
      setDraftId(null);
      setCategorySearch('');
      setShowAuctionAdvanced(false);
      setSelectedExistingProductId(null);
      await onCreated();

      const isPendingReview = (product as any)?.status === 'PENDING_REVIEW';
      let messageKey = '';
      if (state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION) {
        messageKey = isPendingReview ? 'listing.auctionPendingReviewSuccess' : 'listing.auctionCreatedSuccess';
      } else {
        messageKey = isPendingReview ? 'listing.pendingReviewSuccess' : 'listing.publishedSuccess';
      }

      showModal({
        title: t('common.success'),
        message: t(messageKey),
        type: 'success',
        onConfirm: () => {
          router.replace('/(tabs)/seller-dashboard' as never);
        },
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
      auctionReservePrice: '',
      description: product.description ?? '',
      askPriceEnabled: Boolean(product.askPriceEnabled),
      askPriceMinAmount: product.askPriceMinAmount ? formatPriceInput(String(product.askPriceMinAmount)) : '',
    });
    setSelectedExistingProductId(product.id);
    setEntryMode(listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION ? 'AUCTION' : 'MARKETPLACE');
    setCurrentStep(1);
  }

  function renderEntryModeSheet() {
    return (
      <Modal
        visible={!entryMode}
        transparent={true}
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.entryModeModalBackdrop}>
          <TouchableOpacity
            style={styles.entryModeModalDismissArea}
            activeOpacity={1}
            onPress={() => router.back()}
          />
          <SafeAreaView style={styles.entryModeModalContainer} edges={['bottom']}>
            <View style={styles.entryModeModalHandle} />

            <View style={styles.entryModeHeaderArea}>
              <Text style={styles.entryModeEyebrow}>{t('listing.entryModeEyebrow')}</Text>
              <Text style={styles.entryModeTitle}>{t('listing.entryModeTitle')}</Text>
              <Text style={styles.entryModeSubtitle}>{t('listing.entryModeSubtitle')}</Text>
            </View>

            <View style={styles.entryModeOptions}>
              <Animated.View entering={FadeInUp.delay(100).duration(600)}>
                <TouchableOpacity
                  style={[styles.entryModeOption, styles.entryModeOptionMarketplace]}
                  activeOpacity={0.7}
                  onPress={() => handleSelectEntryMode('MARKETPLACE')}
                >
                  <View style={[styles.entryModeIconContainer, styles.entryModeIconContainerMarketplace]}>
                    <Ionicons name="storefront-outline" size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.entryModeOptionTextWrap}>
                    <View style={styles.entryModeOptionHeaderRow}>
                      <Text style={styles.entryModeOptionTitle}>{t('listing.entryModeMarketplace')}</Text>
                      <View style={[styles.entryModeBadge, styles.entryModeBadgeMarketplace]}>
                        <Text style={[styles.entryModeBadgeText, styles.entryModeBadgeTextMarketplace]}>
                          {t('listing.popularTag')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.entryModeOptionBody}>{t('listing.entryModeMarketplaceBody')}</Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={20} color={Colors.slate400} style={styles.entryModeOptionChevron} />
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(250).duration(600)}>
                <TouchableOpacity
                  style={[styles.entryModeOption, styles.entryModeOptionAuction]}
                  activeOpacity={0.7}
                  onPress={() => handleSelectEntryMode('AUCTION')}
                >
                  <View style={[styles.entryModeIconContainer, styles.entryModeIconContainerAuction]}>
                    <Ionicons name="hammer-outline" size={24} color={Colors.secondary} />
                  </View>
                  <View style={styles.entryModeOptionTextWrap}>
                    <View style={styles.entryModeOptionHeaderRow}>
                      <Text style={styles.entryModeOptionTitle}>{t('listing.entryModeAuction')}</Text>
                      <View style={[styles.entryModeBadge, styles.entryModeBadgeAuction]}>
                        <Text style={[styles.entryModeBadgeText, styles.entryModeBadgeTextAuction]}>
                          {t('listing.newTag')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.entryModeOptionBody}>{t('listing.entryModeAuctionBody')}</Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={20} color={Colors.slate400} style={styles.entryModeOptionChevron} />
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View style={styles.entryModeFooter}>
              <Text style={styles.entryModeFooterText}>{t('listing.sellerAssurance')}</Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
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
                onPress={() => handleOpenShippingDistrictModal()}
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

  const renderCategorySelectionStep = () => {
    const isAuction = state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION;

    return (
      <>
        {isAuction ? (
          <View style={[styles.inputGroup, { marginBottom: 20 }]}>
            <Text style={styles.inputLabel}>Müzayede Etkinliği Seçin *</Text>
            {isEventsLoading ? (
              <ActivityIndicator color={Colors.primary} size="small" style={{ marginVertical: 12 }} />
            ) : eventsError ? (
              <Text style={{ color: Colors.error, fontSize: 13, marginBottom: 8 }}>{eventsError}</Text>
            ) : auctionEvents.length === 0 ? (
              <Text style={{ color: Colors.slate500, fontSize: 13, marginVertical: 8 }}>
                Şu anda başvuru sürecinde olan aktif bir müzayede etkinliği bulunmamaktadır.
              </Text>
            ) : (
              <View style={{ gap: 8, marginVertical: 8 }}>
                {auctionEvents.map((event) => {
                   const isSelected = state.selectedEventId === event.id;
                   return (
                    <TouchableOpacity
                      key={event.id}
                      activeOpacity={0.85}
                      onPress={() => updateField('selectedEventId', isSelected ? null : event.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isSelected ? `${Colors.primary}08` : Colors.surface,
                        borderWidth: 1.5,
                        borderColor: isSelected ? Colors.primary : Colors.outlineVariant,
                        borderRadius: 12,
                        padding: 12,
                        gap: 12,
                      }}
                    >
                      <Image
                        source={{ uri: event.coverImageUrl }}
                        style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: Colors.slate100 }}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.onSurface }}>
                          {event.title}
                        </Text>
                        <Text style={{ fontSize: 11, color: Colors.slate500 }} numberOfLines={1}>
                          {event.description}
                        </Text>
                        <Text style={{ fontSize: 10, color: Colors.primary, fontWeight: '600' }}>
                          Son Katılım: {new Date(event.submissionDeadline).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: isSelected ? Colors.primary : Colors.slate300,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        {isSelected && (
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary }} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

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
  };

  function renderBasicsStep() {
    return (
      <>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('listing.title')} *</Text>
          <TextInput
            style={styles.input}
            value={state.title}
            onChangeText={(value) => updateField('title', value)}
            onBlur={handleTitleBlur}
            placeholder={t('listing.titlePlaceholder')}
            placeholderTextColor={Colors.slate400}
            maxLength={200}
          />
          {isAiGenerating ? (
            <View style={styles.aiLoadingBadge}>
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.aiLoadingText}>{t('listing.aiGenerating')}</Text>
            </View>
          ) : null}
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
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                marginBottom: 16,
              }}
              activeOpacity={0.8}
              onPress={() => patchState({ askPriceEnabled: !state.askPriceEnabled, askPriceMinAmount: !state.askPriceEnabled ? state.askPriceMinAmount : '' })}
            >
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.slate700 }}>{t('listing.askPriceEnabled')}</Text>
                <Text style={{ fontSize: 12, color: Colors.slate500, marginTop: 2, lineHeight: 16 }}>{t('listing.askPriceHint')}</Text>
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
    const isDescGenerating = isAiGenerating && (!state.description || state.description.trim().length === 0);
    return (
      <>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('listing.description')} & {t('listing.sellerNotes')} *</Text>
          <TextInput
            style={[
              styles.input,
              styles.textareaInput,
              isDescGenerating && { opacity: 0.6, backgroundColor: Colors.slate50 }
            ]}
            value={state.description}
            onChangeText={(value) => updateField('description', value)}
            placeholder={isDescGenerating ? t('listing.aiGenerating') : t('listing.descriptionPlaceholder')}
            placeholderTextColor={Colors.slate400}
            multiline
            maxLength={1200}
            editable={!isDescGenerating}
          />
        </View>

        <View style={styles.inlineRow}>
          <View style={styles.inlineBlock}>
            <Text style={styles.inputLabel}>{t('listing.stock')} *</Text>
            {hasVariants ? (
              <View style={[styles.input, { backgroundColor: Colors.slate50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 }]}>
                <Text style={{ color: Colors.slate600, fontFamily: 'PlusJakartaSans-Medium', fontSize: 14 }}>
                  {state.stockQuantity}
                </Text>
                <Ionicons name="lock-closed" size={16} color={Colors.slate400} />
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={state.stockQuantity}
                onChangeText={(value) => updateField('stockQuantity', value)}
                placeholder="1"
                placeholderTextColor={Colors.slate400}
                keyboardType="number-pad"
              />
            )}
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

  function renderVariantSection() {
    const isVariantEnabled = selectedListingTemplate?.variant?.enabled === true;
    if (!isVariantEnabled) return null;

    return (
      <>
        <TouchableOpacity
          style={styles.toggleCard}
          activeOpacity={0.85}
          onPress={() => {
            const nextVal = !hasVariants;
            setHasVariants(nextVal);
            if (!nextVal) {
              patchState({ variantSkus: [] });
              updateField('stockQuantity', '1');
            } else {
              patchState({ variantSkus: [] });
              updateField('stockQuantity', '0');
            }
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.toggleTitle}>{t('listing.hasVariants')}</Text>
            <Text style={styles.toggleSub}>{t('listing.hasVariantsHint')}</Text>
          </View>
          <View style={[styles.checkbox, hasVariants && styles.checkboxChecked]}>
            {hasVariants ? <Ionicons name="checkmark" size={14} color={Colors.white} /> : null}
          </View>
        </TouchableOpacity>

        {hasVariants ? (
          <View style={{ marginTop: 8, marginBottom: 20 }}>
            <Text style={[styles.inputLabel, { marginBottom: 10 }]}>{t('listing.variantListTitle')}</Text>
            {state.variantSkus.length === 0 ? (
              <View style={styles.variantEmptyState}>
                <Ionicons name="options-outline" size={24} color={Colors.slate400} style={styles.variantEmptyIcon} />
                <Text style={styles.variantEmptyText}>{t('listing.variantEmptyState')}</Text>
              </View>
            ) : (
              <View style={styles.variantList}>
                {state.variantSkus.map((variant, index) => {
                  const colorNode = SEEDED_COLOR_VARIANTS.find((c) => c.id === variant.colorVariantNumberId);
                  const sizeNode = activeSizeList.find((s) => s.id === variant.sizeVariantNumberId);
                  const labelParts = [];
                  if (colorNode) labelParts.push(colorNode.nameTr);
                  if (sizeNode) labelParts.push(sizeNode.nameTr);
                  const label = labelParts.join(' / ') || t('listing.variantItemFallback');

                  return (
                    <View key={`variant-item-${index}`} style={styles.variantItemCard}>
                      <View style={styles.variantItemContent}>
                        {colorNode?.hex ? <View style={[styles.variantSwatch, { backgroundColor: colorNode.hex }]} /> : null}
                        <View style={styles.variantItemTextBlock}>
                          <Text style={styles.variantItemTitle} numberOfLines={1}>
                            {label}
                          </Text>
                          <Text style={styles.variantItemMeta}>
                            {`${t('listing.variantStockMeta', { stock: variant.stockQuantity })}${
                              variant.priceOverride
                                ? t('listing.variantPriceMeta', { price: formatCurrency(variant.priceOverride) })
                                : ''
                            }${variant.skuCode ? t('listing.variantSkuMeta', { sku: variant.skuCode }) : ''}`}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          const updated = state.variantSkus.filter((_, idx) => idx !== index);
                          patchState({ variantSkus: updated });
                          const sum = updated.reduce((acc, v) => acc + (v.stockQuantity ?? 0), 0);
                          updateField('stockQuantity', sum.toString());
                        }}
                        style={styles.variantDeleteButton}
                      >
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={styles.variantAddButton}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedColorId(null);
                setSelectedSizeId(null);
                setVariantSkuCode('');
                setVariantStock('1');
                setVariantPriceOverride('');
                setAddVariantModalVisible(true);
              }}
            >
              <Ionicons name="add-circle" size={20} color={Colors.primary} />
              <Text style={styles.variantAddButtonText}>{t('listing.addVariantButton')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </>
    );
  }

  function renderAdditionalStep() {
    return (
      <>

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
              <TouchableOpacity
                style={styles.selectorInput}
                activeOpacity={0.85}
                onPress={handleOpenProductionProvinceModal}
              >
                <Text
                  style={state.productionProvince ? styles.selectorInputText : styles.selectorInputPlaceholder}
                  numberOfLines={1}
                >
                  {state.productionProvince || t('listing.productionProvincePlaceholder')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={Colors.slate500} />
              </TouchableOpacity>
            </View>
          ) : null}
          {isListingFieldVisible('productionDistrict') ? (
            <View style={styles.inlineBlock}>
              <Text style={styles.inputLabel}>{t('listing.productionDistrict')}</Text>
              <TouchableOpacity
                style={[styles.selectorInput, !state.productionProvince && { opacity: 0.5 }]}
                activeOpacity={0.85}
                onPress={() => handleOpenProductionDistrictModal()}
              >
                <Text
                  style={state.productionDistrict ? styles.selectorInputText : styles.selectorInputPlaceholder}
                  numberOfLines={1}
                >
                  {state.productionDistrict || t('listing.productionDistrictPlaceholder')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={Colors.slate500} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

      </>
    );
  }

  function renderLogisticsStep() {
    const isContentGenerating = isAiGenerating && (!state.productContent || state.productContent.trim().length === 0);
    return (
      <>
        {isListingFieldVisible('productContent') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.productContent')}</Text>
            <TextInput
              style={[
                styles.input,
                styles.textareaInput,
                isContentGenerating && { opacity: 0.6, backgroundColor: Colors.slate50 }
              ]}
              value={state.productContent}
              onChangeText={(value) => updateField('productContent', value)}
              placeholder={isContentGenerating ? t('listing.aiGenerating') : t('listing.productContentPlaceholder')}
              placeholderTextColor={Colors.slate400}
              multiline
              maxLength={600}
              editable={!isContentGenerating}
            />
          </View>
        ) : null}

        {isListingFieldVisible('barcodeNo') ? (
          <View style={styles.inputGroup}>
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
          <View style={styles.inputGroup}>
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

        {isListingFieldVisible('geoIndicationCertNo') ? (
          <View style={styles.inputGroup}>
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
        ) : null}

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
            {isFeaturesLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 10 }} />
            ) : (
              <View style={styles.badgeGrid}>
                {featureBadges.map((item) => {
                  const val = item.code || item.id;
                  const isSelected = state.featureBadges.includes(val);
                  const displayName = i18n.language === 'en' ? item.nameEn : item.name;
                  return (
                    <TouchableOpacity
                      key={`feature-badge-${val}`}
                      style={[styles.badgeItem, { opacity: isSelected ? 1 : 0.5 }]}
                      activeOpacity={0.85}
                      onPress={() => handleToggleFeatureBadge(val)}
                    >
                      <View style={[styles.badgeIconContainer, isSelected && styles.badgeIconContainerActive]}>
                        {item.logoUrl ? (
                          <Image
                            source={{ uri: item.logoUrl }}
                            style={styles.badgeLogo}
                            contentFit="contain"
                          />
                        ) : (
                          <Ionicons
                            name="ribbon-outline"
                            size={26}
                            color={isSelected ? Colors.primary : Colors.slate400}
                          />
                        )}
                      </View>
                      <Text style={[styles.badgeLabel, isSelected && styles.badgeLabelActive]}>
                        {displayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {isListingFieldVisible('geoBadgeSelections') ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('listing.geoBadgeSelections')}</Text>
            {isGeoLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 10 }} />
            ) : (
              <View style={styles.badgeGrid}>
                {geoIndications.map((item) => {
                  const val = item.code || item.id;
                  const isSelected = state.geoBadgeSelections.includes(val);
                  const displayName = i18n.language === 'en' ? (item.nameEn || item.name) : item.name;
                  return (
                    <TouchableOpacity
                      key={`geo-badge-${item.id}`}
                      style={[styles.badgeItem, { opacity: isSelected ? 1 : 0.5 }]}
                      activeOpacity={0.85}
                      onPress={() => handleToggleGeoBadgeSelection(val)}
                    >
                      <View style={[styles.badgeIconContainer, isSelected && styles.badgeIconContainerActive]}>
                        {item.logoUrl ? (
                          <Image
                            source={{ uri: item.logoUrl }}
                            style={styles.badgeLogo}
                            contentFit="contain"
                          />
                        ) : (
                          <Ionicons
                            name="ribbon"
                            size={26}
                            color={isSelected ? Colors.primary : Colors.slate400}
                          />
                        )}
                      </View>
                      <Text style={[styles.badgeLabel, isSelected && styles.badgeLabelActive]}>
                        {displayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
      </>
    );
  }

  function renderImagesStep() {
    return (
      <>
        {renderVariantSection()}

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
              {t('listing.imagePickerHint', {
                count: imageUploadLimits.max,
                minCount: imageUploadLimits.min,
              })}
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
    const selectedEvent = auctionEvents.find((e) => e.id === state.selectedEventId);

    return (
      <>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('listing.auctionType')}</Text>
          {selectedEvent ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: `${Colors.primary}08`,
                borderWidth: 1.5,
                borderColor: Colors.primary,
                borderRadius: 12,
                padding: 12,
                gap: 12,
                marginTop: 8,
              }}
            >
              <Image
                source={{ uri: selectedEvent.coverImageUrl }}
                style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: Colors.slate100 }}
                contentFit="cover"
              />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.onSurface }} numberOfLines={1}>
                    {selectedEvent.title}
                  </Text>
                  <View style={{
                    backgroundColor: Colors.primary,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}>
                    <Text style={{ fontSize: 8, fontWeight: '700', color: Colors.white }}>
                      {t('listing.eventBadge')}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: Colors.slate500 }} numberOfLines={1}>
                  {selectedEvent.description}
                </Text>
                <Text style={{ fontSize: 10, color: Colors.primary, fontWeight: '600' }}>
                  Son Katılım: {new Date(selectedEvent.submissionDeadline).toLocaleDateString('tr-TR')}
                </Text>
              </View>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: Colors.slate50,
                borderWidth: 1,
                borderColor: Colors.slate200,
                borderRadius: 12,
                padding: 12,
                marginTop: 8,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.slate700 }}>
                {t('listing.standaloneAuctionLabel')}
              </Text>
              <Text style={{ fontSize: 12, color: Colors.slate500, marginTop: 4 }}>
                {t('listing.standaloneAuctionDesc')}
              </Text>
            </View>
          )}
        </View>

        {!state.selectedEventId ? (
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
          </>
        ) : null}

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

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('listing.reservePrice')}</Text>
          <TextInput
            style={styles.input}
            value={state.auctionReservePrice}
            onChangeText={(value) => updateField('auctionReservePrice', formatPriceInput(value))}
            placeholder="0"
            placeholderTextColor={Colors.slate400}
            keyboardType="decimal-pad"
          />
          <Text style={styles.helperText}>{t('listing.reservePriceHint')}</Text>
        </View>

        {!state.selectedEventId ? (
          <>
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
                    <Text style={styles.inputLabel}>{t('maxExtensions')}</Text>
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
        ) : null}
      </>
    );
  }



  function renderReviewStep() {
    return (
      <>
        {previewImages.length > 0 ? (
          <View style={styles.previewImagesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.previewImagesContent}
            >
              {previewImages.map((uri, idx) => (
                <View key={`preview-img-${idx}`} style={styles.previewImageCard}>
                  <Image source={{ uri }} style={styles.previewImage} contentFit="cover" />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.compactPreviewCard}>
          {/* Başlık (En üstte belirgin) */}
          <View style={styles.compactBlock}>
            <Text style={styles.compactBlockLabel}>{t('listing.summaryTitle')}</Text>
            <Text style={[styles.compactBlockValue, { fontWeight: '700', fontSize: 16 }]}>
              {state.title}
            </Text>
          </View>

          {/* Satış Modeli */}
          <View style={styles.compactRow}>
            <Text style={styles.compactRowLabel}>{t('listing.summaryMode')}</Text>
            <Text style={styles.compactRowValue}>
              {t(state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION ? 'listing.auction' : 'listing.directSale')}
            </Text>
          </View>

          {/* Kategori */}
          <View style={styles.compactRow}>
            <Text style={styles.compactRowLabel}>{t('listing.summaryCategory')}</Text>
            <Text style={styles.compactRowValue} numberOfLines={2}>
              {selectedCategoryLabel}
            </Text>
          </View>

          {/* Fiyat */}
          <View style={styles.compactRow}>
            <Text style={styles.compactRowLabel}>{t('listing.summaryPrice')}</Text>
            <Text style={styles.compactRowValue}>
              {state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION 
                ? formatCurrency(parsePriceInput(state.auctionStartPrice) || 0)
                : formatCurrency(parsePriceInput(state.directSalePrice) || 0)}
            </Text>
          </View>

          {/* Stok Adedi */}
          {state.listingType !== PRODUCT_CREATE_LISTING_TYPES.AUCTION ? (
            <View style={styles.compactRow}>
              <Text style={styles.compactRowLabel}>{t('listing.stockQuantity')}</Text>
              <Text style={styles.compactRowValue}>{state.stockQuantity}</Text>
            </View>
          ) : null}

          {/* Marka */}
          {state.brand ? (
            <View style={styles.compactRow}>
              <Text style={styles.compactRowLabel}>{t('listing.brand')}</Text>
              <Text style={styles.compactRowValue}>{state.brand}</Text>
            </View>
          ) : null}

          {/* Üretim Yeri (Origin) */}
          {state.productionProvince ? (
            <View style={styles.compactRow}>
              <Text style={styles.compactRowLabel}>{t('listing.productionProvince')}</Text>
              <Text style={styles.compactRowValue}>
                {state.productionProvince}
                {state.productionDistrict ? ` / ${state.productionDistrict}` : ''}
              </Text>
            </View>
          ) : null}

          {/* Kargo Çıkış Yeri */}
          {state.shippingProvince ? (
            <View style={styles.compactRow}>
              <Text style={styles.compactRowLabel}>{t('listing.shippingProvince')}</Text>
              <Text style={styles.compactRowValue}>
                {state.shippingProvince}
                {state.shippingDistrict ? ` / ${state.shippingDistrict}` : ''}
              </Text>
            </View>
          ) : null}

          {/* Desi */}
          {state.desiDomestic ? (
            <View style={styles.compactRow}>
              <Text style={styles.compactRowLabel}>{t('listing.desiDomestic') || 'DESİ'}</Text>
              <Text style={styles.compactRowValue}>{state.desiDomestic}</Text>
            </View>
          ) : null}

          {/* Açıklama */}
          {state.description ? (
            <View style={styles.compactBlock}>
              <Text style={styles.compactBlockLabel}>{t('listing.description')}</Text>
              <Text style={styles.compactBlockValue}>{state.description}</Text>
            </View>
          ) : null}

          {/* Sertifikalar */}
          {state.additionalCertificates ? (
            <View style={styles.compactBlock}>
              <Text style={styles.compactBlockLabel}>{t('listing.additionalCertificates')}</Text>
              <Text style={styles.compactBlockValue}>{state.additionalCertificates}</Text>
            </View>
          ) : null}

          {/* Varyantlar */}
          {state.variantSkus && state.variantSkus.length > 0 ? (
            <View style={[styles.compactBlock, styles.compactRowLast]}>
              <Text style={styles.compactBlockLabel}>{t('listing.variantListTitle')}</Text>
              {state.variantSkus.map((variant, index) => {
                const colorNode = SEEDED_COLOR_VARIANTS.find((c) => c.id === variant.colorVariantNumberId);
                const sizeNode = activeSizeList.find((s) => s.id === variant.sizeVariantNumberId);
                const labelParts = [];
                if (colorNode) labelParts.push(colorNode.nameTr);
                if (sizeNode) labelParts.push(sizeNode.nameTr);
                const label = labelParts.join(' / ') || t('listing.variantItemFallback');
                return (
                  <View key={`preview-variant-${index}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text style={{ color: Colors.slate700, fontSize: 13 }}>{label}</Text>
                    <Text style={{ color: Colors.slate500, fontSize: 13 }}>
                      {t('listing.variantStockMeta', { stock: variant.stockQuantity })}
                      {variant.priceOverride ? ` (${formatCurrency(variant.priceOverride)})` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        {state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION ? renderAuctionReviewFields() : null}
      </>
    );
  }

  function renderCurrentStep() {
    if (currentStep === 1) return renderCategorySelectionStep();
    if (currentStep === 2) return renderCoreStep();
    if (currentStep === 3) return renderGeoIndicationStep();
    if (currentStep === 4) return renderAdditionalStep();
    if (currentStep === 5) return renderLogisticsStep();
    if (currentStep === 6) return renderImagesStep();
    return renderReviewStep();
  }

  return (
    <>
      <View style={styles.page}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          <View style={styles.stepCard}>
            <ProductCreateProgress
              currentStep={currentStep}
              totalSteps={7}
              titleKey={STEP_TITLE_KEYS[currentStep]}
              listingType={state.listingType}
            />
            {renderCurrentStep()}
          </View>

          {currentStep === 1 ? (
            <View style={styles.productsCard}>
              <TouchableOpacity
                style={[styles.productsCardHeader, isProductsCollapsed && { marginBottom: 0 }]}
                activeOpacity={0.8}
                onPress={() => setIsProductsCollapsed(!isProductsCollapsed)}
              >
                <View>
                  <Text style={styles.productsCardTitle}>{t('listing.myProductsTitle')}</Text>
                  <Text style={styles.productsCardSubtitle}>
                    {t('listing.totalProducts', { count: totalProducts })}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {isProductsLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
                  ) : null}
                  <Ionicons
                    name={isProductsCollapsed ? 'chevron-down' : 'chevron-up'}
                    size={18}
                    color={Colors.slate500}
                  />
                </View>
              </TouchableOpacity>

              {!isProductsCollapsed ? (
                <>
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
                </>
              ) : null}
            </View>
          ) : null}
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
              ((!canContinue && currentStep !== 7) || (!canSubmit && currentStep === 7) || isSubmitting)
                && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.88}
            onPress={currentStep === 7 ? handleSubmit : handleGoNext}
            disabled={((!canContinue && currentStep !== 7) || (!canSubmit && currentStep === 7) || isSubmitting)}
          >
            {isSubmitting ? <ActivityIndicator color={Colors.white} /> : null}
            {!isSubmitting ? (
              <>
                <Ionicons
                  name={currentStep === 7 ? 'checkmark-circle-outline' : 'arrow-forward'}
                  size={18}
                  color={Colors.white}
                />
                <Text style={styles.primaryButtonText}>
                  {t(currentStep === 7 ? 'listing.publish' : 'listing.next')}
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
                          if (item.children && item.children.length > 0) {
                            setSelectedRootCategoryId(item.id);
                            setCategorySearch('');
                          } else {
                            patchState({ categoryId: item.id });
                            handleCloseCategoryModal();
                          }
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
                        {item.children && item.children.length > 0 ? (
                          <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
                        ) : isSelected ? (
                          <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                        ) : null}
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
              ItemSeparatorComponent={() => <View style={styles.locationSeparator} />}
              renderItem={({ item }) => {
                const isSelected = item === state.originRegion;

                return (
                  <TouchableOpacity
                    style={[styles.locationListItem, isSelected && styles.locationListItemSelected]}
                    activeOpacity={0.85}
                    onPress={() => {
                      patchState({ originCountry: 'TR', originRegion: item });
                      handleCloseProvinceModal();
                    }}
                  >
                    <View style={styles.categoryListItemLeft}>
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
        onDismiss={() => {
          if (pendingShippingDistrictOpen) {
            handleOpenShippingDistrictModal(pendingShippingDistrictOpen);
            setPendingShippingDistrictOpen(null);
          }
        }}
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
              ItemSeparatorComponent={() => <View style={styles.locationSeparator} />}
              renderItem={({ item }) => {
                const isSelected = item === state.shippingProvince;
                return (
                  <TouchableOpacity
                    style={[styles.locationListItem, isSelected && styles.locationListItemSelected]}
                    activeOpacity={0.85}
                    onPress={() => {
                      patchState({ shippingProvince: item, shippingDistrict: '' });
                      handleCloseShippingProvinceModal();
                      if (Platform.OS === 'ios') {
                        setPendingShippingDistrictOpen(item);
                      } else {
                        setTimeout(() => {
                          handleOpenShippingDistrictModal(item);
                        }, 100);
                      }
                    }}
                  >
                    <View style={styles.categoryListItemLeft}>
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
              ItemSeparatorComponent={() => <View style={styles.locationSeparator} />}
              renderItem={({ item }) => {
                const isSelected = item === state.shippingDistrict;
                return (
                  <TouchableOpacity
                    style={[styles.locationListItem, isSelected && styles.locationListItemSelected]}
                    activeOpacity={0.85}
                    onPress={() => {
                      patchState({ shippingDistrict: item });
                      handleCloseShippingDistrictModal();
                    }}
                  >
                    <View style={styles.categoryListItemLeft}>
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
        visible={isProductionProvinceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseProductionProvinceModal}
        onDismiss={() => {
          if (pendingProductionDistrictOpen) {
            handleOpenProductionDistrictModal(pendingProductionDistrictOpen);
            setPendingProductionDistrictOpen(null);
          }
        }}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity style={styles.bottomSheetDismissArea} activeOpacity={1} onPress={handleCloseProductionProvinceModal} />
          <SafeAreaView style={styles.bottomSheetContainer} edges={['bottom']}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.categoryModalHeader}>
              <View style={styles.categoryModalHeaderTextWrap}>
                <Text style={styles.categoryModalTitle}>{t('listing.productionProvinceModalTitle')}</Text>
                <Text style={styles.categoryModalSubtitle}>{t('listing.productionProvinceModalSubtitle')}</Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseButton}
                onPress={handleCloseProductionProvinceModal}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={styles.categorySearchWrapper}>
              <Ionicons name="search-outline" size={16} color={Colors.slate500} />
              <TextInput
                style={styles.categorySearchInput}
                value={productionProvinceSearch}
                onChangeText={setProductionProvinceSearch}
                placeholder={t('listing.productionProvinceSearchPlaceholder')}
                placeholderTextColor={Colors.slate400}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {productionProvinceSearch.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.categorySearchClearButton}
                  onPress={() => setProductionProvinceSearch('')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.slate500} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filteredProductionProvinces}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.categoryListContent}
              ItemSeparatorComponent={() => <View style={styles.locationSeparator} />}
              renderItem={({ item }) => {
                const isSelected = item === state.productionProvince;
                return (
                  <TouchableOpacity
                    style={[styles.locationListItem, isSelected && styles.locationListItemSelected]}
                    activeOpacity={0.85}
                    onPress={() => {
                      patchState({ productionProvince: item, productionDistrict: '' });
                      handleCloseProductionProvinceModal();
                      if (Platform.OS === 'ios') {
                        setPendingProductionDistrictOpen(item);
                      } else {
                        setTimeout(() => {
                          handleOpenProductionDistrictModal(item);
                        }, 100);
                      }
                    }}
                  >
                    <View style={styles.categoryListItemLeft}>
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
                  <Text style={styles.categoryEmptyStateText}>{t('listing.productionProvinceEmpty')}</Text>
                </View>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={isProductionDistrictModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseProductionDistrictModal}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity style={styles.bottomSheetDismissArea} activeOpacity={1} onPress={handleCloseProductionDistrictModal} />
          <SafeAreaView style={styles.bottomSheetContainer} edges={['bottom']}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.categoryModalHeader}>
              <View style={styles.categoryModalHeaderTextWrap}>
                <Text style={styles.categoryModalTitle}>{t('listing.productionDistrictModalTitle')}</Text>
                <Text style={styles.categoryModalSubtitle}>{t('listing.productionDistrictModalSubtitle')}</Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseButton}
                onPress={handleCloseProductionDistrictModal}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={styles.categorySearchWrapper}>
              <Ionicons name="search-outline" size={16} color={Colors.slate500} />
              <TextInput
                style={styles.categorySearchInput}
                value={productionDistrictSearch}
                onChangeText={setProductionDistrictSearch}
                placeholder={t('listing.productionDistrictSearchPlaceholder')}
                placeholderTextColor={Colors.slate400}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {productionDistrictSearch.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.categorySearchClearButton}
                  onPress={() => setProductionDistrictSearch('')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.slate500} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filteredProductionDistricts}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.categoryListContent}
              ItemSeparatorComponent={() => <View style={styles.locationSeparator} />}
              renderItem={({ item }) => {
                const isSelected = item === state.productionDistrict;
                return (
                  <TouchableOpacity
                    style={[styles.locationListItem, isSelected && styles.locationListItemSelected]}
                    activeOpacity={0.85}
                    onPress={() => {
                      patchState({ productionDistrict: item });
                      handleCloseProductionDistrictModal();
                    }}
                  >
                    <View style={styles.categoryListItemLeft}>
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
                  <Text style={styles.categoryEmptyStateText}>{t('listing.productionDistrictEmpty')}</Text>
                </View>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>


      {/* Add Variant Modal */}
      <Modal
        visible={isAddVariantModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddVariantModalVisible(false)}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity style={styles.bottomSheetDismissArea} activeOpacity={1} onPress={() => setAddVariantModalVisible(false)} />
          <SafeAreaView style={styles.bottomSheetContainer} edges={['bottom']}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.categoryModalHeader}>
              <View style={styles.categoryModalHeaderTextWrap}>
                <Text style={styles.categoryModalTitle}>
                  {t('listing.addVariantButton')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseButton}
                onPress={() => setAddVariantModalVisible(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Color Selection */}
              {isColorVariantSupported ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('listing.variantColorLabel')}</Text>
                  <TouchableOpacity
                    style={styles.selectorInput}
                    activeOpacity={0.85}
                    onPress={() => {
                      setColorSearch('');
                      setColorSelectModalVisible(true);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {selectedColorId ? (
                        <>
                          <View 
                            style={{ 
                              width: 16, 
                              height: 16, 
                              borderRadius: 8, 
                              backgroundColor: SEEDED_COLOR_VARIANTS.find(c => c.id === selectedColorId)?.hex || Colors.slate300,
                              borderWidth: 1,
                              borderColor: Colors.outlineVariant
                            }} 
                          />
                          <Text style={styles.selectorInputText}>
                            {SEEDED_COLOR_VARIANTS.find(c => c.id === selectedColorId)?.nameTr}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.selectorInputPlaceholder}>
                          {t('listing.variantColorPlaceholder')}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-down" size={18} color={Colors.slate500} />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Size Selection */}
              {isSizeVariantSupported ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('listing.variantSizeLabel')}</Text>
                  <TouchableOpacity
                    style={styles.selectorInput}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSizeSearch('');
                      setSizeSelectModalVisible(true);
                    }}
                  >
                    <Text
                      style={selectedSizeId ? styles.selectorInputText : styles.selectorInputPlaceholder}
                    >
                      {selectedSizeId ? activeSizeList.find(s => s.id === selectedSizeId)?.nameTr : t('listing.variantSizePlaceholder')}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={Colors.slate500} />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* SKU Code */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('listing.skuCode', 'SKU Kodu')}</Text>
                <TextInput
                  style={styles.input}
                  value={variantSkuCode}
                  onChangeText={setVariantSkuCode}
                  placeholder={t('listing.variantSkuPlaceholder')}
                  placeholderTextColor={Colors.slate400}
                  autoCapitalize="characters"
                />
              </View>

              {/* Stock and Price Row */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('listing.variantStockLabel')}</Text>
                  <TextInput
                    style={styles.input}
                    value={variantStock}
                    onChangeText={setVariantStock}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={Colors.slate400}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('listing.variantPriceOverrideLabel')}</Text>
                  <TextInput
                    style={styles.input}
                    value={variantPriceOverride}
                    onChangeText={(val) => setVariantPriceOverride(formatPriceInput(val))}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.slate400}
                  />
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: Colors.primary,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 10,
                }}
                activeOpacity={0.9}
                onPress={handleSaveVariant}
              >
                <Text style={{ color: Colors.white, fontFamily: 'PlusJakartaSans-Bold', fontSize: 16 }}>
                  {t('listing.saveVariantButton')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Color Selection Modal */}
      <Modal
        visible={isColorSelectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setColorSelectModalVisible(false)}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity style={styles.bottomSheetDismissArea} activeOpacity={1} onPress={() => setColorSelectModalVisible(false)} />
          <SafeAreaView style={styles.bottomSheetContainer} edges={['bottom']}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.categoryModalHeader}>
              <View style={styles.categoryModalHeaderTextWrap}>
                <Text style={styles.categoryModalTitle}>
                  {t('listing.variantColorModalTitle')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseButton}
                onPress={() => setColorSelectModalVisible(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={styles.categorySearchWrapper}>
              <Ionicons name="search-outline" size={16} color={Colors.slate500} />
              <TextInput
                style={styles.categorySearchInput}
                value={colorSearch}
                onChangeText={setColorSearch}
                placeholder={t('listing.variantColorSearchPlaceholder', 'Renk ara...')}
                placeholderTextColor={Colors.slate400}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {colorSearch.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.categorySearchClearButton}
                  onPress={() => setColorSearch('')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.slate500} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filteredColors}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.categoryListContent}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedColorId;
                return (
                  <TouchableOpacity
                    style={[styles.categoryListItem, isSelected && styles.categoryListItemSelected]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedColorId(item.id);
                      setColorSelectModalVisible(false);
                    }}
                  >
                    <View style={styles.categoryListItemLeft}>
                      <View 
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: item.hex,
                          borderWidth: 1,
                          borderColor: Colors.outlineVariant,
                          marginRight: 8,
                        }} 
                      />
                      <Text style={[styles.categoryListItemText, isSelected && styles.categoryListItemTextSelected]}>
                        {item.nameTr}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={18} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={(
                <View style={styles.categoryEmptyState}>
                  <Text style={styles.categoryEmptyStateText}>{t('listing.variantColorEmpty', 'Eşleşen renk bulunamadı')}</Text>
                </View>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>

      {/* Size Selection Modal */}
      <Modal
        visible={isSizeSelectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSizeSelectModalVisible(false)}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity style={styles.bottomSheetDismissArea} activeOpacity={1} onPress={() => setSizeSelectModalVisible(false)} />
          <SafeAreaView style={styles.bottomSheetContainer} edges={['bottom']}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.categoryModalHeader}>
              <View style={styles.categoryModalHeaderTextWrap}>
                <Text style={styles.categoryModalTitle}>
                  {t('listing.variantSizeModalTitle')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.categoryModalCloseButton}
                onPress={() => setSizeSelectModalVisible(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={styles.categorySearchWrapper}>
              <Ionicons name="search-outline" size={16} color={Colors.slate500} />
              <TextInput
                style={styles.categorySearchInput}
                value={sizeSearch}
                onChangeText={setSizeSearch}
                placeholder={t('listing.variantSizeSearchPlaceholder', 'Beden / Numara ara...')}
                placeholderTextColor={Colors.slate400}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {sizeSearch.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.categorySearchClearButton}
                  onPress={() => setSizeSearch('')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.slate500} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filteredSizes}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.categoryListContent}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedSizeId;
                return (
                  <TouchableOpacity
                    style={[styles.categoryListItem, isSelected && styles.categoryListItemSelected]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedSizeId(item.id);
                      setSizeSelectModalVisible(false);
                    }}
                  >
                    <View style={styles.categoryListItemLeft}>
                      <View style={[styles.categoryIconWrapLarge, styles.provinceIconWrap]}>
                        <Ionicons name="resize-outline" size={18} color={Colors.primary} />
                      </View>
                      <Text style={[styles.categoryListItemText, isSelected && styles.categoryListItemTextSelected]}>
                        {item.nameTr}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={18} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={(
                <View style={styles.categoryEmptyState}>
                  <Text style={styles.categoryEmptyStateText}>{t('listing.variantSizeEmpty', 'Eşleşen beden/numara bulunamadı')}</Text>
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
      {renderEntryModeSheet()}
    </>
  );
}
