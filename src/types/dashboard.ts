export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isComplete?: boolean;
  isPrediction?: boolean;
  // 백엔드 제공 인디케이터 필드명
  ema_short?: number;    // EMA short (1m/5m/30m/1h/1d: 5 또는 3)
  ema_long?: number;     // EMA long (1m/5m/30m/1h/1d: 13 또는 8)
  ema3?: number;         // 15m 전용 EMA(3)
  ema8?: number;         // 15m 전용 EMA(8)
  bb_upper?: number;     // Bollinger Band 상단
  bb_mid?: number;       // Bollinger Band 중심 (SMA 20)
  bb_lower?: number;     // Bollinger Band 하단
  bbw?: number;          // Bollinger Band Width %
  adx?: number;          // ADX(14)
  // MACD - 백엔드 실제 필드명 (모든 타임프레임)
  macd?: number;         // MACD Line (백엔드 전송 필드명)
  signal?: number;       // MACD Signal (백엔드 전송 필드명)
  histogram?: number;    // MACD Histogram (백엔드 전송 필드명)
  // MACD - 레거시/대체 필드명 (하위 호환성)
  macd_line?: number;    // MACD Line (레거시)
  macd_signal?: number;  // MACD Signal (레거시)
  macd_hist?: number;    // MACD Histogram (레거시)
  rsi?: number;
}

export interface TradeEvent {
  timestamp: number;
  type: 'buy' | 'sell';
  price: number;
  profit?: number;
  pairId?: string;
  quantity?: number;
  exitReason?: string;
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
  side?: 'LONG' | 'SHORT'; // 포지션 방향
  exchange?: 'binance_spot' | 'kraken_futures'; // 거래소 구분
  confirmed?: boolean; // kraken_futures: 거래소 체결 확인
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
  positionSide?: 'LONG' | 'SHORT';
  ppReversalPrice?: number | null;
  floorPrice?: number | null;
  currentSlPct?: number;
  exitFloorPrice?: number | null;
  exitSlPrice?: number | null;
}

export interface ExitConditionVREG {
  armed: boolean;
  bars_ok: boolean;
  bars_held: number;
  bars_min: number;
  pnl_ok: boolean;
  pnl_current: number;
  pnl_min: number;
  vol_spike: boolean;
  vol_mult: number;
  vol_current_ratio?: number;
  vol_threshold?: number;
  line_distance_pct?: number;
}

export interface ExitConditionEMA {
  armed: boolean;
  mfe_ok: boolean;
  mfe_current: number;
  mfe_gate: number;
  pnl_ok: boolean;
  pnl_current: number;
  pnl_gate: number;
  price_past_band?: boolean;
  band_distance_pct?: number;
}

export interface ExitConditionCUT {
  armed: boolean;
  mae_ok: boolean;
  mae_current: number;
  mae_threshold: number;
  pnl_ok: boolean;
  ema_reversed: boolean;
}

export interface ExitConditions {
  VREG?: ExitConditionVREG;
  EMA?: ExitConditionEMA;
  CUT?: ExitConditionCUT;
}

export interface EntryDetailADX {
  current: number;
  threshold: number;
}

export interface EntryDetailEMA {
  price: number;
  bd: number;
  bu: number;
  long_met?: boolean;
  short_met?: boolean;
  long_distance_pct?: number;
  short_distance_pct?: number;
}

export interface EntryDetailRange {
  position_pct: number;
  long_max: number;
  short_min: number;
  long_pct?: number;
  short_pct?: number;
}

export interface EntryDetails {
  ADX?: EntryDetailADX;
  EMA?: EntryDetailEMA;
  Range?: EntryDetailRange;
  [key: string]: any;
}

export interface V10StrategyStatus {
  strategyVersion?: string;
  inPosition: boolean;
  strategy_params?: {
    vreg_vol_mult?: number;
    vreg_min_pnl?: number;
    vreg_reg_n?: number;
    mgmt_tf?: string;
    [key: string]: any;
  };
  positionSide?: 'LONG' | 'SHORT' | null;
  side?: 'LONG' | 'SHORT' | null;
  entryPrice?: number;
  entryTime?: number;
  currentPnl?: number;
  mfe?: number;
  mae?: number;
  holdHours?: number;
  healthScore?: number;
  currentPrice?: number;
  updatedAt?: string;
  allBuyMet?: boolean;
  buyConditionsMet?: number;
  buyConditionsTotal?: number;
  buyConditions?: {
    '1h_ema_bu'?: boolean;
    '1h_ema_bd'?: boolean;
    '1h_adx_20'?: boolean;
    [key: string]: boolean | undefined;
  };
  exitPrices?: {
    ema_exit?: number;
    vreg_exit?: number;
    cut_threshold_mae?: number;
  };
  exitConditions?: ExitConditions;
  entryDetails?: EntryDetails;
  vregLine?: number;
  vreg_series?: (number | null)[];
  vregSeries?: (number | null)[];
  indicators?: {
    '5m'?: { bd?: number; bu?: number; [key: string]: any };
    '15m'?: { ema8?: number; ema13?: number; bd?: number; bu?: number; [key: string]: any };
    '1h'?: { ema8?: number; ema13?: number; adx?: number; [key: string]: any };
    [key: string]: any;
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
  '15m_ema38_above': boolean;
  '30m_slope_up': boolean;
  '15m_bbw': boolean;
  '30m_gap': boolean;
  '30m_adx': boolean;
  // Display-only 필드 (진입 판단에 미사용)
  '5m_bbw'?: boolean;
  '1h_adx'?: boolean;
}

export interface EarlyExitConditions {
  '30m_golden_maintained': boolean;
  '30m_ema5_falling': boolean;
  '30m_ema13_falling': boolean;
  '1d_downtrend': boolean;
}

export interface SellConditions {
  dead_cross: {
    met: boolean;
    label: string;
    ema5?: number;
    ema13?: number;
    above?: boolean;
  };
  smart_trail?: {
    met: boolean;
    active: boolean;
    label: string;
    regime: string;
    score: number;
    entry_price: number;
    peak_price: number;
    '15m_ema3': number;
    '15m_ema8': number;
    '15m_above': boolean;
    min_profit: number;
  };
  early_exit: {
    met: boolean;
    label: string;
    conditions: EarlyExitConditions;
    conditions_met: number;
    conditions_total: number;
  };
  any_sell: boolean;
  in_position?: boolean;
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
  sellConditions?: SellConditions;
  inPosition: boolean;
  updatedAt?: string;
  mfe?: number;
  pp_stop?: number | null;
  pp_activated?: boolean;
  strategy?: {
    '1m'?: StrategyTimeframe;
    '5m'?: StrategyTimeframe;
    '15m'?: StrategyTimeframe;
    '30m'?: StrategyTimeframe;
    '1h'?: StrategyTimeframe;
    '1d'?: StrategyTimeframe;
    in_position?: boolean;
    smart_trail?: {
      regime: string;
      score: number;
      entry_price: number;
      peak_price: number;
      '15m_ema3': number;
      '15m_ema8': number;
      '15m_above': boolean;
      exit_type: string;
      min_profit: number;
    };
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
  v10Strategy?: V10StrategyStatus | null;
}

export interface KrakenStrategyA {
  name: string;
  in_position: boolean;
  side?: 'LONG' | 'SHORT';
  entry_price?: number;
  current_pnl?: number;
  mfe?: number;
  mae?: number;
  health_score?: number;
  pp_stop?: number | null;
  pp_activated?: boolean;
  pp_reversal_price?: number | null;
  hard_sl: number;
  vanished?: number;
  vanish_threshold: number;
  total_conditions: number;
  elapsed_min?: number;
  timeout_min: number;
  '1h_adx'?: number;
  '1h_ema5_slope'?: number;
  entry_time?: number;
  pp_active?: boolean;
  floor_pct?: number | null;
  floor_price?: number | null;
  current_sl_pct?: number;
  sl_price?: number | null;
  exit_prices?: {
    floor_price?: number | null;
    sl_price?: number | null;
    floor_pct?: number | null;
    sl_pct?: number | null;
  };
  entry_conditions_live?: {
    '1m_golden_cross'?: boolean | { long: boolean; short: boolean };
    '5m_above'?: boolean | { long: boolean; short: boolean };
    '15m_above'?: boolean | { long: boolean; short: boolean };
    '30m_slope_up'?: boolean | { long: boolean; short: boolean };
    '5m_bbw'?: boolean | { long: boolean; short: boolean };
    '15m_bbw'?: boolean | { long: boolean; short: boolean };
    '30m_gap'?: boolean | { long: boolean; short: boolean };
    '30m_adx'?: boolean | { long: boolean; short: boolean };
    '1h_adx'?: boolean | { long: boolean; short: boolean };
  };
  entry_conditions_long?: Record<string, boolean>;
  entry_conditions_short?: Record<string, boolean>;
  entry_details?: EntryDetails;
}

export interface KrakenSellConditions {
  hard_sl: {
    label: string;
    active: boolean;
    threshold: number;
  };
  pp: {
    label: string;
    active: boolean;
    mfe?: number;
    stop_level?: number | null;
    '1h_slope'?: number;
  };
  vanish: {
    label: string;
    current: number;
    threshold: number;
    met: boolean;
  };
  timeout: {
    label: string;
    elapsed: number;
    remaining: number;
    met: boolean;
  };
}

export interface KrakenPosition {
  in_position: boolean;
  position_side?: 'LONG' | 'SHORT';
  inPosition?: boolean;
  side?: 'LONG' | 'SHORT';
  entry_price?: number;
  entryPrice?: number;
  entry_quantity?: number;
  entry_time?: string;
  entryTime?: number;
  currentPrice?: number;
  unrealizedPnlPct?: number;
  currentPnl?: number;
  mfe?: number;
  mae?: number;
  holdHours?: number;
  healthScore?: number;
  mode: string;
  symbol: string;
  exchange: string;
}

export interface KrakenBalance {
  available: number;
  portfolioValue: number;
  currency: string;
  currencies?: {
    [currencyCode: string]: {
      quantity: number;
      valueUsd: number;
    };
  };
}

export interface KrakenFeeRate {
  maker: number;
  taker: number;
  roundTrip: number;
  description: string;
  breakevenLinePct: number;
}

export interface KrakenMetrics {
  portfolioReturn?: number;
  portfolioReturnWithCommission?: number;
  marketReturn?: number;
  avgTradeReturn?: number;
  takeProfitCount?: number;
  stopLossCount?: number;
  totalTrades?: number;
  winRate?: number;
  totalPnl?: number;
}

export interface KrakenTimeframeIndicators {
  ema_short: number;
  ema_long: number;
  above: boolean;
  golden_cross: boolean;
  dead_cross: boolean;
  bbw: number;
  adx: number;
  ema_gap_pct: number;
  ema_slope: number;
}

export interface Kraken15mIndicators extends KrakenTimeframeIndicators {
  ema3: number;
  ema8: number;
  ema3_8_above: boolean;
}

export interface Kraken4hIndicators {
  macd_line: number;
  macd_signal: number;
  macd_hist: number;
  macd_hist_prev: number;
}

export interface KrakenIndicators {
  '1m': KrakenTimeframeIndicators;
  '5m': KrakenTimeframeIndicators;
  '15m': Kraken15mIndicators;
  '30m': KrakenTimeframeIndicators;
  '1h': KrakenTimeframeIndicators;
  '4h': Kraken4hIndicators;
  '1d': KrakenTimeframeIndicators;
  market_regime: 'U' | 'S' | 'D';
  trend_health_score: number;
}

export interface KrakenDashboardData {
  exchange: string;
  accountId: string;
  accountName: string;
  mode: string;
  symbol: string;
  version: string;
  currentPrice: number;
  currentTime: number;
  balance: KrakenBalance;
  position: KrakenPosition;
  strategyA: KrakenStrategyA;
  sellConditions: KrakenSellConditions;
  recentTrades: TradeEvent[];
  feeRate: KrakenFeeRate;
  systemStatus: string;
  metrics?: KrakenMetrics;
  indicators?: KrakenIndicators;
  priceHistory1m?: Candle[];
  priceHistory5m?: Candle[];
  priceHistory15m?: Candle[];
  priceHistory30m?: Candle[];
  priceHistory1h?: Candle[];
  priceHistory4h?: Candle[];
  priceHistory1d?: Candle[];
  priceHistories?: {
    '1m': Candle[];
    '5m': Candle[];
    '15m': Candle[];
    '30m': Candle[];
    '1h': Candle[];
    '4h': Candle[];
    '1d': Candle[];
  };
  strategyStatus?: V10StrategyStatus;
}

export interface BFDashboardData {
  currentPrice: number;
  serverTime: number;
  wsHealthy: boolean;
  exchange: string;
  symbol: string;
  account: {
    id: string;
    name: string;
    mode: string;
    totalAsset: number;
    initialAsset: number;
    currencies: Record<string, { quantity: number; valueUsd: number }>;
    returnPct: number;
  };
  position: {
    inPosition: boolean;
    side: 'LONG' | 'SHORT' | null;
    entryPrice: number | null;
    entryTime: number | null;
    currentPnl: number;
    mfe: number;
    mae?: number;
    health_score?: number;
    ppActivated: boolean;
    ppStop: number | null;
    ppReversalPrice: number | null;
    peakPrice: number | null;
    ppActive?: boolean;
    floorPct?: number | null;
    floorPrice?: number | null;
    currentSlPct?: number;
    slPrice?: number | null;
    exit_prices?: {
      floor_price?: number | null;
      sl_price?: number | null;
      floor_pct?: number | null;
      sl_pct?: number | null;
    };
  };
  strategy: {
    version: string;
    entryConditionsLong: Record<string, boolean>;
    entryConditionsShort: Record<string, boolean>;
    entry_conditions_long?: Record<string, boolean>;
    entry_conditions_short?: Record<string, boolean>;
    entryDetails?: EntryDetails;
    entry_details?: EntryDetails;
    indicators: Record<string, any>;
    pp_reversal_price: number | null;
  };
  metrics: {
    totalTrades: number;
    winRate: number;
    avgPnl: number;
    totalPnl: number;
    marketReturn: number;
  };
  trades: Array<{
    timestamp: number;
    type: string;
    side: string;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnlPercent: number;
    reason: string;
    holdSeconds: number;
  }>;
  recentTrades?: TradeEvent[];
  priceHistories: Record<string, any[]>;
  strategyStatus?: V10StrategyStatus;
}
