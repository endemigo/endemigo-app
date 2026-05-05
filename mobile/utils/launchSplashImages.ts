import type { ProductImage } from '@/types';

export interface LaunchSplashImageItem {
  id: string;
  uri: string;
  source: 'live' | 'fallback';
}

interface ProductLikeImageSource {
  thumbnail?: string;
  imageUrl?: string;
  images?: ProductImage[];
}

interface AuctionLikeImageSource {
  productImage?: string | null;
}

interface CreateLaunchSplashImageItemsInput {
  storedImages?: string[];
  products?: ProductLikeImageSource[];
  auctions?: AuctionLikeImageSource[];
  maxImages?: number;
}

export const CURATED_LAUNCH_SPLASH_IMAGE_POOL = [
  'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=700&q=80',
  'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=700&q=80',
  'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=700&q=80',
  'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=700&q=80',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=700&q=80',
  'https://images.unsplash.com/photo-1514996937319-344454492b37?w=700&q=80',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=700&q=80',
  'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=700&q=80',
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=700&q=80',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=700&q=80',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=700&q=80',
] as const;

function isNonEmptyImageUri(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getProductImageUri(product: ProductLikeImageSource): string | null {
  const primaryImage = product.images?.find((image) => image.isPrimary)?.url;
  return product.thumbnail || product.imageUrl || primaryImage || product.images?.[0]?.url || null;
}

function uniqueImageUris(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  return values.filter(isNonEmptyImageUri).filter((value) => {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

export function createLaunchSplashImageItems({
  storedImages = [],
  products = [],
  auctions = [],
  maxImages = 12,
}: CreateLaunchSplashImageItemsInput): LaunchSplashImageItem[] {
  const liveImages = uniqueImageUris([
    ...storedImages,
    ...products.map(getProductImageUri),
    ...auctions.map((auction) => auction.productImage ?? null),
  ]).slice(0, maxImages);

  const fallbackImages = CURATED_LAUNCH_SPLASH_IMAGE_POOL.filter((uri) => !liveImages.includes(uri)).slice(
    0,
    Math.max(0, maxImages - liveImages.length),
  );

  return [...liveImages, ...fallbackImages].map((uri, index) => ({
    id: `launch-splash-${index}-${uri}`,
    uri,
    source: index < liveImages.length ? 'live' : 'fallback',
  }));
}

export function buildLaunchSplashColumns(
  items: LaunchSplashImageItem[],
  columnCount: number,
): LaunchSplashImageItem[][] {
  const safeColumnCount = Math.max(1, columnCount);
  const columns = Array.from({ length: safeColumnCount }, () => [] as LaunchSplashImageItem[]);

  items.forEach((item, index) => {
    columns[index % safeColumnCount].push(item);
  });

  return columns.map((column, index) => {
    if (column.length <= 1) {
      return column;
    }

    const offset = index % column.length;
    return [...column.slice(offset), ...column.slice(0, offset)];
  });
}
