import { io, Socket } from 'socket.io-client';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isFinal?: boolean;
  ema20?: number;
  ema50?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  bbWidth?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
  rsi?: number;
}

export interface RealtimeCandleUpdate {
  timeframe: string;
  candle: CandleData;
}

export interface CandleUpdate {
  timeframe: string;
  candle: CandleData;
}

export interface PriceUpdate {
  currentPrice: number;
  currentTime: number;
}

type CandleUpdateCallback = (data: CandleUpdate) => void;
type RealtimeCandleUpdateCallback = (data: RealtimeCandleUpdate) => void;
type PriceUpdateCallback = (data: PriceUpdate) => void;
type ConnectionStatusCallback = (connected: boolean) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private candleUpdateCallbacks: Set<CandleUpdateCallback> = new Set();
  private realtimeCandleUpdateCallbacks: Set<RealtimeCandleUpdateCallback> = new Set();
  private priceUpdateCallbacks: Set<PriceUpdateCallback> = new Set();
  private connectionStatusCallbacks: Set<ConnectionStatusCallback> = new Set();

  connect() {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.hedgetrade.eu';

    this.socket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.connectionStatusCallbacks.forEach(cb => cb(true));
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      this.connectionStatusCallbacks.forEach(cb => cb(false));
    });

    this.socket.on('candle_update', (data: CandleUpdate) => {
      this.candleUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('realtime_candle_update', (data: RealtimeCandleUpdate) => {
      this.realtimeCandleUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('price_update', (data: PriceUpdate) => {
      this.priceUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onCandleUpdate(callback: CandleUpdateCallback) {
    this.candleUpdateCallbacks.add(callback);
    return () => this.candleUpdateCallbacks.delete(callback);
  }

  onRealtimeCandleUpdate(callback: RealtimeCandleUpdateCallback) {
    this.realtimeCandleUpdateCallbacks.add(callback);
    return () => this.realtimeCandleUpdateCallbacks.delete(callback);
  }

  onPriceUpdate(callback: PriceUpdateCallback) {
    this.priceUpdateCallbacks.add(callback);
    return () => this.priceUpdateCallbacks.delete(callback);
  }

  onConnectionStatus(callback: ConnectionStatusCallback) {
    this.connectionStatusCallbacks.add(callback);
    return () => this.connectionStatusCallbacks.delete(callback);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const websocketService = new WebSocketService();
