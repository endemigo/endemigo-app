import { useEffect, useState, useCallback, useRef } from 'react';
import { Vibration } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Socket } from 'socket.io-client';
import { getAuctionSocket } from '../services/socket';
import ENV from '../lib/config';
import { useModalStore } from '../store/modalStore';
import { formatCurrency } from '../utils/transactionFormatters';

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
    at: string;
  }[];
  wasOutbid: boolean;
  auctionStarted: boolean;
  auctionEnded: boolean;
  isWinner: boolean;
  finalPrice: number | null;
}

export function useAuctionSocket(auctionId: string, currency?: string | null) {
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
    auctionStarted: false,
    auctionEnded: false,
    isWinner: false,
    finalPrice: null,
  });

  const socketRef = useRef<Socket | null>(null);
  // Ref, effect'i yeniden bağlamadan (socket leave/join tetiklemeden)
  // handler'ların güncel para birimini görmesini sağlar.
  const currencyRef = useRef(currency ?? 'TRY');
  useEffect(() => {
    currencyRef.current = currency ?? 'TRY';
  }, [currency]);

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
        at?: string,
      ) => {
        // Sunucu saati varsa onu kullan — "ne zaman oldu" akışta görünsün.
        const itemAt = at ?? new Date().toISOString();
        setState((currentState) => {
          // Gateway aynı olayı hem lot hem salon odasına basar; socket iki
          // odadaysa çift teslim olur. Kopyalar aynı serverTime'ı taşır —
          // aynı (başlık, gövde, an) zaten akıştaysa yut.
          const isDuplicate = currentState.activityFeed.some(
            (f) => f.at === itemAt && f.title === title && f.body === body,
          );
          if (isDuplicate) return currentState;
          return {
            ...currentState,
            activityFeed: [
              {
                id: `${Date.now()}-${Math.random()}`,
                title,
                body,
                tone,
                at: itemAt,
              },
              ...currentState.activityFeed,
            ].slice(0, 20),
          };
        });
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
              amount: formatCurrency(data.amount, currencyRef.current),
            }),
            'accent',
            data.serverTime,
          );
        }
      };

      const onBidWithdrawn = (data: { auctionId: string; currentPrice: number; bidCount: number; endTime: string; serverTime?: string }) => {
        if (data.auctionId === auctionId) {
          setState((s) => ({
            ...s,
            currentPrice: data.currentPrice,
            bidCount: data.bidCount,
            endTime: data.endTime,
            serverTime: data.serverTime ?? s.serverTime,
            // The leading bid was withdrawn — the previous "last bid" no
            // longer reflects the auction state.
            lastBid: null,
          }));
        }
      };

      const onAuctionStarted = (data: { auctionId: string; startPrice: number; currentPrice?: number; bidCount?: number; serverTime?: string }) => {
        if (data.auctionId === auctionId) {
          setState((s) => ({
            ...s,
            auctionStarted: true,
            currentPrice: data.currentPrice ?? data.startPrice,
            bidCount: data.bidCount ?? s.bidCount,
            serverTime: data.serverTime ?? s.serverTime,
          }));
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
              amount: formatCurrency(data.newAmount, currencyRef.current),
            }),
            type: 'info',
          });
          appendActivity(
            t('auction.outbidTitle'),
            t('auction.outbidMessage', {
              amount: formatCurrency(data.newAmount, currencyRef.current),
            }),
            'error',
            data.serverTime,
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
            data.serverTime,
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
            data.serverTime,
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
      socket.on('bid:withdrawn', onBidWithdrawn);
      socket.on('auction:started', onAuctionStarted);
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
        socket.off('bid:withdrawn', onBidWithdrawn);
        socket.off('auction:started', onAuctionStarted);
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
