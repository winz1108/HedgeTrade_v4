import { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw, X, Bug, BarChart3 } from 'lucide-react';
import { DashboardData, TradeEvent, Candle } from './types/dashboard';
import { fetchDashboardData } from './services/oracleApi';
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

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const dashboardData = await fetchDashboardData(selectedAccount);

      if (!dashboardData || !dashboardData.metrics) {
        throw new Error('Invalid data structure received from API');
      }

      console.log('📊 App.tsx setData 전 - currentProfit:', dashboardData.holding.currentProfit);
      console.log('📊 전체 holding 데이터:', JSON.stringify(dashboardData.holding, null, 2));
      if (dashboardData.currentPrediction?.v5MoeTakeProfitProb !== undefined) {
        console.log('📊 v5MoeTakeProfitProb:', dashboardData.currentPrediction.v5MoeTakeProfitProb);
        if (dashboardData.currentPrediction?.predictionCalculatedAt) {
          console.log('📊 v5MoeTakeProfitProb 계산 시점:', new Date(dashboardData.currentPrediction.predictionCalculatedAt).toLocaleString());
        }
      }

      if (!selectedAccount && dashboardData.accountId) {
        setSelectedAccount(dashboardData.accountId);
      }

      setData({ ...dashboardData });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  const handleVerification = async () => {
    setVerificationLoading(true);
    setShowVerificationModal(true);
    setVerificationResult(null);

    try {
      const isDev = import.meta.env.DEV;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = isDev
        ? 'http://130.61.50.101:54321/api/debug/verification/text'
        : `${supabaseUrl}/functions/v1/oracle-proxy?endpoint=${encodeURIComponent('/api/debug/verification/text')}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const text = contentType.includes('application/json')
        ? JSON.stringify(await response.json(), null, 2)
        : await response.text();
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
      const isDev = import.meta.env.DEV;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = isDev
        ? 'http://130.61.50.101:54321/api/debug/realtime-performance/text'
        : `${supabaseUrl}/functions/v1/oracle-proxy?endpoint=${encodeURIComponent('/api/debug/realtime-performance/text')}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });

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
    setLoading(true);
    loadData();
  }, [loadData]);

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

  useEffect(() => {
    websocketService.connect();

    const convertCandleData = (candleData: CandleData): Candle => ({
      timestamp: candleData.timestamp,
      open: candleData.open,
      high: candleData.high,
      low: candleData.low,
      close: candleData.close,
      volume: candleData.volume,
      ema20: candleData.ema20,
      ema50: candleData.ema50,
      bbUpper: candleData.bbUpper,
      bbMiddle: candleData.bbMiddle,
      bbLower: candleData.bbLower,
      bbWidth: candleData.bbWidth,
      macd: candleData.macd,
      signal: candleData.signal,
      histogram: candleData.histogram,
      rsi: candleData.rsi,
    });

    const unsubscribePriceUpdate = websocketService.onPriceUpdate((priceData) => {
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
      if (update.timeframe !== '5m') return;

      setData((prevData) => {
        if (!prevData || !prevData.priceHistory5m) return prevData;

        const candles = [...prevData.priceHistory5m];
        const newCandle = convertCandleData(update.candle);

        if (candles.length > 0) {
          const lastCandle = candles[candles.length - 1];
          if (lastCandle.timestamp === newCandle.timestamp) {
            candles[candles.length - 1] = newCandle;
          } else {
            candles.push(newCandle);
          }
        } else {
          candles.push(newCandle);
        }

        return {
          ...prevData,
          priceHistory5m: candles,
        };
      });
    });

    const unsubscribeCandleUpdate = websocketService.onCandleUpdate((update) => {
      setData((prevData) => {
        if (!prevData) return prevData;

        const newCandle = convertCandleData(update.candle);
        const timeframeKey = `priceHistory${update.timeframe}` as keyof DashboardData;
        const existingCandles = prevData[timeframeKey] as Candle[] | undefined;

        if (!existingCandles) return prevData;

        const candles = [...existingCandles];
        const existingIndex = candles.findIndex(c => c.timestamp === newCandle.timestamp);

        if (existingIndex >= 0) {
          candles[existingIndex] = newCandle;
        } else {
          candles.push(newCandle);
          candles.sort((a, b) => a.timestamp - b.timestamp);
        }

        return {
          ...prevData,
          [timeframeKey]: candles,
        };
      });
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

    return () => {
      unsubscribePriceUpdate();
      unsubscribeRealtimeCandleUpdate();
      unsubscribeCandleUpdate();
      unsubscribeAccountAssetsUpdate();
      unsubscribeBinanceServerTime();
      websocketService.disconnect();
    };
  }, []);


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

            <div className="flex items-center gap-2 ml-auto">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatLocalTime(data.currentTime)}
                </span>
                <span className="text-[8px] text-slate-500">
                  바이낸스 서버 시간 기준
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
