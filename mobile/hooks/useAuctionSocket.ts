import { useEffect, useState, useCallback } from 'react';
import { Alert, Vibration } from 'react-native';
import { getAuctionSocket } from '../services/socket';
import ENV from '../lib/config';

interface AuctionSocketState {
  currentPrice: number;
  bidCount: number;
  endTime: string;
  serverTime: string;
  viewerCount: number;
  isConnected: boolean;
  lastBid: { amount: number; bidderName: string } | null;
  wasOutbid: boolean;
  auctionEnded: boolean;
  isWinner: boolean;
  finalPrice: number | null;
}

export function useAuctionSocket(auctionId: string) {
  const [state, setState] = useState<AuctionSocketState>({
    currentPrice: 0,
    bidCount: 0,
    endTime: '',
    serverTime: '',
    viewerCount: 0,
    isConnected: false,
    lastBid: null,
    wasOutbid: false,
    auctionEnded: false,
    isWinner: false,
    finalPrice: null,
  });

  useEffect(() => {
    // Mock mode — no socket
    if (ENV.USE_MOCK) return;

    const socket = getAuctionSocket();

    socket.emit('auction:join', { auctionId });

    const onConnect = () =>
      setState((s) => ({ ...s, isConnected: true }));
    const onDisconnect = () =>
      setState((s) => ({ ...s, isConnected: false }));

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Set initial connection state
    if (socket.connected) {
      setState((s) => ({ ...s, isConnected: true }));
    }

    socket.on('bid:new', (data: any) => {
      if (data.auctionId === auctionId) {
        setState((s) => ({
          ...s,
          currentPrice: data.currentPrice,
          bidCount: data.bidCount,
          endTime: data.endTime,
          serverTime: data.serverTime,
          lastBid: { amount: data.amount, bidderName: data.bidderName },
        }));
      }
    });

    socket.on('bid:outbid', (data: any) => {
      if (data.auctionId === auctionId) {
        Vibration.vibrate(200);
        setState((s) => ({ ...s, wasOutbid: true }));
        Alert.alert(
          '⚠️ Teklifiniz Geçildi!',
          `Yeni teklif: ₺${data.newAmount?.toLocaleString('tr-TR')}`,
        );
      }
    });

    socket.on('bid:winner', (data: any) => {
      if (data.auctionId === auctionId) {
        Vibration.vibrate([0, 200, 100, 200]);
        setState((s) => ({
          ...s,
          isWinner: true,
          auctionEnded: true,
          finalPrice: data.finalPrice,
        }));
      }
    });

    socket.on('bid:lost', (data: any) => {
      if (data.auctionId === auctionId) {
        setState((s) => ({
          ...s,
          isWinner: false,
          auctionEnded: true,
          finalPrice: data.finalPrice,
        }));
      }
    });

    socket.on('auction:extended', (data: any) => {
      if (data.auctionId === auctionId) {
        setState((s) => ({ ...s, endTime: data.newEndTime }));
        Alert.alert('⏱ Süre Uzatıldı!', `Uzatma #${data.extensionNumber}`);
      }
    });

    socket.on('auction:ended', (data: any) => {
      if (data.auctionId === auctionId) {
        setState((s) => ({
          ...s,
          auctionEnded: true,
          finalPrice: data.finalPrice,
        }));
      }
    });

    socket.on('auction:viewer_count', (data: any) => {
      if (data.auctionId === auctionId) {
        setState((s) => ({ ...s, viewerCount: data.count }));
      }
    });

    socket.on('auction:warning', (data: any) => {
      if (data.auctionId === auctionId) {
        Vibration.vibrate(100);
      }
    });

    socket.on('auction:cancelled', (data: any) => {
      if (data.auctionId === auctionId) {
        setState((s) => ({ ...s, auctionEnded: true }));
        Alert.alert('Müzayede İptal', data.reason || 'Müzayede iptal edildi');
      }
    });

    return () => {
      socket.emit('auction:leave', { auctionId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('bid:new');
      socket.off('bid:outbid');
      socket.off('bid:winner');
      socket.off('bid:lost');
      socket.off('auction:extended');
      socket.off('auction:ended');
      socket.off('auction:viewer_count');
      socket.off('auction:warning');
      socket.off('auction:cancelled');
    };
  }, [auctionId]);

  const clearOutbid = useCallback(() => {
    setState((s) => ({ ...s, wasOutbid: false }));
  }, []);

  return { ...state, clearOutbid };
}
