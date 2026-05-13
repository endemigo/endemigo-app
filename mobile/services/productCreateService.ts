import { ProductStatus } from '../../shared-types/enums/product-status.enum.ts';
import api from '../lib/api';
import ENV from '../lib/config';
import { mockService } from '../lib/mockService';
import { queryClient } from '../lib/queryClient';
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
  if (ENV.USE_MOCK) {
    return mockService.createProduct(buildProductCreatePayload(state));
  }

  const { data } = await api.post<ProductCreateResponse>(
    '/products',
    buildProductCreatePayload(state),
  );
  return data;
}

async function uploadProductImage(productId: string, image: ProductCreateImageDraft) {
  if (ENV.USE_MOCK) {
    await mockService.uploadProductImage(productId, image);
    return;
  }

  const formData = new FormData();
  formData.append('file', buildProductImageUploadFile(image));

  await api.post(`/products/${productId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

async function publishProduct(productId: string) {
  if (ENV.USE_MOCK) {
    return mockService.publishProduct(productId);
  }

  return api.patch(`/products/${productId}`, {
    status: ProductStatus.ACTIVE,
  });
}

async function createAuction(productId: string, state: ProductCreateWizardState) {
  if (ENV.USE_MOCK) {
    return mockService.createAuction(buildAuctionCreatePayload(productId, state));
  }

  const { data } = await api.post<AuctionCreateResponse>(
    '/auctions',
    buildAuctionCreatePayload(productId, state),
  );
  return data;
}

async function publishAuction(auctionId: string) {
  if (ENV.USE_MOCK) {
    return mockService.publishAuction(auctionId);
  }

  return api.patch(`/auctions/${auctionId}/publish`);
}

export async function submitProductCreateWizard(
  state: ProductCreateWizardState,
  images: ProductCreateImageDraft[],
  existingProductId?: string,
) {
  const product = existingProductId
    ? { id: existingProductId, code: 'EXISTING_PRODUCT_SELECTED', message: 'Existing product selected.' }
    : await createProduct(state);

  if (!existingProductId) {
    for (const image of images) {
      await uploadProductImage(product.id, image);
    }
  }

  await publishProduct(product.id);

  if (state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION) {
    const auction = await createAuction(product.id, state);
    await publishAuction(auction.id);
  }

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['products'] }),
    queryClient.invalidateQueries({ queryKey: ['auctions'] }),
  ]);

  return product;
}
