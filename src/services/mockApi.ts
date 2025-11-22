import { DashboardData } from '../types/dashboard';

export const generateMockData = (): DashboardData => {
  const now = Date.now();
  const basePrice = 95000;

  const priceHistory1m = Array.from({ length: 60 }, (_, i) => ({
    timestamp: now - (59 - i) * 60000,
    price: basePrice + Math.sin(i / 10) * 1000 + Math.random() * 500
  }));

  return {
    currentTime: now,
    currentPrice: priceHistory1m[priceHistory1m.length - 1].price,
    priceHistory1m,
    pricePredictions: [],
    currentPrediction: {
      takeProfitProb: 0.65,
      stopLossProb: 0.35,
      timestamp: now
    },
    lastPredictionUpdateTime: now,
    holding: {
      isHolding: false,
      entryPrice: null,
      entryTime: null,
      initialTakeProfitProb: null
    },
    trades: [],
    metrics: {
      totalTrades: 0,
      winRate: 0,
      portfolioReturn: 0,
      currentBalance: 10000,
      takeProfitCount: 0,
      stopLossCount: 0
    }
  };
};

export const fetchDashboardData = async (mode: 'realtime' | 'simulation'): Promise<DashboardData> => {
  const endpoint = mode === 'simulation' ? '/api/sim_data' : '/api/dashboard';
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL}/functions/v1/oracle-proxy?endpoint=${endpoint}`;

  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.priceHistory1m) {
    data.priceHistory1m = [];
  }

  if (!data.pricePredictions) {
    data.pricePredictions = [];
  }

  return data;
};
