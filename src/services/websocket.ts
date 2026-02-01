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
  is_complete?: boolean;
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

export interface CandleComplete extends CandleData {
  is_complete: true;
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

export interface PredictionUpdate {
  probability: number;
  version: string;
  timestamp: number;
  predictionCalculatedAt: number;
  stopLossProb?: number;
  market_state?: any;
  gate_weights?: number[];
  prediction?: {
    market_mood?: 'BULL' | 'BEAR';
    threshold_v8?: number;
    bb_touch?: boolean;
    takeProfitProb?: number;
  };
}

export interface AccountBalance {
  accountId: 'Account_A' | 'Account_B';
  btcBalance: number;
  btcFree: number;
  btcLocked: number;
  usdcBalance: number;
  usdcFree: number;
  usdcLocked: number;
  btcValue: number;
  totalAsset: number;
  trades?: any[];
  holding?: any;
}

export interface DashboardUpdate {
  serverTime: number;
  currentPrice: number;
  accounts: AccountBalance[];
  totalBtc: number;
  totalUsdc: number;
  totalAsset: number;
  btcBalance?: number;
  btcPrice?: number;
  usdcBalance?: number;
  timestamp?: number;
  accountId?: string;
  version?: string;
  trades?: any[];
  holding?: any;
}

export interface TradeEventUpdate {
  accountId: string;
  trade: any;
  holding: any;
  trades?: any[];
}

type CandleUpdateCallback = (data: CandleUpdate) => void;
type RealtimeCandleUpdateCallback = (data: RealtimeCandleUpdate) => void;
type CandleCompleteCallback = (data: CandleComplete) => void;
type PriceUpdateCallback = (data: PriceUpdate) => void;
type AccountAssetsUpdateCallback = (data: AccountAssetsUpdate) => void;
type BinanceServerTimeCallback = (data: BinanceServerTime) => void;
type PredictionUpdateCallback = (data: PredictionUpdate) => void;
type DashboardUpdateCallback = (data: DashboardUpdate) => void;
type TradeEventCallback = (data: TradeEventUpdate) => void;
type ConnectionStatusCallback = (connected: boolean) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private candleUpdateCallbacks: Set<CandleUpdateCallback> = new Set();
  private realtimeCandleUpdateCallbacks: Set<RealtimeCandleUpdateCallback> = new Set();
  private candleCompleteCallbacks: Set<CandleCompleteCallback> = new Set();
  private priceUpdateCallbacks: Set<PriceUpdateCallback> = new Set();
  private accountAssetsUpdateCallbacks: Set<AccountAssetsUpdateCallback> = new Set();
  private binanceServerTimeCallbacks: Set<BinanceServerTimeCallback> = new Set();
  private predictionUpdateCallbacks: Set<PredictionUpdateCallback> = new Set();
  private dashboardUpdateCallbacks: Set<DashboardUpdateCallback> = new Set();
  private tradeEventCallbacks: Set<TradeEventCallback> = new Set();
  private connectionStatusCallbacks: Set<ConnectionStatusCallback> = new Set();

  private eventStats = {
    price_update: { count: 0, lastTime: 0 },
    realtime_candle_update: { count: 0, lastTime: 0 },
    candle_update: { count: 0, lastTime: 0 },
    candle_complete: { count: 0, lastTime: 0 },
    account_assets_update: { count: 0, lastTime: 0 },
    binance_server_time: { count: 0, lastTime: 0 },
    prediction_update: { count: 0, lastTime: 0 },
    dashboard_update: { count: 0, lastTime: 0 },
    trade_event: { count: 0, lastTime: 0 },
  };
  private statsInterval: NodeJS.Timeout | null = null;

  connect() {
    // Connect to API URL without port (Cloudflare only proxies 80/443)
    // Nginx will automatically proxy WebSocket connections to the backend
    const wsUrl = import.meta.env.VITE_API_URL || 'https://api.hedgetrade.eu';

    this.socket = io(`${wsUrl}/ws/dashboard`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 60000,
      pingInterval: 25000,
      pingTimeout: 120000,
      upgrade: true,
      rememberUpgrade: true,
      path: '/socket.io/',
    });

    this.socket.on('connect', () => {
      this.connectionStatusCallbacks.forEach(cb => cb(true));
      this.startStatsTracking();
    });

    this.socket.on('disconnect', (reason) => {
      this.connectionStatusCallbacks.forEach(cb => cb(false));
    });

    this.socket.on('reconnect_error', (error) => {
    });

    this.socket.on('reconnect_failed', () => {
    });

    this.socket.on('candle_update', (data: CandleUpdate) => {
      this.eventStats.candle_update.count++;
      this.eventStats.candle_update.lastTime = Date.now();
      this.candleUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('candle_complete', (data: CandleComplete) => {
      this.eventStats.candle_complete.count++;
      this.eventStats.candle_complete.lastTime = Date.now();
      this.candleCompleteCallbacks.forEach(cb => cb(data));
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

    this.socket.on('account_assets_update', (data: any) => {
      this.eventStats.account_assets_update.count++;
      this.eventStats.account_assets_update.lastTime = Date.now();

      // 백엔드가 잘못된 형식으로 보내는 경우 (dashboard_update 형식)
      if (data.accounts && data.totalAsset) {
        return;
      }

      // 올바른 형식 검증
      if (!data || !data.asset) {
        return;
      }

      this.accountAssetsUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('binance_server_time', (data: BinanceServerTime) => {
      this.eventStats.binance_server_time.count++;
      this.eventStats.binance_server_time.lastTime = Date.now();
      this.binanceServerTimeCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('prediction_update', (data: PredictionUpdate) => {
      this.eventStats.prediction_update.count++;
      this.eventStats.prediction_update.lastTime = Date.now();
      this.predictionUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('dashboard_update', (data: DashboardUpdate) => {
      this.eventStats.dashboard_update.count++;
      this.eventStats.dashboard_update.lastTime = Date.now();

      this.dashboardUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('trade_event', (data: TradeEventUpdate) => {
      this.eventStats.trade_event.count++;
      this.eventStats.trade_event.lastTime = Date.now();

      this.tradeEventCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('connect_error', (error) => {
    });

    this.socket.on('error', (error) => {
    });

    this.socket.io.on('error', (error) => {
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

    // 웹소켓 이벤트 통계 추적 (30초마다)
    this.statsInterval = setInterval(() => {
      const now = Date.now();
      console.log('[WS 통계] 지난 30초 동안 수신한 이벤트:');

      Object.entries(this.eventStats).forEach(([eventName, stats]) => {
        const timeSinceLastEvent = stats.lastTime > 0 ? Math.floor((now - stats.lastTime) / 1000) : -1;
        if (stats.count > 0) {
          console.log(`  ${eventName}: ${stats.count}회 (마지막: ${timeSinceLastEvent}초 전)`);
        }
      });

      console.log(`  연결상태: ${this.socket?.connected ? '✅ 연결됨' : '❌ 끊김'}`);
    }, 30000);
  }

  onCandleUpdate(callback: CandleUpdateCallback) {
    this.candleUpdateCallbacks.add(callback);
    return () => this.candleUpdateCallbacks.delete(callback);
  }

  onCandleComplete(callback: CandleCompleteCallback) {
    this.candleCompleteCallbacks.add(callback);
    return () => this.candleCompleteCallbacks.delete(callback);
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

  onPredictionUpdate(callback: PredictionUpdateCallback) {
    this.predictionUpdateCallbacks.add(callback);
    return () => this.predictionUpdateCallbacks.delete(callback);
  }

  onDashboardUpdate(callback: DashboardUpdateCallback) {
    this.dashboardUpdateCallbacks.add(callback);
    return () => this.dashboardUpdateCallbacks.delete(callback);
  }

  onTradeEvent(callback: TradeEventCallback) {
    this.tradeEventCallbacks.add(callback);
    return () => this.tradeEventCallbacks.delete(callback);
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
      this.socket.emit('request_timeframe', { timeframe });
    }
  }
}

export const websocketService = new WebSocketService();
