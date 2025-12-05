import { TrendingUp, TrendingDown, DollarSign, Activity, History } from 'lucide-react';
import { DashboardData } from '../types/dashboard';
import { formatLocalTime, formatLocalDateTime } from '../utils/time';

interface MetricsPanelProps {
  data: DashboardData;
  position: 'left' | 'right' | 'trades';
}

export const MetricsPanel = ({ data, position }: MetricsPanelProps) => {
  if (position === 'left' && data.holding.isHolding) {
    console.log('🎨 MetricsPanel 렌더링 - currentProfit:', data.holding.currentProfit);
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00%';
    }
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };


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
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
              <div className="text-[10px] text-slate-400 mb-1">Total Asset</div>
              <div className="text-2xl font-bold text-white mb-2">
                {formatCurrency(data.currentAsset)}
              </div>
              <div className="space-y-1 pt-2 border-t border-slate-600/50">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-400">BTC Value</span>
                  <span className="text-xs font-semibold text-amber-400">
                    {formatCurrency(data.currentBTC || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-400">Cash</span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {formatCurrency(data.currentCash || 0)}
                  </span>
                </div>
              </div>
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
                      key={`profit-${data.holding.currentProfit}-${Date.now()}`}
                      className={`text-[10px] font-bold ${
                        (data.holding.currentProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatPercent(data.holding.currentProfit)}
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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Take Profit Probability</h3>
              <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[8px] font-bold border border-blue-500/30">
                완성된 5분봉 기준
              </span>
            </div>
            <div className="p-1 bg-emerald-500/20 rounded-lg">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            </div>
          </div>

          {data.currentPrediction ? (
            <div className="space-y-2">
              {data.holding.isHolding && data.holding.initialTakeProfitProb !== undefined && (
                <div className="bg-slate-700/30 rounded-lg p-2 border border-slate-600/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Initial (At Buy)</span>
                    {data.holding.buyTime && (
                      <span className="text-[9px] text-slate-500 font-mono">
                        {formatLocalTime(data.holding.buyTime)}
                      </span>
                    )}
                  </div>
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
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {data.holding.isHolding ? 'Current' : 'Current Prediction'}
                  </span>
                  {data.lastPredictionUpdateTime && (
                    <span className="text-[9px] text-slate-500 font-mono">
                      {formatLocalTime(data.lastPredictionUpdateTime)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/50"
                      style={{ width: `${(data.currentPrediction?.takeProfitProb ?? 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-emerald-400 min-w-[50px]">
                    {((data.currentPrediction?.takeProfitProb ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {data.holding.isHolding && data.holding.initialTakeProfitProb !== undefined && data.currentPrediction && (
                <div className="bg-slate-700/20 rounded-lg p-2 border border-slate-600/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold">Change</span>
                    <span
                      className={`text-sm font-bold ${
                        (data.currentPrediction.takeProfitProb - data.holding.initialTakeProfitProb) >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {((data.currentPrediction.takeProfitProb - data.holding.initialTakeProfitProb) * 100) >= 0 ? '+' : ''}
                      {((data.currentPrediction.takeProfitProb - data.holding.initialTakeProfitProb) * 100).toFixed(1)}%
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
    const recentTrades = [...data.trades].reverse().slice(0, 10);

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-xl p-2.5 hover:shadow-purple-500/10 transition-all duration-300">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-bold text-white">Recent Trades</h3>
          <div className="p-0.5 bg-purple-500/20 rounded">
            <History className="w-2.5 h-2.5 text-purple-400" />
          </div>
        </div>

        <div className="space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent hover:scrollbar-thumb-slate-500" style={{ maxHeight: '140px' }}>
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-1 rounded border ${
                  trade.type === 'buy'
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-rose-500/10 border-rose-500/20'
                }`}
              >
                <div className="flex flex-col">
                  <span
                    className={`text-[9px] font-bold uppercase ${
                      trade.type === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {trade.type}
                  </span>
                  <span className="text-[8px] text-slate-500">
                    {formatLocalDateTime(trade.timestamp)}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-white">
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

        <div className="space-y-2">
          {data.metrics.portfolioReturnWithCommission !== undefined && (
            <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 p-3 rounded-lg border-2 border-emerald-500/50 shadow-lg">
              <div className="text-[10px] text-emerald-300 font-bold mb-1 tracking-wide">ACTUAL PROFIT</div>
              <div
                className={`text-3xl font-black ${
                  data.metrics.portfolioReturnWithCommission >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatPercent(data.metrics.portfolioReturnWithCommission)}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between items-center bg-slate-700/30 p-1.5 rounded-lg border border-slate-600/50">
              <span className="text-[9px] text-slate-400 font-semibold">Portfolio Return</span>
              <span
                className={`text-xs font-bold ${
                  data.metrics.portfolioReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatPercent(data.metrics.portfolioReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center bg-slate-700/30 p-1.5 rounded-lg border border-slate-600/50">
              <span className="text-[9px] text-slate-400 font-semibold">Market Change</span>
              <span
                className={`text-xs font-bold ${
                  data.metrics.marketReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatPercent(data.metrics.marketReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center bg-slate-700/30 p-1.5 rounded-lg border border-slate-600/50">
              <span className="text-[9px] text-slate-400 font-semibold">Avg Trade Return</span>
              <span
                className={`text-xs font-bold ${
                  data.metrics.avgTradeReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatPercent(data.metrics.avgTradeReturn)}
              </span>
            </div>
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
                      data.metrics.takeProfitCount + data.metrics.stopLossCount > 0
                        ? (data.metrics.takeProfitCount /
                            (data.metrics.takeProfitCount + data.metrics.stopLossCount)) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-sm font-bold text-cyan-400 min-w-[45px]">
                {
                  data.metrics.takeProfitCount + data.metrics.stopLossCount > 0
                    ? (
                        (data.metrics.takeProfitCount /
                          (data.metrics.takeProfitCount + data.metrics.stopLossCount)) *
                        100
                      ).toFixed(1)
                    : '0.0'
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
