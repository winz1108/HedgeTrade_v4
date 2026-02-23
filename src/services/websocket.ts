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
  adx?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  bbWidth?: number;
  ema5?: number;
  ema13?: number;
  ema3?: number;
  ema8?: number;
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

export interface StrategyStatusUpdate {
  buyConditions: Record<string, boolean>;
  buyConditionsMet: number;
  buyConditionsTotal: number;
  allBuyMet: boolean;
  sellSignal: string | null;
  inPosition: boolean;
  updatedAt?: string;
  strategy?: Record<string, any>;
  sellConditions?: {
    dead_cross?: {
      met: boolean;
      label: string;
      ema5: number;
      ema13: number;
      above: boolean;
    };
    smart_trail?: {
      met: boolean;
      active: boolean;
      label: string;
      regime: 'U' | 'S' | 'D';
      score: number;
      entry_price: number;
      peak_price: number;
      '15m_ema3': number;
      '15m_ema8': number;
      '15m_above': boolean;
      min_profit: number;
      macd_hist?: number;
      reversal_ready?: boolean;
      min_profit_met?: boolean;
    };
    early_exit?: any;
    any_sell?: boolean;
    in_position?: boolean;
  };
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
  strategyStatus?: StrategyStatusUpdate | null;
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
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastMessageTime: number = 0;
  private reconnectCount: number = 0;

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
      timeout: 20000,
      pingInterval: 25000,
      pingTimeout: 60000,
      upgrade: true,
      rememberUpgrade: true,
      path: '/socket.io/',
      forceNew: false,
    });

    this.socket.on('connect', () => {
      console.log(`[WebSocket] 🟢 연결 성공 (재연결 ${this.reconnectCount}회)`);
      this.reconnectCount = 0;
      this.lastMessageTime = Date.now();
      this.connectionStatusCallbacks.forEach(cb => cb(true));
      this.startStatsTracking();
      this.startHeartbeatMonitor();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[WebSocket] 🔴 연결 끊김: ${reason}`);
      this.connectionStatusCallbacks.forEach(cb => cb(false));
      this.stopHeartbeatMonitor();

      if (reason === 'io server disconnect') {
        console.log('[WebSocket] 서버에서 연결을 끊음. 재연결 시도...');
        setTimeout(() => {
          if (this.socket && !this.socket.connected) {
            this.socket.connect();
          }
        }, 1000);
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.reconnectCount = attemptNumber;
      console.log(`[WebSocket] 🔄 재연결 시도 ${attemptNumber}회...`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[WebSocket] ✅ 재연결 성공 (${attemptNumber}회 시도 후)`);
      this.lastMessageTime = Date.now();
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('[WebSocket] ⚠️ 재연결 실패:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[WebSocket] ❌ 재연결 최종 실패');
    });

    this.socket.on('ping', () => {
      this.lastMessageTime = Date.now();
    });

    this.socket.on('pong', (latency: number) => {
      this.lastMessageTime = Date.now();
    });

    this.socket.on('candle_update', (data: CandleUpdate) => {
      this.lastMessageTime = Date.now();
      this.eventStats.candle_update.count++;
      this.eventStats.candle_update.lastTime = Date.now();
      this.candleUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('candle_complete', (data: CandleComplete) => {
      this.lastMessageTime = Date.now();
      this.eventStats.candle_complete.count++;
      this.eventStats.candle_complete.lastTime = Date.now();
      this.candleCompleteCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('realtime_candle_update', (data: RealtimeCandleUpdate) => {
      this.lastMessageTime = Date.now();
      this.eventStats.realtime_candle_update.count++;
      this.eventStats.realtime_candle_update.lastTime = Date.now();
      this.realtimeCandleUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('price_update', (data: PriceUpdate) => {
      this.lastMessageTime = Date.now();
      this.eventStats.price_update.count++;
      this.eventStats.price_update.lastTime = Date.now();
      this.priceUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('account_assets_update', (data: any) => {
      this.lastMessageTime = Date.now();
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
      this.lastMessageTime = Date.now();
      this.eventStats.binance_server_time.count++;
      this.eventStats.binance_server_time.lastTime = Date.now();
      this.binanceServerTimeCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('prediction_update', (data: PredictionUpdate) => {
      this.lastMessageTime = Date.now();
      this.eventStats.prediction_update.count++;
      this.eventStats.prediction_update.lastTime = Date.now();
      this.predictionUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('dashboard_update', (data: DashboardUpdate) => {
      this.lastMessageTime = Date.now();
      this.eventStats.dashboard_update.count++;
      this.eventStats.dashboard_update.lastTime = Date.now();

      this.dashboardUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('trade_event', (data: TradeEventUpdate) => {
      this.lastMessageTime = Date.now();
      this.eventStats.trade_event.count++;
      this.eventStats.trade_event.lastTime = Date.now();

      console.log('[WebSocket] 🔔 trade_event 수신:', {
        accountId: data.accountId,
        trade: data.trade,
        tradesArray: data.trades?.length,
        holding: data.holding,
      });

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
    console.log('[WebSocket] 연결 종료 중...');
    this.stopStatsTracking();
    this.stopHeartbeatMonitor();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private stopStatsTracking() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  private startHeartbeatMonitor() {
    this.stopHeartbeatMonitor();

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastMessage = now - this.lastMessageTime;

      // 90초 동안 메시지가 없으면 연결 문제로 간주
      if (timeSinceLastMessage > 90000) {
        console.warn(`[WebSocket] ⚠️ ${Math.floor(timeSinceLastMessage / 1000)}초간 메시지 없음. 재연결 시도...`);

        if (this.socket) {
          this.socket.disconnect();
          setTimeout(() => {
            if (this.socket) {
              this.socket.connect();
            }
          }, 1000);
        }
      }
    }, 30000);
  }

  private stopHeartbeatMonitor() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startStatsTracking() {
    this.stopStatsTracking();

    // 웹소켓 이벤트 통계 추적 (30초마다)
    this.statsInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastMessage = this.lastMessageTime > 0 ? Math.floor((now - this.lastMessageTime) / 1000) : -1;

      console.log('[WS 통계] 지난 30초 동안 수신한 이벤트:');

      Object.entries(this.eventStats).forEach(([eventName, stats]) => {
        const timeSinceLastEvent = stats.lastTime > 0 ? Math.floor((now - stats.lastTime) / 1000) : -1;
        if (stats.count > 0) {
          console.log(`  ${eventName}: ${stats.count}회 (마지막: ${timeSinceLastEvent}초 전)`);
        }
      });

      console.log(`  연결상태: ${this.socket?.connected ? '✅ 연결됨' : '❌ 끊김'}`);
      console.log(`  마지막 메시지: ${timeSinceLastMessage}초 전`);
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

  // Generic event listener for any event
  on(eventName: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(eventName, callback);
    }
  }

  off(eventName: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.off(eventName, callback);
    }
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
