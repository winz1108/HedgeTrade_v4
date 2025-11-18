import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { DashboardData, TradeEvent } from './types/dashboard';
import { fetchDashboardData } from './services/oracleApi';
import { PriceChart } from './components/PriceChart';
import { MetricsPanel } from './components/MetricsPanel';

type ViewMode = 'realtime' | 'simulation';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('realtime');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [hoveredTrade, setHoveredTrade] = useState<TradeEvent | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const dashboardData = await fetchDashboardData(viewMode);
      console.log('📊 Data updated:', {
        holding: dashboardData.holding.isHolding,
        trades: dashboardData.trades.length,
        TP: dashboardData.metrics.takeProfitCount,
        SL: dashboardData.metrics.stopLossCount,
        return: dashboardData.metrics.portfolioReturn.toFixed(2) + '%'
      });
      setData(dashboardData);
      const now = Date.now();
      const nextMinute = Math.ceil(now / 60000) * 60000;
      const secondsUntilNextMinute = Math.round((nextMinute - now) / 1000);
      setCountdown(secondsUntilNextMinute);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [viewMode]);

  useEffect(() => {
    const now = Date.now();
    const nextMinute = Math.ceil(now / 60000) * 60000;
    const msUntilNextMinute = nextMinute - now;

    const initialTimeout = setTimeout(() => {
      loadData();

      const interval = setInterval(() => {
        loadData();
      }, 60000);

      return () => clearInterval(interval);
    }, msUntilNextMinute);

    return () => clearTimeout(initialTimeout);
  }, [viewMode]);

  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          const now = Date.now();
          const nextMinute = Math.ceil(now / 60000) * 60000;
          return Math.round((nextMinute - now) / 1000);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-6 drop-shadow-lg" />
          <p className="text-slate-300 text-lg font-semibold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">⚠</div>
          <p className="text-slate-300 text-lg font-semibold mb-2">Failed to load data</p>
          <p className="text-slate-400 text-sm mb-6">{error || 'No data available'}</p>
          <button
            onClick={() => {
              setLoading(true);
              loadData();
            }}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-400 hover:to-blue-400 transition-all duration-200 shadow-lg font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-[98vw] mx-auto p-2 lg:p-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-2 bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl gap-3 lg:gap-0">
          <div className="w-full lg:w-auto">
            <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
              <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                HedgeTrade Dashboard
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-mono">v4.0.0.1</span>
                <span className="text-[9px] text-slate-600">|</span>
                <span className="text-[9px] text-slate-500">
                  Last update: {data.currentTime ? new Date(data.currentTime).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) : 'N/A'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:gap-3 mt-2 flex-wrap">
              <div className="flex gap-1 bg-slate-800/70 p-1 rounded-lg border border-slate-600">
                <button
                  onClick={() => setViewMode('realtime')}
                  className={`px-2 lg:px-3 py-1 text-xs font-semibold rounded transition-all duration-200 ${
                    viewMode === 'realtime'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Realtime
                </button>
                <button
                  onClick={() => setViewMode('simulation')}
                  className={`px-2 lg:px-3 py-1 text-xs font-semibold rounded transition-all duration-200 ${
                    viewMode === 'simulation'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Simulation
                </button>
              </div>
              <p className="text-slate-400 text-xs lg:text-sm flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="hidden sm:inline">{viewMode === 'realtime' ? 'Real-time monitoring' : 'Simulation data'}</span>
                <span className="sm:hidden">{viewMode === 'realtime' ? 'Real-time' : 'Simulation'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3 w-full lg:w-auto">
            <div className="text-xs text-slate-400 bg-slate-700/50 px-2 lg:px-3 py-1.5 rounded-lg border border-slate-600 flex-1 lg:flex-none text-center">
              Next <span className="font-bold text-cyan-400">{countdown}s</span>
            </div>
            <button
              onClick={loadData}
              className="flex items-center justify-center gap-2 px-3 lg:px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm rounded-lg hover:from-cyan-400 hover:to-blue-400 transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 font-semibold flex-1 lg:flex-none"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col xl:grid xl:grid-cols-[280px,1fr,280px] gap-2">
          <div className="flex flex-col gap-2 order-2 xl:order-1">
            <MetricsPanel data={data} position="left" />
          </div>
          <div className="flex-shrink-0 order-1 xl:order-2">
            <PriceChart data={data} onTradeHover={setHoveredTrade} />
          </div>
          <div className="flex flex-col gap-2 order-3 xl:order-3">
            <MetricsPanel data={data} position="right" />
            <MetricsPanel data={data} position="trades" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
