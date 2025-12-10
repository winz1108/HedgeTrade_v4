import { DashboardData, ApiResponse, AccountData, TradeEvent } from '../types/dashboard';

const getApiUrl = () => {
  if (import.meta.env.DEV) {
    return '';
  }
  return '/.netlify/functions/oracle-proxy';
};

const convertAccountTradesToTradeEvents = (accountTrades: AccountData['trades']): TradeEvent[] => {
  const events: TradeEvent[] = [];

  accountTrades.forEach(trade => {
    events.push({
      timestamp: trade.entryTime,
      type: 'buy',
      price: trade.entryPrice,
    });

    if (trade.completed) {
      events.push({
        timestamp: trade.exitTime,
        type: 'sell',
        price: trade.exitPrice,
        profit: trade.pnl,
      });
    }
  });

  return events.sort((a, b) => a.timestamp - b.timestamp);
};

const convertApiResponseToDashboardData = (
  apiResponse: ApiResponse,
  selectedAccountId: string
): DashboardData => {
  let account = apiResponse.accounts.find(acc => acc.accountId === selectedAccountId);

  if (!account && apiResponse.accounts.length > 0) {
    account = apiResponse.accounts[0];
  }

  if (!account) {
    throw new Error('No accounts available');
  }

  const priceHistory1m = apiResponse.priceHistory1m.map(candle => ({
    timestamp: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    ema20: candle.ema20,
    ema50: candle.ema50,
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
  }));

  return {
    version: apiResponse.version,
    currentAsset: account.asset.currentAsset,
    currentBTC: account.asset.currentBTC,
    currentCash: account.asset.currentCash,
    initialAsset: account.asset.initialAsset,
    currentTime: apiResponse.currentTime,
    currentPrice: apiResponse.currentPrice,
    priceHistory1m,
    priceHistory5m: apiResponse.priceHistory5m?.map(c => ({ timestamp: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume, ema20: c.ema20, ema50: c.ema50, bb_upper: c.bb_upper, bb_lower: c.bb_lower, bbUpper: c.bbUpper, bbMiddle: c.bbMiddle, bbLower: c.bbLower, bbWidth: c.bbWidth, macd: c.macd, signal: c.signal, histogram: c.histogram, rsi: c.rsi })),
    priceHistory15m: apiResponse.priceHistory15m?.map(c => ({ timestamp: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume, ema20: c.ema20, ema50: c.ema50, bb_upper: c.bb_upper, bb_lower: c.bb_lower, bbUpper: c.bbUpper, bbMiddle: c.bbMiddle, bbLower: c.bbLower, bbWidth: c.bbWidth, macd: c.macd, signal: c.signal, histogram: c.histogram, rsi: c.rsi })),
    priceHistory1h: apiResponse.priceHistory1h?.map(c => ({ timestamp: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume, ema20: c.ema20, ema50: c.ema50, bb_upper: c.bb_upper, bb_lower: c.bb_lower, bbUpper: c.bbUpper, bbMiddle: c.bbMiddle, bbLower: c.bbLower, bbWidth: c.bbWidth, macd: c.macd, signal: c.signal, histogram: c.histogram, rsi: c.rsi })),
    priceHistory4h: apiResponse.priceHistory4h?.map(c => ({ timestamp: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume, ema20: c.ema20, ema50: c.ema50, bb_upper: c.bb_upper, bb_lower: c.bb_lower, bbUpper: c.bbUpper, bbMiddle: c.bbMiddle, bbLower: c.bbLower, bbWidth: c.bbWidth, macd: c.macd, signal: c.signal, histogram: c.histogram, rsi: c.rsi })),
    priceHistory1d: apiResponse.priceHistory1d?.map(c => ({ timestamp: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume, ema20: c.ema20, ema50: c.ema50, bb_upper: c.bb_upper, bb_lower: c.bb_lower, bbUpper: c.bbUpper, bbMiddle: c.bbMiddle, bbLower: c.bbLower, bbWidth: c.bbWidth, macd: c.macd, signal: c.signal, histogram: c.histogram, rsi: c.rsi })),
    pricePredictions: [],
    trades: convertAccountTradesToTradeEvents(account.trades),
    holding: {
      isHolding: account.holding.hasPosition,
      buyPrice: account.holding.entryPrice,
      buyTime: account.holding.entryTime,
      currentProfit: account.holding.unrealizedPnl,
      takeProfitPrice: account.holding.tpPrice,
      stopLossPrice: account.holding.slPrice,
      initialTakeProfitProb: apiResponse.currentPrediction.v5MoeTakeProfitProb,
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
};

export const fetchDashboardData = async (accountId: string): Promise<DashboardData> => {
  const baseUrl = getApiUrl();
  const isDirect = import.meta.env.DEV;

  const url = isDirect
    ? `/api/dashboard?_=${Date.now()}`
    : `${baseUrl}?endpoint=${encodeURIComponent('/api/dashboard')}&_=${Date.now()}`;

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

  if (!apiResponse.accounts || apiResponse.accounts.length === 0) {
    throw new Error('No accounts found in API response');
  }

  return convertApiResponseToDashboardData(apiResponse, accountId);
};
