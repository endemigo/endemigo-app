import type { Product } from '@/types';

type ProductImageSource = Pick<Product, 'thumbnail' | 'imageUrl' | 'images'>;

export function getProductImageUri(
  product: ProductImageSource | null | undefined,
  fallbackImage: string,
): string {
  const primaryImage = product?.images?.find((image) => image.isPrimary)?.url;
  return product?.thumbnail || product?.imageUrl || primaryImage || product?.images?.[0]?.url || fallbackImage;
}
