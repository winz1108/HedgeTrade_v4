import { DashboardData } from '../types/dashboard';

const getProxyUrl = () => {
  if (import.meta.env.DEV) {
    return '/.netlify/functions/oracle-proxy';
  }
  return '/.netlify/functions/oracle-proxy';
};

export const fetchDashboardData = async (): Promise<DashboardData> => {
  const url = `${getProxyUrl()}?endpoint=${encodeURIComponent('/api/dashboard')}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Oracle VM unavailable: ${response.status} ${response.statusText}`);
  }

  const rawData = await response.json();

  // 🚨 전체 응답 덤프
  console.log('🚨 FULL RAW DATA:', JSON.stringify(rawData, null, 2));

  console.log('📡 API Response:', {
    cacheStatus: rawData.cacheStatus,
    priceHistory: {
      '1m': rawData.priceHistory?.['1m']?.length || 0,
      '5m': rawData.priceHistory?.['5m']?.length || 0,
      '15m': rawData.priceHistory?.['15m']?.length || 0,
      '1h': rawData.priceHistory?.['1h']?.length || 0,
      '4h': rawData.priceHistory?.['4h']?.length || 0,
      '1d': rawData.priceHistory?.['1d']?.length || 0
    },
    sample1m: rawData.priceHistory?.['1m']?.[0] || 'none',
    hasPriceHistory: !!rawData.priceHistory,
    priceHistoryKeys: rawData.priceHistory ? Object.keys(rawData.priceHistory) : []
  });

  // 🔍 4h와 1d 데이터 상세 확인
  console.log('🔍 4h 데이터 타입:', typeof rawData.priceHistory?.['4h']);
  console.log('🔍 4h 데이터 Array.isArray:', Array.isArray(rawData.priceHistory?.['4h']));
  console.log('🔍 4h 첫 3개:', rawData.priceHistory?.['4h']?.slice(0, 3));
  console.log('🔍 1d 데이터 타입:', typeof rawData.priceHistory?.['1d']);
  console.log('🔍 1d 데이터 Array.isArray:', Array.isArray(rawData.priceHistory?.['1d']));
  console.log('🔍 1d 첫 3개:', rawData.priceHistory?.['1d']?.slice(0, 3));

  // 🎯 익절확률 확인
  console.log('🎯 익절확률 데이터:', {
    isHolding: rawData.holding?.isHolding,
    initialTakeProfitProb: rawData.holding?.initialTakeProfitProb,
    currentTakeProfitProb: rawData.holding?.currentTakeProfitProb,
    currentPrediction: rawData.currentPrediction,
    lastPredictionUpdateTime: rawData.lastPredictionUpdateTime
  });

  if (rawData.error) {
    throw new Error(`Oracle VM error: ${rawData.error}`);
  }

  try {
    const data: DashboardData = {
      version: rawData.version,
      currentAsset: rawData.asset?.currentAsset ?? 0,
      currentBTC: rawData.asset?.currentBTC,
      currentCash: rawData.asset?.currentCash,
      initialAsset: rawData.asset?.initialAsset ?? 0,
      currentTime: rawData.currentTime ?? Date.now(),
      currentPrice: rawData.currentPrice ?? 0,
      priceHistory1m: rawData.priceHistory?.['1m'] || [],
      priceHistory5m: rawData.priceHistory?.['5m'] || [],
      priceHistory15m: rawData.priceHistory?.['15m'] || [],
      priceHistory1h: rawData.priceHistory?.['1h'] || [],
      priceHistory4h: rawData.priceHistory?.['4h'] || [],
      priceHistory1d: rawData.priceHistory?.['1d'] || [],
      pricePredictions: rawData.pricePredictions || [],
      trades: rawData.trades || [],
      holding: {
        isHolding: rawData.holding?.isHolding ?? false,
        buyPrice: rawData.holding?.buyPrice,
        buyTime: rawData.holding?.buyTime,
        currentProfit: rawData.holding?.currentProfit,
        takeProfitPrice: rawData.holding?.takeProfitPrice,
        stopLossPrice: rawData.holding?.stopLossPrice,
        initialTakeProfitProb: rawData.holding?.initialTakeProfitProb,
        currentTakeProfitProb: rawData.holding?.currentTakeProfitProb,
        latestPrediction: rawData.holding?.latestPrediction
      },
      currentPrediction: rawData.currentPrediction,
      lastPredictionUpdateTime: rawData.currentPrediction?.lastUpdateTime ?? rawData.lastPredictionUpdateTime,
      marketState: rawData.marketState,
      gateWeights: rawData.gateWeights,
      metrics: {
        portfolioReturn: rawData.metrics?.portfolioReturn ?? 0,
        portfolioReturnWithCommission: rawData.metrics?.portfolioReturnWithCommission,
        marketReturn: rawData.metrics?.marketReturn ?? 0,
        avgTradeReturn: rawData.metrics?.avgTradeReturn ?? 0,
        takeProfitCount: rawData.metrics?.takeProfitCount ?? 0,
        stopLossCount: rawData.metrics?.stopLossCount ?? 0
      },
      isAuthenticated: rawData.isAuthenticated ?? false
    };

    return data;
  } catch (error) {
    console.error('❌ Transformation error:', error);
    console.error('❌ Error location:', error instanceof Error ? error.stack : 'Unknown');
    console.error('❌ Raw data that caused error:', rawData);
    throw error;
  }
};
