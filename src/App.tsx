import { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw, Bug } from 'lucide-react';
import { DashboardData, TradeEvent, Candle } from './types/dashboard';
import { fetchDashboardData, fetchChartData, fetchStrategyStatus } from './services/oracleApi';
import { PriceChart } from './components/PriceChart';
import { MetricsPanel } from './components/MetricsPanel';
import { ChartSkeleton, MetricsSkeleton } from './components/ChartSkeleton';
import { formatLocalTime } from './utils/time';
import { websocketService, CandleData } from './services/websocket';
import { dataCache } from './services/dataCache';

// 타임프레임별 예상 간격(ms)
const TIMEFRAME_INTERVALS: Record<string, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

type TimeframeStatus = {
  [K in '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d']: 'idle' | 'loading' | 'loaded';
};

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setHoveredTrade] = useState<TradeEvent | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    return hash || 'Account_A';
  });
  const [timeframeStatus, setTimeframeStatus] = useState<TimeframeStatus>({
    '1m': 'idle',
    '5m': 'idle',
    '15m': 'idle',
    '30m': 'idle',
    '1h': 'idle',
    '4h': 'idle',
    '1d': 'idle',
  });
  // BTC 수량과 USDC 수량을 저장 (가격 업데이트 시 자산 재계산용)
  const btcBalanceRef = useRef<number>(0);
  const usdcBalanceRef = useRef<number>(0);
  const loadingQueueRef = useRef<string[]>([]);
  const isLoadingRef = useRef(false);

  // 갭 감지 및 자동 채우기
  const detectAndFillGap = useCallback(async (
    timeframe: string,
    lastTimestamp: number,
    newTimestamp: number
  ) => {
    const interval = TIMEFRAME_INTERVALS[timeframe];
    if (!interval) return;

    const gap = newTimestamp - lastTimestamp;

    // 예상 간격의 1.5배 이상 차이나면 갭으로 판단
    if (gap > interval * 1.5) {
      const missedCandles = Math.floor(gap / interval) - 1;

      // 갭 채우기: 누락된 개수 + 여유분 5개 요청
      try {
        const limit = Math.min(missedCandles + 5, 100);
        const chart = await fetchChartData(timeframe, limit);
        const timeframeLower = timeframe.toLowerCase();
        const timeframeKey = `priceHistory${timeframeLower}` as keyof DashboardData;

        setData(prev => {
          if (!prev) return prev;

          const existingCandles = (prev[timeframeKey] as Candle[] | undefined) || [];
          const merged = [...existingCandles];
          let addedCount = 0;

          for (const newCandle of chart.candles as Candle[]) {
            const existingIndex = merged.findIndex(c => c.timestamp === newCandle.timestamp);
            if (existingIndex === -1) {
              const insertIndex = merged.findIndex(c => c.timestamp > newCandle.timestamp);
              if (insertIndex === -1) {
                merged.push(newCandle);
              } else {
                merged.splice(insertIndex, 0, newCandle);
              }
              addedCount++;
            }
          }

          merged.sort((a, b) => a.timestamp - b.timestamp);


          if (merged.length > 500) {
            merged.splice(0, merged.length - 500);
          }

          return { ...prev, [timeframeKey]: merged };
        });
      } catch (error) {
      }
    }
  }, []);

  const loadTimeframe = useCallback(async (timeframe: string, priority: boolean = false) => {
    let shouldLoad = false;

    setTimeframeStatus(prev => {
      const currentStatus = prev[timeframe as keyof TimeframeStatus];
      if (currentStatus === 'loading' || currentStatus === 'loaded') {
        return prev;
      }
      shouldLoad = true;
      return { ...prev, [timeframe]: 'loading' };
    });

    if (!shouldLoad) return;

    try {
      const chart = await fetchChartData(timeframe, 500);
      const timeframeLower = timeframe.toLowerCase();
      const timeframeKey = `priceHistory${timeframeLower}` as keyof DashboardData;

      setData(prev => {
        if (!prev) return prev;
        return { ...prev, [timeframeKey]: chart.candles as Candle[] };
      });

      setTimeframeStatus(prev => ({ ...prev, [timeframe]: 'loaded' }));
    } catch (error) {
      setTimeframeStatus(prev => ({ ...prev, [timeframe]: 'idle' }));
    }
  }, []);

  const loadBackgroundTimeframes = useCallback(async () => {
    const backgroundTimeframes = ['5m', '15m', '30m', '1h', '4h', '1d'];

    for (const tf of backgroundTimeframes) {
      await loadTimeframe(tf);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [loadTimeframe]);

  const handleTimeframeRequest = useCallback(async (timeframe: string) => {
    await loadTimeframe(timeframe, true);
  }, [loadTimeframe]);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      const cached = dataCache.load();
      if (cached) {
        setData(prev => prev ? {
          ...prev,
          currentAsset: (cached.currentAsset && cached.currentAsset > 0) ? cached.currentAsset : prev.currentAsset,
          currentBTC: (cached.currentBTC && cached.currentBTC > 0) ? cached.currentBTC : prev.currentBTC,
          currentCash: (cached.currentCash !== undefined) ? cached.currentCash : prev.currentCash,
          initialAsset: (cached.initialAsset && cached.initialAsset > 0) ? cached.initialAsset : prev.initialAsset,
          currentPrice: (cached.currentPrice && cached.currentPrice > 0) ? cached.currentPrice : prev.currentPrice,
        } : prev);
      }

      setTimeframeStatus({
        '1m': 'loading',
        '5m': 'idle',
        '15m': 'idle',
        '30m': 'idle',
        '1h': 'idle',
        '4h': 'idle',
        '1d': 'idle',
      });

      const [fullDashboard, chart1m] = await Promise.all([
        fetchDashboardData(selectedAccount),
        fetchChartData('1m', 500),
      ]);

      fullDashboard.priceHistory1m = chart1m.candles as Candle[];

      try {
        const strategyStatus = await fetchStrategyStatus();
        if (strategyStatus) {
          console.log('[Initial Strategy Status Debug]', {
            buyConditions: strategyStatus.buyConditions,
            buyConditionsMet: strategyStatus.buyConditionsMet,
            buyConditionsTotal: strategyStatus.buyConditionsTotal,
            conditionKeys: Object.keys(strategyStatus.buyConditions || {}),
            conditionCount: Object.keys(strategyStatus.buyConditions || {}).length,
          });
          fullDashboard.strategyStatus = strategyStatus;
        }
      } catch {}

      if (fullDashboard.currentBTC !== undefined && fullDashboard.currentPrice) {
        btcBalanceRef.current = fullDashboard.currentBTC / fullDashboard.currentPrice;
      }
      if (fullDashboard.currentCash !== undefined) {
        usdcBalanceRef.current = fullDashboard.currentCash;
      }

      dataCache.save({
        currentAsset: fullDashboard.currentAsset,
        currentBTC: fullDashboard.currentBTC,
        currentCash: fullDashboard.currentCash,
        initialAsset: fullDashboard.initialAsset,
        currentPrice: fullDashboard.currentPrice,
      });

      setData(fullDashboard);
      setTimeframeStatus(prev => ({ ...prev, '1m': 'loaded' }));
      setLoading(false);

      setTimeout(() => {
        loadBackgroundTimeframes();
      }, 100);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      setLoading(false);
    }
  }, [selectedAccount, loadBackgroundTimeframes]);

  useEffect(() => {
    window.location.hash = selectedAccount;
    setLoading(true);
    loadData();
  }, [selectedAccount, loadData]);

  useEffect(() => {
    if (data?.currentPrice) {
      document.title = `HedgeTrade - $${data.currentPrice.toFixed(2)}`;
    }
  }, [data?.currentPrice]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && hash !== selectedAccount) {
        setSelectedAccount(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [selectedAccount]);

  const refillMissingCandles = useCallback(async () => {
    const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const;

    for (const timeframe of timeframes) {
      try {
        const chart = await fetchChartData(timeframe, 100);
        const timeframeLower = timeframe.toLowerCase();
        const timeframeKey = `priceHistory${timeframeLower}` as keyof DashboardData;

        setData(prev => {
          if (!prev) return prev;

          const existingCandles = prev[timeframeKey] as Candle[] | undefined;

          if (!existingCandles || existingCandles.length === 0) {
            return { ...prev, [timeframeKey]: chart.candles as Candle[] };
          }

          const newCandles = chart.candles as Candle[];
          const merged = [...existingCandles];

          for (const newCandle of newCandles) {
            const existingIndex = merged.findIndex(c => c.timestamp === newCandle.timestamp);
            if (existingIndex === -1) {
              const insertIndex = merged.findIndex(c => c.timestamp > newCandle.timestamp);
              if (insertIndex === -1) {
                merged.push(newCandle);
              } else {
                merged.splice(insertIndex, 0, newCandle);
              }
            } else {
              merged[existingIndex] = newCandle;
            }
          }

          if (merged.length > 500) {
            merged.splice(0, merged.length - 500);
          }

          return { ...prev, [timeframeKey]: merged };
        });
      } catch (error) {
      }
    }
  }, []);

  useEffect(() => {
    websocketService.connect();

    const convertCandleData = (candleData: CandleData): Candle => ({
      timestamp: candleData.openTime,
      open: candleData.open,
      high: candleData.high,
      low: candleData.low,
      close: candleData.close,
      volume: candleData.volume,
      isComplete: candleData.isFinal,
      ema5: candleData.ema5,
      ema13: candleData.ema13,
      ema3: candleData.ema3,
      ema8: candleData.ema8,
      bbUpper: candleData.bbUpper,
      bbMiddle: candleData.bbMiddle,
      bbLower: candleData.bbLower,
      bbWidth: candleData.bbWidth,
      macd: candleData.macd,
      signal: candleData.macdSignal,
      histogram: candleData.macdHistogram,
      rsi: candleData.rsi,
      adx: candleData.adx,
    });

    const unsubscribePriceUpdate = websocketService.onPriceUpdate((priceData) => {
      document.title = `HedgeTrade - $${priceData.currentPrice.toFixed(2)}`;

      setData((prevData) => {
        if (!prevData) return prevData;

        // 홀딩 중이면 미실현 수익률 재계산
        let updatedHolding = prevData.holding;
        if (prevData.holding.isHolding && prevData.holding.buyPrice) {
          const currentProfit = ((priceData.currentPrice - prevData.holding.buyPrice) / prevData.holding.buyPrice) * 100;
          updatedHolding = {
            ...prevData.holding,
            currentProfit,
          };
        }

        // 가격이 업데이트될 때마다 자산 재계산 (1초마다)
        const btcValue = btcBalanceRef.current * priceData.currentPrice;
        const totalAsset = btcValue + usdcBalanceRef.current;

        return {
          ...prevData,
          currentPrice: priceData.currentPrice,
          currentTime: priceData.currentTime,
          currentAsset: totalAsset,
          currentBTC: btcValue,
          currentCash: usdcBalanceRef.current,
          holding: updatedHolding,
        };
      });
    });

    const unsubscribeRealtimeCandleUpdate = websocketService.onRealtimeCandleUpdate((update) => {

      setData((prevData) => {
        if (!prevData) return prevData;
        if (!update.timeframe) return prevData;

        // 완성봉은 onCandleComplete에서 처리하므로 여기서는 스킵
        if (update.isFinal) {
          return prevData;
        }

        const newCandle = convertCandleData(update);
        const timeframeLower = update.timeframe.toLowerCase();
        const timeframeKey = `priceHistory${timeframeLower}` as keyof DashboardData;
        const existingCandles = prevData[timeframeKey] as Candle[] | undefined;

        if (!existingCandles) {
          return prevData;
        }

        const candles = [...existingCandles];
        let updatedData = { ...prevData };

        // 진행 중인 봉
        const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;

        if (!lastCandle) {
          // 캔들이 없으면 추가
          candles.push(newCandle);
        } else if (lastCandle.timestamp === newCandle.timestamp) {
          // 타임스탬프가 같으면 진행봉 업데이트
          // 가격 데이터와 지표 모두 실시간 업데이트
          if (!lastCandle.isComplete) {
            lastCandle.close = newCandle.close;
            lastCandle.high = Math.max(lastCandle.high, newCandle.high);
            lastCandle.low = Math.min(lastCandle.low, newCandle.low);
            lastCandle.volume = newCandle.volume;
            // 지표 실시간 업데이트
            if (newCandle.ema5 !== undefined) lastCandle.ema5 = newCandle.ema5;
            if (newCandle.ema13 !== undefined) lastCandle.ema13 = newCandle.ema13;
            if (newCandle.ema3 !== undefined) lastCandle.ema3 = newCandle.ema3;
            if (newCandle.ema8 !== undefined) lastCandle.ema8 = newCandle.ema8;
            if (newCandle.bbUpper !== undefined) lastCandle.bbUpper = newCandle.bbUpper;
            if (newCandle.bbMiddle !== undefined) lastCandle.bbMiddle = newCandle.bbMiddle;
            if (newCandle.bbLower !== undefined) lastCandle.bbLower = newCandle.bbLower;
            if (newCandle.bbWidth !== undefined) lastCandle.bbWidth = newCandle.bbWidth;
            if (newCandle.macd !== undefined) lastCandle.macd = newCandle.macd;
            if (newCandle.signal !== undefined) lastCandle.signal = newCandle.signal;
            if (newCandle.histogram !== undefined) lastCandle.histogram = newCandle.histogram;
            if (newCandle.rsi !== undefined) lastCandle.rsi = newCandle.rsi;
            if (newCandle.adx !== undefined) lastCandle.adx = newCandle.adx;
          }
        } else if (newCandle.timestamp > lastCandle.timestamp) {
          const interval = TIMEFRAME_INTERVALS[update.timeframe];
          if (interval && (newCandle.timestamp - lastCandle.timestamp) > interval * 1.5) {
            detectAndFillGap(update.timeframe, lastCandle.timestamp, newCandle.timestamp);
          }

          if (lastCandle.isComplete === false) {
            lastCandle.isComplete = true;
          }

          const completedCandles = candles.filter(c => c.isComplete !== false);
          const lastCompleted = completedCandles.length > 0
            ? completedCandles[completedCandles.length - 1]
            : lastCandle;

          newCandle.ema5 = lastCompleted.ema5;
          newCandle.ema13 = lastCompleted.ema13;
          newCandle.ema3 = lastCompleted.ema3;
          newCandle.ema8 = lastCompleted.ema8;
          newCandle.bbUpper = lastCompleted.bbUpper;
          newCandle.bbMiddle = lastCompleted.bbMiddle;
          newCandle.bbLower = lastCompleted.bbLower;
          newCandle.bbWidth = lastCompleted.bbWidth;
          newCandle.macd = lastCompleted.macd;
          newCandle.signal = lastCompleted.signal;
          newCandle.histogram = lastCompleted.histogram;
          newCandle.rsi = lastCompleted.rsi;
          newCandle.adx = lastCompleted.adx;

          candles.push(newCandle);

          if (candles.length > 500) {
            candles.shift();
          }
        }

        updatedData = {
          ...prevData,
          [timeframeKey]: candles,
        };

        // 1분봉이 업데이트되면 다른 타임프레임의 마지막 캔들도 재집계
        if (update.timeframe === '1m' && !update.isFinal) {
          const updated1m = candles;
          const timeframeConfigs = [
            { key: 'priceHistory5m' as keyof DashboardData, minutes: 5 },
            { key: 'priceHistory15m' as keyof DashboardData, minutes: 15 },
            { key: 'priceHistory30m' as keyof DashboardData, minutes: 30 },
            { key: 'priceHistory1h' as keyof DashboardData, minutes: 60 },
            { key: 'priceHistory4h' as keyof DashboardData, minutes: 240 },
            { key: 'priceHistory1d' as keyof DashboardData, minutes: 1440 },
          ];

          for (const config of timeframeConfigs) {
            const existingTfCandles = prevData[config.key] as Candle[] | undefined;
            if (!existingTfCandles || existingTfCandles.length === 0) continue;

            const tfCandles = [...existingTfCandles];
            const lastCandle = tfCandles[tfCandles.length - 1];

            // 마지막 캔들의 시간 버킷 계산
            const timeframeMs = config.minutes * 60000;
            const lastBucketKey = Math.floor(lastCandle.timestamp / timeframeMs) * timeframeMs;

            // 1분봉에서 해당 버킷에 속하는 캔들들 찾기
            const candlesInBucket = updated1m.filter(c => {
              const bucketKey = Math.floor(c.timestamp / timeframeMs) * timeframeMs;
              return bucketKey === lastBucketKey;
            });

            if (candlesInBucket.length > 0) {
              // 마지막 캔들 재집계
              candlesInBucket.sort((a, b) => a.timestamp - b.timestamp);
              const aggregated = {
                timestamp: lastBucketKey,
                open: candlesInBucket[0].open,
                high: Math.max(...candlesInBucket.map(c => c.high)),
                low: Math.min(...candlesInBucket.map(c => c.low)),
                close: candlesInBucket[candlesInBucket.length - 1].close,
                volume: candlesInBucket.reduce((sum, c) => sum + (c.volume || 0), 0),
                isComplete: lastCandle.isComplete,
                // 기술지표는 기존 것 유지
                ema5: lastCandle.ema5,
                ema13: lastCandle.ema13,
                bbUpper: lastCandle.bbUpper,
                bbMiddle: lastCandle.bbMiddle,
                bbLower: lastCandle.bbLower,
                bbWidth: lastCandle.bbWidth,
                macd: lastCandle.macd,
                signal: lastCandle.signal,
                histogram: lastCandle.histogram,
                rsi: lastCandle.rsi,
              };

              tfCandles[tfCandles.length - 1] = aggregated;
              updatedData = {
                ...updatedData,
                [config.key]: tfCandles,
              };
            }
          }
        }

        return updatedData;
      });
    });

    const unsubscribeCandleUpdate = websocketService.onCandleUpdate((update) => {
      setData((prevData) => {
        if (!prevData) return prevData;
        if (!update.timeframe) return prevData;

        const newCandle = convertCandleData(update);
        const timeframeLower = update.timeframe.toLowerCase();
        const timeframeKey = `priceHistory${timeframeLower}` as keyof DashboardData;
        const existingCandles = prevData[timeframeKey] as Candle[] | undefined;

        if (!existingCandles) {
          return prevData;
        }

        const candles = [...existingCandles];

        if (update.isFinal) {
          // 완성봉: 갭 감지만 수행
          // 실제 완성봉 업데이트는 onCandleComplete 이벤트의 검증(5개 불러오기)에서만 처리
          const completedCandles = candles.filter(c => c.isComplete !== false);
          if (completedCandles.length > 0) {
            const lastCompleted = completedCandles[completedCandles.length - 1];
            detectAndFillGap(update.timeframe, lastCompleted.timestamp, newCandle.timestamp);
          }

          // 완성봉은 여기서 처리하지 않음 (기술지표 보존을 위해)
          return prevData;
        } else {
          // 진행 중인 봉: 지표는 마지막 완성봉 것을 복사
          const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;

          if (lastCandle && lastCandle.isComplete !== false) {
            // 마지막 캔들이 완성봉이면 지표 복사
            newCandle.ema5 = lastCandle.ema5;
            newCandle.ema13 = lastCandle.ema13;
            newCandle.bbUpper = lastCandle.bbUpper;
            newCandle.bbMiddle = lastCandle.bbMiddle;
            newCandle.bbLower = lastCandle.bbLower;
            newCandle.bbWidth = lastCandle.bbWidth;
            newCandle.macd = lastCandle.macd;
            newCandle.signal = lastCandle.signal;
            newCandle.histogram = lastCandle.histogram;
            newCandle.rsi = lastCandle.rsi;
          } else if (lastCandle && lastCandle.isComplete === false) {
            // 마지막 캔들이 진행 중인 봉이면 그 지표를 그대로 유지
            newCandle.ema5 = lastCandle.ema5;
            newCandle.ema13 = lastCandle.ema13;
            newCandle.bbUpper = lastCandle.bbUpper;
            newCandle.bbMiddle = lastCandle.bbMiddle;
            newCandle.bbLower = lastCandle.bbLower;
            newCandle.bbWidth = lastCandle.bbWidth;
            newCandle.macd = lastCandle.macd;
            newCandle.signal = lastCandle.signal;
            newCandle.histogram = lastCandle.histogram;
            newCandle.rsi = lastCandle.rsi;
          }

          // 진행 중인 봉: 마지막이 진행 중인 봉이면 업데이트, 아니면 추가
          if (candles.length === 0) {
            candles.push(newCandle);
          } else if (lastCandle && lastCandle.isComplete === false) {
            // 마지막 캔들이 진행 중인 봉이면 업데이트
            candles[candles.length - 1] = newCandle;
          } else {
            // 마지막 캔들이 완성봉이면 새 진행 중인 봉 추가
            candles.push(newCandle);
            // 500개 초과 시 앞에서 삭제
            if (candles.length > 500) {
              candles.shift();
            }
          }
        }

        return {
          ...prevData,
          [timeframeKey]: candles,
        };
      });
    });

    const unsubscribeCandleComplete = websocketService.onCandleComplete((update) => {
      if (!update.timeframe) return;

      const timeframeLower = update.timeframe.toLowerCase();
      const timeframeKey = `priceHistory${timeframeLower}` as keyof DashboardData;
      const newCandle = convertCandleData(update);

      setData(prev => {
        if (!prev) return prev;

        const existingCandles = prev[timeframeKey] as Candle[] | undefined;
        if (!existingCandles || existingCandles.length === 0) {
          return { ...prev, [timeframeKey]: [newCandle] };
        }

        const completedCandles = existingCandles.filter(c => c.isComplete !== false);
        if (completedCandles.length > 0) {
          const lastCompleted = completedCandles[completedCandles.length - 1];
          const interval = TIMEFRAME_INTERVALS[update.timeframe];
          if (interval && (newCandle.timestamp - lastCompleted.timestamp) > interval * 1.5) {
            detectAndFillGap(update.timeframe, lastCompleted.timestamp, newCandle.timestamp);
          }
        }

        const merged = [...existingCandles];
        const existingIndex = merged.findIndex(c => c.timestamp === newCandle.timestamp);

        if (existingIndex === -1) {
          const insertIndex = merged.findIndex(c => c.timestamp > newCandle.timestamp);
          if (insertIndex === -1) {
            merged.push(newCandle);
          } else {
            merged.splice(insertIndex, 0, newCandle);
          }
        } else {
          // 기존 캔들이 이미 완성봉이고 같은 데이터면 스킵
          const existingCandle = merged[existingIndex];
          if (existingCandle.isComplete &&
              existingCandle.close === newCandle.close &&
              existingCandle.high === newCandle.high &&
              existingCandle.low === newCandle.low) {
            return prev;
          }

          // 진행봉 → 완성봉 전환 또는 완성봉 업데이트
          merged[existingIndex] = newCandle;
        }

        merged.sort((a, b) => a.timestamp - b.timestamp);

        // 최대 500개만 유지
        if (merged.length > 500) {
          merged.splice(0, merged.length - 500);
        }

        return { ...prev, [timeframeKey]: merged };
      });
    });

    const unsubscribeAccountAssetsUpdate = websocketService.onAccountAssetsUpdate((update) => {
      setData((prevData) => {
        if (!prevData) return prevData;
        if (update.accountId !== selectedAccount) return prevData;
        if (!update.asset) {
          return prevData;
        }

        // 0 값 필터링: 0이 아닌 값만 사용
        const currentAsset = (update.asset.currentAsset && update.asset.currentAsset > 0)
          ? update.asset.currentAsset
          : prevData.currentAsset;
        const currentBTC = (update.asset.currentBTC && update.asset.currentBTC > 0)
          ? update.asset.currentBTC
          : prevData.currentBTC;
        const currentCash = (update.asset.currentCash !== undefined && update.asset.currentCash !== null)
          ? update.asset.currentCash
          : prevData.currentCash;
        const initialAsset = (update.asset.initialAsset && update.asset.initialAsset > 0)
          ? update.asset.initialAsset
          : prevData.initialAsset;

        // 캐시에는 0이 아닌 값만 저장
        if (currentAsset > 0) {
          dataCache.save({
            currentAsset,
            currentBTC,
            currentCash,
            initialAsset,
            currentPrice: prevData.currentPrice,
          });
        }

        return {
          ...prevData,
          currentAsset,
          currentBTC,
          currentCash,
          initialAsset,
        };
      });
    });

    const unsubscribeBinanceServerTime = websocketService.onBinanceServerTime((update) => {
      setData((prevData) => {
        if (!prevData) return prevData;
        return {
          ...prevData,
          currentTime: update.serverTime,
        };
      });
    });

    const unsubscribePredictionUpdate = websocketService.onPredictionUpdate((update) => {
      const newCalculatedAt = update.predictionCalculatedAt;

      setData((prevData) => {
        if (!prevData) return prevData;

        let predictionData = prevData.prediction;

        if (update.prediction) {
          predictionData = update.prediction;
        } else if (update.market_state?.activeState) {
          const activeState = update.market_state.activeState.toUpperCase();
          let marketMood: 'BULL' | 'BEAR' | undefined = undefined;
          if (activeState === 'BULL' || activeState.includes('BULL')) {
            marketMood = 'BULL';
          } else if (activeState === 'BEAR' || activeState.includes('BEAR')) {
            marketMood = 'BEAR';
          }
          predictionData = {
            ...prevData.prediction,
            market_mood: marketMood,
          };
        }

        return {
          ...prevData,
          currentPrediction: {
            takeProfitProb: update.probability,
            stopLossProb: update.stopLossProb || 0,
            v5MoeTakeProfitProb: update.probability,
            predictionDataTimestamp: update.timestamp,
            predictionCalculatedAt: newCalculatedAt,
          },
          lastPredictionUpdateTime: newCalculatedAt,
          marketState: update.market_state,
          gateWeights: update.gate_weights,
          prediction: predictionData,
          holding: {
            ...prevData.holding,
            v5MoeTakeProfitProb: update.probability,
            latestPrediction: {
              takeProfitProb: update.probability,
              stopLossProb: update.stopLossProb || 0,
            },
          },
        };
      });
    });

    const unsubscribeDashboardUpdate = websocketService.onDashboardUpdate((update) => {
      if (update.accounts && update.accounts.length > 0) {
        const accountData = update.accounts.find(acc => acc.accountId === selectedAccount);

        if (accountData) {
          setData((prevData) => {
            if (!prevData) return prevData;

            // 0 값 필터링: 0이 아닌 값만 사용, 0이면 이전 값 유지
            const newAsset = (accountData as any).asset?.currentAsset ?? accountData.totalAsset;
            const newBTC = (accountData as any).asset?.currentBTC ?? accountData.btcValue;
            const newCash = (accountData as any).asset?.currentCash ?? accountData.usdcBalance;

            const currentAsset = (newAsset && newAsset > 0) ? newAsset : prevData.currentAsset;
            const currentBTC = (newBTC && newBTC > 0) ? newBTC : prevData.currentBTC;
            const currentCash = (newCash !== undefined && newCash !== null) ? newCash : prevData.currentCash;

            // btcBalance와 usdcBalance 업데이트 (0이 아닌 경우만)
            if (accountData.btcBalance && accountData.btcBalance > 0) {
              btcBalanceRef.current = accountData.btcBalance;
            }
            if (accountData.usdcBalance !== undefined && accountData.usdcBalance !== null) {
              usdcBalanceRef.current = accountData.usdcBalance;
            }

            // 캐시에는 0이 아닌 값만 저장
            if (currentAsset > 0) {
              dataCache.save({
                currentAsset,
                currentBTC,
                currentCash,
                initialAsset: prevData.initialAsset,
                currentPrice: update.currentPrice,
              });
            }

            // 거래 및 holding 정보 업데이트 (accountData에서 가져옴)
            const updatedTrades = accountData.trades || prevData.trades;
            const updatedHolding = accountData.holding || prevData.holding;

            return {
              ...prevData,
              currentPrice: update.currentPrice,
              currentTime: update.serverTime,
              currentAsset,
              currentBTC,
              currentCash,
              trades: updatedTrades,
              holding: updatedHolding,
              strategyStatus: prevData.strategyStatus,
            };
          });
        }
      }
    });

    const unsubscribeTradeEvent = websocketService.onTradeEvent((update) => {
      setData((prevData) => {
        if (!prevData) return prevData;
        if (update.accountId !== selectedAccount) return prevData;

        let updatedTrades = prevData.trades;

        if (update.trades) {
          updatedTrades = update.trades;
        } else if (update.trade) {
          const newTrade: TradeEvent = {
            timestamp: update.trade.timestamp,
            type: update.trade.type,
            price: update.trade.price,
            quantity: update.trade.quantity,
            profit: update.trade.profit || update.trade.pnl_pct,
            pairId: update.trade.pairId || update.trade.pair_id,
            exitReason: update.trade.exitReason,
            pnl: update.trade.pnl,
            buyCost: update.trade.buyCost,
            sellRevenue: update.trade.sellRevenue,
            buyQty: update.trade.buyQty,
            sellQty: update.trade.sellQty,
            buyCommission: update.trade.buyCommission,
            sellCommission: update.trade.sellCommission,
            entryPrice: update.trade.entryPrice,
            entryTime: update.trade.entryTime,
            profitNoCommission: update.trade.profitNoCommission,
            pnlWithCommission: update.trade.pnlWithCommission,
          };

          const existingIndex = updatedTrades.findIndex(t =>
            t.timestamp === newTrade.timestamp && t.type === newTrade.type
          );

          if (existingIndex === -1) {
            updatedTrades = [...updatedTrades, newTrade].sort((a, b) => a.timestamp - b.timestamp);
          } else {
            const newTrades = [...updatedTrades];
            newTrades[existingIndex] = newTrade;
            updatedTrades = newTrades;
          }
        }

        const updatedHolding = update.holding || prevData.holding;

        return {
          ...prevData,
          trades: updatedTrades,
          holding: updatedHolding,
        };
      });
    });

    const unsubscribeConnectionStatus = websocketService.onConnectionStatus((connected) => {
      if (connected) {
        setTimeout(() => refillMissingCandles(), 2000);
      }
    });

    // 주기적으로 갭 체크 및 자동 채우기 (30초마다)
    const gapCheckInterval = setInterval(() => {
      if (data) {
        refillMissingCandles();
      }
    }, 30000);

    return () => {
      unsubscribePriceUpdate();
      unsubscribeRealtimeCandleUpdate();
      unsubscribeCandleUpdate();
      unsubscribeCandleComplete();
      unsubscribeAccountAssetsUpdate();
      unsubscribeBinanceServerTime();
      unsubscribePredictionUpdate();
      unsubscribeDashboardUpdate();
      unsubscribeTradeEvent();
      unsubscribeConnectionStatus();
      clearInterval(gapCheckInterval);
      websocketService.disconnect();
    };
  }, [selectedAccount, refillMissingCandles]);

  useEffect(() => {
    const pollStrategy = setInterval(async () => {
      try {
        const status = await fetchStrategyStatus();
        if (status) {
          console.log('[Strategy Status Debug]', {
            buyConditions: status.buyConditions,
            buyConditionsMet: status.buyConditionsMet,
            buyConditionsTotal: status.buyConditionsTotal,
            conditionKeys: Object.keys(status.buyConditions || {}),
            conditionCount: Object.keys(status.buyConditions || {}).length,
          });
          setData(prev => prev ? { ...prev, strategyStatus: status } : prev);
        }
      } catch {}
    }, 10000);

    return () => clearInterval(pollStrategy);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50">
        <div className="max-w-[98vw] mx-auto p-2 lg:p-4">
          <div className="flex flex-col mb-2 bg-white/80 border border-amber-200 rounded-lg p-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                <h1 className="text-lg lg:text-2xl font-bold text-slate-800">
                  Loading Dashboard...
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:grid lg:grid-cols-[280px,1fr,280px] gap-2">
            <div className="flex flex-col gap-2 order-2 lg:order-1">
              <MetricsSkeleton />
            </div>
            <div className="min-w-0 order-1 lg:order-2">
              <ChartSkeleton />
            </div>
            <div className="flex flex-col gap-2 order-3 lg:order-3">
              <MetricsSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center max-w-md bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-stone-200">
          <div className="text-rose-600 text-6xl mb-4">⚠</div>
          <p className="text-stone-900 text-xl font-bold mb-2">Failed to load data</p>
          <p className="text-stone-700 text-sm mb-6">{error || 'No data available'}</p>
          <button
            onClick={() => {
              setLoading(true);
              loadData();
            }}
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

      <div className="max-w-[98vw] mx-auto p-2 lg:p-4">
        <div className="flex flex-col mb-2 bg-white/80 border border-amber-200 rounded-lg p-3 shadow-xl gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-2xl font-bold text-slate-800">
                HedgeTrade Dashboard
              </h1>
              {data.version && (
                <span className="text-[10px] text-emerald-400 font-mono">{data.version}</span>
              )}
              {data.holding.isHolding && (
                <div className="relative px-4 py-2 bg-blue-100/80 backdrop-blur-sm rounded-lg border border-blue-400/40 shadow-lg overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-200/20 via-transparent to-blue-200/20"></div>
                  <div className="relative flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-blue-700 tracking-wider uppercase">
                      IN POSITION
                    </span>
                  </div>
                </div>
              )}
            </div>

            {data.availableAccounts && data.availableAccounts.length > 1 && (
              <div className="flex gap-2 px-2">
                {[...data.availableAccounts]
                  .sort((a, b) => {
                    if (a.id === 'Account_A') return -1;
                    if (b.id === 'Account_A') return 1;
                    return a.id.localeCompare(b.id);
                  })
                  .map((account) => (
                    <button
                      key={account.id}
                      onClick={() => setSelectedAccount(account.id)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        selectedAccount === account.id
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                          : 'bg-stone-200/60 text-stone-600 hover:bg-stone-300/60 hover:text-stone-800'
                      }`}
                    >
                      {account.name}
                    </button>
                  ))}
              </div>
            )}

            <div className="flex items-center gap-3 ml-auto">
              {data.currentTime && (
                <span className="text-xs text-stone-600 font-mono">
                  {formatLocalTime(data.currentTime)}
                </span>
              )}
              <button
                onClick={() => {
                  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.hedgetrade.eu';
                  window.open(`${apiUrl}/api/debug/strategy`, '_blank');
                }}
                className="p-1.5 rounded transition-all duration-200 text-amber-400 hover:bg-amber-500/10"
                title="전략 디버그"
              >
                <Bug className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[280px,1fr,280px] gap-2" style={{ alignItems: 'start' }}>
          <div className="flex flex-col gap-2 order-2 lg:order-1" style={{ height: '640px' }}>
            <MetricsPanel
              key={`left-${data.currentPrediction?.predictionCalculatedAt}-${data.currentTime}`}
              data={data}
              position="left"
            />
          </div>
          <div className="min-w-0 order-1 lg:order-2">
            <PriceChart
              data={data}
              onTradeHover={setHoveredTrade}
              onTimeframeChange={handleTimeframeRequest}
            />
          </div>
          <div className="order-3 lg:order-3" style={{ width: '280px', height: '640px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ flex: '0 0 auto', width: '100%' }}>
              <MetricsPanel
                key={`right-${data.currentPrediction?.predictionCalculatedAt}-${data.currentTime}`}
                data={data}
                position="right"
              />
            </div>
            <div style={{ flex: '1 1 auto', minHeight: '0', width: '100%' }}>
              <MetricsPanel
                key={`trades-${data.trades?.length}-${data.currentTime}`}
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

export default App;
