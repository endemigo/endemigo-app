import api from '../lib/api';
import type {
  ProductCreateEntryMode,
  ProductCreateWizardState,
} from '../types/productCreate.ts';
import { buildProductCreatePayload } from '../utils/productCreateMapper.ts';

interface ListingDraftPayload {
  entryMode: ProductCreateEntryMode;
  listingType: ProductCreateWizardState['listingType'];
  categoryId?: string | null;
  currentStep: number;
  payload: Record<string, unknown>;
}

interface ListingDraftResponse {
  code: string;
  message: string;
  draft: {
    id: string;
    currentStep: number;
    payload: Record<string, unknown>;
  };
}

export async function createListingDraft(
  state: ProductCreateWizardState,
  entryMode: ProductCreateEntryMode,
  currentStep: number,
) {
  const payload: ListingDraftPayload = {
    entryMode,
    listingType: state.listingType,
    categoryId: state.categoryId || null,
    currentStep,
    payload: {
      rawState: state,
      product: buildProductCreatePayload(state),
    },
  };
  const { data } = await api.post<ListingDraftResponse>('/products/drafts', payload);
  return data.draft;
}

export async function updateListingDraft(
  draftId: string,
  state: ProductCreateWizardState,
  entryMode: ProductCreateEntryMode,
  currentStep: number,
) {
  const payload: ListingDraftPayload = {
    entryMode,
    listingType: state.listingType,
    categoryId: state.categoryId || null,
    currentStep,
    payload: {
      rawState: state,
      product: buildProductCreatePayload(state),
    },
  };
  const { data } = await api.patch<ListingDraftResponse>(`/products/drafts/${draftId}`, payload);
  return data.draft;
}

export async function publishListingDraft(draftId: string) {
  const { data } = await api.post<ListingDraftResponse>(`/products/drafts/${draftId}/publish`);
  return data;
}
