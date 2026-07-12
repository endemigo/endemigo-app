import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyPendingLots,
  getProductForEdit,
  updateLotFields,
  updateProductFields,
  type MyLot,
} from '../services/productEditService';
import type { Product } from '../types';
import type { LotUpdatePayload, ProductUpdatePayload } from '../utils/productEditMapper';

// Satıcının onay bekleyen lotları — "Ürünlerim" listesinde productId→lot eşlemesi
// ve edit ekranında lot alanlarının koşullu gösterimi için.
export function useMyPendingLots(enabled = true) {
  return useQuery<MyLot[]>({
    queryKey: ['my-pending-lots'],
    queryFn: getMyPendingLots,
    enabled,
  });
}

export function useProductForEdit(productId: string, enabled = true) {
  return useQuery<Product>({
    queryKey: ['product-edit', productId],
    queryFn: () => getProductForEdit(productId),
    enabled: enabled && Boolean(productId),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: ProductUpdatePayload }) =>
      updateProductFields(productId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['product-edit', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.productId] });
    },
  });
}

export function useUpdateLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lotId, payload }: { lotId: string; payload: LotUpdatePayload }) =>
      updateLotFields(lotId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-pending-lots'] });
      queryClient.invalidateQueries({ queryKey: ['auction', variables.lotId] });
    },
  });
}
