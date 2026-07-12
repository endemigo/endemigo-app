import api from '../lib/api';
import ENV from '../lib/config';
import type { Product } from '../types';
import type { LotUpdatePayload, ProductUpdatePayload } from '../utils/productEditMapper';

// Satıcının kendi lotu (GET /auctions/my). Backend toResponse projeksiyonundan
// mobilin düzenleme akışında kullandığı alanlar.
export interface MyLot {
  id: string;
  productId: string;
  productTitle: string | null;
  productImage: string | null;
  startPrice: number;
  minIncrement: number;
  reservePrice: number | null;
  status: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  eventId: string | null;
  eventTitle: string | null;
  lotNumber: string | null;
}

interface Envelope {
  code: string;
  message: string;
}

type ProductAuthResponse = Envelope & Product;
type MyLotsResponse = Envelope & {
  items: MyLot[];
  total: number;
  page: number;
  totalPages: number;
};

// Sahiplik kontrolü backend'de; her statüdeki ürünü döndürür (düzenleme için).
export async function getProductForEdit(productId: string): Promise<Product> {
  const { data } = await api.get<ProductAuthResponse>(`/products/${productId}/auth`);
  return data;
}

export async function getMyPendingLots(): Promise<MyLot[]> {
  if (ENV.USE_MOCK) return [];
  const { data } = await api.get<MyLotsResponse>('/auctions/my?approvalStatus=PENDING&limit=100');
  return data.items ?? [];
}

export async function updateProductFields(
  productId: string,
  payload: ProductUpdatePayload,
): Promise<Product> {
  const { data } = await api.patch<ProductAuthResponse>(`/products/${productId}`, payload);
  return data;
}

export async function updateLotFields(lotId: string, payload: LotUpdatePayload): Promise<void> {
  await api.patch(`/auctions/${lotId}`, payload);
}
