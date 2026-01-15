import { DashboardData, ApiResponse, AccountData, TradeEvent } from '../types/dashboard';

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'https://api.hedgetrade.eu';
};

const convertAccountTradesToTradeEvents = (accountTrades: AccountData['trades']): TradeEvent[] => {
  const events: TradeEvent[] = [];

  if (!accountTrades || !Array.isArray(accountTrades)) {
    return events;
  }

  accountTrades.forEach((trade, index) => {
    const pairId = `pair_${trade.entryTime}_${index}`;

    events.push({
      timestamp: trade.entryTime,
      type: 'buy',
      price: trade.entryPrice,
      pairId,
    });

    if (trade.completed) {
      events.push({
        timestamp: trade.exitTime,
        type: 'sell',
        price: trade.exitPrice,
        profit: trade.pnlPct,
        pairId,
      });
    }
  });

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
      bbUpper: c.bbUpper,
      bbMiddle: c.bbMiddle,
      bbLower: c.bbLower,
      bbWidth: c.bbWidth,
      macd: c.macd,
      signal: c.signal,
      histogram: c.histogram,
      rsi: c.rsi,
    })) || [];

    const priceHistory = apiResponse.priceHistory || {};

    return {
      version: apiResponse.version,
      currentAsset: account.asset.currentAsset,
      currentBTC: account.asset.currentBTC,
      currentCash: account.asset.currentCash,
      initialAsset: account.asset.initialAsset,
      currentTime: apiResponse.currentTime,
      currentPrice: apiResponse.currentPrice,
      priceHistory1m: mapCandles(priceHistory['1m']),
      priceHistory5m: mapCandles(priceHistory['5m']),
      priceHistory15m: mapCandles(priceHistory['15m']),
      priceHistory30m: mapCandles(priceHistory['30m']),
      priceHistory1h: mapCandles(priceHistory['1h']),
      priceHistory4h: mapCandles(priceHistory['4h']),
      priceHistory1d: mapCandles(priceHistory['1d']),
      pricePredictions: [],
      trades: convertAccountTradesToTradeEvents(account.trades),
      holding: {
        isHolding: account.holding.hasPosition,
        buyPrice: account.holding.entryPrice,
        buyTime: account.holding.entryTime,
        currentProfit: account.holding.unrealizedPnlPct,
        takeProfitPrice: account.holding.tpPrice,
        stopLossPrice: account.holding.slPrice,
        initialTakeProfitProb: account.holding.initialTakeProfitProb,
        v5MoeTakeProfitProb: apiResponse.currentPrediction.v5MoeTakeProfitProb,
        latestPrediction: {
          takeProfitProb: apiResponse.currentPrediction.takeProfitProb,
          stopLossProb: apiResponse.currentPrediction.stopLossProb,
        },
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
        portfolioReturn: account.metrics.portfolioReturn,
        portfolioReturnWithCommission: account.metrics.portfolioReturnWithCommission,
        marketReturn: apiResponse.metrics.marketReturn ?? 0,
        avgTradeReturn: account.metrics.avgPnl ?? 0,
        takeProfitCount: account.metrics.winningTrades,
        stopLossCount: account.metrics.totalTrades - account.metrics.winningTrades,
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
    bbUpper: c.bbUpper,
    bbMiddle: c.bbMiddle,
    bbLower: c.bbLower,
    bbWidth: c.bbWidth,
    macd: c.macd,
    signal: c.signal,
    histogram: c.histogram,
    rsi: c.rsi,
  })) || [];

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
    priceHistory1m: (apiResponse as any).priceHistory1m ? mapCandles((apiResponse as any).priceHistory1m) : [],
    priceHistory5m: (apiResponse as any).priceHistory5m ? mapCandles((apiResponse as any).priceHistory5m) : undefined,
    priceHistory15m: (apiResponse as any).priceHistory15m ? mapCandles((apiResponse as any).priceHistory15m) : undefined,
    priceHistory30m: (apiResponse as any).priceHistory30m ? mapCandles((apiResponse as any).priceHistory30m) : undefined,
    priceHistory1h: (apiResponse as any).priceHistory1h ? mapCandles((apiResponse as any).priceHistory1h) : undefined,
    priceHistory4h: (apiResponse as any).priceHistory4h ? mapCandles((apiResponse as any).priceHistory4h) : undefined,
    priceHistory1d: (apiResponse as any).priceHistory1d ? mapCandles((apiResponse as any).priceHistory1d) : undefined,
    pricePredictions: (apiResponse as any).pricePredictions ? mapCandles((apiResponse as any).pricePredictions) : [],
    trades,
    holding: {
      isHolding: (apiResponse as any).holding?.isHolding ?? false,
      buyPrice: (apiResponse as any).holding?.buyPrice,
      buyTime: (apiResponse as any).holding?.buyTime,
      currentProfit: (apiResponse as any).holding?.currentProfit,
      takeProfitPrice: (apiResponse as any).holding?.takeProfitPrice,
      stopLossPrice: (apiResponse as any).holding?.stopLossPrice,
      initialTakeProfitProb: (apiResponse as any).holding?.initialTakeProfitProb,
      v5MoeTakeProfitProb: apiResponse.currentPrediction?.v5MoeTakeProfitProb,
      latestPrediction: {
        takeProfitProb: apiResponse.currentPrediction?.takeProfitProb ?? 0,
        stopLossProb: apiResponse.currentPrediction?.stopLossProb ?? 0,
      },
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
      marketReturn: (apiResponse as any).metrics?.marketReturn ?? 0,
      avgTradeReturn: (apiResponse as any).metrics?.avgTradeReturn ?? 0,
      takeProfitCount: (apiResponse as any).metrics?.takeProfitCount ?? 0,
      stopLossCount: (apiResponse as any).metrics?.stopLossCount ?? 0,
    },
  };
};

export const fetchChartData = async (timeframe: string, limit: number = 500) => {
  const isDev = import.meta.env.DEV;
  const baseUrl = isDev ? 'http://130.61.50.101:54321' : getApiUrl();
  const url = `${baseUrl}/api/chart/${timeframe}?limit=${limit}`;

  console.log(`📊 Fetching ${timeframe} chart data from:`, url);

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
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
      bbUpper: c.bbUpper,
      bbMiddle: c.bbMiddle,
      bbLower: c.bbLower,
      bbWidth: c.bbWidth,
      macd: c.macd,
      signal: c.signal,
      histogram: c.histogram,
      rsi: c.rsi,
    })) || [];

    console.log(`✅ ${timeframe} chart data loaded: ${chartResponse.candles.length} candles`);

    return {
      timeframe: chartResponse.timeframe,
      candles: mapCandles(chartResponse.candles),
      count: chartResponse.count,
      source: chartResponse.source,
    };
  } catch (error) {
    console.error(`❌ Failed to fetch ${timeframe} chart data:`, error);
    throw error;
  }
};

export const fetchDashboardData = async (accountId: string): Promise<DashboardData> => {
  const isDev = import.meta.env.DEV;
  const baseUrl = isDev ? 'http://130.61.50.101:54321' : getApiUrl();
  const url = `${baseUrl}/api/dashboard?_=${Date.now()}`;

  console.log('🔍 Fetching dashboard data from:', url);
  console.log('🔍 Environment:', isDev ? 'Development' : 'Production');

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
    });

    console.log('✅ API Response status:', response.status);

    if (!response.ok) {
      throw new Error(`Oracle VM unavailable: ${response.status} ${response.statusText}`);
    }

    const apiResponse: ApiResponse = await response.json();
    console.log('✅ API Response received:', apiResponse ? 'Valid' : 'Empty');

    if (!apiResponse) {
      throw new Error('Empty API response');
    }

    const dashboardData = convertApiResponseToDashboardData(apiResponse, accountId);
    console.log('✅ Dashboard data converted successfully');

    return dashboardData;
  } catch (error) {
    console.error('❌ Failed to fetch dashboard data:', error);
    throw error;
  }
};
