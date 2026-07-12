import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listListingDrafts,
  type ListingDraftSummary,
} from '../services/listingDraftService.ts';
import { listLocalListingDrafts } from '../services/localListingDraftService.ts';

export const LISTING_DRAFTS_QUERY_KEY = ['listing-drafts'] as const;
export const LOCAL_LISTING_DRAFTS_QUERY_KEY = ['listing-drafts', 'local'] as const;

// Backend taslakları (status=DRAFT) — yalnız onaylı satıcıda anlamlı.
export function useListingDrafts(enabled = true) {
  return useQuery<ListingDraftSummary[]>({
    queryKey: LISTING_DRAFTS_QUERY_KEY,
    queryFn: listListingDrafts,
    enabled,
  });
}

// Cihazda tutulan misafir/onaysız taslaklar.
export function useLocalListingDrafts(enabled = true) {
  return useQuery<ListingDraftSummary[]>({
    queryKey: LOCAL_LISTING_DRAFTS_QUERY_KEY,
    queryFn: listLocalListingDrafts,
    enabled,
  });
}

// Taslak kaydet/sil/yayınla/senkron sonrası hem backend hem yerel listeyi tazeler
// (partial match: ['listing-drafts'] öneki ['listing-drafts','local'] anahtarını da kapsar).
export function useInvalidateListingDrafts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: LISTING_DRAFTS_QUERY_KEY });
}

export type { ListingDraftSummary };
