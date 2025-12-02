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

export interface MarketState {
  bullDiv: number;
  bullConv: number;
  bearDiv: number;
  bearConv: number;
  sideways: number;
  activeState: string;
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
