export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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

export interface DashboardData {
  currentAsset: number;
  initialAsset: number;
  currentTime: number;
  currentPrice: number;
  priceHistory1m: Candle[];
  priceHistory5m?: Candle[];
  priceHistory15m?: Candle[];
  priceHistory1h?: Candle[];
  pricePredictions: Candle[];
  trades: TradeEvent[];
  holding: HoldingInfo;
  currentPrediction?: {
    takeProfitProb: number;
    stopLossProb: number;
    expectedTakeProfitTime?: number;
    expectedStopLossTime?: number;
  };
  lastPredictionUpdateTime?: number;
  metrics: {
    portfolioReturn: number;
    marketReturn: number;
    avgTradeReturn: number;
    takeProfitCount: number;
    stopLossCount: number;
  };
}
