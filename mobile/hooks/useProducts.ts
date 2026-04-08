import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ENV from '../lib/config';
import { mockService } from '../lib/mockService';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  status: string;
  sellerId: string;
  sellerName: string;
  categoryId: string;
  categoryName: string;
  createdAt: string;
}

interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
}

export function useProducts(page = 1) {
  return useQuery<PaginatedProducts>({
    queryKey: ['products', page],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getProducts(page);
      const { data } = await api.get(`/products?page=${page}&limit=20`);
      return data;
    },
  });
}

export function useDiscountedProducts() {
  return useQuery<Product[]>({
    queryKey: ['products', 'discounted'],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getDiscountedProducts();
      const { data } = await api.get(`/products?discounted=true&limit=10`);
      return data.items || data;
    },
  });
}

export function useMostLikedProducts() {
  return useQuery<Product[]>({
    queryKey: ['products', 'most-liked'],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getMostLikedProducts();
      const { data } = await api.get(`/products?sort=likes&limit=10`);
      return data.items || data;
    },
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getProduct(id);
      const { data } = await api.get(`/products/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getCategories();
      const { data } = await api.get('/categories');
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export type { Product, PaginatedProducts, Category };
