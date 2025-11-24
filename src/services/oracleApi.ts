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
  });

  if (!response.ok) {
    throw new Error(`Oracle VM unavailable: ${response.status} ${response.statusText}`);
  }

  const rawData = await response.json();

  console.log('📡 Raw API Response Keys:', Object.keys(rawData));
  console.log('📡 priceHistory structure:', rawData.priceHistory);
  console.log('📡 Full Raw API Response:', rawData);

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
        marketReturn: rawData.metrics?.marketReturn ?? 0,
        avgTradeReturn: rawData.metrics?.avgTradeReturn ?? 0,
        takeProfitCount: rawData.metrics?.takeProfitCount ?? 0,
        stopLossCount: rawData.metrics?.stopLossCount ?? 0
      }
    };

    console.log('✅ Transformation successful');
    console.log('📊 Transformed Data:', {
      priceHistory1m: data.priceHistory1m.length,
      priceHistory5m: data.priceHistory5m?.length || 0,
      priceHistory15m: data.priceHistory15m?.length || 0,
      priceHistory1h: data.priceHistory1h?.length || 0,
      hasCurrentPrediction: !!data.currentPrediction,
      currentPrediction: data.currentPrediction,
      lastPredictionUpdateTime: data.lastPredictionUpdateTime,
      metrics: data.metrics,
      holding: {
        isHolding: data.holding.isHolding,
        hasInitialProb: data.holding.initialTakeProfitProb !== undefined,
        hasCurrentProb: data.holding.currentTakeProfitProb !== undefined,
        initialTakeProfitProb: data.holding.initialTakeProfitProb,
        currentTakeProfitProb: data.holding.currentTakeProfitProb
      }
    });
    return data;
  } catch (error) {
    console.error('❌ Transformation error:', error);
    console.error('❌ Error location:', error instanceof Error ? error.stack : 'Unknown');
    console.error('❌ Raw data that caused error:', rawData);
    throw error;
  }
};
