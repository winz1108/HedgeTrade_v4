import { DashboardData } from '../types/dashboard';
import { generateMockData } from './mockApi';

const getEdgeFunctionUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/oracle-proxy`;
};

export const fetchDashboardData = async (mode: 'realtime' | 'simulation'): Promise<DashboardData> => {
  const endpoint = mode === 'simulation' ? '/api/sim_data' : '/api/dashboard';
  const url = `${getEdgeFunctionUrl()}?endpoint=${encodeURIComponent(endpoint)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Oracle VM unavailable (${response.status}), falling back to mock data`);
      return generateMockData();
    }

    const data = await response.json();

    if (data.error) {
      console.warn('Oracle VM error:', data.error, '- falling back to mock data');
      return generateMockData();
    }

    if (!data.priceHistory1m) {
      data.priceHistory1m = [];
    }

    if (!data.pricePredictions) {
      data.pricePredictions = [];
    }

    return data;
  } catch (error) {
    console.warn('Failed to connect to Oracle VM, falling back to mock data:', error);
    return generateMockData();
  }
};
