import { TrendingUp, TrendingDown, DollarSign, Activity, History } from 'lucide-react';
import { DashboardData } from '../types/dashboard';

interface MetricsPanelProps {
  data: DashboardData;
  position: 'left' | 'right' | 'trades';
}

export const MetricsPanel = ({ data, position }: MetricsPanelProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const calculateCurrentProfit = () => {
    if (!data.holding.isHolding || !data.holding.buyPrice) return 0;
    return ((data.currentPrice - data.holding.buyPrice) / data.holding.buyPrice) * 100;
  };

  const currentProfit = data.holding.isHolding
    ? (data.holding.currentProfit !== undefined ? data.holding.currentProfit : calculateCurrentProfit())
    : 0;

  if (position === 'left') {
    return (
      <div className="flex flex-col gap-2">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 hover:shadow-cyan-500/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white">Current Status</h3>
            <div className="p-1 bg-cyan-500/20 rounded-lg">
              <Activity className="w-3 h-3 text-cyan-400" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-slate-700/30 rounded-lg p-2 border border-slate-600/50">
              <div className="text-[10px] text-slate-400 mb-0.5">Current Asset</div>
              <div className="text-base font-bold text-white">{formatCurrency(data.currentAsset)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Initial: {formatCurrency(data.initialAsset)}</div>
            </div>

            <div className="border-t border-slate-700 pt-2">
              <div className="text-[10px] text-slate-400 mb-1.5 font-semibold">Holding Status</div>
              {data.holding.isHolding ? (
                <div className="space-y-1.5 bg-slate-700/30 rounded-lg p-2 border border-slate-600/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-300">Position</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold border border-emerald-500/30 animate-pulse">
                      HOLDING
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400">Buy Price</span>
                    <span className="text-[10px] font-semibold text-white">{formatCurrency(data.holding.buyPrice!)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400">Current Profit</span>
                    <span
                      className={`text-[10px] font-bold ${
                        currentProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatPercent(currentProfit)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="px-2 py-1 bg-slate-700/20 text-slate-400 rounded-lg text-[10px] font-semibold inline-block border border-slate-600/50">
                  NOT HOLDING
                </div>
              )}
            </div>

            {data.holding.isHolding && (
              <div className="border-t border-slate-700 pt-2">
                <div className="text-[10px] text-slate-400 mb-1.5 font-semibold">Target Levels</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center bg-emerald-500/10 rounded-lg p-1.5 border border-emerald-500/20">
                    <span className="text-[10px] text-emerald-400 font-semibold">Take Profit</span>
                    <span className="text-[10px] font-bold text-white">{formatCurrency(data.holding.takeProfitPrice!)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-rose-500/10 rounded-lg p-1.5 border border-rose-500/20">
                    <span className="text-[10px] text-rose-400 font-semibold">Stop Loss</span>
                    <span className="text-[10px] font-bold text-white">{formatCurrency(data.holding.stopLossPrice!)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 hover:shadow-emerald-500/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white">Take Profit Probability</h3>
            <div className="p-1 bg-emerald-500/20 rounded-lg">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            </div>
          </div>

          {data.currentPrediction ? (
            <div className="space-y-2">
              {data.holding.isHolding && data.holding.initialTakeProfitProb !== undefined && (
                <div className="bg-slate-700/30 rounded-lg p-2 border border-slate-600/50">
                  <div className="text-[10px] text-slate-400 mb-1 font-semibold">Initial (At Buy)</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-400 h-3 rounded-full transition-all duration-500 shadow-lg shadow-blue-500/50"
                        style={{ width: `${data.holding.initialTakeProfitProb! * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-cyan-400 min-w-[50px]">
                      {(data.holding.initialTakeProfitProb! * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-slate-700/30 rounded-lg p-2 border border-slate-600/50">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] text-slate-400 font-semibold">
                    {data.holding.isHolding ? 'Current' : 'Current Prediction'}
                  </div>
                  {data.lastPredictionUpdateTime && (
                    <div className="text-[9px] text-slate-500 font-mono">
                      {new Date(data.lastPredictionUpdateTime).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/50"
                      style={{ width: `${data.currentPrediction.takeProfitProb * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-emerald-400 min-w-[50px]">
                    {(data.currentPrediction.takeProfitProb * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {data.holding.isHolding && data.holding.initialTakeProfitProb !== undefined && (
                <div className="bg-slate-700/20 rounded-lg p-2 border border-slate-600/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold">Change</span>
                    <span
                      className={`text-sm font-bold ${
                        (data.currentPrediction.takeProfitProb - data.holding.initialTakeProfitProb!) >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {((data.currentPrediction.takeProfitProb - data.holding.initialTakeProfitProb!) * 100) >= 0 ? '+' : ''}
                      {((data.currentPrediction.takeProfitProb - data.holding.initialTakeProfitProb!) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {!data.holding.isHolding && (
                <div className="text-[10px] text-slate-500 text-center">
                  No active position
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-slate-500 text-xs">
              No prediction available
            </div>
          )}
        </div>
      </div>
    );
  }

  if (position === 'trades') {
    const recentTrades = [...data.trades].reverse().slice(0, 4);

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 hover:shadow-purple-500/10 transition-all duration-300 h-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white">Recent Trades</h3>
          <div className="p-1 bg-purple-500/20 rounded-lg">
            <History className="w-3 h-3 text-purple-400" />
          </div>
        </div>

        <div className="space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent hover:scrollbar-thumb-slate-500" style={{ maxHeight: 'calc(100% - 40px)' }}>
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-1.5 rounded-lg border ${
                  trade.type === 'buy'
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-rose-500/10 border-rose-500/20'
                }`}
              >
                <div className="flex flex-col">
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      trade.type === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {trade.type}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {new Date(trade.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-white">
                  {formatCurrency(trade.price)}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-20 text-slate-500 text-xs">
              No trades yet
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 hover:shadow-amber-500/10 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white">Performance</h3>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-500 font-mono">30d</span>
            <div className="p-1 bg-amber-500/20 rounded-lg">
              <DollarSign className="w-3 h-3 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center bg-slate-700/30 p-2 rounded-lg border border-slate-600/50">
            <span className="text-[10px] text-slate-400 font-semibold">Portfolio Return</span>
            <span
              className={`text-sm font-bold ${
                data.metrics.portfolioReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatPercent(data.metrics.portfolioReturn)}
            </span>
          </div>
          <div className="flex justify-between items-center bg-slate-700/30 p-2 rounded-lg border border-slate-600/50">
            <span className="text-[10px] text-slate-400 font-semibold">Market Return</span>
            <span
              className={`text-sm font-bold ${
                data.metrics.marketReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatPercent(data.metrics.marketReturn)}
            </span>
          </div>
          <div className="flex justify-between items-center bg-slate-700/30 p-2 rounded-lg border border-slate-600/50">
            <span className="text-[10px] text-slate-400 font-semibold">Avg Trade Return</span>
            <span
              className={`text-sm font-bold ${
                data.metrics.avgTradeReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatPercent(data.metrics.avgTradeReturn)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 hover:shadow-blue-500/10 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white">Trade Statistics</h3>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-500 font-mono">30d</span>
            <div className="p-1 bg-blue-500/20 rounded-lg">
              <TrendingDown className="w-3 h-3 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
            <span className="text-[10px] text-emerald-400 font-semibold">Take Profit Exits</span>
            <span className="text-base font-bold text-emerald-400">{data.metrics.takeProfitCount}</span>
          </div>
          <div className="flex justify-between items-center bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
            <span className="text-[10px] text-rose-400 font-semibold">Stop Loss Exits</span>
            <span className="text-base font-bold text-rose-400">{data.metrics.stopLossCount}</span>
          </div>
          <div className="border-t border-slate-700 pt-2">
            <div className="text-[10px] text-slate-400 mb-1 font-semibold">Win Rate</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-blue-500/50"
                  style={{
                    width: `${
                      (data.metrics.takeProfitCount /
                        (data.metrics.takeProfitCount + data.metrics.stopLossCount)) *
                      100
                    }%`,
                  }}
                />
              </div>
              <span className="text-sm font-bold text-cyan-400 min-w-[45px]">
                {
                  (
                    (data.metrics.takeProfitCount /
                      (data.metrics.takeProfitCount + data.metrics.stopLossCount)) *
                    100
                  ).toFixed(1)
                }
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
