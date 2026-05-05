const SELLER_BANNER_POOL = [
  'https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1495908333425-29a1e0918c5f?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1438109491414-7198515b166b?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1600&q=80',
];

function hashToIndex(value: string, size: number): number {
  const normalized = value.trim();
  if (!normalized) return 0;

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }

  return hash % size;
}

export function resolveSellerBanner(userId: string, bannerUrl?: string | null): string {
  if (bannerUrl && bannerUrl.trim().length > 0) {
    return bannerUrl.trim();
  }

  return SELLER_BANNER_POOL[hashToIndex(userId, SELLER_BANNER_POOL.length)];
}
