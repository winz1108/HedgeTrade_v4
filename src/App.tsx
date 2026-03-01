import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchBinanceFuturesDashboard, fetchBinanceFuturesChartData } from './services/oracleApi';
import { BinanceFuturesMetricsPanel } from './components/spot/BinanceFuturesMetricsPanel';
import { BinanceFuturesPriceChart } from './components/spot/BinanceFuturesPriceChart';
import { formatLocalTime } from './utils/time';
import { websocketService } from './services/websocket';

function App() {
  const [dashData, setDashData] = useState<any>(null);
  const [priceHistories, setPriceHistories] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const loadCharts = useCallback(async () => {
    const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
    const results: any = {};

    await Promise.all(
      timeframes.map(async (tf) => {
        try {
          const chart = await fetchBinanceFuturesChartData(tf, 500);
          results[tf] = chart.candles;
        } catch {
          results[tf] = [];
        }
      })
    );

    setPriceHistories(results);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const apiResp = await fetchBinanceFuturesDashboard();
      setDashData(apiResp);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadCharts();
    const dashInterval = setInterval(loadData, 10000);
    const chartInterval = setInterval(loadCharts, 60000);

    return () => {
      clearInterval(dashInterval);
      clearInterval(chartInterval);
    };
  }, [loadData, loadCharts]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const d = dashData?.data;
    if (d?.currentPrice) {
      document.title = `BF $${d.currentPrice.toFixed(2)}`;
    }
  }, [dashData?.data?.currentPrice]);

  useEffect(() => {
    websocketService.connect();

    const handleLiveStatus = (statusData: any) => {
      if (!statusData) return;
      setDashData((prev: any) => {
        if (!prev?.data) return prev;
        const updated: any = { ...prev, data: { ...prev.data } };

        if (statusData.current_price) {
          updated.data.currentPrice = statusData.current_price;
        }
        if (statusData.server_time) {
          updated.data.serverTime = statusData.server_time;
        }
        if (statusData.entry_conditions_long) {
          updated.data.strategy = {
            ...updated.data.strategy,
            entryConditionsLong: statusData.entry_conditions_long,
          };
        }
        if (statusData.entry_conditions_short) {
          updated.data.strategy = {
            ...updated.data.strategy,
            entryConditionsShort: statusData.entry_conditions_short,
          };
        }
        if (statusData.in_position !== undefined) {
          updated.data.position = {
            ...updated.data.position,
            inPosition: statusData.in_position,
            side: statusData.position_side ?? updated.data.position.side,
          };
        }
        if (statusData.mfe !== undefined) {
          updated.data.position = {
            ...updated.data.position,
            mfe: statusData.mfe,
          };
        }
        if (statusData.pp_activated !== undefined) {
          updated.data.position = {
            ...updated.data.position,
            ppActivated: statusData.pp_activated,
            ppStop: statusData.pp_stop ?? updated.data.position.ppStop,
          };
        }
        if (statusData.pp_reversal_price !== undefined) {
          updated.data.position = {
            ...updated.data.position,
            ppReversalPrice: statusData.pp_reversal_price,
          };
          updated.data.strategy = {
            ...updated.data.strategy,
            pp_reversal_price: statusData.pp_reversal_price,
          };
        }

        return updated;
      });
    };

    const handlePriceTick = (priceData: any) => {
      if (!priceData?.price) return;
      setDashData((prev: any) => {
        if (!prev?.data) return prev;
        return {
          ...prev,
          data: {
            ...prev.data,
            currentPrice: priceData.price,
            serverTime: priceData.timestamp || prev.data.serverTime,
          },
        };
      });
    };

    websocketService.on('bf_live_status', handleLiveStatus);
    websocketService.on('bf_price_tick', handlePriceTick);

    return () => {
      websocketService.off('bf_live_status', handleLiveStatus);
      websocketService.off('bf_price_tick', handlePriceTick);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50">
        <div className="w-full lg:max-w-[98vw] mx-auto p-2 lg:p-4">
          <div className="flex items-center gap-3 mb-4 bg-white border border-amber-200 rounded-lg p-3 shadow-xl">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
            <h1 className="text-lg lg:text-2xl font-bold text-slate-800">
              Loading Binance Futures Dashboard...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashData?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center max-w-md bg-white backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-amber-200">
          <div className="text-rose-600 text-6xl mb-4">!</div>
          <p className="text-slate-900 text-xl font-bold mb-2">Failed to load data</p>
          <p className="text-slate-700 text-sm mb-6">{error || 'No data available'}</p>
          <button
            onClick={() => { setLoading(true); loadData(); }}
            className="px-8 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-500 hover:to-orange-500 transition-all duration-200 shadow-md font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const d = dashData.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50">
      <div className="w-full lg:max-w-[98vw] mx-auto p-2 lg:p-4">
        <div className="flex flex-col mb-2 bg-white border border-amber-200 rounded-lg p-3 shadow-xl gap-3">
          <div className="flex items-center gap-3 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-2xl font-bold text-slate-800">
                HedgeTrade Dashboard
              </h1>
              {d.strategy?.version && (
                <span className="text-[10px] text-amber-600 font-mono">{d.strategy.version}</span>
              )}
              {d.position?.inPosition && (
                <div className={`relative px-4 py-2 bg-white rounded-lg border ${
                  d.position.side === 'SHORT' ? 'border-orange-400' : 'border-cyan-400'
                } shadow-lg overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-r ${
                    d.position.side === 'SHORT'
                      ? 'from-orange-100/50 via-transparent to-orange-100/50'
                      : 'from-cyan-100/50 via-transparent to-cyan-100/50'
                  }`} />
                  <div className="relative flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      d.position.side === 'SHORT' ? 'bg-orange-600' : 'bg-cyan-600'
                    }`} />
                    <span className={`text-xs font-bold tracking-wider uppercase ${
                      d.position.side === 'SHORT' ? 'text-orange-700' : 'text-cyan-700'
                    }`}>
                      {d.position.side} POSITION
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-600">
                <span className="font-semibold">{d.account?.name || 'Account B'}</span>
                <span className="mx-2">&bull;</span>
                <span className="font-mono">{d.symbol || 'BTCUSDT'}</span>
              </div>
              {d.serverTime && (
                <span className="text-xs text-slate-600 font-mono">
                  {formatLocalTime(d.serverTime)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[280px,1fr,280px] gap-2" style={{ alignItems: 'start' }}>
          <div className="w-full lg:w-auto flex flex-col gap-2 order-2 lg:order-1 lg:h-[640px]">
            <BinanceFuturesMetricsPanel data={dashData} position="left" currentTime={currentTime} />
          </div>
          <div className="w-full min-w-0 order-1 lg:order-2">
            <BinanceFuturesPriceChart data={dashData} priceHistories={priceHistories} />
          </div>
          <div className="w-full lg:w-[280px] order-3 lg:order-3 lg:h-[640px] flex flex-col gap-2">
            <div className="w-full flex-shrink-0">
              <BinanceFuturesMetricsPanel data={dashData} position="right" currentTime={currentTime} />
            </div>
            <div className="w-full flex-1 lg:min-h-0">
              <BinanceFuturesMetricsPanel data={dashData} position="trades" currentTime={currentTime} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
