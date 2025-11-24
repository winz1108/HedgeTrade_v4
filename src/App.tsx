import { useEffect, useState, useRef } from 'react';
import { RefreshCw, Bell, BellOff, X } from 'lucide-react';
import { DashboardData, TradeEvent } from './types/dashboard';
import { fetchDashboardData } from './services/oracleApi';
import { PriceChart } from './components/PriceChart';
import { MetricsPanel } from './components/MetricsPanel';
import { requestNotificationPermission, sendBuyNotification, sendSellNotification, setNotificationCallback, InAppNotification } from './services/notifications';


function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTrade, setHoveredTrade] = useState<TradeEvent | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const previousHoldingState = useRef<boolean>(false);
  const lastTradeCount = useRef<number>(0);

  const loadData = async () => {
    try {
      setError(null);
      const dashboardData = await fetchDashboardData();

      if (!dashboardData || !dashboardData.metrics) {
        throw new Error('Invalid data structure received from API');
      }

      if (data && notificationsEnabled) {
        if (!previousHoldingState.current && dashboardData.holding.isHolding) {
          sendBuyNotification(
            dashboardData.holding.buyPrice || dashboardData.currentPrice,
            dashboardData.holding.initialTakeProfitProb || 0
          );
        }

        if (previousHoldingState.current && !dashboardData.holding.isHolding) {
          const latestTrade = dashboardData.trades[dashboardData.trades.length - 1];
          if (latestTrade && latestTrade.type === 'sell' && lastTradeCount.current < dashboardData.trades.length) {
            const previousTrade = dashboardData.trades[dashboardData.trades.length - 2];
            if (previousTrade && previousTrade.type === 'buy') {
              const profit = ((latestTrade.price - previousTrade.price) / previousTrade.price) * 100;
              sendSellNotification(
                profit >= 0 ? 'profit' : 'loss',
                latestTrade.price,
                profit
              );
            }
          }
        }

        lastTradeCount.current = dashboardData.trades.length;
      }

      previousHoldingState.current = dashboardData.holding.isHolding;
      setData(dashboardData);

      console.log('📊 Data loaded:', {
        priceHistory: {
          '1m': dashboardData.priceHistory1m?.length || 0,
          '5m': dashboardData.priceHistory5m?.length || 0,
          '15m': dashboardData.priceHistory15m?.length || 0,
          '1h': dashboardData.priceHistory1h?.length || 0
        },
        holding: dashboardData.holding?.isHolding ?? false,
        trades: dashboardData.trades?.length ?? 0
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();

    const checkNotificationPermission = async () => {
      if ('Notification' in window) {
        setNotificationsEnabled(Notification.permission === 'granted');
      }
    };
    checkNotificationPermission();

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
    }, 3000);

    return () => clearInterval(interval);
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
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-2xl border-2 animate-slide-in backdrop-blur-sm ${
              notification.type === 'buy'
                ? 'bg-emerald-500/90 border-emerald-400 text-white'
                : notification.type === 'sell-profit'
                ? 'bg-blue-500/90 border-blue-400 text-white'
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
      <div className="max-w-[98vw] mx-auto p-2 lg:p-4">
        <div className="flex flex-col mb-2 bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                HedgeTrade Dashboard
              </h1>
              {data.holding.isHolding && (
                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold border-2 border-emerald-500/50 animate-pulse shadow-lg shadow-emerald-500/30">
                  🟢 HOLDING BTC
                </div>
              )}
            </div>
            <button
              onClick={async () => {
                if (!notificationsEnabled) {
                  const granted = await requestNotificationPermission();
                  setNotificationsEnabled(granted);
                } else {
                  alert('Notifications are already enabled. To disable, go to your browser settings.');
                }
              }}
              className={`p-2 rounded-lg transition-all duration-200 border ${
                notificationsEnabled
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500'
              }`}
              title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
            >
              {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
            {data.version && (
              <span className="text-[10px] text-emerald-400 font-mono">{data.version}</span>
            )}
            <span className="text-[10px] text-slate-400 font-mono">
              {new Date(data.currentTime).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
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
