import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchBinanceFuturesDashboard, fetchBinanceFuturesChartData } from './services/oracleApi';
import { BinanceSpotMetricsPanel } from './components/spot/BinanceSpotMetricsPanel';
import { BinanceSpotPriceChart } from './components/spot/BinanceSpotPriceChart';
import { formatLocalTime } from './utils/time';
import { websocketService } from './services/websocket';

function App() {
  const [data, setData] = useState<any>(null);
  const [priceHistories, setPriceHistories] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const dashboardData = await fetchBinanceFuturesDashboard();

      const [chart1m, chart5m, chart15m, chart30m, chart1h, chart4h, chart1d] = await Promise.all([
        fetchBinanceFuturesChartData('1m', 500),
        fetchBinanceFuturesChartData('5m', 500),
        fetchBinanceFuturesChartData('15m', 500),
        fetchBinanceFuturesChartData('30m', 500),
        fetchBinanceFuturesChartData('1h', 500),
        fetchBinanceFuturesChartData('4h', 500),
        fetchBinanceFuturesChartData('1d', 500),
      ]);

      setPriceHistories({
        '1m': chart1m.candles,
        '5m': chart5m.candles,
        '15m': chart15m.candles,
        '30m': chart30m.candles,
        '1h': chart1h.candles,
        '4h': chart4h.candles,
        '1d': chart1d.candles,
      });

      setData(dashboardData);
      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);

    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (data?.data?.currentPrice) {
      document.title = `Binance Spot - $${data.data.currentPrice.toFixed(2)}`;
    }
  }, [data?.data?.currentPrice]);

  useEffect(() => {
    websocketService.connect();

    const handleLiveStatus = (statusData: any) => {
      if (statusData.current_price) {
        setData((prevData: any) => {
          if (!prevData) return prevData;
          return {
            ...prevData,
            data: {
              ...prevData.data,
              currentPrice: statusData.current_price,
            },
          };
        });
      }
    };

    const handlePriceTick = (priceData: any) => {
      if (priceData.price) {
        setData((prevData: any) => {
          if (!prevData) return prevData;
          return {
            ...prevData,
            data: {
              ...prevData.data,
              currentPrice: priceData.price,
              serverTime: priceData.timestamp,
            },
          };
        });
      }
    };

    websocketService.on('bf_live_status', handleLiveStatus);
    websocketService.on('bf_price_tick', handlePriceTick);

    return () => {
      websocketService.off('bf_live_status', handleLiveStatus);
      websocketService.off('bf_price_tick', handlePriceTick);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50">
        <div className="w-full lg:max-w-[98vw] mx-auto p-2 lg:p-4">
          <div className="flex items-center gap-3 mb-4 bg-white border border-amber-200 rounded-lg p-3 shadow-xl">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
            <h1 className="text-lg lg:text-2xl font-bold text-slate-800">
              Loading Binance Spot Dashboard...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center max-w-md bg-white backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-amber-200">
          <div className="text-rose-600 text-6xl mb-4">⚠</div>
          <p className="text-slate-900 text-xl font-bold mb-2">Failed to load data</p>
          <p className="text-slate-700 text-sm mb-6">{error || 'No data available'}</p>
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
      <div className="w-full lg:max-w-[98vw] mx-auto p-2 lg:p-4">
        <div className="flex flex-col mb-2 bg-white border border-amber-200 rounded-lg p-3 shadow-xl gap-3">
          <div className="flex items-center gap-3 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-2xl font-bold text-slate-800">
                Binance Spot Dashboard
              </h1>
              {data.data?.strategy?.version && (
                <span className="text-[10px] text-amber-600 font-mono">{data.data.strategy.version}</span>
              )}
              {data.data?.position?.inPosition && (
                <div className={`relative px-4 py-2 bg-white rounded-lg border ${
                  data.data.position.side === 'SHORT' ? 'border-orange-400' : 'border-cyan-400'
                } shadow-lg overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-r ${
                    data.data.position.side === 'SHORT' ? 'from-orange-100/50 via-transparent to-orange-100/50' : 'from-cyan-100/50 via-transparent to-cyan-100/50'
                  }`}></div>
                  <div className="relative flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      data.data.position.side === 'SHORT' ? 'bg-orange-600' : 'bg-cyan-600'
                    }`}></div>
                    <span className={`text-xs font-bold tracking-wider uppercase ${
                      data.data.position.side === 'SHORT' ? 'text-orange-700' : 'text-cyan-700'
                    }`}>
                      {data.data.position.side} POSITION
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-600">
                <span className="font-semibold">{data.data?.account?.name || 'Account B'}</span>
                <span className="mx-2">•</span>
                <span className="font-mono">{data.data?.symbol || 'BTCUSDT'}</span>
              </div>
              {data.data?.serverTime && (
                <span className="text-xs text-slate-600 font-mono">
                  {formatLocalTime(data.data.serverTime)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[280px,1fr,280px] gap-2" style={{ alignItems: 'start' }}>
          <div className="w-full lg:w-auto flex flex-col gap-2 order-2 lg:order-1 lg:h-[640px]">
            <BinanceSpotMetricsPanel data={data} position="left" currentTime={currentTime} />
          </div>
          <div className="w-full min-w-0 order-1 lg:order-2">
            <BinanceSpotPriceChart data={data} priceHistories={priceHistories} />
          </div>
          <div className="w-full lg:w-[280px] order-3 lg:order-3 lg:h-[640px] flex flex-col gap-2">
            <div className="w-full flex-shrink-0">
              <BinanceSpotMetricsPanel data={data} position="right" currentTime={currentTime} />
            </div>
            <div className="w-full flex-1 lg:min-h-0">
              <BinanceSpotMetricsPanel data={data} position="trades" currentTime={currentTime} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
