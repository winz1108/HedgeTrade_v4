import { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw, X, Bug } from 'lucide-react';
import { DashboardData, TradeEvent, Candle } from './types/dashboard';
import { fetchDashboardData, fetchChartData } from './services/oracleApi';
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

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTrade, setHoveredTrade] = useState<TradeEvent | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    return hash || 'Account_A';
  });
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);

  // BTC 수량과 USDC 수량을 저장 (가격 업데이트 시 자산 재계산용)
  const btcBalanceRef = useRef<number>(0);
  const usdcBalanceRef = useRef<number>(0);

  // 예측 계산 시점 추적 (5분마다 업데이트 감지용)
  const lastPredictionCalculatedAtRef = useRef<number>(0);

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

      const [fullDashboard, ...charts] = await Promise.all([
        fetchDashboardData(selectedAccount),
        fetchChartData('1m', 500),
        fetchChartData('5m', 500),
        fetchChartData('15m', 500),
        fetchChartData('30m', 500),
        fetchChartData('1h', 500),
        fetchChartData('4h', 500),
        fetchChartData('1d', 500)
      ]);

      fullDashboard.priceHistory1m = charts[0].candles as Candle[];
      fullDashboard.priceHistory5m = charts[1].candles as Candle[];
      fullDashboard.priceHistory15m = charts[2].candles as Candle[];
      fullDashboard.priceHistory30m = charts[3].candles as Candle[];
      fullDashboard.priceHistory1h = charts[4].candles as Candle[];
      fullDashboard.priceHistory4h = charts[5].candles as Candle[];
      fullDashboard.priceHistory1d = charts[6].candles as Candle[];

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
      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      setLoading(false);
    }
  }, [selectedAccount]);

  const handleVerification = async () => {
    setVerificationLoading(true);
    setShowVerificationModal(true);
    setVerificationResult(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.hedgetrade.eu';
      const jsonUrl = `${apiUrl}/api/debug/verification`;
      const textUrl = `${apiUrl}/api/debug/verification/text`;

      const [jsonResponse, textResponse] = await Promise.all([
        fetch(jsonUrl),
        fetch(textUrl)
      ]);

      if (!textResponse.ok) {
        throw new Error(`HTTP error! status: ${textResponse.status}`);
      }

      let text = await textResponse.text();

      // JSON 응답에서 prediction.health 정보 추출
      if (jsonResponse.ok) {
        try {
          const jsonData = await jsonResponse.json();
          if (jsonData.prediction?.health) {
            const health = jsonData.prediction.health;
            const healthStatus = `\n\n=======================================\n` +
              `📊 PREDICTION HEALTH STATUS\n` +
              `=======================================\n` +
              `상태: ${health.status.toUpperCase()}\n` +
              `메시지: ${health.message}\n`;
            text = text + healthStatus;
          }
        } catch (e) {
        }
      }

      setVerificationResult(text);
    } catch (error) {
      setVerificationResult(`오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setVerificationLoading(false);
    }
  };


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
      ema20: candleData.ema20,
      ema50: candleData.ema50,
      bbUpper: candleData.bbUpper,
      bbMiddle: candleData.bbMiddle,
      bbLower: candleData.bbLower,
      bbWidth: candleData.bbWidth,
      macd: candleData.macd,
      signal: candleData.macdSignal,
      histogram: candleData.macdHistogram,
      rsi: candleData.rsi,
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

        const newCandle = convertCandleData(update);
        const timeframeLower = update.timeframe.toLowerCase();
        const timeframeKey = `priceHistory${timeframeLower}` as keyof DashboardData;
        const existingCandles = prevData[timeframeKey] as Candle[] | undefined;

        if (!existingCandles) {
          return prevData;
        }

        const candles = [...existingCandles];
        let updatedData = { ...prevData };

        if (update.isFinal) {
          // 완성봉: 진행봉이었던 캔들을 완성봉으로 전환하고 기술지표 업데이트
          const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;

          if (lastCandle && lastCandle.timestamp === newCandle.timestamp) {
            // 진행봉→완성봉 전환

            lastCandle.isComplete = true;
            lastCandle.close = newCandle.close;
            lastCandle.high = newCandle.high;
            lastCandle.low = newCandle.low;
            lastCandle.volume = newCandle.volume;

            // 기술지표 업데이트 (백엔드가 보낸 값 사용)
            if (update.rsi !== undefined) { lastCandle.rsi = update.rsi; }
            if (update.macd !== undefined) { lastCandle.macd = update.macd; }
            if (update.macdSignal !== undefined) { lastCandle.signal = update.macdSignal; }
            if (update.macdHistogram !== undefined) { lastCandle.histogram = update.macdHistogram; }
            if (update.ema20 !== undefined) { lastCandle.ema20 = update.ema20; }
            if (update.ema50 !== undefined) { lastCandle.ema50 = update.ema50; }
            if (update.bbUpper !== undefined) { lastCandle.bbUpper = update.bbUpper; }
            if (update.bbMiddle !== undefined) { lastCandle.bbMiddle = update.bbMiddle; }
            if (update.bbLower !== undefined) { lastCandle.bbLower = update.bbLower; }
            if (update.bbWidth !== undefined) { lastCandle.bbWidth = update.bbWidth; }
          } else {
            // 갭 발생: onCandleComplete에서 처리
            const completedCandles = candles.filter(c => c.isComplete !== false);
            if (completedCandles.length > 0) {
              const lastCompleted = completedCandles[completedCandles.length - 1];
              detectAndFillGap(update.timeframe, lastCompleted.timestamp, newCandle.timestamp);
            }
            return prevData;
          }
        } else {
          // 진행 중인 봉
          const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;

          if (!lastCandle) {
            // 캔들이 없으면 추가
            candles.push(newCandle);
          } else if (lastCandle.timestamp === newCandle.timestamp) {
            // 타임스탬프가 같으면 덮어씌우기 (CSV 진행봉 → 웹소켓 진행봉)
            // 지표는 기존 것을 유지
            newCandle.ema20 = lastCandle.ema20;
            newCandle.ema50 = lastCandle.ema50;
            newCandle.bbUpper = lastCandle.bbUpper;
            newCandle.bbMiddle = lastCandle.bbMiddle;
            newCandle.bbLower = lastCandle.bbLower;
            newCandle.bbWidth = lastCandle.bbWidth;
            newCandle.macd = lastCandle.macd;
            newCandle.signal = lastCandle.signal;
            newCandle.histogram = lastCandle.histogram;
            newCandle.rsi = lastCandle.rsi;

            candles[candles.length - 1] = newCandle;
          } else {
            // 타임스탬프가 다르면 새 봉 (CSV 진행봉이 완성되고 새 봉 시작)
            // CSV의 마지막 진행봉을 완성봉으로 전환
            if (lastCandle.isComplete === false) {
              lastCandle.isComplete = true;
            }

            // 지표는 마지막 완성봉에서 복사
            const completedCandles = candles.filter(c => c.isComplete !== false);
            const lastCompleted = completedCandles.length > 0
              ? completedCandles[completedCandles.length - 1]
              : lastCandle;

            newCandle.ema20 = lastCompleted.ema20;
            newCandle.ema50 = lastCompleted.ema50;
            newCandle.bbUpper = lastCompleted.bbUpper;
            newCandle.bbMiddle = lastCompleted.bbMiddle;
            newCandle.bbLower = lastCompleted.bbLower;
            newCandle.bbWidth = lastCompleted.bbWidth;
            newCandle.macd = lastCompleted.macd;
            newCandle.signal = lastCompleted.signal;
            newCandle.histogram = lastCompleted.histogram;
            newCandle.rsi = lastCompleted.rsi;

            candles.push(newCandle);
            // 500개 초과 시 앞에서 삭제
            if (candles.length > 500) {
              candles.shift();
            }
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
                ema20: lastCandle.ema20,
                ema50: lastCandle.ema50,
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
            newCandle.ema20 = lastCandle.ema20;
            newCandle.ema50 = lastCandle.ema50;
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
            newCandle.ema20 = lastCandle.ema20;
            newCandle.ema50 = lastCandle.ema50;
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

    const unsubscribeCandleComplete = websocketService.onCandleComplete(async (update) => {
      if (!update.timeframe) return;

      // 기술지표 누락 시에만 에러 로그
      const hasIndicators = update.rsi !== undefined &&
                           update.macd !== undefined &&
                           update.ema20 !== undefined &&
                           update.ema50 !== undefined;


      // 웹소켓으로 받은 완성봉 데이터를 직접 사용 (백엔드가 기술지표 포함해서 보냄)
      const timeframeLower = update.timeframe.toLowerCase();
      const timeframeKey = `priceHistory${timeframeLower}` as keyof DashboardData;
      const newCandle = convertCandleData(update);

      setData(prev => {
        if (!prev) return prev;

        const existingCandles = prev[timeframeKey] as Candle[] | undefined;
        if (!existingCandles || existingCandles.length === 0) {
          return { ...prev, [timeframeKey]: [newCandle] };
        }

        const merged = [...existingCandles];
        const existingIndex = merged.findIndex(c => c.timestamp === newCandle.timestamp);

        if (existingIndex === -1) {
          // 새 완성봉 추가
          const insertIndex = merged.findIndex(c => c.timestamp > newCandle.timestamp);
          if (insertIndex === -1) {
            merged.push(newCandle);
          } else {
            merged.splice(insertIndex, 0, newCandle);
          }
        } else {
          // 기존 캔들 업데이트 (진행봉 → 완성봉 전환)
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

        const updated = {
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
          holding: {
            ...prevData.holding,
            v5MoeTakeProfitProb: update.probability,
            latestPrediction: {
              takeProfitProb: update.probability,
              stopLossProb: update.stopLossProb || 0,
            },
          },
        };

        return updated;
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
            };
          });
        }
      }
    });

    const unsubscribeTradeEvent = websocketService.onTradeEvent((update) => {
      setData((prevData) => {
        if (!prevData) return prevData;
        if (update.accountId !== selectedAccount) return prevData;

        const updatedTrades = update.trades || prevData.trades;
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

  // 5분 정각마다 예측 업데이트 체크
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;
    let nextCheckTimeout: NodeJS.Timeout | null = null;

    const checkPredictionUpdate = async () => {
      try {
        const response = await fetchDashboardData(selectedAccount);
        const newCalculatedAt = response.currentPrediction?.predictionCalculatedAt;

        if (newCalculatedAt && newCalculatedAt !== lastPredictionCalculatedAtRef.current) {
          lastPredictionCalculatedAtRef.current = newCalculatedAt;

          setData((prev) => {
            if (!prev) return prev;

            // 완전히 새로운 객체 생성으로 React 리렌더링 강제
            const updated = {
              ...prev,
              currentPrediction: {
                ...response.currentPrediction,
                // 명시적으로 필드 설정
                predictionCalculatedAt: newCalculatedAt,
              },
              lastPredictionUpdateTime: newCalculatedAt,
              // 타임스탬프 추가로 강제 리렌더링
              _updateTimestamp: Date.now(),
            };

            return updated;
          });

          // 업데이트 감지되면 폴링 중단하고 다음 정각까지 대기
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          scheduleNextCheck();
        }
      } catch (error) {
      }
    };

    const scheduleNextCheck = () => {
      const now = new Date();
      const currentMinutes = now.getMinutes();
      const currentSeconds = now.getSeconds();
      const currentMs = now.getMilliseconds();

      // 다음 5분 정각 계산 (00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
      const nextMinute = Math.ceil((currentMinutes + 1) / 5) * 5;
      const minutesUntilNext = (nextMinute - currentMinutes + 60) % 60;
      const msUntilNext = (minutesUntilNext * 60 - currentSeconds) * 1000 - currentMs;

      if (nextCheckTimeout) clearTimeout(nextCheckTimeout);

      nextCheckTimeout = setTimeout(() => {
        checkPredictionUpdate(); // 즉시 체크

        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(checkPredictionUpdate, 1000); // 1초마다 체크
      }, msUntilNext);
    };

    // 초기화 시 한 번만 스케줄 설정
    if (data?.currentPrediction?.predictionCalculatedAt) {
      if (lastPredictionCalculatedAtRef.current === 0) {
        lastPredictionCalculatedAtRef.current = data.currentPrediction.predictionCalculatedAt;
      }
      scheduleNextCheck();
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      if (nextCheckTimeout) clearTimeout(nextCheckTimeout);
    };
  }, [selectedAccount]); // data 의존성 제거!

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

      {showVerificationModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowVerificationModal(false)}
        >
          <div
            className="bg-white border border-amber-200 rounded-lg shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">서버 종합 검증</h2>
              </div>
              <button
                onClick={() => setShowVerificationModal(false)}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
              {verificationLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  <span className="ml-3 text-slate-300">검증 중...</span>
                </div>
              ) : verificationResult ? (
                <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap break-words bg-amber-50/80 p-4 rounded-lg border border-slate-700">
                  {verificationResult}
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      )}

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
                <div className="relative px-4 py-2 bg-emerald-100/80 backdrop-blur-sm rounded-lg border border-emerald-400/40 shadow-lg overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-200/20 via-transparent to-emerald-200/20"></div>
                  <div className="relative flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase">
                      Holding
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
                onClick={handleVerification}
                className="p-1.5 rounded transition-all duration-200 text-amber-400 hover:bg-amber-500/10"
                title="서버 검증"
              >
                <Bug className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/50 px-3 py-2 rounded-lg border border-amber-200">
            <span className="text-[10px] text-stone-600 font-medium whitespace-nowrap">Market State (v8):</span>
            <div className="flex items-center gap-2">
              {data.marketState?.activeState === 'BULL' && (
                <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded font-semibold">
                  <span className="text-sm">🐂</span>
                  <span className="text-[10px]">상승장</span>
                </div>
              )}
              {data.marketState?.activeState === 'BEAR' && (
                <div className="flex items-center gap-1 bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 rounded font-semibold">
                  <span className="text-sm">🐻</span>
                  <span className="text-[10px]">하락장</span>
                </div>
              )}
              {data.marketState?.activeState !== 'BULL' && data.marketState?.activeState !== 'BEAR' && (
                <div className="flex items-center gap-1 bg-stone-100 text-stone-600 border border-stone-200 px-2 py-1 rounded">
                  <span className="text-[10px]">분석중</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[280px,1fr,280px] gap-2">
          <div className="flex flex-col gap-2 order-2 lg:order-1">
            <MetricsPanel
              key={`left-${data.currentPrediction?.predictionCalculatedAt}-${data.currentTime}`}
              data={data}
              position="left"
            />
          </div>
          <div className="min-w-0 order-1 lg:order-2">
            <PriceChart data={data} onTradeHover={setHoveredTrade} />
          </div>
          <div className="flex flex-col gap-2 order-3 lg:order-3">
            <MetricsPanel
              key={`right-${data.currentPrediction?.predictionCalculatedAt}-${data.currentTime}`}
              data={data}
              position="right"
            />
            <MetricsPanel
              key={`trades-${data.trades?.length}-${data.currentTime}`}
              data={data}
              position="trades"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
