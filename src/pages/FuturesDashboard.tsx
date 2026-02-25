import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { KrakenDashboardData, Candle } from '../types/dashboard';
import { fetchKrakenDashboard, fetchKrakenChartData } from '../services/oracleApi';
import { KrakenMetricsPanel } from '../components/futures/KrakenMetricsPanel';
import { KrakenPriceChart } from '../components/futures/KrakenPriceChart';
import { formatLocalTime } from '../utils/time';
import { websocketService } from '../services/websocket';

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

  // Real-time price updates via WebSocket
  const updateLiveCandle = useCallback((price: number) => {
    if (!price) return;

    setData(prevData => {
      if (!prevData) return prevData;

      const updatedData = { ...prevData, currentPrice: price };
      const timeframes: Array<'1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'> =
        ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

      // Update live candle in priceHistories
      if (prevData.priceHistories) {
        const updatedHistories = { ...prevData.priceHistories };

        timeframes.forEach(tf => {
          const candles = updatedHistories[tf];
          if (candles && candles.length > 0) {
            const updatedCandles = [...candles];
            const lastCandle = { ...updatedCandles[updatedCandles.length - 1] };

            lastCandle.close = price;
            lastCandle.high = Math.max(lastCandle.high, price);
            lastCandle.low = Math.min(lastCandle.low, price);

            updatedCandles[updatedCandles.length - 1] = lastCandle;
            updatedHistories[tf] = updatedCandles;
          }
        });

        updatedData.priceHistories = updatedHistories;
      }

      // Update individual priceHistory fields for backwards compatibility
      timeframes.forEach(tf => {
        const key = `priceHistory${tf}` as keyof KrakenDashboardData;
        const candles = prevData[key] as Candle[] | undefined;

        if (candles && candles.length > 0) {
          const updatedCandles = [...candles];
          const lastCandle = { ...updatedCandles[updatedCandles.length - 1] };

          lastCandle.close = price;
          lastCandle.high = Math.max(lastCandle.high, price);
          lastCandle.low = Math.min(lastCandle.low, price);

          updatedCandles[updatedCandles.length - 1] = lastCandle;
          (updatedData as any)[key] = updatedCandles;
        }
      });

      return updatedData;
    });
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);

    // Connect to WebSocket for real-time price updates
    websocketService.connect();

    const handleStatusUpdate = (statusData: any) => {
      if (statusData.current_price) {
        updateLiveCandle(statusData.current_price);
      }
    };

    websocketService.on('kraken_status_update', handleStatusUpdate);

    return () => {
      clearInterval(interval);
      websocketService.off('kraken_status_update', handleStatusUpdate);
    };
  }, [updateLiveCandle]);

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
              Loading Futures Dashboard...
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
                Futures Dashboard
              </h1>
              {data.version && (
                <span className="text-[10px] text-cyan-400 font-mono">{data.version}</span>
              )}
              {data.position.in_position && (
                <div className={`relative px-4 py-2 bg-slate-700/80 backdrop-blur-sm rounded-lg border ${
                  data.position.position_side === 'SHORT' ? 'border-orange-500/40' : 'border-cyan-500/40'
                } shadow-lg overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-r ${
                    data.position.position_side === 'SHORT' ? 'from-orange-500/10 via-transparent to-orange-500/10' : 'from-cyan-500/10 via-transparent to-cyan-500/10'
                  }`}></div>
                  <div className="relative flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      data.position.position_side === 'SHORT' ? 'bg-orange-400' : 'bg-cyan-400'
                    }`}></div>
                    <span className={`text-xs font-bold tracking-wider uppercase ${
                      data.position.position_side === 'SHORT' ? 'text-orange-300' : 'text-cyan-300'
                    }`}>
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
