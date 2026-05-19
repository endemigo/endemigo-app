import type { ProductCreateImageDraft, ProductCreatePickerAsset } from '../types/productCreate.ts';

export const DEFAULT_MAX_PRODUCT_IMAGE_COUNT = 10;

type UploadableFile = Blob & {
  uri: string;
  name: string;
  type: string;
};

export function mapPickerAssetToProductImage(asset: ProductCreatePickerAsset): ProductCreateImageDraft {
  const safeName = asset.fileName?.trim() || `product-image-${Date.now()}.jpg`;

  return {
    id: `${asset.assetId || asset.uri}-${safeName}`,
    uri: asset.uri,
    fileName: safeName,
    mimeType: asset.mimeType || 'image/jpeg',
    width: asset.width ?? null,
    height: asset.height ?? null,
    fileSize: asset.fileSize ?? null,
  };
}

export function buildProductImageUploadFile(image: ProductCreateImageDraft): UploadableFile {
  return {
    uri: image.uri,
    name: image.fileName,
    type: image.mimeType,
  } as UploadableFile;
}
