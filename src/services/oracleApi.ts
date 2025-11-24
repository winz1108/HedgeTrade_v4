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
    hasGateWeights: !!data.gateWeights,
    priceHistory1m: data.priceHistory1m?.length || 0,
    pricePredictions: data.pricePredictions?.length || 0,
    marketState: data.marketState,
    gateWeights: data.gateWeights
  });

  if (data.error) {
    throw new Error(`Oracle VM error: ${data.error}`);
  }

  if (!data.priceHistory1m || !Array.isArray(data.priceHistory1m)) {
    console.error('❌ Invalid priceHistory1m:', data.priceHistory1m);
    data.priceHistory1m = [];
  }

  if (!data.pricePredictions || !Array.isArray(data.pricePredictions)) {
    console.error('❌ Invalid pricePredictions:', data.pricePredictions);
    data.pricePredictions = [];
  }

  if (data.priceHistory1m.length === 0) {
    console.warn('⚠️ Empty priceHistory1m received from API');
  }

  return data;
};
