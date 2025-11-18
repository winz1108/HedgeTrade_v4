import { DashboardData } from '../types/dashboard';

export const fetchDashboardData = async (mode: 'realtime' | 'simulation'): Promise<DashboardData> => {
  const endpoint = mode === 'simulation' ? '/api/sim_data' : '/api/dashboard';
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oracle-proxy?endpoint=${endpoint}`;

  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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
