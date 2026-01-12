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

export interface AccountAsset {
  currentAsset: number;
  currentBTC: number;
  currentCash: number;
  initialAsset: number;
}

export interface AccountAssetsUpdate {
  accountId: string;
  asset: AccountAsset;
}

export interface BinanceServerTime {
  serverTime: number;
}

type CandleUpdateCallback = (data: CandleUpdate) => void;
type RealtimeCandleUpdateCallback = (data: RealtimeCandleUpdate) => void;
type PriceUpdateCallback = (data: PriceUpdate) => void;
type AccountAssetsUpdateCallback = (data: AccountAssetsUpdate) => void;
type BinanceServerTimeCallback = (data: BinanceServerTime) => void;
type ConnectionStatusCallback = (connected: boolean) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private candleUpdateCallbacks: Set<CandleUpdateCallback> = new Set();
  private realtimeCandleUpdateCallbacks: Set<RealtimeCandleUpdateCallback> = new Set();
  private priceUpdateCallbacks: Set<PriceUpdateCallback> = new Set();
  private accountAssetsUpdateCallbacks: Set<AccountAssetsUpdateCallback> = new Set();
  private binanceServerTimeCallbacks: Set<BinanceServerTimeCallback> = new Set();
  private connectionStatusCallbacks: Set<ConnectionStatusCallback> = new Set();

  private eventStats = {
    price_update: { count: 0, lastTime: 0 },
    realtime_candle_update: { count: 0, lastTime: 0 },
    candle_update: { count: 0, lastTime: 0 },
    account_assets_update: { count: 0, lastTime: 0 },
    binance_server_time: { count: 0, lastTime: 0 },
  };
  private statsInterval: NodeJS.Timeout | null = null;

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
      console.log('🔌 Socket ID:', this.socket?.id);
      console.log('🌐 Connected to:', apiUrl);
      this.connectionStatusCallbacks.forEach(cb => cb(true));
      this.startStatsTracking();
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      this.connectionStatusCallbacks.forEach(cb => cb(false));
    });

    this.socket.onAny((eventName, ...args) => {
      console.log(`🔔 Received event: "${eventName}"`, args);
    });

    this.socket.on('candle_update', (data: CandleUpdate) => {
      const now = Date.now();
      const timestamp = new Date().toISOString();
      this.eventStats.candle_update.count++;
      this.eventStats.candle_update.lastTime = now;
      console.log(`[${timestamp}] 📊 candle_update received:`, data.timeframe);
      this.candleUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('realtime_candle_update', (data: RealtimeCandleUpdate) => {
      const now = Date.now();
      const timestamp = new Date().toISOString();
      this.eventStats.realtime_candle_update.count++;
      this.eventStats.realtime_candle_update.lastTime = now;
      console.log(`[${timestamp}] 🔄 realtime_candle_update received:`, data.timeframe, 'price:', data.candle.close);
      this.realtimeCandleUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('price_update', (data: PriceUpdate) => {
      const now = Date.now();
      const timestamp = new Date().toISOString();
      this.eventStats.price_update.count++;
      this.eventStats.price_update.lastTime = now;
      console.log(`[${timestamp}] 💰 price_update received:`, data.currentPrice);
      this.priceUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('account_assets_update', (data: AccountAssetsUpdate) => {
      const now = Date.now();
      const timestamp = new Date().toISOString();
      this.eventStats.account_assets_update.count++;
      this.eventStats.account_assets_update.lastTime = now;
      console.log(`[${timestamp}] 💼 account_assets_update received:`, data.accountId);
      this.accountAssetsUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('binance_server_time', (data: BinanceServerTime) => {
      const now = Date.now();
      const timestamp = new Date().toISOString();
      this.eventStats.binance_server_time.count++;
      this.eventStats.binance_server_time.lastTime = now;
      console.log(`[${timestamp}] ⏰ binance_server_time received:`, new Date(data.serverTime).toISOString());
      this.binanceServerTimeCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
  }

  disconnect() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private startStatsTracking() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    const startTime = Date.now();
    this.statsInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      console.log('\n📊 WebSocket Event Statistics (last 30s):');
      console.log('═══════════════════════════════════════════════════════');

      Object.entries(this.eventStats).forEach(([eventName, stats]) => {
        const rate = stats.count / elapsed;
        const timeSinceLastEvent = stats.lastTime > 0
          ? ((Date.now() - stats.lastTime) / 1000).toFixed(1) + 's ago'
          : 'never';

        console.log(`${eventName.padEnd(25)} | Count: ${String(stats.count).padStart(4)} | Rate: ${rate.toFixed(2)}/s | Last: ${timeSinceLastEvent}`);
      });

      console.log('═══════════════════════════════════════════════════════\n');
    }, 30000);
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

  onAccountAssetsUpdate(callback: AccountAssetsUpdateCallback) {
    this.accountAssetsUpdateCallbacks.add(callback);
    return () => this.accountAssetsUpdateCallbacks.delete(callback);
  }

  onBinanceServerTime(callback: BinanceServerTimeCallback) {
    this.binanceServerTimeCallbacks.add(callback);
    return () => this.binanceServerTimeCallbacks.delete(callback);
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
