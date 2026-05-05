import { useState } from 'react';
import {
  PRODUCT_CREATE_AUCTION_TYPES,
  PRODUCT_CREATE_CONDITIONS,
  PRODUCT_CREATE_LISTING_TYPES,
  type ProductCreateWizardState,
  type ProductCreateWizardStep,
} from '../types/productCreate.ts';

export function createInitialProductCreateState(): ProductCreateWizardState {
  return {
    listingType: PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE,
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
    weight: '',
    dimensionWidth: '',
    dimensionHeight: '',
    dimensionDepth: '',
  };
}

function isPositiveNumber(value: string): boolean {
  return Number(value.replace(',', '.')) > 0;
}

function isNonNegativeInteger(value: string): boolean {
  const parsed = Number(value || '0');
  return Number.isInteger(parsed) && parsed >= 0;
}

export function canContinueProductCreateStep(
  step: ProductCreateWizardStep,
  state: ProductCreateWizardState,
  imageCount: number,
): boolean {
  if (step === 1) {
    return state.title.trim().length >= 3 && state.categoryId.length > 0;
  }

  if (step === 2) {
    if (state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION) {
      return isPositiveNumber(state.auctionStartPrice);
    }

    if (!isPositiveNumber(state.directSalePrice)) {
      return false;
    }

    if (!state.askPriceEnabled) {
      return true;
    }

    return isPositiveNumber(state.askPriceMinAmount);
  }

  if (step === 3) {
    return state.description.trim().length >= 10 && isNonNegativeInteger(state.stockQuantity);
  }

  if (step === 4) {
    return imageCount > 0;
  }

  return state.listingType !== PRODUCT_CREATE_LISTING_TYPES.AUCTION
    || (
      state.auctionStartTime.length > 0
      && state.auctionEndTime.length > 0
      && isPositiveNumber(state.auctionMinIncrement)
    );
}

export function isProductCreateReadyToSubmit(
  state: ProductCreateWizardState,
  imageCount: number,
): boolean {
  return (
    canContinueProductCreateStep(1, state, imageCount)
    && canContinueProductCreateStep(2, state, imageCount)
    && canContinueProductCreateStep(3, state, imageCount)
    && canContinueProductCreateStep(4, state, imageCount)
    && canContinueProductCreateStep(5, state, imageCount)
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

  function reset() {
    setState(createInitialProductCreateState());
  }

  return {
    state,
    updateField,
    patchState,
    reset,
  };
}
