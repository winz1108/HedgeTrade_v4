import { DashboardData, ApiResponse, TradeEvent, StrategyStatus, KrakenDashboardData, Candle } from '../types/dashboard';

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'https://api.hedgetrade.eu';
};

export interface DashboardQuick {
  currentPrice: number;
  currentPrediction: {
    takeProfitProb: number;
    stopLossProb?: number;
    v5MoeTakeProfitProb?: number;
    predictionCalculatedAt: number;
  };
  accounts: Array<{
    accountId: string;
    btcBalance: number;
    btcFree: number;
    btcLocked: number;
    usdcBalance: number;
    btcValue: number;
    totalAsset: number;
  }>;
  totalBtc: number;
  totalUsdc: number;
  totalAsset: number;
  timestamp: number;
}

const convertAccountTradesToTradeEvents = (accountTrades: any[], hasPosition: boolean, entryTime?: number): TradeEvent[] => {
  if (!accountTrades || !Array.isArray(accountTrades)) {
    return [];
  }

  return accountTrades.map(trade => ({
    timestamp: trade.timestamp,
    type: trade.type,
    price: trade.price,
    quantity: trade.quantity,
    profit: trade.profit || trade.pnl_pct,
    pairId: trade.pairId || trade.pair_id,
    exitReason: trade.exitReason,
    pnl: trade.pnl,
    buyCost: trade.buyCost,
    sellRevenue: trade.sellRevenue,
    buyQty: trade.buyQty,
    sellQty: trade.sellQty,
    buyCommission: trade.buyCommission,
    sellCommission: trade.sellCommission,
    entryPrice: trade.entryPrice,
    entryTime: trade.entryTime,
    profitNoCommission: trade.profitNoCommission,
    pnlWithCommission: trade.pnlWithCommission,
  })).sort((a, b) => a.timestamp - b.timestamp);
};

const convertApiResponseToDashboardData = (
  apiResponse: ApiResponse,
  selectedAccountId: string
): DashboardData => {
  // accounts 배열이 있으면 사용, 없으면 단일 구조로 처리
  if (apiResponse.accounts && apiResponse.accounts.length > 0) {
    let account = apiResponse.accounts.find(acc => acc.accountId === selectedAccountId);

    if (!account) {
      account = apiResponse.accounts[0];
    }

    const mapCandles = (candles: any[]) => {
      if (!candles || !Array.isArray(candles)) return [];

      return candles.map(c => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        ema5: c.ema5,
        ema13: c.ema13,
        ema_short: c.ema_short || c.ema5,
        ema_long: c.ema_long || c.ema13,
        ema20: c.ema20 ?? c.ema8,
        ema50: c.ema50 ?? c.ema13,
        ema200: c.ema200,
        ema3: c.ema3,
        ema8: c.ema8,
        bb_upper: c.bb_upper,
        bb_mid: c.bb_mid || c.bb_middle,
        bb_lower: c.bb_lower,
        bbUpper: c.bbUpper || c.bb_upper,
        bbMiddle: c.bbMiddle || c.bb_middle || c.bb_mid,
        bbLower: c.bbLower || c.bb_lower,
        bbWidth: c.bbWidth || c.bb_width,
        macd: c.macd,
        signal: c.signal || c.macd_signal,
        histogram: c.histogram || c.macd_histogram,
        rsi: c.rsi,
        adx: c.adx,
        isComplete: c.isComplete !== undefined ? c.isComplete : true,
      }));
    };

    return {
      version: apiResponse.version,
      currentAsset: account.asset.currentAsset,
      currentBTC: account.asset.currentBTC,
      currentCash: account.asset.currentCash,
      initialAsset: account.asset.initialAsset,
      currentTime: apiResponse.currentTime,
      currentPrice: apiResponse.currentPrice,
      priceHistory1m: mapCandles((apiResponse as any).priceHistory1m),
      priceHistory5m: mapCandles((apiResponse as any).priceHistory5m),
      priceHistory15m: mapCandles((apiResponse as any).priceHistory15m),
      priceHistory30m: mapCandles((apiResponse as any).priceHistory30m),
      priceHistory1h: mapCandles((apiResponse as any).priceHistory1h),
      priceHistory4h: mapCandles((apiResponse as any).priceHistory4h),
      priceHistory1d: mapCandles((apiResponse as any).priceHistory1d),
      pricePredictions: [],
      trades: convertAccountTradesToTradeEvents(account.trades, account.holding.hasPosition, account.holding.entryTime),
      holding: {
        isHolding: account.holding.hasPosition,
        buyPrice: account.holding.entryPrice,
        buyTime: account.holding.entryTime,
        currentProfit: account.holding.unrealizedPnlPct,
        tpPrice: account.holding.tpPrice,
        initialTakeProfitProb: account.holding.initialTakeProfitProb,
        v5MoeTakeProfitProb: apiResponse.currentPrediction.v5MoeTakeProfitProb,
        latestPrediction: {
          takeProfitProb: apiResponse.currentPrediction.takeProfitProb,
          stopLossProb: apiResponse.currentPrediction.stopLossProb,
        },
      },
      prediction: apiResponse.prediction || {
        market_mood: undefined,
        threshold_v8: undefined,
        bb_touch: undefined,
        takeProfitProb: undefined,
      },
      currentPrediction: {
        takeProfitProb: apiResponse.currentPrediction.takeProfitProb,
        stopLossProb: apiResponse.currentPrediction.stopLossProb,
        v5MoeTakeProfitProb: apiResponse.currentPrediction.v5MoeTakeProfitProb,
        predictionDataTimestamp: apiResponse.currentPrediction.predictionTargetTimestampMs,
        predictionCalculatedAt: apiResponse.currentPrediction.lastUpdateTime,
      },
      lastPredictionUpdateTime: apiResponse.lastPredictionUpdateTime,
      marketState: apiResponse.marketState,
      gateWeights: apiResponse.gateWeights,
      strategyStatus: apiResponse.strategyStatus || null,
      metrics: {
        portfolioReturn: account.metrics.portfolioReturn ?? 0,
        portfolioReturnWithCommission: account.metrics.portfolioReturnWithCommission ?? account.metrics.portfolioReturn,
        actualReturn: (account.metrics as any).actualReturn ?? account.metrics.portfolioReturnWithCommission,
        marketReturn: (apiResponse.metrics as any)?.marketChange ?? (apiResponse.metrics as any)?.marketReturn ?? 0,
        avgTradeReturn: (account.metrics as any).avgTradeReturn ?? (account.metrics as any).avgPnl ?? 0,
        takeProfitCount: (account.metrics as any).takeProfitCount ?? (account as any).tradeStats?.takeProfitExits ?? 0,
        stopLossCount: (account.metrics as any).stopLossCount ?? (account as any).tradeStats?.stopLossExits ?? 0,
        totalTrades: account.metrics.totalTrades,
        winningTrades: account.metrics.winningTrades,
        winRate: account.metrics.winRate,
        totalPnl: account.metrics.totalPnl,
      },
      accountId: selectedAccountId,
      accountName: account.accountName,
      availableAccounts: apiResponse.accounts.map(acc => ({
        id: acc.accountId,
        name: acc.accountName || acc.accountId
      })),
    };
  }

  // 단일 구조 (API_SPEC.md 형식)
  const mapCandlesSingle = (candles: any[]) => {
    if (!candles || !Array.isArray(candles)) return [];

    return candles.map(c => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      ema5: c.ema5,
      ema13: c.ema13,
      ema_short: c.ema_short || c.ema5,
      ema_long: c.ema_long || c.ema13,
      ema20: c.ema20 ?? c.ema8,
      ema50: c.ema50 ?? c.ema13,
      ema200: c.ema200,
      ema3: c.ema3,
      ema8: c.ema8,
      bb_upper: c.bb_upper,
      bb_mid: c.bb_mid || c.bb_middle,
      bb_lower: c.bb_lower,
      bbUpper: c.bbUpper,
      bbMiddle: c.bbMiddle,
      bbLower: c.bbLower,
      bbWidth: c.bbWidth,
      macd: c.macd,
      signal: c.signal,
      histogram: c.histogram,
      rsi: c.rsi,
      adx: c.adx,
      isComplete: c.isComplete !== undefined ? c.isComplete : true,
    }));
  };

  // priceHistory1m 등이 최상위에 있는 경우
  let trades = Array.isArray(apiResponse.trades)
    ? apiResponse.trades.map((t: any) => ({
        timestamp: t.timestamp,
        type: t.type,
        price: t.price,
        profit: t.profit,
        pairId: t.pairId || t.pair_id || undefined,
        prediction: t.prediction,
      }))
    : [];

  const hasPairIds = trades.some(t => t.pairId);

  if (!hasPairIds && trades.length > 0) {
    trades.sort((a, b) => a.timestamp - b.timestamp);

    const unpaired = [...trades];
    let pairCounter = 0;

    while (unpaired.length >= 2) {
      const buyIndex = unpaired.findIndex(t => t.type === 'buy');
      if (buyIndex === -1) break;

      const sellIndex = unpaired.findIndex((t, i) => i > buyIndex && t.type === 'sell');
      if (sellIndex === -1) break;

      const pairId = `auto_pair_${pairCounter++}`;
      unpaired[buyIndex].pairId = pairId;
      unpaired[sellIndex].pairId = pairId;

      unpaired.splice(sellIndex, 1);
      unpaired.splice(buyIndex, 1);
    }
  }

  return {
    version: apiResponse.version,
    currentAsset: (apiResponse as any).currentAsset ?? 0,
    currentBTC: (apiResponse as any).currentBTC,
    currentCash: (apiResponse as any).currentCash,
    initialAsset: (apiResponse as any).initialAsset ?? 0,
    currentTime: apiResponse.currentTime,
    currentPrice: apiResponse.currentPrice,
    priceHistory1m: (apiResponse as any).priceHistory1m ? mapCandlesSingle((apiResponse as any).priceHistory1m) : [],
    priceHistory5m: (apiResponse as any).priceHistory5m ? mapCandlesSingle((apiResponse as any).priceHistory5m) : undefined,
    priceHistory15m: (apiResponse as any).priceHistory15m ? mapCandlesSingle((apiResponse as any).priceHistory15m) : undefined,
    priceHistory30m: (apiResponse as any).priceHistory30m ? mapCandlesSingle((apiResponse as any).priceHistory30m) : undefined,
    priceHistory1h: (apiResponse as any).priceHistory1h ? mapCandlesSingle((apiResponse as any).priceHistory1h) : undefined,
    priceHistory4h: (apiResponse as any).priceHistory4h ? mapCandlesSingle((apiResponse as any).priceHistory4h) : undefined,
    priceHistory1d: (apiResponse as any).priceHistory1d ? mapCandlesSingle((apiResponse as any).priceHistory1d) : undefined,
    pricePredictions: (apiResponse as any).pricePredictions ? mapCandlesSingle((apiResponse as any).pricePredictions) : [],
    trades,
    holding: {
      isHolding: (apiResponse as any).holding?.isHolding ?? false,
      buyPrice: (apiResponse as any).holding?.buyPrice,
      buyTime: (apiResponse as any).holding?.buyTime,
      currentProfit: (apiResponse as any).holding?.currentProfit,
      tpPrice: (apiResponse as any).holding?.tpPrice,
      initialTakeProfitProb: (apiResponse as any).holding?.initialTakeProfitProb,
      v5MoeTakeProfitProb: apiResponse.currentPrediction?.v5MoeTakeProfitProb,
      latestPrediction: {
        takeProfitProb: apiResponse.currentPrediction?.takeProfitProb ?? 0,
        stopLossProb: apiResponse.currentPrediction?.stopLossProb ?? 0,
      },
    },
    prediction: apiResponse.prediction || {
      market_mood: undefined,
      threshold_v8: undefined,
      bb_touch: undefined,
      takeProfitProb: undefined,
    },
    currentPrediction: {
      takeProfitProb: apiResponse.currentPrediction?.takeProfitProb ?? 0,
      stopLossProb: apiResponse.currentPrediction?.stopLossProb ?? 0,
      v5MoeTakeProfitProb: apiResponse.currentPrediction?.v5MoeTakeProfitProb,
      predictionDataTimestamp: apiResponse.currentPrediction?.predictionTargetTimestampMs,
      predictionCalculatedAt: apiResponse.currentPrediction?.lastUpdateTime,
    },
    lastPredictionUpdateTime: apiResponse.lastPredictionUpdateTime,
    marketState: apiResponse.marketState,
    gateWeights: apiResponse.gateWeights,
    metrics: {
      portfolioReturn: (apiResponse as any).metrics?.portfolioReturn ?? 0,
      portfolioReturnWithCommission: (apiResponse as any).metrics?.portfolioReturnWithCommission,
      marketReturn: (apiResponse as any).metrics?.marketChange ?? (apiResponse as any).metrics?.marketReturn ?? 0,
      avgTradeReturn: (apiResponse as any).metrics?.avgTradeReturn ?? 0,
      takeProfitCount: (apiResponse as any).metrics?.takeProfitCount ?? 0,
      stopLossCount: (apiResponse as any).metrics?.stopLossCount ?? 0,
    },
  };
};

export const fetchChartData = async (timeframe: string, limit: number = 500) => {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/chart/${timeframe}?limit=${limit}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch chart data: ${response.status} ${response.statusText}`);
    }

    const chartResponse = await response.json();

    if (!chartResponse.success) {
      throw new Error(chartResponse.error || 'Failed to load chart data');
    }

    const mapCandles = (candles: any[]) => candles?.map(c => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      ema5: c.ema5,
      ema13: c.ema13,
      ema_short: c.ema_short || c.ema5,
      ema_long: c.ema_long || c.ema13,
      ema20: c.ema20 ?? c.ema8,
      ema50: c.ema50 ?? c.ema13,
      ema200: c.ema200,
      ema3: c.ema3,
      ema8: c.ema8,
      bb_upper: c.bb_upper,
      bb_mid: c.bb_mid || c.bb_middle,
      bb_lower: c.bb_lower,
      bbUpper: c.bbUpper || c.bb_upper,
      bbMiddle: c.bbMiddle || c.bb_middle || c.bb_mid,
      bbLower: c.bbLower || c.bb_lower,
      bbWidth: c.bbWidth || c.bb_width,
      macd: c.macd,
      signal: c.signal || c.macd_signal,
      histogram: c.histogram || c.macd_histogram,
      rsi: c.rsi,
      adx: c.adx,
      isComplete: c.isComplete !== undefined ? c.isComplete : true,
    })) || [];

    const mappedCandles = mapCandles(chartResponse.candles);

    return {
      timeframe: chartResponse.timeframe,
      candles: mappedCandles,
      count: chartResponse.count,
      source: chartResponse.source,
    };
  } catch (error) {
    throw error;
  }
};

export const fetchDashboardQuick = async (): Promise<DashboardQuick> => {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/dashboard/quick`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch quick dashboard: ${response.status} ${response.statusText}`);
    }

    const data: DashboardQuick = await response.json();

    return data;
  } catch (error) {
    throw error;
  }
};

export const fetchDashboardData = async (accountId: string): Promise<DashboardData> => {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/dashboard?_=${Date.now()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Oracle VM unavailable: ${response.status} ${response.statusText}`);
    }

    const apiResponse: ApiResponse = await response.json();

    if (!apiResponse) {
      throw new Error('Empty API response');
    }

    const dashboardData = convertApiResponseToDashboardData(apiResponse, accountId);

    return dashboardData;
  } catch (error) {
    throw error;
  }
};

export const fetchStrategyStatus = async (): Promise<StrategyStatus | null> => {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/strategy-status`;

  try {
    const response = await fetch(url);

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 'ok') return null;

    return {
      buyConditions: data.buy_conditions,
      buyConditionsMet: data.buy_conditions_met,
      buyConditionsTotal: data.buy_conditions_total,
      allBuyMet: data.all_buy_met,
      sellSignal: data.sell_signal,
      sellConditions: data.sell_conditions,
      inPosition: data.strategy?.in_position ?? false,
      updatedAt: data.updated_at,
      strategy: data.strategy,
    };
  } catch {
    return null;
  }
};

const normalizeStrategyStatus = (raw: any): any => {
  if (!raw) return null;
  return {
    ...raw,
    inPosition: raw.inPosition ?? raw.in_position ?? false,
    positionSide: raw.positionSide ?? raw.position_side ?? null,
    entryPrice: raw.entryPrice ?? raw.entry_price,
    currentPnl: raw.currentPnl ?? raw.current_pnl,
    allBuyMet: raw.allBuyMet ?? raw.all_buy_met,
    buyConditionsMet: raw.buyConditionsMet ?? raw.buy_conditions_met,
    buyConditionsTotal: raw.buyConditionsTotal ?? raw.buy_conditions_total,
    buyConditions: raw.buyConditions ?? raw.buy_conditions,
    vwapBandSeries: raw.vwapBandSeries ?? raw.vwap_band_series,
    exitPrices: raw.exitPrices ?? raw.exit_prices,
    exitConditions: raw.exitConditions ?? raw.exit_conditions,
    entryDetails: raw.entryDetails ?? raw.entry_details,
    holdHours: raw.holdHours ?? raw.hold_hours,
    updatedAt: raw.updatedAt ?? raw.updated_at,
    entryMode: raw.entryMode ?? raw.entry_mode,
    consecCutCount: raw.consecCutCount ?? raw.consec_cut_count,
    consecCutDir: raw.consecCutDir ?? raw.consec_cut_dir,
    rideMfePct: raw.rideMfePct ?? raw.ride_mfe_pct,
    strategy_version: raw.strategy_version ?? raw.strategyVersion,
    strategyParams: raw.strategyParams ?? raw.strategy_params,
    v32: raw.v32,
  };
};

const normalizeKrakenCandles = (candles: any[]): Candle[] => {
  if (!candles || candles.length === 0) return [];

  return candles.map(candle => ({
    timestamp: candle.timestamp || candle.time * 1000,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    isComplete: candle.isComplete,
    isPrediction: candle.isPrediction,
    ema5: candle.ema5,
    ema13: candle.ema13,
    ema20: candle.ema20 ?? candle.ema8,
    ema50: candle.ema50 ?? candle.ema13,
    ema200: candle.ema200,
    ema3: candle.ema3,
    ema8: candle.ema8,
    bb_upper: candle.bb_upper,
    bb_lower: candle.bb_lower,
    bbUpper: candle.bbUpper,
    bbMiddle: candle.bbMiddle,
    bbLower: candle.bbLower,
    bbWidth: candle.bbWidth,
    macd: candle.macd,
    signal: candle.signal,
    histogram: candle.histogram,
    rsi: candle.rsi,
    adx: candle.adx,
  }));
};

export const fetchKrakenDashboard = async (): Promise<KrakenDashboardData> => {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/kraken/dashboard?_=${Date.now()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Kraken API unavailable: ${response.status} ${response.statusText}`);
    }

    const rawData: any = await response.json();

    const ssRaw = normalizeStrategyStatus(rawData.strategyStatus || rawData.strategy_status || null);

    const data: KrakenDashboardData = {
      ...rawData,
      strategyStatus: ssRaw,
      priceHistory1m: normalizeKrakenCandles(rawData.priceHistories?.['1m'] || rawData.priceHistory1m || []),
      priceHistory5m: normalizeKrakenCandles(rawData.priceHistories?.['5m'] || rawData.priceHistory5m || []),
      priceHistory15m: normalizeKrakenCandles(rawData.priceHistories?.['15m'] || rawData.priceHistory15m || []),
      priceHistory30m: normalizeKrakenCandles(rawData.priceHistories?.['30m'] || rawData.priceHistory30m || []),
      priceHistory1h: normalizeKrakenCandles(rawData.priceHistories?.['1h'] || rawData.priceHistory1h || []),
      priceHistory4h: normalizeKrakenCandles(rawData.priceHistories?.['4h'] || rawData.priceHistory4h || []),
      priceHistory1d: normalizeKrakenCandles(rawData.priceHistories?.['1d'] || rawData.priceHistory1d || []),
    };

    return data;
  } catch (error) {
    throw error;
  }
};

export const fetchKrakenChartData = async (timeframe: string, limit: number = 1000) => {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/kraken/chart/${timeframe}?limit=${limit}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch chart data: ${response.status} ${response.statusText}`);
    }

    const chartResponse = await response.json();

    if (!chartResponse.success) {
      throw new Error(chartResponse.error || 'Failed to load chart data');
    }

    const mapCandles = (candles: any[]): Candle[] => candles?.map(c => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      ema5: c.ema5,
      ema13: c.ema13,
      ema20: c.ema20 ?? c.ema8,
      ema50: c.ema50 ?? c.ema13,
      ema200: c.ema200,
      ema3: c.ema3,
      ema8: c.ema8,
      bb_upper: c.bb_upper,
      bb_lower: c.bb_lower,
      bbUpper: c.bbUpper || c.bb_upper,
      bbMiddle: c.bbMiddle || c.bb_middle,
      bbLower: c.bbLower || c.bb_lower,
      bbWidth: c.bbWidth || c.bb_width,
      macd: c.macd,
      signal: c.signal || c.macd_signal,
      histogram: c.histogram || c.macd_histogram,
      rsi: c.rsi,
      adx: c.adx,
      isComplete: c.isComplete !== undefined ? c.isComplete : true,
    })) || [];

    const mappedCandles = mapCandles(chartResponse.candles);

    return {
      timeframe: chartResponse.timeframe,
      candles: mappedCandles,
      count: chartResponse.count,
      source: chartResponse.source,
    };
  } catch (error) {
    throw error;
  }
};

export const fetchBinanceFuturesDashboard = async (): Promise<any> => {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/binance-futures/dashboard?_=${Date.now()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Binance Futures API unavailable: ${response.status} ${response.statusText}`);
    }

    const rawData: any = await response.json();

    rawData.strategyStatus = normalizeStrategyStatus(rawData.strategyStatus || rawData.strategy_status || null);

    if (rawData.position) {
      const p = rawData.position;
      rawData.position = {
        ...p,
        inPosition: p.inPosition ?? p.in_position ?? false,
        entryPrice: p.entryPrice ?? p.entry_price,
        entryTime: p.entryTime ?? p.entry_time,
        currentPnl: p.currentPnl ?? p.current_pnl,
        side: p.side ?? p.position_side,
        entry_mode: p.entry_mode ?? p.entryMode,
      };
    }


    return rawData;
  } catch (error) {
    throw error;
  }
};

export const fetchBinanceFuturesChartData = async (timeframe: string, limit: number = 500) => {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/api/binance-futures/chart/${timeframe}/${limit}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch Binance Futures chart data: ${response.status} ${response.statusText}`);
    }

    const chartResponse = await response.json();

    const mapCandles = (candles: any[]): any[] => candles?.map(c => ({
      time: c.time,
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      ema_short: c.ema_short,
      ema_long: c.ema_long,
      ema20: c.ema20 ?? c.ema8,
      ema50: c.ema50 ?? c.ema13,
      ema200: c.ema200,
      ema3: c.ema3,
      ema8: c.ema8,
      macd: c.macd,
      macd_line: c.macd_line,
      signal: c.signal,
      macd_signal: c.macd_signal,
      histogram: c.histogram,
      macd_hist: c.macd_hist,
      rsi: c.rsi,
      adx: c.adx,
      bbw: c.bbw,
      bb_upper: c.bb_upper,
      bb_mid: c.bb_mid,
      bb_lower: c.bb_lower,
    })) || [];

    const mappedCandles = mapCandles(chartResponse.candles);

    return {
      candles: mappedCandles,
    };
  } catch (error) {
    throw error;
  }
};
