import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import { getAuctionSocket } from '../services/socket';
import { AuctionStatus } from '@endemigo/shared';
import ENV from '../lib/config';

export function useAuctionsSocket(auctions: any[] | undefined) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const joinedRoomIdsRef = useRef<Set<string>>(new Set());

  // Stable key of the rooms worth joining. DRAFT auctions never emit live
  // events, so they are excluded. Depending on this key (instead of the
  // `auctions` array reference) stops the effect from tearing down and
  // re-subscribing on every refetch/pagination when the live set is unchanged.
  const targetKey = useMemo(() => {
    if (!auctions?.length) return '';
    return auctions
      .filter(
        (a) =>
          a.status === AuctionStatus.ACTIVE ||
          a.status === AuctionStatus.PUBLISHED,
      )
      .map((a) => a.id)
      .sort()
      .join(',');
  }, [auctions]);

  useEffect(() => {
    if (ENV.USE_MOCK || !targetKey) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const connect = async () => {
      const socket = await getAuctionSocket();
      if (cancelled) return;
      socketRef.current = socket;

      const targetIds = new Set(targetKey.split(','));

      // Leave rooms that are no longer in the list
      joinedRoomIdsRef.current.forEach((id) => {
        if (!targetIds.has(id)) {
          socket.emit('auction:leave', { auctionId: id });
          joinedRoomIdsRef.current.delete(id);
        }
      });

      // (Re-)join target rooms on every 'connect': server-side room
      // membership is lost across reconnects, so a one-off join would leave
      // the hook deaf after the first drop. Joining an already-joined room
      // is idempotent on the server.
      const onConnect = () => {
        targetIds.forEach((id) => {
          socket.emit('auction:join', { auctionId: id });
          joinedRoomIdsRef.current.add(id);
        });
      };

      const updateQueryCache = (auctionId: string, updates: any) => {
        queryClient.setQueriesData({ queryKey: ['auctions'] }, (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((item: any) =>
              item.id === auctionId ? { ...item, ...updates } : item,
            ),
          };
        });
      };

      const onBidNew = (data: {
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
      };

      const onBidWithdrawn = (data: {
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
      };

      const onAuctionStarted = (data: { auctionId: string; startPrice: number }) => {
        updateQueryCache(data.auctionId, {
          status: AuctionStatus.ACTIVE,
          currentPrice: data.startPrice,
        });
      };

      const onAuctionExtended = (data: { auctionId: string; newEndTime: string }) => {
        updateQueryCache(data.auctionId, {
          endTime: data.newEndTime,
        });
      };

      const onAuctionEnded = (data: { auctionId: string; finalPrice: number; bidCount?: number }) => {
        updateQueryCache(data.auctionId, {
          status: AuctionStatus.ENDED,
          currentPrice: data.finalPrice,
          bidCount: data.bidCount ?? undefined,
        });
      };

      const onAuctionCancelled = (data: { auctionId: string }) => {
        updateQueryCache(data.auctionId, {
          status: AuctionStatus.CANCELLED,
        });
      };

      socket.on('connect', onConnect);
      socket.on('bid:new', onBidNew);
      socket.on('bid:withdrawn', onBidWithdrawn);
      socket.on('auction:started', onAuctionStarted);
      socket.on('auction:extended', onAuctionExtended);
      socket.on('auction:ended', onAuctionEnded);
      socket.on('auction:cancelled', onAuctionCancelled);

      // The socket may already be connected (shared singleton) — in that
      // case 'connect' will not fire again, so join immediately.
      if (socket.connected) {
        onConnect();
      }

      // Detach only this hook's own handlers — the socket is shared across
      // screens, so a bare socket.off(event) would also remove the detail /
      // event screens' listeners for the same events.
      cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('bid:new', onBidNew);
        socket.off('bid:withdrawn', onBidWithdrawn);
        socket.off('auction:started', onAuctionStarted);
        socket.off('auction:extended', onAuctionExtended);
        socket.off('auction:ended', onAuctionEnded);
        socket.off('auction:cancelled', onAuctionCancelled);

        joinedRoomIdsRef.current.forEach((id) => {
          socket.emit('auction:leave', { auctionId: id });
        });
        joinedRoomIdsRef.current.clear();
      };
    };

    connect();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [targetKey, queryClient]);
}
