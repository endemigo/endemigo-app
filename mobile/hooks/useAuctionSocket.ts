import { useEffect, useState, useCallback, useRef } from 'react';
import { Vibration } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Socket } from 'socket.io-client';
import { getAuctionSocket } from '../services/socket';
import ENV from '../lib/config';
import { useModalStore } from '../store/modalStore';
import { formatAmount } from '../utils/transactionFormatters';

interface AuctionSocketState {
  currentPrice: number;
  bidCount: number;
  endTime: string;
  serverTime: string;
  viewerCount: number;
  isConnected: boolean;
  lastBid: { amount: number; bidderName: string } | null;
  activityFeed: {
    id: string;
    title: string;
    body: string;
    tone: 'accent' | 'error' | 'primary';
  }[];
  wasOutbid: boolean;
  auctionEnded: boolean;
  isWinner: boolean;
  finalPrice: number | null;
}

export function useAuctionSocket(auctionId: string) {
  const { t } = useTranslation();
  const showModal = useModalStore((modalState) => modalState.showModal);
  const [state, setState] = useState<AuctionSocketState>({
    currentPrice: 0,
    bidCount: 0,
    endTime: '',
    serverTime: '',
    viewerCount: 0,
    isConnected: false,
    lastBid: null,
    activityFeed: [],
    wasOutbid: false,
    auctionEnded: false,
    isWinner: false,
    finalPrice: null,
  });

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Mock mode — no socket
    if (ENV.USE_MOCK) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const connect = async () => {
      const socket = await getAuctionSocket();
      if (cancelled) return;
      socketRef.current = socket;

      const appendActivity = (
        title: string,
        body: string,
        tone: 'accent' | 'error' | 'primary' = 'primary',
      ) => {
        setState((currentState) => ({
          ...currentState,
          activityFeed: [
            {
              id: `${Date.now()}-${Math.random()}`,
              title,
              body,
              tone,
            },
            ...currentState.activityFeed,
          ].slice(0, 4),
        }));
      };

      const onConnect = () => {
        setState((s) => ({ ...s, isConnected: true }));
        socket.emit('auction:join', { auctionId });
      };
      const onDisconnect = () =>
        setState((s) => ({ ...s, isConnected: false }));

      const onAuctionJoined = (data: { auctionId: string; viewerCount: number; serverTime?: string }) => {
        if (data.auctionId === auctionId) {
          setState((s) => ({
            ...s,
            viewerCount: data.viewerCount,
            serverTime: data.serverTime ?? s.serverTime,
          }));
        }
      };

      const onBidNew = (data: { auctionId: string; currentPrice: number; bidCount: number; endTime: string; serverTime: string; amount: number; bidderName: string }) => {
        if (data.auctionId === auctionId) {
          setState((s) => ({
            ...s,
            currentPrice: data.currentPrice,
            bidCount: data.bidCount,
            endTime: data.endTime,
            serverTime: data.serverTime,
            lastBid: { amount: data.amount, bidderName: data.bidderName },
          }));
          appendActivity(
            t('auction.activityBidTitle'),
            t('auction.latestBidMessage', {
              bidder: data.bidderName,
              amount: formatAmount(data.amount),
            }),
            'accent',
          );
        }
      };

      const onBidOutbid = (data: { auctionId: string; newAmount: number; serverTime?: string }) => {
        if (data.auctionId === auctionId) {
          Vibration.vibrate(200);
          setState((s) => ({
            ...s,
            wasOutbid: true,
            serverTime: data.serverTime ?? s.serverTime,
          }));
          showModal({
            title: t('auction.outbidTitle'),
            message: t('auction.outbidMessage', {
              amount: formatAmount(data.newAmount),
            }),
            type: 'info',
          });
          appendActivity(
            t('auction.outbidTitle'),
            t('auction.outbidMessage', {
              amount: formatAmount(data.newAmount),
            }),
            'error',
          );
        }
      };

      const onBidWinner = (data: { auctionId: string; finalPrice: number; serverTime?: string }) => {
        if (data.auctionId === auctionId) {
          Vibration.vibrate([0, 200, 100, 200]);
          setState((s) => ({
            ...s,
            isWinner: true,
            auctionEnded: true,
            finalPrice: data.finalPrice,
            serverTime: data.serverTime ?? s.serverTime,
          }));
        }
      };

      const onBidLost = (data: { auctionId: string; finalPrice: number; serverTime?: string }) => {
        if (data.auctionId === auctionId) {
          setState((s) => ({
            ...s,
            isWinner: false,
            auctionEnded: true,
            finalPrice: data.finalPrice,
            serverTime: data.serverTime ?? s.serverTime,
          }));
        }
      };

      const onAuctionExtended = (data: { auctionId: string; newEndTime: string; extensionNumber: number; serverTime?: string }) => {
        if (data.auctionId === auctionId) {
          setState((s) => ({
            ...s,
            endTime: data.newEndTime,
            serverTime: data.serverTime ?? s.serverTime,
          }));
          showModal({
            title: t('auction.extendedTitle'),
            message: t('auction.extendedMessage', {
              count: data.extensionNumber,
            }),
            type: 'info',
          });
          appendActivity(
            t('auction.extendedTitle'),
            t('auction.extendedMessage', {
              count: data.extensionNumber,
            }),
            'primary',
          );
        }
      };

      const onAuctionEnded = (data: { auctionId: string; finalPrice: number; bidCount?: number; serverTime?: string }) => {
        if (data.auctionId === auctionId) {
          setState((s) => ({
            ...s,
            auctionEnded: true,
            finalPrice: data.finalPrice,
            bidCount: data.bidCount ?? s.bidCount,
            serverTime: data.serverTime ?? s.serverTime,
          }));
        }
      };

      const onViewerCount = (data: { auctionId: string; count: number; serverTime?: string }) => {
        if (data.auctionId === auctionId) {
          setState((s) => ({
            ...s,
            viewerCount: data.count,
            serverTime: data.serverTime ?? s.serverTime,
          }));
        }
      };

      const onAuctionWarning = (data: { auctionId: string; serverTime?: string }) => {
        if (data.auctionId === auctionId) {
          Vibration.vibrate(100);
          setState((s) => ({
            ...s,
            serverTime: data.serverTime ?? s.serverTime,
          }));
          appendActivity(
            t('auction.activityWarningTitle'),
            t('auction.activityWarningBody'),
            'primary',
          );
        }
      };

      const onAuctionCancelled = (data: { auctionId: string; reason: string; serverTime?: string }) => {
        if (data.auctionId === auctionId) {
          setState((s) => ({
            ...s,
            auctionEnded: true,
            serverTime: data.serverTime ?? s.serverTime,
          }));
          showModal({
            title: t('auction.cancelledTitle'),
            message: data.reason || t('auction.cancelledMessage'),
            type: 'error',
          });
        }
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('auction:joined', onAuctionJoined);
      socket.on('bid:new', onBidNew);
      socket.on('bid:outbid', onBidOutbid);
      socket.on('bid:winner', onBidWinner);
      socket.on('bid:lost', onBidLost);
      socket.on('auction:extended', onAuctionExtended);
      socket.on('auction:ended', onAuctionEnded);
      socket.on('auction:viewer_count', onViewerCount);
      socket.on('auction:warning', onAuctionWarning);
      socket.on('auction:cancelled', onAuctionCancelled);

      if (socket.connected) {
        onConnect();
      }

      // Remove only this hook's own handlers — the socket is shared across
      // screens, so a bare socket.off(event) would also kill the listeners
      // other mounted screens registered for the same event.
      cleanup = () => {
        socket.emit('auction:leave', { auctionId });
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('auction:joined', onAuctionJoined);
        socket.off('bid:new', onBidNew);
        socket.off('bid:outbid', onBidOutbid);
        socket.off('bid:winner', onBidWinner);
        socket.off('bid:lost', onBidLost);
        socket.off('auction:extended', onAuctionExtended);
        socket.off('auction:ended', onAuctionEnded);
        socket.off('auction:viewer_count', onViewerCount);
        socket.off('auction:warning', onAuctionWarning);
        socket.off('auction:cancelled', onAuctionCancelled);
      };
    };

    connect();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [auctionId, showModal, t]);

  const clearOutbid = useCallback(() => {
    setState((s) => ({ ...s, wasOutbid: false }));
  }, []);

  return { ...state, clearOutbid };
}
