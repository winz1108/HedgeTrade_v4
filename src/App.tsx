import { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw, X, Bug, BarChart3, Wifi, WifiOff } from 'lucide-react';
import { DashboardData, TradeEvent, Candle } from './types/dashboard';
import { fetchDashboardData, fetchChartData } from './services/oracleApi';
import { PriceChart } from './components/PriceChart';
import { MetricsPanel } from './components/MetricsPanel';
import { formatLocalTime } from './utils/time';
import { websocketService, CandleData } from './services/websocket';

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
  const [wsConnected, setWsConnected] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // 1. Load dashboard data first
      console.log('📊 Step 1: Loading dashboard data...');
      const dashboardData = await fetchDashboardData(selectedAccount);

      if (!dashboardData || !dashboardData.metrics) {
        throw new Error('Invalid data structure received from API');
      }

      if (!selectedAccount && dashboardData.accountId) {
        setSelectedAccount(dashboardData.accountId);
      }

      // 2. Load 5m chart first (priority)
      console.log('📊 Step 2: Loading 5m chart data (priority)...');
      try {
        const chart5m = await fetchChartData('5m', 500);
        dashboardData.priceHistory5m = chart5m.candles as Candle[];
        console.log('✅ 5m chart loaded:', chart5m.candles.length, 'candles');
      } catch (chartError) {
        console.error('⚠️ Failed to load 5m chart:', chartError);
      }

      // Set initial data with 5m chart
      setData({ ...dashboardData });
      setLoading(false);

      // 3. Load other timeframes in background
      console.log('📊 Step 3: Loading other timeframes in background...');
      const timeframes = ['1m', '15m', '30m', '1h', '4h', '1d'] as const;

      for (const timeframe of timeframes) {
        try {
          const chart = await fetchChartData(timeframe, 500);
          console.log(`✅ ${timeframe} chart loaded:`, chart.candles.length, 'candles');

          // Update data with new timeframe
          setData(prev => {
            if (!prev) return prev;
            const updated = { ...prev };

            switch (timeframe) {
              case '1m':
                updated.priceHistory1m = chart.candles as Candle[];
                break;
              case '15m':
                updated.priceHistory15m = chart.candles as Candle[];
                break;
              case '30m':
                updated.priceHistory30m = chart.candles as Candle[];
                break;
              case '1h':
                updated.priceHistory1h = chart.candles as Candle[];
                break;
              case '4h':
                updated.priceHistory4h = chart.candles as Candle[];
                break;
              case '1d':
                updated.priceHistory1d = chart.candles as Candle[];
                break;
            }

            return updated;
          });
        } catch (chartError) {
          console.error(`⚠️ Failed to load ${timeframe} chart:`, chartError);
        }
      }

      console.log('✅ All chart data loaded');
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
        return {
          ...prevData,
          currentPrice: priceData.currentPrice,
          currentTime: priceData.currentTime,
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

        if (update.isFinal) {
          // 완성봉: 기존에 같은 타임스탬프가 있으면 업데이트, 없으면 추가
          const existingIndex = candles.findIndex(c => c.timestamp === newCandle.timestamp);
          if (existingIndex >= 0) {
            candles[existingIndex] = newCandle;
          } else {
            candles.push(newCandle);
            // 500개 초과 시에만 앞에서 삭제
            if (candles.length > 500) {
              candles.shift();
            }
          }
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
          // 완성봉: 기존에 같은 타임스탬프가 있으면 업데이트, 없으면 추가
          const existingIndex = candles.findIndex(c => c.timestamp === newCandle.timestamp);
          if (existingIndex >= 0) {
            candles[existingIndex] = newCandle;
          } else {
            candles.push(newCandle);
            // 500개 초과 시에만 앞에서 삭제
            if (candles.length > 500) {
              candles.shift();
            }
          }
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

    const unsubscribeCandleComplete = websocketService.onCandleComplete((update) => {
      if (!update.timeframe) return;

      console.log(`✅ Candle complete: ${update.timeframe} at ${new Date(update.openTime).toLocaleTimeString()}`);

      const fetchLatestCandles = async (attempt: number) => {
        try {
          const chart = await fetchChartData(update.timeframe, 2);
          const timeframeLower = update.timeframe.toLowerCase();
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
                merged.push(newCandle);
              } else {
                merged[existingIndex] = newCandle;
              }
            }

            merged.sort((a, b) => a.timestamp - b.timestamp);

            if (merged.length > 500) {
              merged.splice(0, merged.length - 500);
            }

            return { ...prev, [timeframeKey]: merged };
          });

          console.log(`🔄 ${update.timeframe}: Verified latest 2 candles (attempt ${attempt}/5)`);
        } catch (error) {
          console.error(`❌ Failed to verify ${update.timeframe} candles (attempt ${attempt}/5):`, error);
        }
      };

      // 즉시 1번 실행
      fetchLatestCandles(1);

      // 1초 간격으로 4번 더 실행 (총 5번)
      setTimeout(() => fetchLatestCandles(2), 1000);
      setTimeout(() => fetchLatestCandles(3), 2000);
      setTimeout(() => fetchLatestCandles(4), 3000);
      setTimeout(() => fetchLatestCandles(5), 4000);
    });

    const unsubscribeAccountAssetsUpdate = websocketService.onAccountAssetsUpdate((update) => {
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
      setData((prevData) => {
        if (!prevData) return prevData;
        return {
          ...prevData,
          ...update,
        };
      });
    });

    let isInitialConnection = true;

    const unsubscribeConnectionStatus = websocketService.onConnectionStatus((connected) => {
      setWsConnected(connected);
      console.log('🔌 WebSocket connection status:', connected ? 'Connected' : 'Disconnected');

      if (connected && !isInitialConnection) {
        console.log('🔄 WebSocket reconnected, checking for missing candles...');
        setTimeout(() => refillMissingCandles(), 1000);
      }

      if (connected) {
        isInitialConnection = false;
      }
    });

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
      websocketService.disconnect();
    };
  }, [selectedAccount, refillMissingCandles]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-6 drop-shadow-lg" />
          <p className="text-slate-300 text-lg font-semibold">Loading dashboard...</p>
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
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded transition-all duration-200 ${
                  wsConnected
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
                title={wsConnected ? 'WebSocket 연결됨' : 'WebSocket 연결 끊김'}
              >
                {wsConnected ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                <span className="text-[10px] font-medium">
                  {wsConnected ? 'Live' : 'Offline'}
                </span>
              </div>
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
