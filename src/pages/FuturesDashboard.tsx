import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { KrakenDashboardData, Candle } from '../types/dashboard';
import { fetchKrakenDashboard, fetchKrakenChartData, fetchBinanceFuturesDashboard } from '../services/oracleApi';
import { KrakenMetricsPanel } from '../components/futures/KrakenMetricsPanel';
import { KrakenPriceChart } from '../components/futures/KrakenPriceChart';
import { formatLocalTime } from '../utils/time';
import { websocketService } from '../services/websocket';
import type { ZBStatus, ZBZones, ZBTrade, ZBParams } from '../types/zoneBounce';

function FuturesDashboard() {
  const [data, setData] = useState<KrakenDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1m');

  const mergePreservingLive = useCallback(
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
            ...(liveIndicators ? { indicators: { ...newLast.indicators, ...liveIndicators } } : {}),
          };
          merged[tf] = preserved;
        } else if (!newLastIsFinal) {
          const preserved = [...newArr];
          const liveIndicators = prevLast.indicators && Object.keys(prevLast.indicators).length > 0 ? prevLast.indicators : undefined;
          preserved[preserved.length - 1] = {
            ...newLast,
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
      const [krakenData, binanceData] = await Promise.all([
        fetchKrakenDashboard(),
        fetchBinanceFuturesDashboard().catch(() => null),
      ]);

      if (!krakenData.priceHistory1m || krakenData.priceHistory1m.length === 0) {
        const chart1m = await fetchKrakenChartData('1m', 1000);
        krakenData.priceHistory1m = chart1m.candles;
      }

      // Unify signal info: use Binance's entryDetails for Kraken dashboard.
      const binanceEntryDetails = (binanceData as any)?.strategyStatus?.entryDetails;
      if (binanceEntryDetails) {
        krakenData.strategyStatus = {
          ...(krakenData.strategyStatus as any),
          entryDetails: binanceEntryDetails,
        } as any;
      }

      setData(prev => {
        if (!prev) return krakenData;
        return {
          ...krakenData,
          priceHistories: mergePreservingLive(prev.priceHistories, krakenData.priceHistories),
        };
      });
      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch Kraken data');
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

    websocketService.connect();

    const applyPriceToCandles = (prevData: KrakenDashboardData, price: number): KrakenDashboardData => {
      const updated = { ...prevData, currentPrice: price };
      const tfs: Array<'1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'> = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
      if (prevData.priceHistories) {
        const updatedHistories = { ...prevData.priceHistories };
        tfs.forEach(tf => {
          const candles = updatedHistories[tf];
          if (candles && candles.length > 0) {
            const updatedCandles = [...candles];
            const last = { ...updatedCandles[updatedCandles.length - 1] };
            last.close = price;
            last.high = Math.max(last.high, price);
            last.low = Math.min(last.low, price);
            updatedCandles[updatedCandles.length - 1] = last;
            updatedHistories[tf] = updatedCandles;
          }
        });
        updated.priceHistories = updatedHistories;
      }
      tfs.forEach(tf => {
        const key = `priceHistory${tf}` as keyof KrakenDashboardData;
        const candles = prevData[key] as Candle[] | undefined;
        if (candles && candles.length > 0) {
          const updatedCandles = [...candles];
          const last = { ...updatedCandles[updatedCandles.length - 1] };
          last.close = price;
          last.high = Math.max(last.high, price);
          last.low = Math.min(last.low, price);
          updatedCandles[updatedCandles.length - 1] = last;
          (updated as any)[key] = updatedCandles;
        }
      });
      return updated;
    };

    const handleStatusUpdate = (statusData: any) => {
      setData(prevData => {
        if (!prevData) return prevData;
        let updated = { ...prevData };

        if (statusData.current_price) {
          const p = Number(statusData.current_price);
          if (!isNaN(p) && p > 0) {
            updated = applyPriceToCandles(updated, p);
          }
        }

        if (statusData.pp_reversal_price !== undefined) {
          updated.strategyA = { ...updated.strategyA, pp_reversal_price: statusData.pp_reversal_price };
        }
        return updated;
      });
    };

    const handleKrakenPriceUpdate = (priceData: any) => {
      if (!priceData) return;

      if (priceData.price != null) {
        const krakenPrice = Number(priceData.price);
        if (isNaN(krakenPrice) || krakenPrice <= 0) return;
      }

      setData(prevData => {
        if (!prevData) return prevData;
        let updated = { ...prevData };

        if (priceData.price != null) {
          const p = Number(priceData.price);
          if (!isNaN(p) && p > 0) {
            updated = applyPriceToCandles(updated, p);
          }
        }

        if (priceData.portfolioValue !== undefined) {
          updated.balance = {
            ...updated.balance,
            portfolioValue: priceData.portfolioValue,
          } as any;
        }

        if (priceData.currentPnl !== undefined || priceData.mfe !== undefined || priceData.mae !== undefined) {
          updated.strategyA = {
            ...updated.strategyA,
            ...(priceData.currentPnl !== undefined ? { current_pnl: priceData.currentPnl } : {}),
            ...(priceData.mfe !== undefined ? { mfe: priceData.mfe } : {}),
            ...(priceData.mae !== undefined ? { mae: priceData.mae } : {}),
          };
        }
        if (priceData.entry_leverage !== undefined) {
          updated.position = { ...updated.position, entryLeverage: priceData.entry_leverage } as any;
        }
        if (priceData.in_position === false) {
          updated.position = { ...updated.position, entryLeverage: null, entry_leverage: undefined } as any;
        }

        const prevStatus = updated.strategyStatus || {} as any;
        const statusUpdate: any = { ...prevStatus };
        let statusChanged = false;

        if (priceData.in_position !== undefined) { statusUpdate.inPosition = priceData.in_position; statusChanged = true; }
        if (priceData.position_side !== undefined) { statusUpdate.positionSide = priceData.position_side; statusChanged = true; }
        if (priceData.entry_price !== undefined) { statusUpdate.entryPrice = priceData.entry_price; statusChanged = true; }
        if (priceData.vwap_band_series !== undefined) { statusUpdate.vwapBandSeries = priceData.vwap_band_series; statusChanged = true; }
        if (priceData.indicators) { statusUpdate.indicators = { ...prevStatus.indicators, ...priceData.indicators }; statusChanged = true; }
        if (priceData.v32) { statusUpdate.v32 = { ...prevStatus.v32, ...priceData.v32 }; statusChanged = true; }
        if (priceData.exit_prices) {
          statusUpdate.exitPrices = { ...prevStatus.exitPrices, ...priceData.exit_prices };
          statusChanged = true;
        }
        if (priceData.exit_conditions) { statusUpdate.exitConditions = { ...prevStatus.exitConditions, ...priceData.exit_conditions }; statusChanged = true; }

        if (statusChanged) updated.strategyStatus = statusUpdate;

        if (priceData.exit_prices && priceData.in_position) {
          updated.strategyA = {
            ...updated.strategyA,
            exit_prices: priceData.exit_prices,
            floor_price: priceData.exit_prices.floor_price,
            sl_price: priceData.exit_prices.sl_price,
          };
        }

        if (priceData.exit_conditions) {
          updated.strategyA = {
            ...updated.strategyA,
            exit_conditions: priceData.exit_conditions,
          };
        }

        if (priceData.zoneData) {
          (updated as any).zoneData = priceData.zoneData;
        }

        return updated;
      });
    };

    const handleKrakenCandleUpdate = (candleData: any) => {
      if (!candleData) return;

      const openTimeMs: number =
        candleData.open_time_ms ??
        (typeof candleData.openTime === 'number' ? candleData.openTime : parseInt(candleData.openTime || '0'));
      const isFinal: boolean = candleData.is_final ?? candleData.isFinal ?? false;

      setData(prevData => {
        if (!prevData) return prevData;
        const updatedData = { ...prevData };

        if (prevData.priceHistories) {
          const updatedHistories = { ...prevData.priceHistories };
          const tf = candleData.timeframe as '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';
          const candles = updatedHistories[tf];
          if (candles && candles.length > 0) {
            const updatedCandles = [...candles];
            const lastCandle = updatedCandles[updatedCandles.length - 1];
            const lastTs: number =
              lastCandle.open_time_ms ??
              lastCandle.timestamp ??
              (lastCandle.time ? lastCandle.time * 1000 : 0);

            const wsIndicators = candleData.indicators && Object.keys(candleData.indicators).length > 0 ? candleData.indicators : undefined;
            if (isFinal) {
              const targetIdx = updatedCandles.findIndex(c => {
                const ts = c.open_time_ms ?? c.timestamp ?? (c.time ? c.time * 1000 : 0);
                return ts === openTimeMs || Math.floor(ts / 1000) === Math.floor(openTimeMs / 1000);
              });
              if (targetIdx !== -1) {
                updatedCandles[targetIdx] = {
                  ...updatedCandles[targetIdx],
                  open: candleData.open,
                  high: candleData.high,
                  low: candleData.low,
                  close: candleData.close,
                  volume: candleData.volume ?? updatedCandles[targetIdx].volume,
                  is_final: true,
                  ...(wsIndicators ? { indicators: { ...updatedCandles[targetIdx].indicators, ...wsIndicators } } : {}),
                };
              }
            } else if (openTimeMs === lastTs || Math.floor(openTimeMs / 1000) === Math.floor(lastTs / 1000)) {
              updatedCandles[updatedCandles.length - 1] = {
                ...lastCandle,
                high: Math.max(lastCandle.high, candleData.high),
                low: Math.min(lastCandle.low, candleData.low),
                close: candleData.close,
                volume: candleData.volume ?? lastCandle.volume,
                ...(wsIndicators ? { indicators: { ...lastCandle.indicators, ...wsIndicators } } : {}),
              };
            } else if (openTimeMs > lastTs) {
              updatedCandles.push({
                open_time_ms: openTimeMs,
                timestamp: openTimeMs,
                time: Math.floor(openTimeMs / 1000),
                open: candleData.open ?? lastCandle.close,
                high: candleData.high,
                low: candleData.low,
                close: candleData.close,
                volume: candleData.volume || 0,
                ...(wsIndicators ? { indicators: wsIndicators } : {}),
              } as any);
            }
            updatedHistories[tf] = updatedCandles;
            updatedData.priceHistories = updatedHistories;
          }
        }

        return updatedData;
      });
    };

    websocketService.on('kraken_candle_update', handleKrakenCandleUpdate);
    websocketService.on('kraken_price_update', handleKrakenPriceUpdate);
    websocketService.on('kraken_status_update', handleStatusUpdate);

    return () => {
      clearInterval(interval);
      websocketService.off('kraken_candle_update', handleKrakenCandleUpdate);
      websocketService.off('kraken_price_update', handleKrakenPriceUpdate);
      websocketService.off('kraken_status_update', handleStatusUpdate);
    };
  }, [selectedTimeframe]);

  const zbData = useMemo(() => {
    const zb = data?.zoneBounce;
    if (!zb) return { status: null as ZBStatus | null, zones: null as ZBZones | null, trades: [] as ZBTrade[], params: null as ZBParams | null, online: false };
    return {
      status: (zb.status || null) as ZBStatus | null,
      zones: (zb.zones || null) as ZBZones | null,
      trades: ((zb.trades as any)?.trades || []) as ZBTrade[],
      params: (zb.params || null) as ZBParams | null,
      online: !!zb.status,
    };
  }, [data?.zoneBounce]);

  const chartColRef = useRef<HTMLDivElement | null>(null);
  const [chartColHeight, setChartColHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = chartColRef.current;
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setChartColHeight(Math.round(h));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [data]);

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
          <div className="text-rose-500 text-6xl mb-4">!</div>
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
              <div className="flex items-baseline gap-1.5">
                <h1 className="text-lg lg:text-2xl font-bold text-slate-100">HedgeTrade</h1>
                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">Kraken</span>
              </div>
              {data.version && (
                <span className="text-[10px] text-cyan-400 font-mono">{data.version}</span>
              )}
              {data.position.in_position && (
                <div className={`relative px-4 py-2 backdrop-blur-sm rounded-lg border overflow-hidden ${
                  data.position.position_side === 'SHORT'
                    ? 'bg-orange-500/20 border-orange-500/60 header-position-short'
                    : 'bg-cyan-500/20 border-cyan-500/60 header-position-long'
                }`}>
                  <div className={`absolute inset-0 bg-gradient-to-r ${
                    data.position.position_side === 'SHORT'
                      ? 'from-orange-500/20 via-orange-400/5 to-orange-500/20'
                      : 'from-cyan-500/20 via-cyan-400/5 to-cyan-500/20'
                  }`}></div>
                  <div className="relative flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      data.position.position_side === 'SHORT' ? 'bg-orange-400' : 'bg-cyan-400'
                    }`}></div>
                    <span className={`text-xs font-bold tracking-wider uppercase ${
                      data.position.position_side === 'SHORT' ? 'text-orange-200' : 'text-cyan-200'
                    }`}>
                      {data.position.position_side}
                    </span>
                    {(data.strategyStatus?.entryMode || data.strategyA?.entry_mode) === 'RIDE' && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-500/30 text-blue-300 border border-blue-400/40 rounded tracking-wider">
                        RIDE
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-400">
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

        <div className="flex flex-col lg:grid lg:grid-cols-[280px,1fr,280px] gap-2 lg:items-start">
          <div className="w-full lg:w-auto flex flex-col gap-1 order-2 lg:order-1">
            <KrakenMetricsPanel data={data} position="left" zbStatus={zbData.status} zbZones={zbData.zones} />
          </div>
          <div ref={chartColRef} className="w-full min-w-0 order-1 lg:order-2">
            <KrakenPriceChart data={data} onTimeframeChange={setSelectedTimeframe} zbZones={zbData.zones} zbStatus={zbData.status} />
          </div>
          <div className="w-full lg:w-[280px] order-3 lg:order-3 flex flex-col gap-1.5">
            <div className="w-full flex-shrink-0">
              <KrakenMetricsPanel data={data} position="right" />
            </div>
            <div className="w-full flex-shrink-0 h-[480px] lg:h-[420px]">
              <KrakenMetricsPanel data={data} position="trades" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FuturesDashboard;
