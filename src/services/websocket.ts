import { io, Socket } from 'socket.io-client';

export interface CandleData {
  timeframe: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isFinal: boolean;
  timestamp: string;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  bbWidth?: number;
  ema20?: number;
  ema50?: number;
}

export interface RealtimeCandleUpdate extends CandleData {}

export interface CandleUpdate extends CandleData {}

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
    // Connect to API URL without port (Cloudflare only proxies 80/443)
    // Nginx will automatically proxy WebSocket connections to the backend
    const wsUrl = import.meta.env.VITE_API_URL || 'https://api.hedgetrade.eu';

    console.log('🔌 Connecting to WebSocket server:', wsUrl);
    console.log('🔌 Namespace: /ws/dashboard');
    console.log('🔌 Socket.IO version:', io.version);

    this.socket = io(`${wsUrl}/ws/dashboard`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      pingInterval: 25000,
      pingTimeout: 60000,
      upgrade: true,
      rememberUpgrade: true,
      path: '/socket.io/',
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      console.log('🔌 Socket ID:', this.socket?.id);
      console.log('🌐 Connected to:', wsUrl);
      console.log('🔌 Transport:', this.socket?.io?.engine?.transport?.name);
      this.connectionStatusCallbacks.forEach(cb => cb(true));
      this.startStatsTracking();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected, reason:', reason);
      this.connectionStatusCallbacks.forEach(cb => cb(false));
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt #${attemptNumber}`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
    });

    this.socket.on('candle_update', (data: CandleUpdate) => {
      this.eventStats.candle_update.count++;
      this.eventStats.candle_update.lastTime = Date.now();
      this.candleUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('realtime_candle_update', (data: RealtimeCandleUpdate) => {
      this.eventStats.realtime_candle_update.count++;
      this.eventStats.realtime_candle_update.lastTime = Date.now();
      this.realtimeCandleUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('price_update', (data: PriceUpdate) => {
      this.eventStats.price_update.count++;
      this.eventStats.price_update.lastTime = Date.now();
      this.priceUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('account_assets_update', (data: AccountAssetsUpdate) => {
      this.eventStats.account_assets_update.count++;
      this.eventStats.account_assets_update.lastTime = Date.now();
      this.accountAssetsUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('binance_server_time', (data: BinanceServerTime) => {
      this.eventStats.binance_server_time.count++;
      this.eventStats.binance_server_time.lastTime = Date.now();
      this.binanceServerTimeCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      console.error('Error message:', error.message);
      console.error('Error type:', error.type);
      console.error('Error description:', error.description);
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    this.socket.io.on('error', (error) => {
      console.error('❌ Socket.IO Manager error:', error);
    });

    this.socket.io.on('reconnect_attempt', () => {
      console.log('🔄 Manager reconnect attempt');
      console.log('🔌 Available transports:', this.socket?.io?.opts?.transports);
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
      console.log('\n📊 WebSocket Statistics (30s):');

      Object.entries(this.eventStats).forEach(([eventName, stats]) => {
        if (stats.count > 0) {
          const rate = stats.count / elapsed;
          console.log(`${eventName}: ${stats.count} events (${rate.toFixed(2)}/s)`);
        }
      });
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

  requestTimeframeData(timeframe: string) {
    if (this.socket && this.socket.connected) {
      console.log(`📊 Requesting ${timeframe} candle data from server`);
      this.socket.emit('request_timeframe', { timeframe });
    } else {
      console.warn('⚠️ Cannot request timeframe data: WebSocket not connected');
    }
  }
}

export const websocketService = new WebSocketService();
