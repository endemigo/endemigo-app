import { useState } from 'react';
import {
  MOBILE_LISTING_CREATE_OPTIONAL_FIELDS,
  type MobileListingCreateOptionalField,
} from '@endemigo/shared';
import {
  PRODUCT_CREATE_AUCTION_TYPES,
  PRODUCT_CREATE_CONDITIONS,
  PRODUCT_CREATE_LISTING_TYPES,
  type ProductCreateWizardState,
  type ProductCreateWizardStep,
  type ProductCreateEntryMode,
} from '../types/productCreate.ts';
import { parsePriceInput } from '../utils/priceInputMask.ts';

export interface ListingFieldVisibilityOptions {
  optionalFields?: MobileListingCreateOptionalField[];
}

function isOptionalFieldVisible(
  field: MobileListingCreateOptionalField,
  options?: ListingFieldVisibilityOptions,
): boolean {
  const selectedFields = options?.optionalFields;
  if (!Array.isArray(selectedFields)) {
    return true;
  }
  return selectedFields.includes(field);
}

export function createInitialProductCreateState(): ProductCreateWizardState {
  return {
    listingType: PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE,
    selectedEventId: null,
    title: '',
    categoryId: '',
    directSalePrice: '',
    stockQuantity: '1',
    description: '',
    condition: PRODUCT_CREATE_CONDITIONS.NEW,
    originCountry: 'TR',
    originRegion: '',
    askPriceEnabled: false,
    askPriceMinAmount: '',
    auctionStartPrice: '',
    auctionMinIncrement: '1',
    auctionReservePrice: '',
    auctionStartTime: '',
    auctionEndTime: '',
    auctionType: PRODUCT_CREATE_AUCTION_TYPES.REALTIME,
    antiSnipingEnabled: true,
    extensionSeconds: '60',
    maxExtensions: '5',
    selectedAuctionStartDelayHours: null,
    selectedAuctionDurationHours: null,
    sku: '',
    geoIndicationCertNo: '',
    geoIndicationRegion: '',
    geoIndicationReceivedAt: '',
    barcodeNo: '',
    productContent: '',
    sellerNotes: '',
    brand: '',
    isEndemigoBrandCandidate: false,
    productionProvince: '',
    productionDistrict: '',
    productionSeasons: [],
    salesMonths: [],
    wholesalePrice: '',
    retailPrice: '',
    shippingProvince: '',
    shippingDistrict: '',
    shippingAddress: '',
    deliveryTemplateDomestic: '',
    deliveryTemplateInternational: '',
    desiDomestic: '',
    desiInternational: '',
    featureBadges: [],
    geoBadgeSelections: [],
    additionalCertificates: '',
    weight: '',
    dimensionWidth: '',
    dimensionHeight: '',
    dimensionDepth: '',
    dynamicFieldValues: {},
    variantSkus: [],
  };
}

function isPositiveNumber(value: string): boolean {
  const parsed = parsePriceInput(value);
  return Boolean(parsed && parsed > 0);
}

function isNonNegativeInteger(value: string): boolean {
  const parsed = Number(value || '0');
  return Number.isInteger(parsed) && parsed >= 0;
}

export function canContinueProductCreateStep(
  step: ProductCreateWizardStep,
  state: ProductCreateWizardState,
  imageCount: number,
  visibilityOptions?: ListingFieldVisibilityOptions,
  minImageCount = 1,
): boolean {
  if (step === 1) {
    return state.categoryId.length > 0;
  }

  if (step === 2) {
    const hasBasics = state.title.trim().length >= 3;
    const hasPricing = state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION
      ? isPositiveNumber(state.auctionStartPrice)
      : state.askPriceEnabled
        ? true
        : isPositiveNumber(state.directSalePrice);
    const hasDetails = state.description.trim().length >= 3 && isNonNegativeInteger(state.stockQuantity);
    return hasBasics && hasPricing && hasDetails;
  }

  if (step === 3 || step === 4 || step === 5) {
    return true;
  }

  if (step === 6) {
    if (!isOptionalFieldVisible('images', visibilityOptions)) {
      return true;
    }
    return imageCount >= minImageCount;
  }

  if (state.listingType !== PRODUCT_CREATE_LISTING_TYPES.AUCTION) {
    return true;
  }
  if (state.selectedEventId) {
    return true;
  }
  return (
    state.auctionStartTime.length > 0
    && state.auctionEndTime.length > 0
    && isPositiveNumber(state.auctionMinIncrement)
  );
}

export function isProductCreateReadyToSubmit(
  state: ProductCreateWizardState,
  imageCount: number,
  visibilityOptions?: ListingFieldVisibilityOptions,
  minImageCount = 1,
): boolean {
  const normalizedVisibilityOptions = {
    optionalFields: visibilityOptions?.optionalFields ?? [...MOBILE_LISTING_CREATE_OPTIONAL_FIELDS],
  };

  return (
    canContinueProductCreateStep(1, state, imageCount, normalizedVisibilityOptions, minImageCount)
    && canContinueProductCreateStep(2, state, imageCount, normalizedVisibilityOptions, minImageCount)
    && canContinueProductCreateStep(3, state, imageCount, normalizedVisibilityOptions, minImageCount)
    && canContinueProductCreateStep(4, state, imageCount, normalizedVisibilityOptions, minImageCount)
    && canContinueProductCreateStep(5, state, imageCount, normalizedVisibilityOptions, minImageCount)
    && canContinueProductCreateStep(6, state, imageCount, normalizedVisibilityOptions, minImageCount)
    && canContinueProductCreateStep(7, state, imageCount, normalizedVisibilityOptions, minImageCount)
  );
}

export function useProductCreateWizard() {
  const [state, setState] = useState<ProductCreateWizardState>(createInitialProductCreateState());

  function updateField<K extends keyof ProductCreateWizardState>(
    key: K,
    value: ProductCreateWizardState[K],
  ) {
    setState((currentState) => ({ ...currentState, [key]: value }));
  }

  function patchState(patch: Partial<ProductCreateWizardState>) {
    setState((currentState) => ({ ...currentState, ...patch }));
  }

  function reset(entryMode?: ProductCreateEntryMode | null, auctionType?: string) {
    const initialState = createInitialProductCreateState();
    if (entryMode) {
      initialState.listingType = entryMode === 'AUCTION'
        ? PRODUCT_CREATE_LISTING_TYPES.AUCTION
        : PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE;
      initialState.askPriceEnabled = false;
      initialState.auctionType = auctionType === 'TIMED'
        ? PRODUCT_CREATE_AUCTION_TYPES.TIMED
        : PRODUCT_CREATE_AUCTION_TYPES.REALTIME;
    }
    setState(initialState);
  }

  return {
    state,
    updateField,
    patchState,
    reset,
  };
}
