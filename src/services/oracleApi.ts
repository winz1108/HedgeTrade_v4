import { DashboardData } from '../types/dashboard';

const getProxyUrl = () => {
  if (import.meta.env.DEV) {
    return '/.netlify/functions/oracle-proxy';
  }
  return '/.netlify/functions/oracle-proxy';
};

export const fetchDashboardData = async (): Promise<DashboardData> => {
  const url = `${getProxyUrl()}?endpoint=${encodeURIComponent('/api/dashboard')}&_=${Date.now()}`;

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

  const rawData = await response.json();

  if (rawData.error) {
    throw new Error(`Oracle VM error: ${rawData.error}`);
  }

  console.log('🔍 백엔드 Raw Data - holding:', rawData.holding);
  console.log('🔍 백엔드 Raw Data - metrics:', rawData.metrics);

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
        v5MoeTakeProfitProb: rawData.holding?.v5MoeTakeProfitProb,
        latestPrediction: rawData.holding?.latestPrediction
      },
      currentPrediction: rawData.currentPrediction ? {
        takeProfitProb: rawData.currentPrediction.takeProfitProb,
        stopLossProb: rawData.currentPrediction.stopLossProb,
        v5MoeTakeProfitProb: rawData.currentPrediction.v5MoeTakeProfitProb,
        predictionDataTimestamp: rawData.currentPrediction.predictionDataTimestamp,
        predictionCalculatedAt: rawData.currentPrediction.predictionCalculatedAt,
        v2UpdateCount: rawData.currentPrediction.v2UpdateCount,
        v2LastUsed5minTimestamp: rawData.currentPrediction.v2LastUsed5minTimestamp
      } : undefined,
      lastPredictionUpdateTime: rawData.currentPrediction?.predictionCalculatedAt ?? rawData.currentPrediction?.lastUpdateTime ?? rawData.lastPredictionUpdateTime,
      marketState: rawData.marketState,
      gateWeights: rawData.gateWeights,
      metrics: {
        portfolioReturn: rawData.metrics?.portfolioReturn ?? 0,
        portfolioReturnWithCommission: rawData.metrics?.portfolioReturnWithCommission,
        marketReturn: rawData.metrics?.marketReturn ?? 0,
        avgTradeReturn: rawData.metrics?.avgTradeReturn ?? 0,
        takeProfitCount: rawData.metrics?.takeProfitCount ?? 0,
        stopLossCount: rawData.metrics?.stopLossCount ?? 0
      }
    };

    console.log('✅ 변환 완료 - holding.currentProfit:', data.holding.currentProfit);
    console.log('✅ 변환 완료 - 전체 data.holding:', data.holding);

    return data;
  } catch (error) {
    console.error('❌ Transformation error:', error);
    console.error('❌ Error location:', error instanceof Error ? error.stack : 'Unknown');
    console.error('❌ Raw data that caused error:', rawData);
    throw error;
  }
};
