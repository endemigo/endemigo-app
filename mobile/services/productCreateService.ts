import { ProductStatus } from '../../shared-types/enums/product-status.enum.ts';
import api from '../lib/api';
import {
  PRODUCT_CREATE_LISTING_TYPES,
  type ProductCreateImageDraft,
  type ProductCreateWizardState,
} from '../types/productCreate.ts';
import { buildAuctionCreatePayload, buildProductCreatePayload } from '../utils/productCreateMapper.ts';
import { buildProductImageUploadFile } from '../utils/productImageUpload.ts';

interface ProductCreateResponse {
  id: string;
  code: string;
  message: string;
}

interface AuctionCreateResponse {
  id: string;
  code: string;
  message: string;
}

async function createProduct(state: ProductCreateWizardState) {
  const { data } = await api.post<ProductCreateResponse>(
    '/products',
    buildProductCreatePayload(state),
  );
  return data;
}

async function uploadProductImage(productId: string, image: ProductCreateImageDraft) {
  const formData = new FormData();
  formData.append('file', buildProductImageUploadFile(image));

  await api.post(`/products/${productId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

async function publishProduct(productId: string) {
  return api.patch(`/products/${productId}`, {
    status: ProductStatus.ACTIVE,
  });
}

async function createAuction(productId: string, state: ProductCreateWizardState) {
  const { data } = await api.post<AuctionCreateResponse>(
    '/auctions',
    buildAuctionCreatePayload(productId, state),
  );
  return data;
}

async function publishAuction(auctionId: string) {
  return api.patch(`/auctions/${auctionId}/publish`);
}

export async function submitProductCreateWizard(
  state: ProductCreateWizardState,
  images: ProductCreateImageDraft[],
) {
  const product = await createProduct(state);

  for (const image of images) {
    await uploadProductImage(product.id, image);
  }

  await publishProduct(product.id);

  if (state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION) {
    const auction = await createAuction(product.id, state);
    await publishAuction(auction.id);
  }

  return product;
}
