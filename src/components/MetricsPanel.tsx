import { TrendingDown, DollarSign, Activity, History, Target, Check, X } from 'lucide-react';
import { DashboardData, BuyConditions, EarlyExitConditions } from '../types/dashboard';
import { formatLocalDateTime } from '../utils/time';

interface MetricsPanelProps {
  data: DashboardData;
  position: 'left' | 'right' | 'trades';
}

const MAIN_CONDITIONS: { key: keyof BuyConditions; label: string }[] = [
  { key: '1m_golden_cross', label: '1m GC' },
  { key: '30m_gap',         label: '30m Gap' },
];

const MULTI_TF_CONDITIONS: { key: keyof BuyConditions; label: string }[] = [
  { key: '5m_above',  label: '5m' },
  { key: '15m_above', label: '15m' },
  { key: '30m_above', label: '30m' },
  { key: '1h_above',  label: '1h' },
];

const SLOPE_CONDITIONS: { key: keyof BuyConditions; label: string }[] = [
  { key: '30m_slope_up', label: '30m' },
  { key: '1h_slope_up',  label: '1h' },
];

const BBW_CONDITIONS: { key: keyof BuyConditions; label: string }[] = [
  { key: '5m_bbw',  label: '5m' },
  { key: '15m_bbw', label: '15m' },
];

const EARLY_EXIT_ORDER: { key: keyof EarlyExitConditions; label: string }[] = [
  { key: '30m_golden_maintained', label: '30m GC' },
  { key: '30m_ema5_falling', label: 'EMA5↓' },
  { key: '30m_ema13_falling', label: 'EMA13↓' },
  { key: '1d_downtrend', label: '1d↓' },
];

const formatHoldingDuration = (entryTime: number, currentTime: number): string => {
  const diffMs = currentTime - entryTime;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${remainMinutes}m`;
  }
  return `${minutes}m`;
};

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
    if (value === undefined || value === null) return '0.00%';
    if (typeof value !== 'number' || isNaN(value)) return '0.00%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (position === 'left') {
    const strategy = data.strategyStatus;
    const conditionsMet = strategy?.buyConditionsMet ?? 0;
    const conditionsTotal = strategy?.buyConditionsTotal ?? 10;
    const progressPct = conditionsTotal > 0 ? (conditionsMet / conditionsTotal) * 100 : 0;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="bg-white/95 border border-slate-200 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-slate-800">Status</h3>
            <Activity className="w-3 h-3 text-cyan-600" />
          </div>

          <div className="space-y-1.5">
            <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
              <div className="text-[10px] text-amber-800 font-medium mb-0.5">TOTAL ASSET</div>
              <div className="text-xl font-bold text-slate-900 mb-1">
                {formatCurrency(data.currentAsset)}
              </div>
              <div className="space-y-0.5 pt-1 border-t border-amber-200">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-600">BTC</span>
                  <span className="text-[11px] font-bold text-amber-700">
                    {formatCurrency(data.currentBTC || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-600">USDC</span>
                  <span className="text-[11px] font-bold text-emerald-600">
                    {formatCurrency(data.currentCash || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-1.5">
              <div className="text-[10px] text-slate-700 mb-1 font-medium">POSITION</div>
              {data.holding.isHolding ? (
                <div className="space-y-0.5 bg-blue-50 rounded-lg p-1.5 border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-600">Entry</span>
                    <span className="text-[11px] font-bold text-slate-800">{formatCurrency(data.holding.buyPrice!)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-600">P&L</span>
                    <span className={`text-[11px] font-bold ${
                      (data.holding.currentProfit ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'
                    }`}>
                      {typeof data.holding.currentProfit === 'number'
                        ? `${data.holding.currentProfit >= 0 ? '+' : ''}${data.holding.currentProfit.toFixed(2)}%`
                        : '0.00%'}
                    </span>
                  </div>
                  {data.holding.buyTime && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-600">Duration</span>
                      <span className="text-[11px] font-bold text-slate-700">
                        {formatHoldingDuration(data.holding.buyTime, data.currentTime)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold inline-block border border-slate-200">
                  NO POSITION
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/95 border border-emerald-200 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Buy Signals</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white">
              {conditionsMet}/{conditionsTotal}
            </span>
          </div>

          {strategy ? (
            <div className="space-y-1">
              <div className="space-y-0.5">
                {MAIN_CONDITIONS.map(({ key, label }) => {
                  const met = strategy.buyConditions[key];
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between px-1.5 py-1 rounded border ${
                        met
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className="text-[10px] font-medium text-slate-700">{label}</span>
                      {met ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <X className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  );
                })}

                <div className="pt-0.5">
                  <div className="text-[9px] font-bold text-slate-600 mb-0.5">EMA Above</div>
                  <div className="grid grid-cols-4 gap-0.5">
                    {MULTI_TF_CONDITIONS.map(({ key, label }) => {
                      const met = strategy.buyConditions[key];
                      return (
                        <div
                          key={key}
                          className={`flex flex-col items-center justify-center px-1 py-1 rounded border ${
                            met
                              ? 'bg-emerald-50 border-emerald-300'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {met ? (
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                          ) : (
                            <X className="w-2.5 h-2.5 text-slate-400" />
                          )}
                          <span className="text-[8px] font-medium text-slate-700 mt-0.5">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-0.5">
                  <div className="text-[9px] font-bold text-slate-600 mb-0.5">Slope Up</div>
                  <div className="grid grid-cols-2 gap-0.5">
                    {SLOPE_CONDITIONS.map(({ key, label }) => {
                      const met = strategy.buyConditions[key];
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-center gap-1 px-1 py-1 rounded border ${
                            met
                              ? 'bg-emerald-50 border-emerald-300'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {met ? (
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                          ) : (
                            <X className="w-2.5 h-2.5 text-slate-400" />
                          )}
                          <span className="text-[9px] font-medium text-slate-700">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-0.5">
                  <div className="text-[9px] font-bold text-slate-600 mb-0.5">BBW</div>
                  <div className="grid grid-cols-2 gap-0.5">
                    {BBW_CONDITIONS.map(({ key, label }) => {
                      const met = strategy.buyConditions[key];
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-center gap-1 px-1 py-1 rounded border ${
                            met
                              ? 'bg-emerald-50 border-emerald-300'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {met ? (
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                          ) : (
                            <X className="w-2.5 h-2.5 text-slate-400" />
                          )}
                          <span className="text-[9px] font-medium text-slate-700">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-12 text-slate-500 text-[10px]">
              Waiting...
            </div>
          )}
        </div>

        <div className="bg-white/95 border border-blue-200 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Sell Signals</h3>
            {strategy?.sellConditions?.any_sell && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white">
                SELL
              </span>
            )}
          </div>

          {strategy?.sellConditions ? (
            <div className="space-y-1">
              <div className={`flex items-center justify-between px-1.5 py-1 rounded border ${
                strategy.sellConditions.dead_cross.met
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] font-medium text-slate-700">Dead Cross</span>
                {strategy.sellConditions.dead_cross.met ? (
                  <Check className="w-3 h-3 text-blue-600" />
                ) : (
                  <X className="w-3 h-3 text-slate-400" />
                )}
              </div>

              <div className="pt-0.5">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="text-[9px] font-bold text-slate-600">Early Exit</div>
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-500 text-white">
                    {strategy.sellConditions.early_exit.conditions_met}/4
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-0.5">
                  {EARLY_EXIT_ORDER.map(({ key, label }) => {
                    const met = strategy.sellConditions.early_exit.conditions[key];
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-center gap-1 px-1 py-1 rounded border ${
                          met
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {met ? (
                          <Check className="w-2.5 h-2.5 text-blue-600" />
                        ) : (
                          <X className="w-2.5 h-2.5 text-slate-400" />
                        )}
                        <span className="text-[9px] font-medium text-slate-700">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-12 text-slate-500 text-[10px]">
              Waiting...
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
      <div className="bg-white/95 border border-amber-200 rounded-lg shadow-sm p-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[11px] font-bold text-slate-800">Recent Trades</h3>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-500 font-mono">7d</span>
            <History className="w-2.5 h-2.5 text-amber-600" />
          </div>
        </div>

        <div className="space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-transparent" style={{ maxHeight: '140px' }}>
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => (
              <div key={`${trade.timestamp}-${index}`}>
                {trade.type === 'buy' ? (
                  <div className="bg-blue-50 border border-blue-300 rounded p-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600">BUY</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-800">{formatCurrency(trade.price)}</span>
                        <span className="text-[8px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`${
                    trade.exitReason === 'TP'
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-rose-50 border-rose-300'
                  } border rounded p-1`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold ${
                          trade.exitReason === 'TP' ? 'text-emerald-600' : 'text-rose-500'
                        }`}>SELL</span>
                        {trade.exitReason && (
                          <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${
                            trade.exitReason === 'TP'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-rose-500 text-white'
                          }`}>{trade.exitReason}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-800">{formatCurrency(trade.price)}</span>
                          {trade.profit !== undefined && (
                            <span className={`text-[9px] font-bold ${
                              trade.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'
                            }`}>
                              {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                          {trade.pnl !== undefined && (
                            <span className={`text-[8px] font-bold ${
                              trade.pnl >= 0 ? 'text-emerald-600' : 'text-rose-500'
                            }`}>
                              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-20 text-slate-500 text-[10px]">
              No trades
            </div>
          )}
        </div>
      </div>
    );
  }

  const winRate = data.metrics.winRate
    ?? (data.metrics.takeProfitCount + data.metrics.stopLossCount > 0
      ? (data.metrics.takeProfitCount / (data.metrics.takeProfitCount + data.metrics.stopLossCount)) * 100
      : 0);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="bg-white/95 border border-amber-200 rounded-lg shadow-sm p-2">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[11px] font-bold text-slate-800">Performance</h3>
          <DollarSign className="w-3 h-3 text-amber-600" />
        </div>

        <div className="space-y-1.5">
          {data.metrics.portfolioReturnWithCommission !== undefined && (
            <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-2 rounded-lg border border-emerald-300">
              <div className="text-[10px] text-emerald-800 font-bold mb-0.5">NET PROFIT</div>
              <div
                className={`text-2xl font-black ${
                  data.metrics.portfolioReturnWithCommission >= 0 ? 'text-emerald-600' : 'text-rose-500'
                }`}
              >
                {formatPercent(data.metrics.portfolioReturnWithCommission)}
              </div>
              {data.metrics.totalPnl !== undefined && (
                <div className={`text-[11px] font-bold mt-0.5 ${
                  data.metrics.totalPnl >= 0 ? 'text-emerald-700' : 'text-rose-500'
                }`}>
                  {data.metrics.totalPnl >= 0 ? '+' : ''}{data.metrics.totalPnl.toFixed(2)} USDC
                </div>
              )}
            </div>
          )}

          <div className="space-y-0.5">
            <div className="flex justify-between items-center bg-amber-50 p-1 rounded border border-amber-200">
              <span className="text-[9px] text-slate-700 font-medium">Portfolio Return</span>
              <span className={`text-[11px] font-bold ${
                data.metrics.portfolioReturn >= 0 ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                {formatPercent(data.metrics.portfolioReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center bg-amber-50 p-1 rounded border border-amber-200">
              <span className="text-[9px] text-slate-700 font-medium">Market Change</span>
              <span className={`text-[11px] font-bold ${
                data.metrics.marketReturn >= 0 ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                {formatPercent(data.metrics.marketReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center bg-amber-50 p-1 rounded border border-amber-200">
              <span className="text-[9px] text-slate-700 font-medium">Avg Trade Return</span>
              <span className={`text-[11px] font-bold ${
                data.metrics.avgTradeReturn >= 0 ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                {formatPercent(data.metrics.avgTradeReturn)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/95 border border-blue-200 rounded-lg shadow-sm p-2">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[11px] font-bold text-slate-800">Statistics</h3>
          <Target className="w-3 h-3 text-blue-600" />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center bg-emerald-50 p-1.5 rounded border border-emerald-300">
            <span className="text-[10px] text-emerald-700 font-bold">Profit (TP)</span>
            <span className="text-sm font-bold text-emerald-600">{data.metrics.takeProfitCount}</span>
          </div>
          <div className="flex justify-between items-center bg-rose-50 p-1.5 rounded border border-rose-300">
            <span className="text-[10px] text-rose-600 font-bold">Loss (SL)</span>
            <span className="text-sm font-bold text-rose-500">{data.metrics.stopLossCount}</span>
          </div>
          {data.metrics.totalTrades !== undefined && (
            <div className="flex justify-between items-center bg-slate-50 p-1 rounded border border-slate-200">
              <span className="text-[10px] text-slate-700 font-bold">Total</span>
              <span className="text-xs font-bold text-slate-700">{data.metrics.totalTrades}</span>
            </div>
          )}
          <div className="border-t border-blue-200 pt-1 mt-1">
            <div className="text-[10px] text-slate-700 mb-1 font-bold">WIN RATE</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 transition-all duration-500"
                  style={{ width: `${winRate}%` }}
                />
              </div>
              <span className="text-xs font-bold text-amber-700 min-w-[40px]">
                {winRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
