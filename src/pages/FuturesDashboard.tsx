import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { BinanceFuturesDashboardData, Candle } from '../types/dashboard';
import { fetchBinanceFuturesDashboard, fetchBinanceFuturesChartData } from '../services/oracleApi';
import { BinanceFuturesMetricsPanel } from '../components/futures/BinanceFuturesMetricsPanel';
import { BinanceFuturesPriceChart } from '../components/futures/BinanceFuturesPriceChart';
import { formatLocalTime } from '../utils/time';
import { websocketService } from '../services/websocket';

function FuturesDashboard() {
  const [data, setData] = useState<BinanceFuturesDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const dashboardData = await fetchBinanceFuturesDashboard();

      if (!dashboardData.priceHistory1m || dashboardData.priceHistory1m.length === 0) {
        const chart1m = await fetchBinanceFuturesChartData('1m', 1000);
        dashboardData.priceHistory1m = chart1m.candles;
      }

      setData(dashboardData);
      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch Binance Futures data');
      setLoading(false);
    }
  };

  const updateLiveCandle = useCallback((price: number) => {
    if (!price) return;

    setData(prevData => {
      if (!prevData) return prevData;

      const updatedData = { ...prevData, currentPrice: price };
      const timeframes: Array<'1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'> =
        ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

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

      timeframes.forEach(tf => {
        const key = `priceHistory${tf}` as keyof BinanceFuturesDashboardData;
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

    websocketService.connect();

    const handleStatusUpdate = (statusData: any) => {
      if (statusData.current_price || statusData.price) {
        updateLiveCandle(statusData.current_price || statusData.price);
      }

      if (statusData.pp_reversal_price !== undefined) {
        setData(prevData => {
          if (!prevData) return prevData;
          return {
            ...prevData,
            position: {
              ...prevData.position,
              ppReversalPrice: statusData.pp_reversal_price,
            },
          };
        });
      }

      if (statusData.in_position !== undefined) {
        setData(prevData => {
          if (!prevData) return prevData;
          return {
            ...prevData,
            position: {
              ...prevData.position,
              inPosition: statusData.in_position,
              side: statusData.position_side || prevData.position.side,
              entryPrice: statusData.entry_price || prevData.position.entryPrice,
              entryTime: statusData.entry_time || prevData.position.entryTime,
              currentPnl: statusData.current_pnl !== undefined ? statusData.current_pnl : prevData.position.currentPnl,
              mfe: statusData.mfe !== undefined ? statusData.mfe : prevData.position.mfe,
              ppActivated: statusData.pp_activated !== undefined ? statusData.pp_activated : prevData.position.ppActivated,
              ppStop: statusData.pp_stop !== undefined ? statusData.pp_stop : prevData.position.ppStop,
            },
          };
        });
      }

      if (statusData.entry_conditions_long) {
        setData(prevData => {
          if (!prevData) return prevData;
          return {
            ...prevData,
            strategy: {
              ...prevData.strategy,
              entryConditionsLong: {
                ...prevData.strategy.entryConditionsLong,
                ...statusData.entry_conditions_long,
              },
            },
          };
        });
      }

      if (statusData.entry_conditions_short) {
        setData(prevData => {
          if (!prevData) return prevData;
          return {
            ...prevData,
            strategy: {
              ...prevData.strategy,
              entryConditionsShort: {
                ...prevData.strategy.entryConditionsShort,
                ...statusData.entry_conditions_short,
              },
            },
          };
        });
      }
    };

    const handlePriceTick = (tickData: any) => {
      if (tickData.price) {
        updateLiveCandle(tickData.price);
      }

      if (tickData.portfolioValue !== undefined) {
        setData(prevData => {
          if (!prevData) return prevData;
          return {
            ...prevData,
            account: {
              ...prevData.account,
              totalAsset: tickData.portfolioValue,
            },
          };
        });
      }
    };

    websocketService.on('bf_live_status', handleStatusUpdate);
    websocketService.on('bf_price_tick', handlePriceTick);

    return () => {
      clearInterval(interval);
      websocketService.off('bf_live_status', handleStatusUpdate);
      websocketService.off('bf_price_tick', handlePriceTick);
    };
  }, [updateLiveCandle]);

  useEffect(() => {
    if (data?.currentPrice) {
      document.title = `Binance Futures - $${data.currentPrice.toFixed(2)}`;
    }
  }, [data?.currentPrice]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-full lg:max-w-[98vw] mx-auto p-2 lg:p-4">
          <div className="flex flex-col mb-2 bg-slate-800/80 border border-slate-700 rounded-lg p-3 shadow-xl">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
              <h1 className="text-lg lg:text-2xl font-bold text-white">
                Loading Binance Futures Dashboard...
              </h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md bg-slate-800/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-700">
          <div className="text-rose-400 text-6xl mb-4">⚠</div>
          <p className="text-white text-xl font-bold mb-2">Failed to load data</p>
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
        <div className="flex flex-col mb-2 bg-slate-800/80 border border-slate-700 rounded-lg p-3 shadow-xl gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-2xl font-bold text-white">
                Binance Futures Dashboard
              </h1>
              {data.strategy.version && (
                <span className="text-[10px] text-emerald-400 font-mono">{data.strategy.version}</span>
              )}
              {data.position.inPosition && (
                <div className="relative px-4 py-2 bg-blue-100/80 backdrop-blur-sm rounded-lg border border-blue-400/40 shadow-lg overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-200/20 via-transparent to-blue-200/20"></div>
                  <div className="relative flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-blue-700 tracking-wider uppercase">
                      {data.position.side} POSITION
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {data.serverTime && (
                <span className="text-xs text-slate-300 font-mono">
                  {formatLocalTime(data.serverTime)}
                </span>
              )}
              <div className={`w-2 h-2 rounded-full ${data.wsHealthy ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[280px,1fr,280px] gap-2" style={{ alignItems: 'start' }}>
          <div className="w-full lg:w-auto flex flex-col gap-2 order-2 lg:order-1 lg:h-[640px]">
            <BinanceFuturesMetricsPanel
              key={`left-${data.serverTime}`}
              data={data}
              position="left"
            />
          </div>
          <div className="w-full min-w-0 order-1 lg:order-2">
            <BinanceFuturesPriceChart data={data} />
          </div>
          <div className="w-full lg:w-[280px] order-3 lg:order-3 lg:h-[640px] flex flex-col gap-2">
            <div className="w-full flex-shrink-0">
              <BinanceFuturesMetricsPanel
                key={`right-${data.serverTime}`}
                data={data}
                position="right"
              />
            </div>
            <div className="w-full flex-1 lg:min-h-0">
              <BinanceFuturesMetricsPanel
                key={`trades-${data.trades?.length}-${data.serverTime}`}
                data={data}
                position="trades"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FuturesDashboard;
