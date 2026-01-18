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
}

type CandleUpdateCallback = (data: CandleUpdate) => void;
type RealtimeCandleUpdateCallback = (data: RealtimeCandleUpdate) => void;
type CandleCompleteCallback = (data: CandleComplete) => void;
type PriceUpdateCallback = (data: PriceUpdate) => void;
type AccountAssetsUpdateCallback = (data: AccountAssetsUpdate) => void;
type BinanceServerTimeCallback = (data: BinanceServerTime) => void;
type PredictionUpdateCallback = (data: PredictionUpdate) => void;
type DashboardUpdateCallback = (data: DashboardUpdate) => void;
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
  };
  private statsInterval: NodeJS.Timeout | null = null;

  connect() {
    // Connect to API URL without port (Cloudflare only proxies 80/443)
    // Nginx will automatically proxy WebSocket connections to the backend
    const wsUrl = import.meta.env.VITE_API_URL || 'https://api.hedgetrade.eu';

    console.log('═══════════════════════════════════════');
    console.log('🔌 WebSocket Connection Attempt');
    console.log('═══════════════════════════════════════');
    console.log('📍 URL:', wsUrl);
    console.log('📍 Full path:', `${wsUrl}/ws/dashboard`);
    console.log('📍 Namespace: /ws/dashboard');
    console.log('📍 Socket.IO path: /socket.io/');
    console.log('📍 Socket.IO version:', io.version);
    console.log('📍 Transports: websocket, polling');
    console.log('═══════════════════════════════════════');

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
      console.log('═══════════════════════════════════════');
      console.log('✅ WebSocket CONNECTED');
      console.log('═══════════════════════════════════════');
      console.log('🔌 Socket ID:', this.socket?.id);
      console.log('🌐 Connected to:', wsUrl);
      console.log('🔌 Transport:', this.socket?.io?.engine?.transport?.name);
      console.log('⏰ Connected at:', new Date().toLocaleString());
      console.log('═══════════════════════════════════════');
      this.connectionStatusCallbacks.forEach(cb => cb(true));
      this.startStatsTracking();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('═══════════════════════════════════════');
      console.log('❌ WebSocket DISCONNECTED');
      console.log('═══════════════════════════════════════');
      console.log('❌ Reason:', reason);
      console.log('⏰ Disconnected at:', new Date().toLocaleString());
      console.log('═══════════════════════════════════════');
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
        console.warn('⚠️ account_assets_update: 백엔드가 dashboard_update 형식으로 보냄 - 무시');
        console.warn('   백엔드 수정 필요: { accountId, asset: { currentAsset, currentBTC, currentCash, initialAsset } }');
        return;
      }

      // 올바른 형식 검증
      if (!data || !data.asset) {
        console.error('❌ account_assets_update: 잘못된 데이터 구조', data);
        return;
      }

      console.log('💰 account_assets_update received:', {
        accountId: data.accountId,
        currentAsset: data.asset.currentAsset,
        currentBTC: data.asset.currentBTC,
        currentCash: data.asset.currentCash,
      });
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
      console.log('📨 WebSocket received prediction_update event, forwarding to', this.predictionUpdateCallbacks.size, 'callbacks');
      this.predictionUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('dashboard_update', (data: DashboardUpdate) => {
      this.eventStats.dashboard_update.count++;
      this.eventStats.dashboard_update.lastTime = Date.now();

      this.dashboardUpdateCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('connect_error', (error) => {
      console.log('═══════════════════════════════════════');
      console.error('❌ WebSocket CONNECTION ERROR');
      console.log('═══════════════════════════════════════');
      console.error('❌ Error:', error);
      console.error('❌ Message:', error.message);
      console.error('❌ Type:', error.type);
      console.error('❌ Description:', error.description);
      console.error('⏰ Error at:', new Date().toLocaleString());
      console.log('═══════════════════════════════════════');
      console.log('🔍 DIAGNOSIS:');
      console.log('  1. Check if backend server is running');
      console.log('  2. Check backend logs for errors');
      console.log('  3. Verify WebSocket endpoint: /ws/dashboard');
      console.log('  4. Verify Socket.IO namespace is registered');
      console.log('  5. Check CORS configuration');
      console.log('═══════════════════════════════════════');
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
      console.log('\n═══════════════════════════════════════');
      console.log('📊 WebSocket Statistics');
      console.log('═══════════════════════════════════════');
      console.log(`⏱️  Running time: ${elapsed.toFixed(1)}s`);
      console.log('');

      const importantEvents = ['dashboard_update', 'account_assets_update', 'price_update', 'prediction_update'];
      const otherEvents: string[] = [];

      importantEvents.forEach((eventName) => {
        const stats = this.eventStats[eventName as keyof typeof this.eventStats];
        if (stats.count > 0) {
          const rate = stats.count / elapsed;
          const lastAgo = stats.lastTime > 0 ? ((Date.now() - stats.lastTime) / 1000).toFixed(1) + 's ago' : 'never';
          console.log(`✅ ${eventName}: ${stats.count} events (${rate.toFixed(2)}/s) - last: ${lastAgo}`);
        } else {
          console.log(`❌ ${eventName}: NOT RECEIVING`);
        }
      });

      console.log('');
      Object.entries(this.eventStats).forEach(([eventName, stats]) => {
        if (!importantEvents.includes(eventName) && stats.count > 0) {
          otherEvents.push(eventName);
        }
      });

      if (otherEvents.length > 0) {
        console.log('Other events:');
        otherEvents.forEach((eventName) => {
          const stats = this.eventStats[eventName as keyof typeof this.eventStats];
          const rate = stats.count / elapsed;
          console.log(`  ${eventName}: ${stats.count} (${rate.toFixed(2)}/s)`);
        });
      }

      console.log('═══════════════════════════════════════\n');
    }, 10000);
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
