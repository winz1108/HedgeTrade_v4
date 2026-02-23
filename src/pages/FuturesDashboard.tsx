import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { KrakenDashboardData } from '../types/dashboard';
import { fetchKrakenDashboard, fetchKrakenChartData } from '../services/oracleApi';
import { KrakenMetricsPanel } from '../components/futures/KrakenMetricsPanel';
import { KrakenPriceChart } from '../components/futures/KrakenPriceChart';
import { formatLocalTime } from '../utils/time';

function FuturesDashboard() {
  const [data, setData] = useState<KrakenDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const krakenData = await fetchKrakenDashboard();

      // 백엔드에서 priceHistories로 모든 타임프레임을 전달하므로
      // 추가 API 호출은 필요없음 (하위호환성 유지)
      if (!krakenData.priceHistory1m || krakenData.priceHistory1m.length === 0) {
        const chart1m = await fetchKrakenChartData('1m', 1000);
        krakenData.priceHistory1m = chart1m.candles;
      }

      setData(krakenData);
      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch Kraken data');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (data?.currentPrice) {
      document.title = `Kraken Futures - $${data.currentPrice.toFixed(2)}`;
    }
  }, [data?.currentPrice]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-full lg:max-w-[98vw] mx-auto p-2 lg:p-4">
          <div className="flex items-center gap-3 mb-4 bg-slate-800/90 border border-slate-700 rounded-lg p-3 shadow-xl">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
            <h1 className="text-lg lg:text-2xl font-bold text-slate-100">
              Loading Kraken Futures Dashboard...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md bg-slate-800/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-700">
          <div className="text-rose-500 text-6xl mb-4">⚠</div>
          <p className="text-slate-100 text-xl font-bold mb-2">Failed to load data</p>
          <p className="text-slate-300 text-sm mb-6">{error || 'No data available'}</p>
          <button
            onClick={() => {
              setLoading(true);
              loadData();
            }}
            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 shadow-md font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full lg:max-w-[98vw] mx-auto p-2 lg:p-4">
        <div className="flex flex-col mb-2 bg-slate-800/90 border border-slate-700 rounded-lg p-3 shadow-xl gap-3">
          <div className="flex items-center gap-3 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-2xl font-bold text-slate-100">
                Kraken Futures Dashboard
              </h1>
              {data.version && (
                <span className="text-[10px] text-cyan-400 font-mono">{data.version}</span>
              )}
              {data.position.in_position && (
                <div className="relative px-4 py-2 bg-slate-700/80 backdrop-blur-sm rounded-lg border border-cyan-500/40 shadow-lg overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-cyan-500/10"></div>
                  <div className="relative flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                    <span className="text-xs font-bold text-cyan-300 tracking-wider uppercase">
                      {data.position.position_side} POSITION
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-400">
                <span className="font-semibold">{data.accountName}</span>
                <span className="mx-2">•</span>
                <span className="font-mono">{data.symbol}</span>
              </div>
              {data.currentTime && (
                <span className="text-xs text-slate-400 font-mono">
                  {formatLocalTime(data.currentTime)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[280px,1fr,280px] gap-2" style={{ alignItems: 'start' }}>
          <div className="w-full lg:w-auto flex flex-col gap-2 order-2 lg:order-1 lg:h-[640px]">
            <KrakenMetricsPanel data={data} position="left" />
          </div>
          <div className="w-full min-w-0 order-1 lg:order-2">
            <KrakenPriceChart data={data} />
          </div>
          <div className="w-full lg:w-[280px] order-3 lg:order-3 lg:h-[640px] flex flex-col gap-2">
            <div className="w-full flex-shrink-0">
              <KrakenMetricsPanel data={data} position="right" />
            </div>
            <div className="w-full flex-1 lg:min-h-0">
              <KrakenMetricsPanel data={data} position="trades" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FuturesDashboard;
