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
  takeProfitPrice?: number;
  stopLossPrice?: number;
  initialTakeProfitProb?: number;
  currentTakeProfitProb?: number;
  latestPrediction?: {
    takeProfitProb: number;
    stopLossProb: number;
  };
}

export interface MarketState {
  bullDiv: number;
  bullConv: number;
  bearDiv: number;
  bearConv: number;
  sideways: number;
  activeState: string;
}

export interface EntryConditions {
  '1m_above': boolean;
  '1m_below': boolean;
  '1h_slope_up': boolean;
  '1h_slope_down': boolean;
  '5m_above': boolean;
  '5m_below': boolean;
  '15m_ema38_above': boolean;
  '15m_ema38_below': boolean;
  '30m_slope_up': boolean;
  '30m_slope_down': boolean;
  '15m_bbw': boolean;
  '30m_gap': boolean;
  '30m_gap_short': boolean;
  '30m_adx': boolean;
}

export interface FuturesEntryConditions {
  '1m_above': boolean;
  '1m_below': boolean;
  '1h_slope_up': boolean;
  '1h_slope_down': boolean;
  '5m_above': boolean;
  '5m_below': boolean;
  '15m_ema38_above': boolean;
  '15m_ema38_below': boolean;
  '30m_slope_up': boolean;
  '30m_slope_down': boolean;
  '15m_bbw': boolean;
  '30m_gap': boolean;
  '30m_gap_short': boolean;
  '30m_adx': boolean;
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
  priceHistory1h?: Candle[];
  priceHistory4h?: Candle[];
  priceHistory1d?: Candle[];
  pricePredictions: Candle[];
  trades: TradeEvent[];
  holding: HoldingInfo;
  currentPrediction?: {
    takeProfitProb: number;
    stopLossProb: number;
  };
  lastPredictionUpdateTime?: number;
  marketState?: MarketState;
  entryConditions?: EntryConditions;
  gateWeights?: number[];
  metrics: {
    portfolioReturn: number;
    portfolioReturnWithCommission?: number;
    marketReturn: number;
    avgTradeReturn: number;
    takeProfitCount: number;
    stopLossCount: number;
  };
}
