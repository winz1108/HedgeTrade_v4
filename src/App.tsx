import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { DashboardData, TradeEvent } from './types/dashboard';
import { fetchDashboardData } from './services/oracleApi';
import { PriceChart } from './components/PriceChart';
import { MetricsPanel } from './components/MetricsPanel';


function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTrade, setHoveredTrade] = useState<TradeEvent | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const dashboardData = await fetchDashboardData();
      console.log('📊 Data updated:', {
        holding: dashboardData.holding.isHolding,
        trades: dashboardData.trades.length,
        TP: dashboardData.metrics.takeProfitCount,
        SL: dashboardData.metrics.stopLossCount,
        return: dashboardData.metrics.portfolioReturn.toFixed(2) + '%'
      });
      setData(dashboardData);
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
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 3000);

    return () => clearInterval(interval);
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
        <div className="flex flex-col mb-2 bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              HedgeTrade Dashboard
            </h1>
            {data.version && (
              <span className="text-[10px] text-emerald-400 font-mono">{data.version}</span>
            )}
            <span className="text-[10px] text-slate-400 font-mono">
              {new Date(data.currentTime).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/70 px-2 py-1.5 rounded-lg border border-slate-600 overflow-x-auto">
            <span className="text-[10px] text-slate-400 mr-1 whitespace-nowrap">Market:</span>
            <div className="flex gap-1">
              {[
                { key: 'bullConv', label: 'Bull Conv', value: data.marketState?.bullConv ?? 0, colors: { active: 'bg-emerald-600 text-white border-emerald-400', inactive: 'bg-slate-800/50 text-emerald-500/30 border-emerald-800/20' } },
                { key: 'bullDiv', label: 'Bull Div', value: data.marketState?.bullDiv ?? 0, colors: { active: 'bg-emerald-500 text-white border-emerald-300', inactive: 'bg-slate-800/50 text-emerald-500/30 border-emerald-800/20' } },
                { key: 'sideways', label: 'Sideways', value: data.marketState?.sideways ?? 0, colors: { active: 'bg-amber-500 text-white border-amber-300', inactive: 'bg-slate-800/50 text-amber-500/30 border-amber-800/20' } },
                { key: 'bearDiv', label: 'Bear Div', value: data.marketState?.bearDiv ?? 0, colors: { active: 'bg-rose-500 text-white border-rose-300', inactive: 'bg-slate-800/50 text-rose-500/30 border-rose-800/20' } },
                { key: 'bearConv', label: 'Bear Conv', value: data.marketState?.bearConv ?? 0, colors: { active: 'bg-rose-600 text-white border-rose-400', inactive: 'bg-slate-800/50 text-rose-500/30 border-rose-800/20' } }
              ].map((state) => {
                const isActive = state.value > 0.5;
                return (
                  <div
                    key={state.key}
                    className={`text-[9px] px-1.5 py-0.5 rounded transition-all whitespace-nowrap border ${
                      isActive
                        ? `${state.colors.active} font-bold shadow-lg animate-pulse`
                        : state.colors.inactive
                    }`}
                  >
                    {state.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[280px,1fr,280px] gap-2">
          <div className="flex flex-col gap-2 order-2 lg:order-1">
            <MetricsPanel data={data} position="left" />
          </div>
          <div className="min-w-0 order-1 lg:order-2">
            <PriceChart data={data} onTradeHover={setHoveredTrade} />
          </div>
          <div className="flex flex-col gap-2 order-3 lg:order-3">
            <MetricsPanel data={data} position="right" />
            <MetricsPanel data={data} position="trades" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
