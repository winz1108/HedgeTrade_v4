import { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw, X, Bug, BarChart3 } from 'lucide-react';
import { DashboardData, TradeEvent, Candle } from './types/dashboard';
import { fetchDashboardData, fetchChartData } from './services/oracleApi';
import { PriceChart } from './components/PriceChart';
import { MetricsPanel } from './components/MetricsPanel';
import { ChartSkeleton, MetricsSkeleton } from './components/ChartSkeleton';
import { formatLocalTime } from './utils/time';
import { websocketService, CandleData } from './services/websocket';

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
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [performanceResult, setPerformanceResult] = useState<string | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);

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
      console.warn(`⚠️ GAP DETECTED in ${timeframe}: ${missedCandles} candles missing`);
      console.log(`   Last: ${new Date(lastTimestamp).toLocaleTimeString()}`);
      console.log(`   New: ${new Date(newTimestamp).toLocaleTimeString()}`);
      console.log(`   Gap: ${(gap / 1000 / 60).toFixed(1)} minutes`);

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

          console.log(`✅ Filled ${addedCount} missing candles in ${timeframe}`);
          return { ...prev, [timeframeKey]: merged };
        });
      } catch (error) {
        console.error(`❌ Failed to fill gap in ${timeframe}:`, error);
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      console.log('📊 Loading dashboard data...');
      const startTime = performance.now();

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

      const loadTime = performance.now() - startTime;
      console.log(`✅ All data loaded in ${(loadTime / 1000).toFixed(2)}s`);

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

      console.log('📋 Dashboard Data:');
      console.log('  - Account Name:', fullDashboard.accountName);
      console.log('  - Trades:', fullDashboard.trades?.length || 0);
      console.log('  - Metrics loaded:', fullDashboard.metrics ? '✅' : '❌');

      setData(fullDashboard);
      setLoading(false);

      console.log('✅ Dashboard ready');
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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
      const url = `${apiUrl}/api/debug/verification/text`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      setVerificationResult(text);
    } catch (error) {
      console.error('서버 검증 실패:', error);
      setVerificationResult(`오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleRealtimePerformance = async () => {
    setPerformanceLoading(true);
    setShowPerformanceModal(true);
    setPerformanceResult(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.hedgetrade.eu';
      const url = `${apiUrl}/api/debug/realtime-performance/text`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      setPerformanceResult(text);
    } catch (error) {
      console.error('실시간 성능 지표 조회 실패:', error);
      setPerformanceResult(`오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setPerformanceLoading(false);
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
    console.log('🔄 Refilling missing candles...');
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
            console.log(`📊 Loading initial ${timeframe} data (100 candles)`);
            
            return { ...prev, [timeframeKey]: chart.candles as Candle[] };
          }

          const newCandles = chart.candles as Candle[];
          const merged = [...existingCandles];
          let addedCount = 0;

          for (const newCandle of newCandles) {
            const existingIndex = merged.findIndex(c => c.timestamp === newCandle.timestamp);
            if (existingIndex === -1) {
              const insertIndex = merged.findIndex(c => c.timestamp > newCandle.timestamp);
              if (insertIndex === -1) {
                merged.push(newCandle);
              } else {
                merged.splice(insertIndex, 0, newCandle);
              }
              addedCount++;
            } else {
              merged[existingIndex] = newCandle;
            }
          }

          

          if (merged.length > 500) {
            merged.splice(0, merged.length - 500);
          }

          if (addedCount > 0) {
            console.log(`✅ ${timeframe}: Added ${addedCount} missing candles`);
          }

          return { ...prev, [timeframeKey]: merged };
        });
      } catch (error) {
        console.error(`❌ Failed to refill ${timeframe}:`, error);
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
      // 기술지표 확인 로그
      if (update.isFinal) {
        console.log('📊 realtime_candle_update (완성봉):', {
          timeframe: update.timeframe,
          time: new Date(update.openTime).toLocaleTimeString(),
          close: update.close,
          rsi: update.rsi ?? 'missing',
          macd: update.macd ?? 'missing',
          ema20: update.ema20 ?? 'missing',
          bbUpper: update.bbUpper ?? 'missing',
        });
      }

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
          // 완성봉: 갭 감지만 수행, 실제 추가는 onCandleComplete에서 처리
          const completedCandles = candles.filter(c => c.isComplete !== false);
          if (completedCandles.length > 0) {
            const lastCompleted = completedCandles[completedCandles.length - 1];
            detectAndFillGap(update.timeframe, lastCompleted.timestamp, newCandle.timestamp);
          }

          // 완성봉은 onCandleComplete 이벤트에서 CSV 데이터(기술지표 포함)로 처리
          return prevData;
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

        return {
          ...prevData,
          [timeframeKey]: candles,
        };
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

      // 웹소켓으로 받은 원시 데이터 확인
      console.log('═══════════════════════════════════════');
      console.log('📦 candle_complete 원시 데이터:');
      console.log('═══════════════════════════════════════');
      console.log('⏰ Time:', new Date(update.openTime).toLocaleTimeString());
      console.log('📊 Timeframe:', update.timeframe);
      console.log('💰 Close:', update.close);
      console.log('📉 RSI:', update.rsi);
      console.log('📈 MACD:', update.macd, '/ Signal:', update.macdSignal, '/ Histogram:', update.macdHistogram);
      console.log('📊 EMA20:', update.ema20, '/ EMA50:', update.ema50);
      console.log('📊 BB Upper:', update.bbUpper, '/ Middle:', update.bbMiddle, '/ Lower:', update.bbLower);
      console.log('═══════════════════════════════════════');

      // 기술지표 누락 감지
      const hasIndicators = update.rsi !== undefined &&
                           update.macd !== undefined &&
                           update.ema20 !== undefined &&
                           update.ema50 !== undefined;

      if (!hasIndicators) {
        console.error('❌ CRITICAL: 기술지표 누락!');
        console.error('   백엔드에서 기술지표를 계산해서 보내야 합니다!');
      } else {
        const rsiStr = typeof update.rsi === 'number' ? update.rsi.toFixed(1) : update.rsi;
        const macdStr = typeof update.macd === 'number' ? update.macd.toFixed(1) : update.macd;
        console.log(`✅ 기술지표 모두 존재 (RSI=${rsiStr}, MACD=${macdStr})`);
      }

      // 완성봉 이벤트 발생 시 해당 타임프레임만 최신 5개 검증
      // 단, 마지막 진행봉은 제외하고 완성봉만 병합 (진행봉은 웹소켓만 신뢰)
      try {
        const chart = await fetchChartData(update.timeframe, 5);
        const timeframeLower = update.timeframe.toLowerCase();
        const timeframeKey = `priceHistory${timeframeLower}` as keyof DashboardData;

        setData(prev => {
          if (!prev) return prev;

          const existingCandles = prev[timeframeKey] as Candle[] | undefined;
          if (!existingCandles || existingCandles.length === 0) {
            return { ...prev, [timeframeKey]: chart.candles as Candle[] };
          }

          const newCandles = chart.candles as Candle[];

          // 마지막 진행봉 제외하고 완성봉만 병합
          const completedCandlesOnly = newCandles.slice(0, -1);

          const merged = [...existingCandles];
          let addedCount = 0;
          let indicatorMissingCount = 0;

          for (const newCandle of completedCandlesOnly) {
            // 기술지표 누락 체크
            if (!newCandle.rsi || !newCandle.macd || !newCandle.ema20) {
              indicatorMissingCount++;
            }

            const existingIndex = merged.findIndex(c => c.timestamp === newCandle.timestamp);
            if (existingIndex === -1) {
              // 타임스탬프 순서대로 삽입
              const insertIndex = merged.findIndex(c => c.timestamp > newCandle.timestamp);
              if (insertIndex === -1) {
                merged.push(newCandle);
              } else {
                merged.splice(insertIndex, 0, newCandle);
              }
              addedCount++;
            } else {
              // 기존 캔들 업데이트 (완성봉만)
              merged[existingIndex] = newCandle;
            }
          }

          merged.sort((a, b) => a.timestamp - b.timestamp);

          if (merged.length > 500) {
            merged.splice(0, merged.length - 500);
          }

          if (addedCount > 0) {
            console.log(`🔄 ${update.timeframe}: Added ${addedCount} missing candles on complete event`);
          }

          if (indicatorMissingCount > 0) {
            console.warn(`⚠️ ${update.timeframe}: ${indicatorMissingCount} candles missing indicators`);
          }

          // 최종 병합된 마지막 완성봉의 기술지표 확인
          const lastCompleted = merged.filter(c => c.isComplete !== false).pop();
          if (lastCompleted) {
            const hasAllIndicators = lastCompleted.rsi && lastCompleted.macd && lastCompleted.ema20;
            if (hasAllIndicators) {
              console.log(`   ✅ Last completed candle OK:`, {
                timestamp: new Date(lastCompleted.timestamp).toISOString(),
                rsi: typeof lastCompleted.rsi === 'number' ? lastCompleted.rsi.toFixed(1) : lastCompleted.rsi,
                macd: typeof lastCompleted.macd === 'number' ? lastCompleted.macd.toFixed(1) : lastCompleted.macd,
                ema20: typeof lastCompleted.ema20 === 'number' ? lastCompleted.ema20.toFixed(0) : lastCompleted.ema20
              });
            } else {
              console.error(`   ❌ Last completed candle MISSING indicators:`, {
                timestamp: new Date(lastCompleted.timestamp).toISOString(),
                rsi: lastCompleted.rsi,
                macd: lastCompleted.macd,
                ema20: lastCompleted.ema20
              });
            }
          }

          return { ...prev, [timeframeKey]: merged };
        });
      } catch (error) {
        console.error(`❌ Failed to verify ${update.timeframe} on complete:`, error);
      }
    });

    let assetUpdateCount = 0;
    let lastAssetLogTime = Date.now();

    const unsubscribeAccountAssetsUpdate = websocketService.onAccountAssetsUpdate((update) => {
      assetUpdateCount++;

      // 10초마다 통계 출력
      const now = Date.now();
      if (now - lastAssetLogTime >= 10000) {
        const elapsed = (now - lastAssetLogTime) / 1000;
        const rate = assetUpdateCount / elapsed;
        console.log(`💰 Asset updates: ${assetUpdateCount} in ${elapsed.toFixed(1)}s (${rate.toFixed(2)}/s)`);
        assetUpdateCount = 0;
        lastAssetLogTime = now;
      }

      setData((prevData) => {
        if (!prevData) return prevData;
        if (update.accountId !== selectedAccount) return prevData;

        return {
          ...prevData,
          currentAsset: update.asset.currentAsset,
          currentBTC: update.asset.currentBTC,
          currentCash: update.asset.currentCash,
          initialAsset: update.asset.initialAsset,
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
      if (!update.success || !update.prediction) return;

      console.log('🔮 Prediction Update from WebSocket:');
      console.log('  - Probability:', (update.prediction.prob * 100).toFixed(2) + '%');
      console.log('  - Calculated At:', new Date(update.prediction.predictionCalculatedAt).toLocaleString());
      console.log('  - Target Timestamp:', new Date(update.prediction.predictionTargetTimestampMs).toLocaleString());

      setData((prevData) => {
        if (!prevData) return prevData;
        return {
          ...prevData,
          currentPrediction: {
            takeProfitProb: update.prediction!.prob,
            stopLossProb: update.prediction!.stopLossProb,
            v5MoeTakeProfitProb: update.prediction!.prob,
            predictionDataTimestamp: update.prediction!.predictionTargetTimestampMs,
            predictionCalculatedAt: update.prediction!.predictionCalculatedAt,
          },
          lastPredictionUpdateTime: update.prediction!.predictionCalculatedAt,
          marketState: update.prediction!.market_state,
          gateWeights: update.prediction!.gate_weights,
          holding: {
            ...prevData.holding,
            v5MoeTakeProfitProb: update.prediction!.prob,
            latestPrediction: {
              takeProfitProb: update.prediction!.prob,
              stopLossProb: update.prediction!.stopLossProb,
            },
          },
        };
      });
    });

    const unsubscribeDashboardUpdate = websocketService.onDashboardUpdate((update) => {
      if (update.accounts && update.accounts.length > 0) {
        const accountData = update.accounts.find(acc => acc.accountId === selectedAccount);

        if (accountData) {
          btcBalanceRef.current = accountData.btcBalance || 0;
          usdcBalanceRef.current = accountData.usdcBalance || 0;

          setData((prevData) => {
            if (!prevData) return prevData;

            // 백엔드가 보내는 구조에 따라 안전하게 처리
            // asset 객체가 있으면 사용, 없으면 flat 필드 사용
            const currentAsset = (accountData as any).asset?.currentAsset ?? accountData.totalAsset ?? prevData.currentAsset;
            const currentBTC = (accountData as any).asset?.currentBTC ?? accountData.btcValue ?? prevData.currentBTC;
            const currentCash = (accountData as any).asset?.currentCash ?? accountData.usdcBalance ?? prevData.currentCash;

            return {
              ...prevData,
              currentPrice: update.currentPrice,
              currentTime: update.serverTime,
              currentAsset,
              currentBTC,
              currentCash,
            };
          });
        }
      }
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
        console.log('🔍 예측 업데이트 체크 중...');
        const response = await fetchDashboardData(selectedAccount);
        const newCalculatedAt = response.currentPrediction?.predictionCalculatedAt;

        console.log('  - 이전:', lastPredictionCalculatedAtRef.current, new Date(lastPredictionCalculatedAtRef.current).toLocaleString());
        console.log('  - 현재:', newCalculatedAt, new Date(newCalculatedAt || 0).toLocaleString());

        if (newCalculatedAt && newCalculatedAt !== lastPredictionCalculatedAtRef.current) {
          console.log('✅ 예측 업데이트 감지! UI 강제 업데이트');
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

            console.log('🔄 State 업데이트 완료:', {
              old: prev.currentPrediction?.predictionCalculatedAt,
              new: updated.currentPrediction?.predictionCalculatedAt,
            });

            return updated;
          });

          // 업데이트 감지되면 폴링 중단하고 다음 정각까지 대기
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          scheduleNextCheck();
        } else {
          console.log('  ℹ️  변경사항 없음');
        }
      } catch (error) {
        console.error('❌ 예측 업데이트 체크 실패:', error);
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

      console.log(`⏰ 다음 예측 체크: ${minutesUntilNext}분 ${Math.floor((msUntilNext % 60000) / 1000)}초 후 (${nextMinute}분)`);

      if (nextCheckTimeout) clearTimeout(nextCheckTimeout);

      nextCheckTimeout = setTimeout(() => {
        console.log('🔍 정각 도달 - 1초마다 예측 업데이트 체크 시작');
        checkPredictionUpdate(); // 즉시 체크

        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(checkPredictionUpdate, 1000); // 1초마다 체크
      }, msUntilNext);
    };

    // 초기화 시 한 번만 스케줄 설정
    if (data?.currentPrediction?.predictionCalculatedAt) {
      if (lastPredictionCalculatedAtRef.current === 0) {
        lastPredictionCalculatedAtRef.current = data.currentPrediction.predictionCalculatedAt;
        console.log('🎯 초기 예측 시간 설정:', new Date(lastPredictionCalculatedAtRef.current).toLocaleString());
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-[98vw] mx-auto p-2 lg:p-4">
          <div className="flex flex-col mb-2 bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">⚠</div>
          <p className="text-slate-300 text-lg font-semibold mb-2">Failed to load data</p>
          <p className="text-slate-400 text-sm mb-6">{error || 'No data available'}</p>
          <button
            onClick={() => {
              setLoading(true);
              loadData();
            }}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-400 hover:to-blue-400 transition-all duration-200 shadow-lg font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {showPerformanceModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowPerformanceModal(false)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">실시간 성능 지표</h2>
              </div>
              <button
                onClick={() => setShowPerformanceModal(false)}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
              {performanceLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  <span className="ml-3 text-slate-300">계산 중...</span>
                </div>
              ) : performanceResult ? (
                <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap break-words bg-slate-950/50 p-4 rounded-lg border border-slate-700">
                  {performanceResult}
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {showVerificationModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowVerificationModal(false)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
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
                <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap break-words bg-slate-950/50 p-4 rounded-lg border border-slate-700">
                  {verificationResult}
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[98vw] mx-auto p-2 lg:p-4">
        <div className="flex flex-col mb-2 bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                HedgeTrade Dashboard
              </h1>
              {data.version && (
                <span className="text-[10px] text-emerald-400 font-mono">{data.version}</span>
              )}
              {data.holding.isHolding && (
                <div className="relative px-4 py-2 bg-slate-900/80 backdrop-blur-md rounded-lg border border-emerald-400/30 shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10"></div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-emerald-400/20 to-emerald-500/20 blur-lg animate-pulse"></div>
                  <div className="relative flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]"></div>
                    <span className="text-xs font-bold text-emerald-300 tracking-wider uppercase">
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
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {account.name}
                    </button>
                  ))}
              </div>
            )}

            <div className="flex items-center gap-3 ml-auto">
              {data.currentTime && (
                <span className="text-xs text-slate-400 font-mono">
                  {formatLocalTime(data.currentTime)}
                </span>
              )}
              <button
                onClick={handleRealtimePerformance}
                className="p-1.5 rounded transition-all duration-200 text-cyan-400 hover:bg-cyan-500/10"
                title="실시간 성능 지표"
              >
                <BarChart3 className="w-3 h-3" />
              </button>
              <button
                onClick={handleVerification}
                className="p-1.5 rounded transition-all duration-200 text-amber-400 hover:bg-amber-500/10"
                title="서버 검증"
              >
                <Bug className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/70 px-2 py-1.5 rounded-lg border border-slate-600 overflow-x-auto">
            <span className="text-[10px] text-slate-400 mr-1 whitespace-nowrap">Market:</span>
            <div className="flex gap-1">
              {[
                { key: 'bullDiv', label: 'Bull Div', value: data.marketState?.bullDiv ?? 0, colors: { active: 'bg-emerald-500 text-white border-emerald-300', inactive: 'bg-emerald-950/30 text-emerald-700/40 border-emerald-900/40' } },
                { key: 'bullConv', label: 'Bull Conv', value: data.marketState?.bullConv ?? 0, colors: { active: 'bg-emerald-600 text-white border-emerald-400', inactive: 'bg-emerald-950/40 text-emerald-700/50 border-emerald-900/50' } },
                { key: 'sideways', label: 'Sideways', value: data.marketState?.sideways ?? 0, colors: { active: 'bg-amber-500 text-white border-amber-300', inactive: 'bg-amber-950/30 text-amber-700/40 border-amber-900/40' } },
                { key: 'bearConv', label: 'Bear Conv', value: data.marketState?.bearConv ?? 0, colors: { active: 'bg-rose-600 text-white border-rose-400', inactive: 'bg-rose-950/40 text-rose-700/50 border-rose-900/50' } },
                { key: 'bearDiv', label: 'Bear Div', value: data.marketState?.bearDiv ?? 0, colors: { active: 'bg-rose-500 text-white border-rose-300', inactive: 'bg-rose-950/30 text-rose-700/40 border-rose-900/40' } }
              ].map((state) => {
                const isActive = state.value > 0.5;
                return (
                  <div
                    key={state.key}
                    className={`text-[9px] px-1.5 py-0.5 rounded transition-all whitespace-nowrap border ${
                      isActive
                        ? `${state.colors.active} font-bold shadow-lg`
                        : state.colors.inactive
                    }`}
                  >
                    {state.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[280px,1fr,280px] gap-2">
          <div className="flex flex-col gap-2 order-2 lg:order-1">
            <MetricsPanel data={data} position="left" />
          </div>
          <div className="min-w-0 order-1 lg:order-2">
            <PriceChart data={data} onTradeHover={setHoveredTrade} />
          </div>
          <div className="flex flex-col gap-2 order-3 lg:order-3">
            <MetricsPanel data={data} position="right" />
            <MetricsPanel data={data} position="trades" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
