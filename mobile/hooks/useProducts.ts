import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

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
}

export function useProducts(page = 1) {
  return useQuery<PaginatedProducts>({
    queryKey: ['products', page],
    queryFn: async () => {
      const { data } = await api.get(`/products?page=${page}&limit=20`);
      return data;
    },
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
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
      const { data } = await api.get('/categories');
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export type { Product, PaginatedProducts, Category };
