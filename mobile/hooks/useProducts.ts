import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ENV from '../lib/config';
import { mockService } from '../lib/mockService';
import type { Product, Category } from '@/types';

interface ApiResponseEnvelope {
  code: string;
  message: string;
}

interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
}

type ProductListResponse = ApiResponseEnvelope & PaginatedProducts;
type ProductResponse = ApiResponseEnvelope & Product;
type CategoryListResponse = ApiResponseEnvelope & { categories: Category[] };
type BlogListResponse = ApiResponseEnvelope & { items: ProductBlog[] };

type ProductBlog = {
  id: string | number;
  title: string;
  titleEn?: string;
  excerpt: string;
  excerptEn?: string;
  readTime: string;
  readTimeEn?: string;
  image?: string;
  slug?: string;
  body?: string;
  bodyEn?: string;
  publishedAt?: string;
};

function unwrapProductList(data: ProductListResponse): PaginatedProducts {
  return {
    items: data.items,
    total: data.total,
    page: data.page,
    totalPages: data.totalPages,
  };
}

function unwrapProducts(data: ProductListResponse | Product[]): Product[] {
  return Array.isArray(data) ? data : data.items;
}

function unwrapProduct(data: ProductResponse): Product {
  const { code: _code, message: _message, ...product } = data;
  return product;
}

function unwrapCategories(data: Category[] | CategoryListResponse): Category[] {
  return Array.isArray(data) ? data : data.categories;
}

function unwrapBlogs(data: ProductBlog[] | BlogListResponse): ProductBlog[] {
  return Array.isArray(data) ? data : data.items;
}

/**
 * MİMARİ KARAR: Neden TanStack Query (React Query) Kullanıyoruz?
 * - useEffect + useState ikilisi manuel "loading", "error" ve "caching" takibi gerektirir.
 * - TanStack Query ise API verisini bir nevi "Server State" olarak Redux dışında, kendi önbelleğinde tutar.
 * - Uygulama içinde defalarca useProducts çağrılsa bile, QueryKey ['products', page] aynı olduğu sürece 
 *   mükerrer API isteği atılmaz, 1 kere çekilen data memory'den döndürülür.
 * 
 * useProducts: Ansayfadaki "Tüm Ürünler" listesi veya vitrin ürünleri içindir.
 */
export function useProducts(page = 1) {
  return useQuery<PaginatedProducts>({
    queryKey: ['products', page],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getProducts(page);
      const { data } = await api.get<ProductListResponse>(`/products?page=${page}&limit=20`);
      return unwrapProductList(data);
    },
  });
}

export function useDiscountedProducts() {
  return useQuery<Product[]>({
    queryKey: ['products', 'discounted'],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getDiscountedProducts();
      const { data } = await api.get<ProductListResponse | Product[]>(`/products?discounted=true&limit=10`);
      return unwrapProducts(data);
    },
  });
}

export function useMostLikedProducts() {
  return useQuery<Product[]>({
    queryKey: ['products', 'most-liked'],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getMostLikedProducts();
      const { data } = await api.get<ProductListResponse | Product[]>(`/products?sort=likes&limit=10`);
      return unwrapProducts(data);
    },
  });
}

export function useProductsByBrand(brand: string, page = 1) {
  return useQuery<PaginatedProducts>({
    queryKey: ['products', 'brand', brand, page],
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        const mockData = await mockService.getProducts(page);
        const normalizedBrand = brand.trim().toLowerCase();
        return {
          ...mockData,
          items: mockData.items.filter((item) => {
            const itemRecord = item as Record<string, unknown>;
            const itemBrand = typeof itemRecord.brand === 'string'
              ? itemRecord.brand.trim().toLowerCase()
              : '';
            return itemBrand === normalizedBrand;
          }),
        };
      }

      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        brand,
      });
      const { data } = await api.get<ProductListResponse>(`/products?${params.toString()}`);
      return unwrapProductList(data);
    },
    enabled: brand.trim().length > 0,
  });
}

export function useBlogs() {
  return useQuery<ProductBlog[]>({
    queryKey: ['blogs'],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getBlogs();
      const { data } = await api.get<ProductBlog[] | BlogListResponse>('/blogs');
      return unwrapBlogs(data);
    },
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getProduct(id);
      const { data } = await api.get<ProductResponse>(`/products/${id}`);
      return unwrapProduct(data);
    },
    enabled: !!id,
  });
}

/**
 * Kategoriler nadir değişen verilerdir. 
 * Bu yüzden `staleTime: 30 * 60 * 1000` (Yarım saat) vererek API'ye olan yükü %90 oranında azalttık.
 * Kullanıcı her sekmeye tıkladığında tekrardan kategori aramak yerine 30 dk boyunca cache kullanır.
 */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getCategories();
      const { data } = await api.get<Category[] | CategoryListResponse>(
        '/categories',
      );
      return unwrapCategories(data);
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useMyProducts(page = 1, enabled = true) {
  return useQuery<PaginatedProducts>({
    queryKey: ['products', 'my', page],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getMyProducts(page);
      const { data } = await api.get<ProductListResponse>(`/products/my?page=${page}&limit=20`);
      return unwrapProductList(data);
    },
    enabled,
  });
}

export type { Product, PaginatedProducts, Category };
