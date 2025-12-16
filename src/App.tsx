import { useEffect, useState, useRef } from 'react';
import { RefreshCw, Bug, X } from 'lucide-react';
import { DashboardData, TradeEvent } from './types/dashboard';
import { fetchDashboardData } from './services/oracleApi';
import { PriceChart } from './components/PriceChart';
import { MetricsPanel } from './components/MetricsPanel';
import { sendBuyNotification, sendSellNotification, setNotificationCallback, InAppNotification } from './services/notifications';
import { formatLocalTime } from './utils/time';


interface DebugData {
  status: string;
  processes: {
    watchdog: { running: boolean; pids: string[] };
    trading: { running: boolean; pids: string[]; uptime?: string };
  };
  prediction: {
    status: string;
    prob: number;
    model_version: string;
    completed_5min_timestamp: string;
    completed_1min_timestamp: string;
  };
  errors: string[];
}

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTrade, setHoveredTrade] = useState<TradeEvent | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('Account_A');
  const [debugModalOpen, setDebugModalOpen] = useState(false);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const previousHoldingState = useRef<boolean>(false);
  const lastTradeCount = useRef<number>(0);

  const loadData = async () => {
    try {
      setError(null);
      const dashboardData = await fetchDashboardData(selectedAccount);

      if (!dashboardData || !dashboardData.metrics) {
        throw new Error('Invalid data structure received from API');
      }

      if (data && notificationsEnabled) {
        if (!previousHoldingState.current && dashboardData.holding.isHolding) {
          sendBuyNotification(
            dashboardData.holding.buyPrice || dashboardData.currentPrice,
            dashboardData.currentPrediction?.takeProfitProb || 0
          );
        }

        if (previousHoldingState.current && !dashboardData.holding.isHolding) {
          const latestTrade = dashboardData.trades[dashboardData.trades.length - 1];
          if (latestTrade && latestTrade.type === 'sell' && lastTradeCount.current < dashboardData.trades.length) {
            const profit = latestTrade.profit ?? 0;
            sendSellNotification(
              profit >= 0 ? 'profit' : 'loss',
              latestTrade.price,
              profit
            );
          }
        }

        lastTradeCount.current = dashboardData.trades.length;
      }

      previousHoldingState.current = dashboardData.holding.isHolding;

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
  };

  const handleDebugClick = async () => {
    setDebugModalOpen(true);
    setDebugLoading(true);
    setDebugData(null);

    try {
      const isDev = import.meta.env.DEV;
      const url = isDev
        ? '/api/debug/verification'
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oracle-proxy?endpoint=${encodeURIComponent('/api/debug/verification')}`;

      const response = await fetch(url);
      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      console.error('Debug verification failed:', error);
      setDebugData({
        status: 'error',
        processes: {
          watchdog: { running: false, pids: [] },
          trading: { running: false, pids: [] },
        },
        prediction: {
          status: 'error',
          prob: 0,
          model_version: 'N/A',
          completed_5min_timestamp: 'N/A',
          completed_1min_timestamp: 'N/A',
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      setDebugLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();

    setNotificationsEnabled(true);

    setNotificationCallback((notification) => {
      setNotifications(prev => [...prev, notification]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, [selectedAccount]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [selectedAccount]);


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
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-2xl border-2 animate-slide-in backdrop-blur-sm ${
              notification.type === 'buy'
                ? 'bg-blue-500/90 border-blue-400 text-white'
                : notification.type === 'sell-profit'
                ? 'bg-emerald-500/90 border-emerald-400 text-white'
                : 'bg-rose-500/90 border-rose-400 text-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="font-bold text-sm mb-1">{notification.title}</div>
                <div className="text-xs whitespace-pre-line opacity-90">{notification.message}</div>
              </div>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {debugModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Debug Verification</h2>
              </div>
              <button
                onClick={() => setDebugModalOpen(false)}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              {debugLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                </div>
              ) : debugData ? (
                <div className="space-y-4">
                  <div className={`p-3 rounded-lg border ${
                    debugData.status === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}>
                    <div className="text-sm font-semibold mb-1 text-white">Status</div>
                    <div className={`text-lg font-bold ${
                      debugData.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {debugData.status.toUpperCase()}
                    </div>
                  </div>

                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div className="text-sm font-semibold mb-2 text-white">Processes</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Watchdog</span>
                        <span className={`text-sm font-semibold ${
                          debugData.processes.watchdog.running ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {debugData.processes.watchdog.running ? 'Running' : 'Stopped'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Trading</span>
                        <span className={`text-sm font-semibold ${
                          debugData.processes.trading.running ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {debugData.processes.trading.running ? 'Running' : 'Stopped'}
                        </span>
                      </div>
                      {debugData.processes.trading.uptime && (
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Uptime</span>
                          <span>{debugData.processes.trading.uptime}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div className="text-sm font-semibold mb-2 text-white">Prediction</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Status</span>
                        <span className={`text-sm font-semibold ${
                          debugData.prediction.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {debugData.prediction.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Take Profit Probability</span>
                        <span className="text-emerald-400 text-sm font-semibold">
                          {(debugData.prediction.prob * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Model Version</span>
                        <span className="text-slate-300 text-sm font-mono">
                          {debugData.prediction.model_version}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">5min Completed</span>
                        <span className="text-slate-400 font-mono">
                          {new Date(debugData.prediction.completed_5min_timestamp).toLocaleString('ko-KR')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">1min Completed</span>
                        <span className="text-slate-400 font-mono">
                          {new Date(debugData.prediction.completed_1min_timestamp).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {debugData.errors.length > 0 && (
                    <div className="bg-rose-500/10 p-3 rounded-lg border border-rose-500/30">
                      <div className="text-sm font-semibold mb-2 text-rose-400">Errors</div>
                      <div className="space-y-1">
                        {debugData.errors.map((error, idx) => (
                          <div key={idx} className="text-xs text-rose-300">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
                onClick={handleDebugClick}
                className="p-1.5 rounded transition-all duration-200 text-amber-400 hover:bg-amber-500/10"
                title="Debug Verification"
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
