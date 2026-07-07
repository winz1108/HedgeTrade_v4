import { useEffect, useRef, useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { KrakenDashboardData } from '../types/dashboard';
import { fetchKrakenDashboard, fetchKrakenChartData, fetchBinanceFuturesDashboard, fetchKrakenCvbChartData } from '../services/oracleApi';
import { KrakenPriceChart } from '../components/futures/KrakenPriceChart';
import { formatLocalTime } from '../utils/time';
import { websocketService } from '../services/websocket';
import { ProfessionalMetricsPanel } from '../components/futures/ProfessionalMetricsPanel';
import type { ZBStatus, ZBZones, ZBTrade, ZBParams } from '../types/zoneBounce';

function ProfessionalDashboard() {
  const [data, setData] = useState<KrakenDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('15m');
  const [fp60History, setFp60History] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setError(null);
      const [krakenData, binanceData, cvbData] = await Promise.all([
        fetchKrakenDashboard(),
        fetchBinanceFuturesDashboard().catch(() => null),
        fetchKrakenCvbChartData(200).catch(() => null),
      ]);

      if (!krakenData.priceHistory1m || krakenData.priceHistory1m.length === 0) {
        const chart1m = await fetchKrakenChartData('1m', 1000);
        krakenData.priceHistory1m = chart1m.candles;
      }

      if (!krakenData.priceHistoryCvb || krakenData.priceHistoryCvb.length < 50) {
        if (cvbData && cvbData.candles.length > 0) {
          krakenData.priceHistoryCvb = cvbData.candles;
          krakenData.priceHistories = { ...(krakenData.priceHistories || {}), cvb: cvbData.candles };
        }
      } else {
        krakenData.priceHistories = { ...(krakenData.priceHistories || {}), cvb: krakenData.priceHistoryCvb };
      }

      const binanceEntryDetails = (binanceData as any)?.strategyStatus?.entryDetails;
      if (binanceEntryDetails) {
        krakenData.strategyStatus = {
          ...(krakenData.strategyStatus as any),
          entryDetails: binanceEntryDetails,
        } as any;
      }

      if (cvbData?.fp60_history) setFp60History(cvbData.fp60_history);

      setData(prev => {
        if (!prev) return krakenData;
        const prevLeverage = (prev.position as any)?.entryLeverage ?? (prev.position as any)?.entry_leverage;
        const newLeverage = (krakenData.position as any)?.entryLeverage ?? (krakenData.position as any)?.entry_leverage;
        if (prevLeverage && !newLeverage && krakenData.position?.in_position) {
          krakenData.position = { ...krakenData.position, entryLeverage: prevLeverage } as any;
        }
        return krakenData;
      });
      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    websocketService.connect();

    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let lastWsMessage = Date.now();

    const startFallback = () => {
      if (!fallbackInterval) {
        fallbackInterval = setInterval(loadData, 30000);
      }
    };
    const stopFallback = () => {
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };

    const wsHealthCheck = setInterval(() => {
      if (Date.now() - lastWsMessage > 15000) {
        startFallback();
      } else {
        stopFallback();
      }
    }, 5000);

    const handleStatusUpdate = (statusData: any) => {
      lastWsMessage = Date.now();
      setData(prevData => {
        if (!prevData) return prevData;
        let updated = { ...prevData };
        if (statusData.current_price) {
          const p = Number(statusData.current_price);
          if (!isNaN(p) && p > 0) {
            updated.currentPrice = p;
            if (updated.priceHistories) {
              const updatedHistories = { ...updated.priceHistories };
              ['1m', '5m', '15m', '30m', '1h', '4h', '1d'].forEach(tf => {
                const candles = updatedHistories[tf];
                if (candles && candles.length > 0) {
                  const updatedCandles = [...candles];
                  const last = { ...updatedCandles[updatedCandles.length - 1] };
                  last.close = p;
                  last.high = Math.max(last.high, p);
                  last.low = Math.min(last.low, p);
                  updatedCandles[updatedCandles.length - 1] = last;
                  updatedHistories[tf] = updatedCandles;
                }
              });
              updated.priceHistories = updatedHistories;
            }
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
      lastWsMessage = Date.now();
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
            updated.currentPrice = p;
            if (updated.priceHistories) {
              const updatedHistories = { ...updated.priceHistories };
              ['1m', '5m', '15m', '30m', '1h', '4h', '1d'].forEach(tf => {
                const candles = updatedHistories[tf];
                if (candles && candles.length > 0) {
                  const updatedCandles = [...candles];
                  const last = { ...updatedCandles[updatedCandles.length - 1] };
                  last.close = p;
                  last.high = Math.max(last.high, p);
                  last.low = Math.min(last.low, p);
                  updatedCandles[updatedCandles.length - 1] = last;
                  updatedHistories[tf] = updatedCandles;
                }
              });
              updated.priceHistories = updatedHistories;
            }
          }
        }
        if (priceData.portfolioValue !== undefined) {
          updated.balance = { ...updated.balance, portfolioValue: priceData.portfolioValue } as any;
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
        if (priceData.exit_prices) { statusUpdate.exitPrices = { ...prevStatus.exitPrices, ...priceData.exit_prices }; statusChanged = true; }
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
          updated.strategyA = { ...updated.strategyA, exit_conditions: priceData.exit_conditions };
        }
        if (priceData.zoneData) {
          (updated as any).zoneData = priceData.zoneData;
        }
        return updated;
      });
    };

    const handleKrakenCandleUpdate = (candleData: any) => {
      if (!candleData) return;
      lastWsMessage = Date.now();
      const tf = candleData.timeframe as string;
      if (tf === 'cvb') {
        setData(prevData => {
          if (!prevData || !prevData.priceHistories) return prevData;
          const candles = prevData.priceHistories[tf];
          if (!candles || candles.length === 0) return prevData;
          const updatedCandles = [...candles];
          const lastCandle = updatedCandles[updatedCandles.length - 1];

          if (candleData.is_final === true) {
            fetchKrakenCvbChartData(200).then(result => {
              const freshCandles = result?.candles;
              if (!freshCandles || freshCandles.length === 0) return;
              setData(prev => {
                if (!prev || !prev.priceHistories) return prev;
                return { ...prev, priceHistoryCvb: freshCandles, priceHistories: { ...prev.priceHistories, cvb: freshCandles } };
              });
            }).catch(() => {});
            return prevData;
          }

          const wsSeq = candleData.seq;
          const lastSeq = (lastCandle as any).seq;

          if (wsSeq != null && lastSeq != null && wsSeq > lastSeq) {
            const prevClose = lastCandle.close;
            updatedCandles.push({
              ...candleData,
              open_time_ms: candleData.time ? candleData.time * 1000 : Date.now(),
              timestamp: candleData.time ? candleData.time * 1000 : Date.now(),
              seq: wsSeq,
              open: prevClose,
              high: Math.max(prevClose, candleData.high || prevClose),
              low: Math.min(prevClose, candleData.low || prevClose),
              close: candleData.close || prevClose,
              volume: candleData.volume || 0,
              volume_pct: candleData.volume_pct ?? 0,
              duration: candleData.duration ?? 0,
              poc: candleData.poc ?? (lastCandle as any).poc,
              is_forming: true,
            } as any);
            if (updatedCandles.length > 250) updatedCandles.shift();
          } else {
            updatedCandles[updatedCandles.length - 1] = {
              ...lastCandle,
              high: Math.max(lastCandle.high, candleData.high),
              low: Math.min(lastCandle.low, candleData.low),
              close: candleData.close,
              ...(candleData.volume !== undefined ? { volume: candleData.volume } : {}),
              ...(candleData.volume_pct !== undefined ? { volume_pct: candleData.volume_pct } : {}),
              ...(candleData.duration !== undefined ? { duration: candleData.duration } : {}),
              ...(candleData.poc !== undefined ? { poc: candleData.poc } : {}),
            };
          }
          return { ...prevData, priceHistoryCvb: updatedCandles, priceHistories: { ...prevData.priceHistories, cvb: updatedCandles } };
        });
        return;
      }

      const openTimeMs: number = candleData.open_time_ms ?? (typeof candleData.openTime === 'number' ? candleData.openTime : parseInt(candleData.openTime || '0'));
      const isFinal: boolean = candleData.is_final ?? candleData.isFinal ?? false;

      if (isFinal) {
        const fetchFn = tf === 'cvb'
          ? () => fetchKrakenCvbChartData(200)
          : () => fetchKrakenChartData(tf, 200);
        fetchFn().then(result => {
          const candles = result?.candles;
          if (!candles || candles.length === 0) return;
          setData(prev => {
            if (!prev || !prev.priceHistories) return prev;
            return { ...prev, priceHistories: { ...prev.priceHistories, [tf]: candles } };
          });
        }).catch(() => {});
        return;
      }

      setData(prevData => {
        if (!prevData || !prevData.priceHistories) return prevData;
        const updatedHistories = { ...prevData.priceHistories };
        const candles = updatedHistories[tf];
        if (!candles || candles.length === 0) return prevData;

        const updatedCandles = [...candles];
        const lastCandle = updatedCandles[updatedCandles.length - 1];
        const lastTs: number = lastCandle.open_time_ms ?? lastCandle.timestamp ?? (lastCandle.time ? lastCandle.time * 1000 : 0);
        const wsIndicators = candleData.indicators && Object.keys(candleData.indicators).length > 0 ? candleData.indicators : undefined;

        if (openTimeMs === lastTs || Math.floor(openTimeMs / 1000) === Math.floor(lastTs / 1000)) {
          updatedCandles[updatedCandles.length - 1] = {
            ...lastCandle,
            high: Math.max(lastCandle.high, candleData.high), low: Math.min(lastCandle.low, candleData.low),
            close: candleData.close, volume: candleData.volume ?? lastCandle.volume,
            ...(wsIndicators ? { indicators: { ...lastCandle.indicators, ...wsIndicators } } : {}),
          };
        } else if (openTimeMs > lastTs) {
          updatedCandles.push({
            open_time_ms: openTimeMs, timestamp: openTimeMs, time: Math.floor(openTimeMs / 1000),
            open: lastCandle.close, high: candleData.high, low: candleData.low,
            close: candleData.close, volume: candleData.volume || 0,
            ...(wsIndicators ? { indicators: wsIndicators } : {}),
          } as any);
          if (updatedCandles.length > 200) updatedCandles.shift();
        }

        updatedHistories[tf] = updatedCandles;

        if (tf === '1m' && candleData.close != null) {
          const p = candleData.close;
          ['5m', '15m', '30m', '1h', '4h', '1d'].forEach(htf => {
            const htfCandles = updatedHistories[htf];
            if (!htfCandles || htfCandles.length === 0) return;
            const htfUpdated = [...htfCandles];
            const last = { ...htfUpdated[htfUpdated.length - 1] };
            last.close = p;
            last.high = Math.max(last.high, p);
            last.low = Math.min(last.low, p);
            htfUpdated[htfUpdated.length - 1] = last;
            updatedHistories[htf] = htfUpdated;
          });
          return { ...prevData, currentPrice: candleData.close, priceHistories: updatedHistories };
        }

        return { ...prevData, priceHistories: updatedHistories };
      });
    };

    websocketService.on('kraken_candle_update', handleKrakenCandleUpdate);
    websocketService.on('kraken_price_update', handleKrakenPriceUpdate);
    websocketService.on('kraken_status_update', handleStatusUpdate);

    const cvbPollInterval = setInterval(() => {
      fetchKrakenCvbChartData(5).then(result => {
        const freshCandles = result?.candles;
        if (!freshCandles || freshCandles.length === 0) return;
        const freshLast = freshCandles[freshCandles.length - 1];
        setData(prev => {
          if (!prev?.priceHistories?.cvb) return prev;
          const cvbCandles = [...prev.priceHistories.cvb];
          if (cvbCandles.length === 0) return prev;
          const lastCandle = cvbCandles[cvbCandles.length - 1];
          const lastSeq = (lastCandle as any).seq;
          const freshSeq = (freshLast as any).seq;
          if (freshSeq != null && lastSeq != null && freshSeq > lastSeq) {
            cvbCandles.push(freshLast);
            if (cvbCandles.length > 250) cvbCandles.shift();
          } else {
            cvbCandles[cvbCandles.length - 1] = {
              ...lastCandle,
              high: Math.max(lastCandle.high, freshLast.high),
              low: Math.min(lastCandle.low, freshLast.low),
              close: freshLast.close,
              volume: freshLast.volume ?? lastCandle.volume,
              volume_pct: (freshLast as any).volume_pct ?? (lastCandle as any).volume_pct,
              duration: (freshLast as any).duration ?? (lastCandle as any).duration,
              poc: (freshLast as any).poc ?? (lastCandle as any).poc,
            };
          }
          return {
            ...prev,
            priceHistoryCvb: cvbCandles,
            priceHistories: { ...prev.priceHistories, cvb: cvbCandles },
          };
        });
        if (result.fp60_history) setFp60History(result.fp60_history);
      }).catch(() => {});
    }, 5000);

    const handleTradeEvent = (tradeData: any) => {
      if (!tradeData) return;
      lastWsMessage = Date.now();
      setData(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (tradeData.trades && Array.isArray(tradeData.trades)) {
          updated.recentTrades = tradeData.trades;
        } else if (tradeData.trade) {
          const existing = [...(prev.recentTrades || [])];
          const tradeTs = tradeData.trade.timestamp || tradeData.trade.time;
          const isDuplicate = existing.some(t =>
            (t.timestamp || (t as any).time) === tradeTs && t.type === tradeData.trade.type
          );
          if (!isDuplicate) {
            existing.push(tradeData.trade);
            if (existing.length > 50) existing.shift();
          }
          updated.recentTrades = existing;
        }
        if (tradeData.holding !== undefined) {
          const prevLev = (updated.position as any)?.entryLeverage ?? (updated.position as any)?.entry_leverage;
          updated.position = { ...updated.position, ...tradeData.holding };
          if (prevLev && !(tradeData.holding as any)?.entryLeverage && !(tradeData.holding as any)?.entry_leverage) {
            (updated.position as any).entryLeverage = prevLev;
          }
        }
        return updated;
      });
    };

    const handleDashboardUpdate = (dashData: any) => {
      if (!dashData) return;
      lastWsMessage = Date.now();
      setData(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (dashData.trades && Array.isArray(dashData.trades)) {
          updated.recentTrades = dashData.trades;
        }
        if (dashData.holding !== undefined) {
          const prevLev = (updated.position as any)?.entryLeverage ?? (updated.position as any)?.entry_leverage;
          updated.position = { ...updated.position, ...dashData.holding };
          if (prevLev && !(dashData.holding as any)?.entryLeverage && !(dashData.holding as any)?.entry_leverage) {
            (updated.position as any).entryLeverage = prevLev;
          }
        }
        if (dashData.strategyStatus) {
          updated.strategyStatus = { ...(updated.strategyStatus as any), ...dashData.strategyStatus } as any;
        }
        return updated;
      });
    };

    const unsubTradeEvent = websocketService.onTradeEvent(handleTradeEvent);
    const unsubDashboard = websocketService.onDashboardUpdate(handleDashboardUpdate);

    const unsubBinancePrice = websocketService.onPriceUpdate((priceData) => {
      if (!priceData?.currentPrice) return;
      const p = Number(priceData.currentPrice);
      if (isNaN(p) || p <= 0) return;
      setData(prevData => {
        if (!prevData?.priceHistories?.cvb) return prevData;
        const cvbCandles = [...prevData.priceHistories.cvb];
        if (cvbCandles.length === 0) return prevData;
        const last = { ...cvbCandles[cvbCandles.length - 1] };
        last.close = p;
        last.high = Math.max(last.high, p);
        last.low = Math.min(last.low, p);
        cvbCandles[cvbCandles.length - 1] = last;
        return {
          ...prevData,
          priceHistoryCvb: cvbCandles,
          priceHistories: { ...prevData.priceHistories, cvb: cvbCandles },
        };
      });
    });

    return () => {
      clearInterval(wsHealthCheck);
      clearInterval(cvbPollInterval);
      stopFallback();
      websocketService.off('kraken_candle_update', handleKrakenCandleUpdate);
      websocketService.off('kraken_price_update', handleKrakenPriceUpdate);
      websocketService.off('kraken_status_update', handleStatusUpdate);
      unsubBinancePrice();
      unsubTradeEvent();
      unsubDashboard();
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
              Loading Professional Dashboard...
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
            onClick={() => { setLoading(true); loadData(); }}
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
                <span className="text-[11px] font-semibold text-cyan-400 tracking-wide">Professional</span>
              </div>
              {(data.version || true) && (
                <span className="text-[10px] text-cyan-400 font-mono">{(data as any).strategyVersion || 'FP60-vmatch v1.0'}</span>
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
                  }`} />
                  <div className="relative flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      data.position.position_side === 'SHORT' ? 'bg-orange-400' : 'bg-cyan-400'
                    }`} />
                    <span className={`text-xs font-bold tracking-wider uppercase ${
                      data.position.position_side === 'SHORT' ? 'text-orange-200' : 'text-cyan-200'
                    }`}>
                      {data.position.position_side}
                    </span>
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
            <ProfessionalMetricsPanel data={data} position="left" zbStatus={zbData.status} zbZones={zbData.zones} />
          </div>
          <div ref={chartColRef} className="w-full min-w-0 order-1 lg:order-2">
            <KrakenPriceChart data={data} onTimeframeChange={setSelectedTimeframe} zbZones={zbData.zones} zbStatus={zbData.status} fp60History={fp60History} />
          </div>
          <div className="w-full lg:w-[280px] order-3 lg:order-3 flex flex-col gap-1.5">
            <div className="w-full flex-shrink-0">
              <ProfessionalMetricsPanel data={data} position="right" />
            </div>
            <div className="w-full flex-shrink-0 h-[220px]">
              <ProfessionalMetricsPanel data={data} position="trades" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalDashboard;
