import { TrendingUp, TrendingDown, DollarSign, Activity, History } from 'lucide-react';
import { DashboardData } from '../types/dashboard';
import { formatLocalTime, formatLocalDateTime } from '../utils/time';
import { useState, useEffect } from 'react';

interface MetricsPanelProps {
  data: DashboardData;
  position: 'left' | 'right' | 'trades';
}

export const MetricsPanel = ({ data, position }: MetricsPanelProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null) {
      return '0.00%';
    }
    if (typeof value !== 'number' || isNaN(value)) {
      return '0.00%';
    }
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };


  if (position === 'left') {
    return (
      <div className="flex flex-col gap-2">
        <div className="bg-white/90 border border-blue-200 rounded-lg shadow-lg p-3 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-800">Current Status</h3>
            <div className="p-1 bg-cyan-100 rounded-lg">
              <Activity className="w-3 h-3 text-cyan-600" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-amber-50/80 rounded-lg p-3 border border-amber-200">
              <div className="text-[10px] text-slate-600 mb-1">Total Asset</div>
              <div
                key={`asset-${data.currentAsset}`}
                className="text-2xl font-bold text-slate-800 mb-2"
              >
                {formatCurrency(data.currentAsset)}
              </div>
              <div className="space-y-1 pt-2 border-t border-amber-200">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-600">BTC</span>
                  <span
                    key={`btc-${data.currentBTC}`}
                    className="text-xs font-semibold text-amber-600"
                  >
                    {formatCurrency(data.currentBTC || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-600">USDC</span>
                  <span
                    key={`cash-${data.currentCash}`}
                    className="text-xs font-semibold text-emerald-600"
                  >
                    {formatCurrency(data.currentCash || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-amber-200 pt-2">
              <div className="text-[10px] text-slate-600 mb-1.5 font-semibold">Holding Status</div>
              {data.holding.isHolding ? (
                <div className="space-y-1.5 bg-amber-50/80 rounded-lg p-2 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-600 font-semibold">
                      Position
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      Holding
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-600">Buy Price</span>
                    <span className="text-[10px] font-semibold text-slate-800">{formatCurrency(data.holding.buyPrice!)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-600">Current Profit</span>
                    <span
                      key={Math.random()}
                      className={`text-[10px] font-bold ${
                        (data.holding.currentProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {typeof data.holding.currentProfit === 'number'
                        ? `${data.holding.currentProfit >= 0 ? '+' : ''}${data.holding.currentProfit.toFixed(2)}%`
                        : '0.00%'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="px-2 py-1 bg-slate-700/20 text-slate-600 rounded-lg text-[10px] font-semibold inline-block border border-amber-200">
                  NOT HOLDING
                </div>
              )}
            </div>

            {data.holding.isHolding && (
              <div className="border-t border-amber-200 pt-2">
                <div className="text-[10px] text-slate-600 mb-1.5 font-semibold">Target Levels</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center bg-emerald-500/10 rounded-lg p-1.5 border border-emerald-500/20">
                    <span className="text-[10px] text-emerald-400 font-semibold">Take Profit</span>
                    <span className="text-[10px] font-bold text-slate-800">{formatCurrency(data.holding.takeProfitPrice!)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-rose-500/10 rounded-lg p-1.5 border border-rose-500/20">
                    <span className="text-[10px] text-rose-400 font-semibold">Stop Loss</span>
                    <span className="text-[10px] font-bold text-slate-800">{formatCurrency(data.holding.stopLossPrice!)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/90 border border-amber-200 rounded-lg shadow-xl p-3 hover:shadow-emerald-500/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-bold text-slate-800">Take Profit Probability</h3>
              {data.currentPrediction?.predictionDataTimestamp && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] text-slate-500">
                    데이터 기준: {formatLocalTime(data.currentPrediction.predictionDataTimestamp)}
                  </span>
                </div>
              )}
            </div>
            <div className="p-1 bg-emerald-500/20 rounded-lg">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            </div>
          </div>

          {data.currentPrediction ? (
            <div className="space-y-2">
              {data.holding.isHolding && data.holding.initialTakeProfitProb !== undefined && (
                <div className="bg-amber-50/80 rounded-lg p-2 border border-amber-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-600 font-semibold">Initial (At Buy)</span>
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

              <div className="bg-amber-50/80 rounded-lg p-2 border border-amber-200">
                <div className="flex flex-col gap-0.5 mb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-600 font-semibold">
                      {data.holding.isHolding ? 'Current' : 'Current Prediction'}
                    </span>
                    {data.currentPrediction?.predictionCalculatedAt && (
                      <span className="text-[9px] text-slate-500 font-mono">
                        {formatLocalTime(data.currentPrediction.predictionCalculatedAt)}
                      </span>
                    )}
                  </div>
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
    const oneWeekAgo = data.currentTime - (7 * 24 * 60 * 60 * 1000);
    const recentTrades = [...data.trades]
      .filter(trade => trade.timestamp >= oneWeekAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 40);

    return (
      <div className="bg-white/90 border border-amber-200 rounded-lg shadow-xl p-2.5 hover:shadow-purple-500/10 transition-all duration-300">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-bold text-slate-800">Recent Trades</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 font-mono">max 40 trades / 7d</span>
            <div className="p-0.5 bg-purple-500/20 rounded">
              <History className="w-2.5 h-2.5 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent hover:scrollbar-thumb-slate-500" style={{ maxHeight: '140px' }}>
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => (
              <div key={`${trade.timestamp}-${index}`}>
                {trade.type === 'buy' ? (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded p-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase text-blue-400">BUY</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-slate-800">{formatCurrency(trade.price)}</span>
                        <span className="text-[8px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded p-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase text-orange-400">SELL</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-slate-800">{formatCurrency(trade.price)}</span>
                        <span className="text-[8px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                )}
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
      <div className="bg-white/90 border border-amber-200 rounded-lg shadow-xl p-3 hover:shadow-amber-500/10 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-800">Performance</h3>
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
            <div className="flex justify-between items-center bg-amber-50/80 p-1.5 rounded-lg border border-amber-200">
              <span className="text-[9px] text-slate-600 font-semibold">Portfolio Return</span>
              <span
                className={`text-xs font-bold ${
                  data.metrics.portfolioReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatPercent(data.metrics.portfolioReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center bg-amber-50/80 p-1.5 rounded-lg border border-amber-200">
              <span className="text-[9px] text-slate-600 font-semibold">Market Change</span>
              <span
                className={`text-xs font-bold ${
                  data.metrics.marketReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatPercent(data.metrics.marketReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center bg-amber-50/80 p-1.5 rounded-lg border border-amber-200">
              <span className="text-[9px] text-slate-600 font-semibold">Avg Trade Return</span>
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

      <div className="bg-white/90 border border-amber-200 rounded-lg shadow-xl p-3 hover:shadow-blue-500/10 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-800">Trade Statistics</h3>
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
          <div className="border-t border-amber-200 pt-2">
            <div className="text-[10px] text-slate-600 mb-1 font-semibold">Win Rate</div>
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
