import { DashboardData } from '../types/dashboard';

const getApiUrl = () => {
  const host = import.meta.env.VITE_API_HOST || 'localhost';
  return `http://${host}:54321`;
};

export const fetchDashboardData = async (mode: 'realtime' | 'simulation'): Promise<DashboardData> => {
  const endpoint = mode === 'simulation' ? '/api/sim_data' : '/api/dashboard';
  const response = await fetch(`${getApiUrl()}${endpoint}`, {
    mode: 'cors',
    headers: {
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
