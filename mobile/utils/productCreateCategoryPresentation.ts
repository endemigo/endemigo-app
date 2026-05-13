import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface CategoryVisualConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  imageUrl?: string;
}

const CATEGORY_VISUALS: Record<string, CategoryVisualConfig> = {
  gida: {
    icon: 'restaurant-outline',
    color: Colors.primary,
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
  },
  elektronik: {
    icon: 'hardware-chip-outline',
    color: Colors.secondary,
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80',
  },
  antika_koleksiyon: {
    icon: 'diamond-outline',
    color: Colors.accent,
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80',
  },
  sanat: {
    icon: 'color-palette-outline',
    color: Colors.primary,
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&q=80',
  },
  hali_kilim: {
    icon: 'grid-outline',
    color: Colors.secondary,
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
  },
  mucevher_saat: {
    icon: 'watch-outline',
    color: Colors.accent,
    imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80',
  },
  mobilya_dekor: {
    icon: 'bed-outline',
    color: Colors.primary,
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&q=80',
  },
  kiyafet_aksesuar: {
    icon: 'shirt-outline',
    color: Colors.secondary,
    imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80',
  },
  spor_outdoor: {
    icon: 'fitness-outline',
    color: Colors.accent,
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80',
  },
  yoresel_urunler: {
    icon: 'leaf-outline',
    color: Colors.secondary,
    imageUrl: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=400&q=80',
  },
  default: {
    icon: 'apps-outline',
    color: Colors.slate500,
  },
};

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; key: keyof typeof CATEGORY_VISUALS }> = [
  { keywords: ['elektronik', 'telefon', 'bilgisayar', 'kulaklik', 'kamera'], key: 'elektronik' },
  { keywords: ['antika', 'koleksiyon', 'retro', 'vintage'], key: 'antika_koleksiyon' },
  { keywords: ['sanat', 'tablo', 'resim', 'heykel'], key: 'sanat' },
  { keywords: ['hali', 'kilim', 'tekstil'], key: 'hali_kilim' },
  { keywords: ['mucevher', 'saat', 'taki', 'aksesuar'], key: 'mucevher_saat' },
  { keywords: ['mobilya', 'dekor', 'ev'], key: 'mobilya_dekor' },
  { keywords: ['giyim', 'kiyafet', 'moda', 'canta', 'ayakkabi'], key: 'kiyafet_aksesuar' },
  { keywords: ['spor', 'outdoor', 'kamp', 'bisiklet'], key: 'spor_outdoor' },
  { keywords: ['yoresel', 'gida', 'bal', 'zeytinyagi', 'kurutulmus', 'bakir', 'seramik'], key: 'yoresel_urunler' },
];

function normalizeCategoryValue(value?: string) {
  return (value ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9çğıöşü\s_-]/gi, '')
    .replace(/[- ]/g, '_');
}

function resolveCategoryVisual(slug?: string, name?: string) {
  const normalizedSlug = normalizeCategoryValue(slug);
  const normalizedName = normalizeCategoryValue(name);
  const directMatch = CATEGORY_VISUALS[normalizedSlug];

  if (directMatch) {
    return directMatch;
  }

  const matchedKeyword = CATEGORY_KEYWORDS.find(({ keywords }) =>
    keywords.some((keyword) =>
      normalizedSlug.includes(keyword) || normalizedName.includes(keyword)),
  );

  if (matchedKeyword) {
    return CATEGORY_VISUALS[matchedKeyword.key];
  }

  return CATEGORY_VISUALS.default;
}

export function getCategoryIcon(slug?: string, name?: string) {
  const { icon, color } = resolveCategoryVisual(slug, name);
  return { icon, color };
}

export function getCategoryMockImage(slug?: string, name?: string) {
  return resolveCategoryVisual(slug, name).imageUrl;
}
