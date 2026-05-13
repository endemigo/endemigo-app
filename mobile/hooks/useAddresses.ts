import { AddressType } from '@endemigo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import ENV from '../lib/config';
import {
  ADDRESS_QUERY_KEYS,
  type AddressItem,
  type AddressPayload,
  type ApiResponseEnvelope,
} from '../types/transactionFlows';

interface AddressListResponse extends ApiResponseEnvelope {
  addresses: AddressItem[];
}

interface AddressResponse extends ApiResponseEnvelope {
  address: AddressItem;
}

export function useAddresses(type?: AddressType) {
  return useQuery<AddressItem[]>({
    queryKey: ADDRESS_QUERY_KEYS.list(type),
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        return [];
      }
      const { data } = await api.get<AddressListResponse>('/users/addresses', {
        params: {
          type,
        },
      });
      return data.addresses;
    },
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation<AddressItem, Error, AddressPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<AddressResponse>('/users/addresses', payload);
      return data.address;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.list() });
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.list(variables.type) });
      queryClient.invalidateQueries({ queryKey: ['seller-dashboard'] });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation<AddressItem, Error, { addressId: string; payload: Partial<AddressPayload> & { type?: AddressType } }>({
    mutationFn: async ({ addressId, payload }) => {
      const { data } = await api.patch<AddressResponse>(`/users/addresses/${addressId}`, payload);
      return data.address;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.list() });
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.list(data.type) });
      queryClient.invalidateQueries({ queryKey: ['seller-dashboard'] });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { addressId: string; type?: AddressType }>({
    mutationFn: async ({ addressId }) => {
      await api.delete(`/users/addresses/${addressId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.list() });
      if (variables.type) {
        queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.list(variables.type) });
      }
      queryClient.invalidateQueries({ queryKey: ['seller-dashboard'] });
    },
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { addressId: string; type?: AddressType }>({
    mutationFn: async ({ addressId }) => {
      await api.patch(`/users/addresses/${addressId}/default`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.list() });
      if (variables.type) {
        queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.list(variables.type) });
      }
      queryClient.invalidateQueries({ queryKey: ['seller-dashboard'] });
    },
  });
}
