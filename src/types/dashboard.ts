export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isComplete?: boolean;
  isPrediction?: boolean;
  ema20?: number;
  ema50?: number;
  bb_upper?: number;
  bb_lower?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  bbWidth?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
  rsi?: number;
}

export interface TradeEvent {
  timestamp: number;
  type: 'buy' | 'sell';
  price: number;
  profit?: number;
  pairId?: string;
  quantity?: number;  // 체결 수량
  prediction?: {
    takeProfitProb: number;
    stopLossProb: number;
    expectedTakeProfitTime: number;
    expectedStopLossTime: number;
    expectedTakeProfitPrice: number;
    expectedStopLossPrice: number;
  };
}

export interface HoldingInfo {
  isHolding: boolean;
  buyPrice?: number;
  buyTime?: number;
  currentProfit?: number;
  tpPrice?: number;
  slPrice?: number;
  initialTakeProfitProb?: number;
  v5MoeTakeProfitProb?: number;
  latestPrediction?: {
    takeProfitProb: number;
    stopLossProb: number;
  };
}

export interface MarketState {
  BULL?: number;
  BEAR?: number;
  activeState: string;
  bullDiv?: number;
  bullConv?: number;
  bearDiv?: number;
  bearConv?: number;
  sideways?: number;
}

export interface AccountAsset {
  currentAsset: number;
  initialAsset: number;
  currentBTC: number;
  currentCash: number;
  btcQuantity: number;
  usdcFree: number;
  usdcLocked: number;
}

export interface AccountHolding {
  hasPosition: boolean;
  entryPrice?: number;
  quantity?: number;
  currentPrice?: number;
  unrealizedPnl?: number;
  unrealizedPnlPct?: number;
  tpPrice?: number;
  slPrice?: number;
  entryTime?: number;
  initialTakeProfitProb?: number;
}

export interface AccountTrade {
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryTime: number;
  exitTime: number;
  pnl: number;
  pnlPct: number;
  profit: number;
  exitReason: 'TP' | 'SL';
  completed: boolean;
}

export interface AccountMetrics {
  portfolioReturn: number;
  portfolioReturnWithCommission?: number;
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  totalPnl?: number;
  avgPnl?: number;
}

export interface AccountData {
  accountId: string;
  accountName?: string;
  asset: AccountAsset;
  holding: AccountHolding;
  trades: AccountTrade[];
  metrics: AccountMetrics;
  tradeStats?: {
    takeProfitExits: number;
    stopLossExits: number;
    winRate: number;
  };
}

export interface ApiResponse {
  version: string;
  cacheStatus?: string;
  currentTime: number;
  currentPrice: number;
  priceHistory1m: Candle[];
  priceHistory5m?: Candle[];
  priceHistory15m?: Candle[];
  priceHistory30m?: Candle[];
  priceHistory1h?: Candle[];
  priceHistory4h?: Candle[];
  priceHistory1d?: Candle[];
  currentPrediction: {
    v5MoeTakeProfitProb: number;
    v5MoeStopLossProb: number;
    takeProfitProb: number;
    stopLossProb: number;
    lastUpdateTime: number;
    predictionTargetTimestampMs?: number;
    marketState?: MarketState;
    gateWeights?: number[];
  };
  lastPredictionUpdateTime: number;
  marketState: MarketState;
  gateWeights: number[];
  accounts: AccountData[];
  metrics: {
    portfolioReturn: number;
    totalTrades: number;
    winningTrades: number;
    winRate: number;
    marketReturn?: number;
  };
}

export interface TradingConfig {
  takeProfitPercent: number;
  stopLossPercent: number;
}

export interface DashboardData {
  version?: string;
  currentAsset: number;
  currentBTC?: number;
  currentCash?: number;
  initialAsset: number;
  currentTime: number;
  currentPrice: number;
  priceHistory1m: Candle[];
  priceHistory5m?: Candle[];
  priceHistory15m?: Candle[];
  priceHistory30m?: Candle[];
  priceHistory1h?: Candle[];
  priceHistory4h?: Candle[];
  priceHistory1d?: Candle[];
  pricePredictions: Candle[];
  trades: TradeEvent[];
  holding: HoldingInfo;
  prediction?: {
    market_mood?: 'BULL' | 'BEAR';
    threshold_v8?: number;
    bb_touch?: boolean;
    takeProfitProb?: number;
  };
  currentPrediction?: {
    takeProfitProb: number;
    stopLossProb: number;
    v5MoeTakeProfitProb?: number;
    predictionDataTimestamp?: number;
    predictionCalculatedAt?: number;
    v2UpdateCount?: number;
    v2LastUsed5minTimestamp?: number;
    threshold_v8?: number;
    bb_touch?: boolean;
  };
  lastPredictionUpdateTime?: number;
  marketState?: MarketState;
  gateWeights?: number[];
  metrics: {
    portfolioReturn: number;
    portfolioReturnWithCommission?: number;
    marketReturn: number;
    avgTradeReturn: number;
    takeProfitCount: number;
    stopLossCount: number;
  };
  tradingConfig?: TradingConfig;
  accountId?: string;
  accountName?: string;
  availableAccounts?: Array<{ id: string; name: string }>;
  _updateTimestamp?: number; // 강제 리렌더링용 타임스탬프
}
