import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchBinanceFuturesDashboard } from './services/oracleApi';
import { BinanceFuturesMetricsPanel } from './components/spot/BinanceFuturesMetricsPanel';
import { BinanceFuturesPriceChart } from './components/spot/BinanceFuturesPriceChart';
import { formatLocalTime } from './utils/time';
import { websocketService } from './services/websocket';
import type { BFDashboardData } from './types/dashboard';

function App() {
  const [data, setData] = useState<BFDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const loadData = async () => {
    try {
      setError(null);
      const resp = await fetchBinanceFuturesDashboard();
      if (resp?.data) {
        setData(resp.data);
      } else {
        throw new Error('No data in API response');
      }
      setLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setLoading(false);
    }
  };

  const updateLiveCandle = useCallback((price: number) => {
    if (!price) return;
    setData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, currentPrice: price };
      if (prev.priceHistories) {
        const updatedHistories = { ...prev.priceHistories };
        const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
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
        updated.priceHistories = updatedHistories;
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    websocketService.connect();

    const handleLiveStatus = (statusData: any) => {
      if (!statusData) return;
      if (statusData.current_price) {
        updateLiveCandle(statusData.current_price);
      }
      setData(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (statusData.server_time) updated.serverTime = statusData.server_time;
        if (statusData.entry_conditions_long) {
          updated.strategy = { ...updated.strategy, entryConditionsLong: statusData.entry_conditions_long };
        }
        if (statusData.entry_conditions_short) {
          updated.strategy = { ...updated.strategy, entryConditionsShort: statusData.entry_conditions_short };
        }
        if (statusData.indicators) {
          updated.strategy = { ...updated.strategy, indicators: statusData.indicators };
        }
        if (statusData.in_position !== undefined) {
          updated.position = {
            ...updated.position,
            inPosition: statusData.in_position,
            side: statusData.position_side ?? updated.position.side,
          };
        }
        if (statusData.entry_price !== undefined) {
          updated.position = { ...updated.position, entryPrice: statusData.entry_price };
        }
        if (statusData.entry_time !== undefined) {
          updated.position = { ...updated.position, entryTime: statusData.entry_time };
        }
        if (statusData.mfe !== undefined) {
          updated.position = { ...updated.position, mfe: statusData.mfe };
        }
        if (statusData.pp_activated !== undefined) {
          updated.position = {
            ...updated.position,
            ppActivated: statusData.pp_activated,
            ppStop: statusData.pp_stop !== -999 ? statusData.pp_stop : null,
          };
        }
        if (statusData.pp_reversal_price !== undefined) {
          updated.position = { ...updated.position, ppReversalPrice: statusData.pp_reversal_price };
          updated.strategy = { ...updated.strategy, pp_reversal_price: statusData.pp_reversal_price };
        }
        if (statusData.peak_price !== undefined) {
          updated.position = { ...updated.position, peakPrice: statusData.peak_price };
        }
        return updated;
      });
    };

    const handlePriceTick = (priceData: any) => {
      if (!priceData?.price) return;
      updateLiveCandle(priceData.price);
      setData(prev => {
        if (!prev) return prev;
        const updated = { ...prev, currentPrice: priceData.price };
        if (priceData.timestamp) updated.serverTime = priceData.timestamp;
        if (priceData.currencies) {
          updated.account = { ...updated.account, currencies: priceData.currencies };
        }
        if (priceData.portfolioValue) {
          updated.account = { ...updated.account, totalAsset: priceData.portfolioValue };
        }
        return updated;
      });
    };

    websocketService.on('bf_live_status', handleLiveStatus);
    websocketService.on('bf_price_tick', handlePriceTick);

    return () => {
      clearInterval(interval);
      websocketService.off('bf_live_status', handleLiveStatus);
      websocketService.off('bf_price_tick', handlePriceTick);
    };
  }, [updateLiveCandle]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (data?.currentPrice) {
      document.title = `BF $${data.currentPrice.toFixed(2)}`;
    }
  }, [data?.currentPrice]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50">
        <div className="w-full lg:max-w-[98vw] mx-auto p-2 lg:p-4">
          <div className="flex items-center gap-3 mb-4 bg-white border border-amber-200 rounded-lg p-3 shadow-xl">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
            <h1 className="text-lg lg:text-2xl font-bold text-slate-800">
              Loading HedgeTrade Dashboard...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50">
      <div className="w-full lg:max-w-[98vw] mx-auto p-2 lg:p-4">
        <div className="flex flex-col mb-2 bg-white border border-amber-200 rounded-lg p-3 shadow-xl gap-3">
          <div className="flex items-center gap-3 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-2xl font-bold text-slate-800">
                HedgeTrade Dashboard
              </h1>
              {data.strategy?.version && (
                <span className="text-[10px] text-amber-600 font-mono">{data.strategy.version}</span>
              )}
              {data.position?.inPosition && (
                <div className={`relative px-4 py-2 bg-white rounded-lg border ${
                  data.position.side === 'SHORT' ? 'border-orange-400' : 'border-cyan-400'
                } shadow-lg overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-r ${
                    data.position.side === 'SHORT'
                      ? 'from-orange-100/50 via-transparent to-orange-100/50'
                      : 'from-cyan-100/50 via-transparent to-cyan-100/50'
                  }`} />
                  <div className="relative flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      data.position.side === 'SHORT' ? 'bg-orange-600' : 'bg-cyan-600'
                    }`} />
                    <span className={`text-xs font-bold tracking-wider uppercase ${
                      data.position.side === 'SHORT' ? 'text-orange-700' : 'text-cyan-700'
                    }`}>
                      {data.position.side} POSITION
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-600">
                <span className="font-semibold">{data.account?.name || 'Account B'}</span>
                <span className="mx-2">&bull;</span>
                <span className="font-mono">{data.symbol || 'BTCUSDT'}</span>
              </div>
              {data.serverTime && (
                <span className="text-xs text-slate-600 font-mono">
                  {formatLocalTime(data.serverTime)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[280px,1fr,280px] gap-2" style={{ alignItems: 'start' }}>
          <div className="w-full lg:w-auto flex flex-col gap-2 order-2 lg:order-1 lg:h-[640px]">
            <BinanceFuturesMetricsPanel data={data} position="left" currentTime={currentTime} />
          </div>
          <div className="w-full min-w-0 order-1 lg:order-2">
            <BinanceFuturesPriceChart data={data} />
          </div>
          <div className="w-full lg:w-[280px] order-3 lg:order-3 lg:h-[640px] flex flex-col gap-2">
            <div className="w-full flex-shrink-0">
              <BinanceFuturesMetricsPanel data={data} position="right" currentTime={currentTime} />
            </div>
            <div className="w-full flex-1 lg:min-h-0">
              <BinanceFuturesMetricsPanel data={data} position="trades" currentTime={currentTime} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
