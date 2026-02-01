import { DashboardData, ApiResponse, AccountData, TradeEvent } from '../types/dashboard';

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
  const events: TradeEvent[] = [];

  if (!accountTrades || !Array.isArray(accountTrades)) {
    return events;
  }

  // 시간순 정렬
  const sortedTrades = [...accountTrades].sort((a, b) => a.timestamp - b.timestamp);

  // Entry-Exit 페어 생성
  const entries: any[] = [];
  const exits: any[] = [];

  for (const trade of sortedTrades) {
    if (trade.type === 'entry' || trade.type === 'buy') {
      entries.push(trade);
    } else if (trade.type === 'exit' || trade.type === 'sell') {
      exits.push(trade);
    }
  }

  // 페어링: 각 Entry에 대응하는 Exit 찾기
  let pairCount = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLastEntry = i === entries.length - 1;
    const isHoldingThisPosition = hasPosition && isLastEntry && entryTime && Math.abs(entry.timestamp - entryTime) < 5000;

    // Exit 찾기 - Entry보다 나중이고 아직 페어링되지 않은 것
    const exit = exits[i]; // 순서대로 페어링

    const pairId = `pair_${pairCount}`;

    // Entry 추가
    events.push({
      timestamp: entry.timestamp,
      type: 'buy',
      price: entry.price,
      quantity: entry.quantity,
      pairId: pairId,
    });

    // Exit이 있으면 추가 (보유중이 아닌 경우)
    if (exit && !isHoldingThisPosition) {
      const profitPct = ((exit.price - entry.price) / entry.price) * 100;

      events.push({
        timestamp: exit.timestamp,
        type: 'sell',
        price: exit.price,
        quantity: exit.quantity,
        profit: profitPct,
        pairId: pairId,
      });
    }

    pairCount++;
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
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
        ema20: c.ema20,
        ema50: c.ema50,
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
        slPrice: account.holding.slPrice,
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
      metrics: {
        portfolioReturn: account.metrics.portfolioReturn ?? 0,
        portfolioReturnWithCommission: account.metrics.portfolioReturnWithCommission ?? account.metrics.portfolioReturn,
        marketReturn: (apiResponse.metrics as any)?.marketChange ?? (apiResponse.metrics as any)?.marketReturn ?? 0,
        avgTradeReturn: account.metrics.avgTradeReturn ?? (account.metrics as any).avgPnl ?? 0,
        takeProfitCount: account.metrics.takeProfitCount ?? (account as any).tradeStats?.takeProfitExits ?? 0,
        stopLossCount: account.metrics.stopLossCount ?? (account as any).tradeStats?.stopLossExits ?? 0,
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
      ema20: c.ema20,
      ema50: c.ema50,
      bb_upper: c.bb_upper,
      bb_lower: c.bb_lower,
      bbUpper: c.bbUpper,
      bbMiddle: c.bbMiddle,
      bbLower: c.bbLower,
      bbWidth: c.bbWidth,
      macd: c.macd,
      signal: c.signal,
      histogram: c.histogram,
      rsi: c.rsi,
      isComplete: c.isComplete !== undefined ? c.isComplete : true,
    }));
  };

  // priceHistory1m 등이 최상위에 있는 경우
  const trades = Array.isArray(apiResponse.trades)
    ? apiResponse.trades.map((t: any, index: number) => {
        const pairId = t.pairId || `pair_${t.timestamp}_${index}`;
        return {
          timestamp: t.timestamp,
          type: t.type,
          price: t.price,
          profit: t.profit,
          pairId,
          prediction: t.prediction,
        };
      })
    : [];

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
      slPrice: (apiResponse as any).holding?.slPrice,
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
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

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
      ema20: c.ema20,
      ema50: c.ema50,
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
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

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
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
    });

    if (!response.ok) {
      throw new Error(`Oracle VM unavailable: ${response.status} ${response.statusText}`);
    }

    const apiResponse: ApiResponse = await response.json();

    if (!apiResponse) {
      throw new Error('Empty API response');
    }

    console.log('[fetchDashboardData] API response prediction:', apiResponse.prediction);
    console.log('[fetchDashboardData] API response marketState:', apiResponse.marketState);

    const dashboardData = convertApiResponseToDashboardData(apiResponse, accountId);

    console.log('[fetchDashboardData] Transformed prediction:', dashboardData.prediction);

    return dashboardData;
  } catch (error) {
    throw error;
  }
};
