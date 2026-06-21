import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import api from '../lib/api';
import ENV from '../lib/config';
import { getNegotiationSocket } from '../services/negotiationSocket';
import { useNegotiationStore } from '../store/negotiationStore';
import {
  NegotiationMessageType,
  NegotiationOfferStatus,
  NegotiationStatus,
  type CreateNegotiationOfferInput,
  type Negotiation,
  type NegotiationMessage,
  type NegotiationOffer,
  type SendNegotiationMessageInput,
  type StartNegotiationInput,
} from '../types';

export const NEGOTIATION_QUERY_KEYS = {
  all: ['negotiations'] as const,
  detail: (id: string) => ['negotiations', id] as const,
  messages: (id: string) => ['negotiations', id, 'messages'] as const,
};

interface ApiResponseEnvelope {
  code: string;
  message: string;
}

interface NegotiationListResponse extends ApiResponseEnvelope {
  negotiations: Negotiation[];
}

interface NegotiationDetailResponse extends ApiResponseEnvelope {
  negotiation: Negotiation;
}

interface NegotiationMessagesResponse extends ApiResponseEnvelope {
  messages: NegotiationMessage[];
}

interface NegotiationOfferResponse extends ApiResponseEnvelope {
  offer: NegotiationOffer;
  negotiation?: Negotiation;
}

const CONTACT_PATTERNS = [
  /\b(?:\+?90|0)?\s?5\d{2}\s?\d{3}\s?\d{2}\s?\d{2}\b/i,
  /\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/i,
  /\b(?:whatsapp|telegram|iban|havale|eft|papara|elden|nakit)\b/i,
];

const MOCK_NEGOTIATIONS: Negotiation[] = [
  {
    id: 'neg-mock-1',
    product: {
      id: 'prod-4',
      title: 'El Dokuma Kilim 120x180cm',
      imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
      sellerId: 'seller-4',
      sellerName: 'Anadolu El Sanatları',
    },
    buyer: { id: 'user-mock', name: 'Demo Kullanıcı' },
    seller: { id: 'seller-4', name: 'Anadolu El Sanatları' },
    status: NegotiationStatus.OFFER_PENDING,
    policy: {
      hasViolation: false,
      violationCount: 0,
      lastViolationAt: null,
      lockedByPolicy: false,
    },
    unreadCount: 1,
    latestOffer: {
      id: 'offer-mock-1',
      negotiationId: 'neg-mock-1',
      amount: 2950,
      quantity: 1,
      currency: 'TRY',
      status: NegotiationOfferStatus.PENDING,
      createdById: 'seller-4',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
    latestMessage: {
      id: 'message-mock-2',
      negotiationId: 'neg-mock-1',
      senderId: 'seller-4',
      senderName: 'Anadolu El Sanatları',
      type: NegotiationMessageType.OFFER,
      body: 'Satıcı teklif gönderdi.',
      offerId: 'offer-mock-1',
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
];

const MOCK_MESSAGES: Record<string, NegotiationMessage[]> = {
  'neg-mock-1': [
    {
      id: 'message-mock-1',
      negotiationId: 'neg-mock-1',
      senderId: 'user-mock',
      senderName: 'Demo Kullanıcı',
      type: NegotiationMessageType.TEXT,
      body: 'Merhaba, bu ürün için teklif almak istiyorum.',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'message-mock-2',
      negotiationId: 'neg-mock-1',
      senderId: 'seller-4',
      senderName: 'Anadolu El Sanatları',
      type: NegotiationMessageType.OFFER,
      body: 'Satıcı teklif gönderdi.',
      offerId: 'offer-mock-1',
      offer: MOCK_NEGOTIATIONS[0].latestOffer,
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
  ],
};

function unwrapNegotiations(data: NegotiationListResponse | Negotiation[]): Negotiation[] {
  return Array.isArray(data) ? data : data.negotiations;
}

function unwrapNegotiation(data: NegotiationDetailResponse | Negotiation): Negotiation {
  return 'negotiation' in data ? data.negotiation : data;
}

function unwrapMessages(data: NegotiationMessagesResponse | NegotiationMessage[]): NegotiationMessage[] {
  return Array.isArray(data) ? data : data.messages;
}

export function detectNegotiationPolicyViolation(text: string): boolean {
  return CONTACT_PATTERNS.some((pattern) => pattern.test(text));
}

export function useNegotiations() {
  const setConversations = useNegotiationStore((state) => state.setConversations);

  const query = useQuery<Negotiation[]>({
    queryKey: NEGOTIATION_QUERY_KEYS.all,
    queryFn: async () => {
      if (ENV.USE_MOCK) return MOCK_NEGOTIATIONS;
      const { data } = await api.get<NegotiationListResponse | Negotiation[]>('/negotiations');
      return unwrapNegotiations(data);
    },
    select: (data) => [...data].sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    ),
  });

  useEffect(() => {
    if (query.data) setConversations(query.data);
  }, [query.data, setConversations]);

  return query;
}

export function useNegotiation(id?: string) {
  const upsertConversation = useNegotiationStore((state) => state.upsertConversation);

  const query = useQuery<Negotiation>({
    queryKey: NEGOTIATION_QUERY_KEYS.detail(id ?? 'unknown'),
    queryFn: async () => {
      if (!id) throw new Error('Negotiation id is required');
      if (ENV.USE_MOCK) {
        const negotiation = MOCK_NEGOTIATIONS.find((item) => item.id === id);
        if (!negotiation) throw new Error('Negotiation not found');
        return negotiation;
      }
      const { data } = await api.get<NegotiationDetailResponse | Negotiation>(`/negotiations/${id}`);
      return unwrapNegotiation(data);
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (query.data) upsertConversation(query.data);
  }, [query.data, upsertConversation]);

  return query;
}

export function useNegotiationMessages(id?: string) {
  const setMessages = useNegotiationStore((state) => state.setMessages);

  const query = useQuery<NegotiationMessage[]>({
    queryKey: NEGOTIATION_QUERY_KEYS.messages(id ?? 'unknown'),
    queryFn: async () => {
      if (!id) return [];
      if (ENV.USE_MOCK) return MOCK_MESSAGES[id] ?? [];
      const { data } = await api.get<NegotiationMessagesResponse | NegotiationMessage[]>(
        `/negotiations/${id}/messages`,
      );
      return unwrapMessages(data);
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (id && query.data) setMessages(id, query.data);
  }, [id, query.data, setMessages]);

  return query;
}

export function useStartNegotiation() {
  const queryClient = useQueryClient();

  return useMutation<Negotiation, Error, StartNegotiationInput>({
    mutationFn: async (input) => {
      if (ENV.USE_MOCK) {
        const negotiationId = `neg-${Date.now()}`;
        return {
          id: negotiationId,
          product: { id: input.productId, title: input.productId },
          buyer: { id: 'user-mock', name: 'Demo Kullanıcı' },
          seller: { id: 'seller-mock', name: 'Satıcı' },
          status: NegotiationStatus.OPEN,
          unreadCount: 0,
          latestOffer: input.amount
            ? {
                id: `offer-${Date.now()}`,
                negotiationId,
                amount: input.amount,
                quantity: input.quantity,
                currency: 'TRY',
                status: NegotiationOfferStatus.PENDING,
                createdById: 'user-mock',
                createdAt: new Date().toISOString(),
              }
            : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      const { data } = await api.post<NegotiationDetailResponse | Negotiation>(
        '/negotiations',
        input,
      );
      return unwrapNegotiation(data);
    },
    onSuccess: (negotiation) => {
      queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.all });
      queryClient.setQueryData(NEGOTIATION_QUERY_KEYS.detail(negotiation.id), negotiation);
    },
  });
}

export function useSendNegotiationMessage() {
  const queryClient = useQueryClient();

  return useMutation<NegotiationMessage, Error, SendNegotiationMessageInput>({
    mutationFn: async (input) => {
      if (detectNegotiationPolicyViolation(input.body)) {
        throw new Error('NEGOTIATION_POLICY_VIOLATION');
      }
      if (ENV.USE_MOCK) {
        return {
          id: `message-${Date.now()}`,
          negotiationId: input.negotiationId,
          senderId: 'user-mock',
          senderName: 'Demo Kullanıcı',
          type: NegotiationMessageType.TEXT,
          body: input.body,
          createdAt: new Date().toISOString(),
        };
      }
      const { data } = await api.post<NegotiationMessage>(
        `/negotiations/${input.negotiationId}/messages`,
        { body: input.body },
      );
      return data;
    },
    onSuccess: (_message, input) => {
      queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.messages(input.negotiationId) });
      queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.detail(input.negotiationId) });
      queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.all });
    },
  });
}

export function useCreateNegotiationOffer() {
  const queryClient = useQueryClient();

  return useMutation<NegotiationOffer, Error, CreateNegotiationOfferInput>({
    mutationFn: async (input) => {
      if (input.note && detectNegotiationPolicyViolation(input.note)) {
        throw new Error('NEGOTIATION_POLICY_VIOLATION');
      }
      if (ENV.USE_MOCK) {
        return {
          id: `offer-${Date.now()}`,
          negotiationId: input.negotiationId,
          amount: input.amount,
          quantity: input.quantity,
          currency: 'TRY',
          status: NegotiationOfferStatus.PENDING,
          createdById: 'user-mock',
          expiresAt: new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        };
      }
      const { data } = await api.post<NegotiationOfferResponse>(
        `/negotiations/${input.negotiationId}/offers`,
        {
          amount: input.amount,
          quantity: input.quantity,
          expiresInHours: input.expiresInHours,
          note: input.note,
        },
      );
      return data.offer;
    },
    onSuccess: (_offer, input) => {
      queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.messages(input.negotiationId) });
      queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.detail(input.negotiationId) });
      queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.all });
    },
  });
}

export function useRespondToNegotiationOffer(action: 'accept' | 'reject') {
  const queryClient = useQueryClient();

  return useMutation<NegotiationOfferResponse, Error, { negotiationId: string; offerId: string }>({
    mutationFn: async ({ negotiationId, offerId }) => {
      if (ENV.USE_MOCK) {
        return {
          code: action === 'accept' ? 'NEGOTIATION_OFFER_ACCEPTED' : 'NEGOTIATION_OFFER_REJECTED',
          message: action,
          offer: {
            id: offerId,
            negotiationId,
            amount: 0,
            quantity: 1,
            currency: 'TRY',
            status: action === 'accept'
              ? NegotiationOfferStatus.ACCEPTED
              : NegotiationOfferStatus.REJECTED,
            createdById: 'user-mock',
            createdAt: new Date().toISOString(),
          },
        };
      }
      const { data } = await api.post<NegotiationOfferResponse>(
        `/negotiations/offers/${offerId}/${action}`,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.detail(variables.negotiationId) });
      queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.messages(variables.negotiationId) });
      queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.all });
    },
  });
}

export function useCloseNegotiation() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponseEnvelope, Error, string>({
    mutationFn: async (negotiationId) => {
      if (ENV.USE_MOCK) {
        return { code: 'NEGOTIATION_CLOSED', message: 'Negotiation closed' };
      }
      const { data } = await api.post<ApiResponseEnvelope>(
        `/negotiations/${negotiationId}/close`,
        {},
      );
      return data;
    },
    onSuccess: (_data, negotiationId) => {
      queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.detail(negotiationId) });
      queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.all });
    },
  });
}

export function useNegotiationRealtime(negotiationId?: string) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const addMessage = useNegotiationStore((state) => state.addMessage);
  const upsertConversation = useNegotiationStore((state) => state.upsertConversation);
  const upsertOffer = useNegotiationStore((state) => state.upsertOffer);

  useEffect(() => {
    if (!negotiationId || ENV.USE_MOCK) return;

    let cancelled = false;

    const connect = async () => {
      const socket = await getNegotiationSocket();
      if (cancelled) return;

      socketRef.current = socket;
      socket.emit('negotiation:join', { negotiationId });

      const handleMessage = (message: NegotiationMessage) => {
        if (message.negotiationId !== negotiationId) return;
        addMessage(message);
        queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.messages(negotiationId) });
      };

      const handleOffer = (offer: NegotiationOffer) => {
        if (offer.negotiationId !== negotiationId) return;
        upsertOffer(negotiationId, offer);
        queryClient.invalidateQueries({ queryKey: NEGOTIATION_QUERY_KEYS.detail(negotiationId) });
      };

      const handleNegotiation = (negotiation: Negotiation) => {
        if (negotiation.id !== negotiationId) return;
        upsertConversation(negotiation);
        queryClient.setQueryData(NEGOTIATION_QUERY_KEYS.detail(negotiationId), negotiation);
      };

      socket.on('message:new', handleMessage);
      socket.on('offer:updated', handleOffer);
      socket.on('negotiation:updated', handleNegotiation);
    };

    connect();

    return () => {
      cancelled = true;
      const socket = socketRef.current;
      if (!socket) return;

      socket.emit('negotiation:leave', { negotiationId });
      socket.off('message:new');
      socket.off('offer:updated');
      socket.off('negotiation:updated');
    };
  }, [addMessage, negotiationId, queryClient, upsertConversation, upsertOffer]);
}

export function useNegotiationStoreMessages(negotiationId?: string) {
  const messages = useNegotiationStore((state) => (
    negotiationId ? state.messages[negotiationId] : undefined
  ));

  return useMemo(() => messages ?? [], [messages]);
}

export function useNegotiationActions() {
  const acceptOffer = useRespondToNegotiationOffer('accept');
  const rejectOffer = useRespondToNegotiationOffer('reject');
  const closeNegotiation = useCloseNegotiation();
  const sendMessage = useSendNegotiationMessage();
  const createOffer = useCreateNegotiationOffer();

  const isPending = acceptOffer.isPending
    || rejectOffer.isPending
    || closeNegotiation.isPending
    || sendMessage.isPending
    || createOffer.isPending;

  return useMemo(() => ({
    acceptOffer,
    rejectOffer,
    closeNegotiation,
    sendMessage,
    createOffer,
    isPending,
  }), [acceptOffer, closeNegotiation, createOffer, isPending, rejectOffer, sendMessage]);
}

export function useCanRespondToOffer(currentUserId?: string) {
  return useCallback((offer?: NegotiationOffer | null) => {
    return Boolean(
      currentUserId
      && offer
      && offer.status === NegotiationOfferStatus.PENDING
      && offer.createdById !== currentUserId,
    );
  }, [currentUserId]);
}
