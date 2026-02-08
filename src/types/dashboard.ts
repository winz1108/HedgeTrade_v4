export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isComplete?: boolean;
  isPrediction?: boolean;
  ema5?: number;
  ema13?: number;
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
  quantity?: number;
  exitReason?: 'TP' | 'SL';
  pnl?: number;
  buyCost?: number;
  sellRevenue?: number;
  buyQty?: number;
  sellQty?: number;
  buyCommission?: number;
  sellCommission?: number;
  entryPrice?: number;
  entryTime?: number;
  profitNoCommission?: number;
  pnlWithCommission?: number;
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
  state?: 'BULL_CONV' | 'BULL_DIV' | 'BEAR_CONV' | 'BEAR_DIV' | 'SIDEWAYS';
  detail?: {
    ema20: number;
    ema50: number;
    ema100: number;
    ema20_rising: boolean;
  };
}

export interface BuyConditions {
  '1m_golden_cross': boolean;
  '5m_above': boolean;
  '15m_above': boolean;
  '30m_above': boolean;
  '1h_above': boolean;
  '30m_slope_up': boolean;
  '1h_slope_up': boolean;
  '5m_bbw': boolean;
  '15m_bbw': boolean;
  '30m_gap': boolean;
}

export interface StrategyTimeframe {
  ema5: number;
  ema13: number;
  above: boolean;
  golden?: boolean;
  bbw?: number;
  gap?: number;
  slope?: number;
  dead?: boolean;
}

export interface StrategyStatus {
  buyConditions: BuyConditions;
  buyConditionsMet: number;
  buyConditionsTotal: number;
  allBuyMet: boolean;
  sellSignal: string | null;
  inPosition: boolean;
  updatedAt?: string;
  strategy?: {
    '1m'?: StrategyTimeframe;
    '5m'?: StrategyTimeframe;
    '15m'?: StrategyTimeframe;
    '30m'?: StrategyTimeframe;
    '1h'?: StrategyTimeframe;
  };
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
  actualReturn?: number;
  totalTrades: number;
  completedTrades?: number;
  winningTrades: number;
  winRate: number;
  totalPnl?: number;
  avgPnl?: number;
  totalBalance?: number;
  takeProfitCount?: number;
  stopLossCount?: number;
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
  prediction?: {
    market_mood?: 'BULL' | 'BEAR';
    threshold_v8?: number;
    bb_touch?: boolean;
    takeProfitProb?: number;
  };
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
  strategyStatus?: StrategyStatus;
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
  strategyStatus?: StrategyStatus | null;
  metrics: {
    portfolioReturn: number;
    portfolioReturnWithCommission?: number;
    actualReturn?: number;
    marketReturn: number;
    avgTradeReturn: number;
    takeProfitCount: number;
    stopLossCount: number;
    totalTrades?: number;
    winningTrades?: number;
    winRate?: number;
    totalPnl?: number;
  };
  tradingConfig?: {
    takeProfitPercent: number;
    stopLossPercent: number;
  };
  accountId?: string;
  accountName?: string;
  availableAccounts?: Array<{ id: string; name: string }>;
  _updateTimestamp?: number;
}
