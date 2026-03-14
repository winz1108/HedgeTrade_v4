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
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('5m');

  const liveCandles = useCallback(
    (
      prevHistories: Record<string, any[]> | undefined,
      newHistories: Record<string, any[]> | undefined
    ): Record<string, any[]> | undefined => {
      if (!prevHistories || !newHistories) return newHistories;
      const merged: Record<string, any[]> = {};
      const tfs = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
      const getTs = (c: any) => c.open_time_ms ?? c.timestamp ?? (c.time ? c.time * 1000 : 0);
      tfs.forEach(tf => {
        const newArr = newHistories[tf];
        const prevArr = prevHistories[tf];
        if (!newArr) { merged[tf] = prevArr || []; return; }
        if (!prevArr || prevArr.length === 0) { merged[tf] = newArr; return; }
        const prevLast = prevArr[prevArr.length - 1];
        const newLast = newArr[newArr.length - 1];
        const prevTs = getTs(prevLast);
        const newTs = getTs(newLast);
        const newLastIsFinal = newLast.is_final !== false;

        if (prevTs > newTs) {
          merged[tf] = prevArr;
        } else if (Math.floor(prevTs / 1000) === Math.floor(newTs / 1000)) {
          const preserved = [...newArr];
          const liveIndicators = prevLast.indicators && Object.keys(prevLast.indicators).length > 0 ? prevLast.indicators : undefined;
          preserved[preserved.length - 1] = {
            ...newLast,
            close: prevLast.close,
            high: Math.max(newLast.high, prevLast.high),
            low: Math.min(newLast.low, prevLast.low),
            ...(liveIndicators ? { indicators: { ...newLast.indicators, ...liveIndicators } } : {}),
          };
          merged[tf] = preserved;
        } else if (!newLastIsFinal) {
          const preserved = [...newArr];
          const liveIndicators = prevLast.indicators && Object.keys(prevLast.indicators).length > 0 ? prevLast.indicators : undefined;
          preserved[preserved.length - 1] = {
            ...newLast,
            close: prevLast.close,
            high: Math.max(newLast.high, prevLast.high),
            low: Math.min(newLast.low, prevLast.low),
            ...(liveIndicators ? { indicators: { ...newLast.indicators, ...liveIndicators } } : {}),
          };
          merged[tf] = preserved;
        } else {
          merged[tf] = newArr;
        }
      });
      return merged;
    },
    []
  );

  const loadData = async () => {
    try {
      setError(null);
      const resp = await fetchBinanceFuturesDashboard();
      if (resp?.data) {
        setData(prev => {
          const incoming = resp.data;
          if (!prev) return incoming;
          return {
            ...incoming,
            priceHistories: liveCandles(prev.priceHistories, incoming.priceHistories),
          };
        });
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
      if (statusData.exchange && statusData.exchange !== 'binance_futures') return;
      if (statusData.current_price) {
        updateLiveCandle(statusData.current_price);
      }
      setData(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (statusData.current_price) updated.currentPrice = statusData.current_price;
        if (statusData.server_time) updated.serverTime = statusData.server_time;
        if (statusData.ws_healthy !== undefined) updated.wsHealthy = statusData.ws_healthy;
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
        if (priceData.ws_healthy !== undefined) updated.wsHealthy = priceData.ws_healthy;
        if (priceData.currencies) {
          updated.account = { ...updated.account, currencies: priceData.currencies };
          const usdtQty = priceData.currencies?.USDT?.quantity;
          if (usdtQty !== undefined) {
            updated.account = { ...updated.account, totalAsset: usdtQty };
          }
        }
        if (priceData.pp_reversal_price !== undefined) {
          updated.position = { ...updated.position, ppReversalPrice: priceData.pp_reversal_price };
        }
        return updated;
      });
    };

    const handleRealtimeCandle = (candleData: any) => {
      if (!candleData) return;

      const openTimeMs: number =
        candleData.open_time_ms ??
        (typeof candleData.openTime === 'number' ? candleData.openTime : parseInt(candleData.openTime || '0'));
      const isFinal: boolean = candleData.is_final ?? candleData.isFinal ?? false;

      setData(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (prev.priceHistories) {
          const updatedHistories = { ...prev.priceHistories };
          const tf = candleData.timeframe as string;
          const candles = updatedHistories[tf];
          if (candles && candles.length > 0) {
            const updatedCandles = [...candles];
            const lastCandle = updatedCandles[updatedCandles.length - 1];
            const lastTs: number =
              lastCandle.open_time_ms ??
              lastCandle.timestamp ??
              (lastCandle.time ? lastCandle.time * 1000 : 0);

            const wsIndicators = candleData.indicators && Object.keys(candleData.indicators).length > 0 ? candleData.indicators : undefined;
            if (openTimeMs === lastTs || Math.floor(openTimeMs / 1000) === Math.floor(lastTs / 1000)) {
              updatedCandles[updatedCandles.length - 1] = {
                ...lastCandle,
                high: Math.max(lastCandle.high, candleData.high),
                low: Math.min(lastCandle.low, candleData.low),
                close: candleData.close,
                volume: candleData.volume ?? lastCandle.volume,
                ...(wsIndicators ? { indicators: { ...lastCandle.indicators, ...wsIndicators } } : {}),
              };
            } else if (openTimeMs > lastTs) {
              if (isFinal) {
                updatedCandles[updatedCandles.length - 1] = {
                  ...lastCandle,
                  close: candleData.open,
                };
              }
              updatedCandles.push({
                open_time_ms: openTimeMs,
                timestamp: openTimeMs,
                time: Math.floor(openTimeMs / 1000),
                open: lastCandle.close,
                high: Math.max(lastCandle.close, candleData.high),
                low: Math.min(lastCandle.close, candleData.low),
                close: candleData.close,
                volume: candleData.volume || 0,
                ...(wsIndicators ? { indicators: wsIndicators } : {}),
              });
            }
            updatedHistories[tf] = updatedCandles;
            updated.priceHistories = updatedHistories;
          }
        }
        return updated;
      });
    };

    websocketService.on('realtime_candle_update', handleRealtimeCandle);
    websocketService.on('bf_live_status', handleLiveStatus);
    websocketService.on('bf_price_tick', handlePriceTick);

    return () => {
      clearInterval(interval);
      websocketService.off('realtime_candle_update', handleRealtimeCandle);
      websocketService.off('bf_live_status', handleLiveStatus);
      websocketService.off('bf_price_tick', handlePriceTick);
    };
  }, [updateLiveCandle, selectedTimeframe]);

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
              <div className="flex items-baseline gap-1.5">
                <h1 className="text-lg lg:text-2xl font-bold text-slate-800">HedgeTrade</h1>
                <span className="text-[11px] font-semibold text-slate-500 tracking-wide">Binance</span>
              </div>
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
          <div className="w-full lg:w-auto flex flex-col gap-2 order-2 lg:order-1">
            <BinanceFuturesMetricsPanel data={data} position="left" currentTime={currentTime} />
          </div>
          <div className="w-full min-w-0 order-1 lg:order-2">
            <BinanceFuturesPriceChart data={data} onTimeframeChange={setSelectedTimeframe} />
          </div>
          <div className="w-full lg:w-[280px] order-3 lg:order-3 flex flex-col gap-2">
            <div className="w-full flex-shrink-0">
              <BinanceFuturesMetricsPanel data={data} position="right" currentTime={currentTime} />
            </div>
            <div className="w-full" style={{ height: '260px' }}>
              <BinanceFuturesMetricsPanel data={data} position="trades" currentTime={currentTime} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
