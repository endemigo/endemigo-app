import { create } from 'zustand';
import type { Negotiation, NegotiationMessage, NegotiationOffer } from '../types';

interface NegotiationState {
  conversations: Record<string, Negotiation>;
  messages: Record<string, NegotiationMessage[]>;
  upsertConversation: (conversation: Negotiation) => void;
  setConversations: (conversations: Negotiation[]) => void;
  setMessages: (negotiationId: string, messages: NegotiationMessage[]) => void;
  addMessage: (message: NegotiationMessage) => void;
  upsertOffer: (negotiationId: string, offer: NegotiationOffer) => void;
  clearNegotiation: (negotiationId: string) => void;
}

function mergeMessageList(
  existingMessages: NegotiationMessage[],
  incomingMessage: NegotiationMessage,
): NegotiationMessage[] {
  const withoutDuplicate = existingMessages.filter((message) => message.id !== incomingMessage.id);
  return [...withoutDuplicate, incomingMessage].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export const useNegotiationStore = create<NegotiationState>((set) => ({
  conversations: {},
  messages: {},
  upsertConversation: (conversation) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversation.id]: conversation,
      },
    })),
  setConversations: (conversations) =>
    set(() => ({
      conversations: conversations.reduce<Record<string, Negotiation>>((acc, conversation) => {
        acc[conversation.id] = conversation;
        return acc;
      }, {}),
    })),
  setMessages: (negotiationId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [negotiationId]: messages,
      },
    })),
  addMessage: (message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [message.negotiationId]: mergeMessageList(
          state.messages[message.negotiationId] ?? [],
          message,
        ),
      },
    })),
  upsertOffer: (negotiationId, offer) =>
    set((state) => {
      const existing = state.conversations[negotiationId];
      if (!existing) return state;

      return {
        conversations: {
          ...state.conversations,
          [negotiationId]: {
            ...existing,
            latestOffer: offer,
            updatedAt: offer.updatedAt ?? offer.createdAt,
          },
        },
      };
    }),
  clearNegotiation: (negotiationId) =>
    set((state) => {
      const { [negotiationId]: _conversation, ...remainingConversations } = state.conversations;
      const { [negotiationId]: _messages, ...remainingMessages } = state.messages;
      return {
        conversations: remainingConversations,
        messages: remainingMessages,
      };
    }),
}));
