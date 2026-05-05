import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

const CATEGORY_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  gida: { icon: 'restaurant-outline', color: Colors.primary },
  elektronik: { icon: 'phone-portrait-outline', color: Colors.secondary },
  antika_koleksiyon: { icon: 'albums-outline', color: Colors.accent },
  sanat: { icon: 'color-palette-outline', color: Colors.primary },
  hali_kilim: { icon: 'grid-outline', color: Colors.secondary },
  mucevher_saat: { icon: 'diamond-outline', color: Colors.accent },
  mobilya_dekor: { icon: 'bed-outline', color: Colors.primary },
  kiyafet_aksesuar: { icon: 'shirt-outline', color: Colors.secondary },
  spor_outdoor: { icon: 'bicycle-outline', color: Colors.accent },
  yoresel_urunler: { icon: 'leaf-outline', color: Colors.secondary },
  default: { icon: 'apps-outline', color: Colors.slate500 },
};

const CATEGORY_MOCK_IMAGES: Record<string, string> = {
  gida: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
  elektronik: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80',
  antika_koleksiyon: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80',
  sanat: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&q=80',
  hali_kilim: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
  mucevher_saat: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80',
  mobilya_dekor: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&q=80',
  kiyafet_aksesuar: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80',
  spor_outdoor: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80',
  yoresel_urunler: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=400&q=80',
  default: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&q=80',
};

function normalizeCategorySlug(slug?: string) {
  return slug?.toLowerCase().replace(/[- ]/g, '_') || '';
}

export function getCategoryIcon(slug?: string) {
  return CATEGORY_ICONS[normalizeCategorySlug(slug)] || CATEGORY_ICONS.default;
}

export function getCategoryMockImage(slug?: string) {
  return CATEGORY_MOCK_IMAGES[normalizeCategorySlug(slug)] || CATEGORY_MOCK_IMAGES.default;
}
