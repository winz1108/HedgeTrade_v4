import { DashboardData } from '../types/dashboard';

const getEdgeFunctionUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/oracle-proxy`;
};

export const fetchDashboardData = async (): Promise<DashboardData> => {
  const url = `${getEdgeFunctionUrl()}?endpoint=${encodeURIComponent('/api/dashboard')}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Oracle VM unavailable: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  console.log('📡 API Response:', {
    hasMarketState: !!data.marketState,
    marketState: data.marketState,
    priceHistory1m: data.priceHistory1m?.length || 0,
    currentPrice: data.currentPrice,
    currentAsset: data.currentAsset,
    holding: data.holding,
    metrics: data.metrics
  });

  if (data.error) {
    throw new Error(`Oracle VM error: ${data.error}`);
  }

  if (!data.priceHistory1m) {
    data.priceHistory1m = [];
  }

  if (!data.pricePredictions) {
    data.pricePredictions = [];
  }

  console.log('📊 Final data being returned:', {
    priceHistory1m: data.priceHistory1m.length,
    currentPrice: data.currentPrice,
    version: data.version
  });

  return data;
};
