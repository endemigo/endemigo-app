import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import { getAuctionSocket } from '../services/socket';
import { AuctionStatus } from '@endemigo/shared';
import ENV from '../lib/config';

export function useAuctionsSocket(auctions: any[] | undefined) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const joinedRoomIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (ENV.USE_MOCK || !auctions?.length) return;

    let cancelled = false;

    const connect = async () => {
      const socket = await getAuctionSocket();
      if (cancelled) return;
      socketRef.current = socket;

      // Filter only active, published, or draft auctions to subscribe to
      const targetAuctions = auctions.filter(
        (a) =>
          a.status === AuctionStatus.ACTIVE ||
          a.status === AuctionStatus.PUBLISHED ||
          a.status === AuctionStatus.DRAFT,
      );

      const targetIds = new Set(targetAuctions.map((a) => a.id));

      // Leave rooms that are no longer in the list
      joinedRoomIdsRef.current.forEach((id) => {
        if (!targetIds.has(id)) {
          socket.emit('auction:leave', { auctionId: id });
          joinedRoomIdsRef.current.delete(id);
        }
      });

      // Join new rooms
      targetAuctions.forEach((a) => {
        if (!joinedRoomIdsRef.current.has(a.id)) {
          socket.emit('auction:join', { auctionId: a.id });
          joinedRoomIdsRef.current.add(a.id);
        }
      });

      const updateQueryCache = (auctionId: string, updates: any) => {
        queryClient.setQueriesData({ queryKey: ['auctions'] }, (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((item: any) => {
              if (item.id === auctionId) {
                return { ...item, ...updates };
              }
              return item;
            }),
          };
        });
      };

      // Set up event listeners
      socket.on(
        'bid:new',
        (data: {
          auctionId: string;
          currentPrice: number;
          bidCount: number;
          endTime: string;
        }) => {
          updateQueryCache(data.auctionId, {
            currentPrice: data.currentPrice,
            bidCount: data.bidCount,
            endTime: data.endTime,
          });
        },
      );

      socket.on(
        'auction:started',
        (data: { auctionId: string; startPrice: number }) => {
          updateQueryCache(data.auctionId, {
            status: AuctionStatus.ACTIVE,
            currentPrice: data.startPrice,
          });
        },
      );

      socket.on(
        'auction:extended',
        (data: { auctionId: string; newEndTime: string }) => {
          updateQueryCache(data.auctionId, {
            endTime: data.newEndTime,
          });
        },
      );

      socket.on(
        'auction:ended',
        (data: { auctionId: string; finalPrice: number; bidCount?: number }) => {
          updateQueryCache(data.auctionId, {
            status: AuctionStatus.ENDED,
            currentPrice: data.finalPrice,
            bidCount: data.bidCount ?? undefined,
          });
        },
      );

      socket.on('auction:cancelled', (data: { auctionId: string }) => {
        updateQueryCache(data.auctionId, {
          status: AuctionStatus.CANCELLED,
        });
      });
    };

    connect();

    return () => {
      cancelled = true;
      const socket = socketRef.current;
      if (socket) {
        // Clean up listeners
        socket.off('bid:new');
        socket.off('auction:started');
        socket.off('auction:extended');
        socket.off('auction:ended');
        socket.off('auction:cancelled');

        // Leave all rooms
        joinedRoomIdsRef.current.forEach((id) => {
          socket.emit('auction:leave', { auctionId: id });
        });
        joinedRoomIdsRef.current.clear();
      }
    };
  }, [auctions, queryClient]);
}
