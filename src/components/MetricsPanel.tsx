import { TrendingDown, DollarSign, Activity, History, Target } from 'lucide-react';
import { DashboardData, BuyConditions } from '../types/dashboard';
import { formatLocalDateTime } from '../utils/time';

interface MetricsPanelProps {
  data: DashboardData;
  position: 'left' | 'right' | 'trades';
}

const CONDITION_ORDER: { key: keyof BuyConditions; label: string }[] = [
  { key: '1m_golden_cross', label: '1m GC' },
  { key: '5m_above',        label: '5m EMA\u2191' },
  { key: '15m_above',       label: '15m EMA\u2191' },
  { key: '30m_above',       label: '30m EMA\u2191' },
  { key: '1h_above',        label: '1h EMA\u2191' },
  { key: '30m_slope_up',    label: '30m Slope\u2191' },
  { key: '1h_slope_up',     label: '1h Slope\u2191' },
  { key: '5m_bbw',          label: '5m BBW' },
  { key: '15m_bbw',         label: '15m BBW' },
  { key: '30m_gap',         label: '30m Gap' },
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
              <div className="text-2xl font-bold text-slate-800 mb-2">
                {formatCurrency(data.currentAsset)}
              </div>
              <div className="space-y-1 pt-2 border-t border-amber-200">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-600">BTC</span>
                  <span className="text-xs font-semibold text-amber-600">
                    {formatCurrency(data.currentBTC || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-600">USDC</span>
                  <span className="text-xs font-semibold text-emerald-600">
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
                    <span className="text-[10px] text-slate-600 font-semibold">Position</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Holding</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-600">Buy Price</span>
                    <span className="text-[10px] font-semibold text-slate-800">{formatCurrency(data.holding.buyPrice!)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-600">Current Profit</span>
                    <span className={`text-[10px] font-bold ${
                      (data.holding.currentProfit ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-400'
                    }`}>
                      {typeof data.holding.currentProfit === 'number'
                        ? `${data.holding.currentProfit >= 0 ? '+' : ''}${data.holding.currentProfit.toFixed(2)}%`
                        : '0.00%'}
                    </span>
                  </div>
                  {data.holding.buyTime && (
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-600">Duration</span>
                      <span className="text-[10px] font-semibold text-slate-700">
                        {formatHoldingDuration(data.holding.buyTime, data.currentTime)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-2 py-1 bg-stone-200/50 text-slate-600 rounded-lg text-[10px] font-semibold inline-block border border-amber-200">
                  NOT HOLDING
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/90 border border-amber-200 rounded-lg shadow-xl p-3 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-800">Buy Conditions</h3>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                conditionsMet === conditionsTotal
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {conditionsMet}/{conditionsTotal}
              </span>
            </div>
            <div className="p-1 bg-teal-100 rounded-lg">
              <Target className="w-3 h-3 text-teal-600" />
            </div>
          </div>

          {strategy ? (
            <div className="space-y-2">
              <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden border border-stone-200">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    conditionsMet === conditionsTotal
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : 'bg-gradient-to-r from-amber-500 to-orange-400'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-1">
                {CONDITION_ORDER.map(({ key, label }) => {
                  const met = strategy.buyConditions[key];
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-medium border ${
                        met
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-stone-50 text-stone-500 border-stone-200'
                      }`}
                    >
                      <span className="text-[10px]">{met ? '\u2713' : '\u2717'}</span>
                      <span className="truncate">{label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-amber-200 pt-2 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-600 font-semibold">Sell Signal</span>
                  <span className={`text-[9px] font-bold ${
                    strategy.sellSignal ? 'text-rose-500' : 'text-stone-400'
                  }`}>
                    {strategy.sellSignal || 'None'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-600 font-semibold">Position</span>
                  <span className={`text-[9px] font-bold ${
                    strategy.inPosition ? 'text-blue-600' : 'text-stone-400'
                  }`}>
                    {strategy.inPosition ? 'IN' : 'OUT'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-16 text-slate-500 text-xs">
              Waiting for strategy data...
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
      <div className="bg-white/90 border border-amber-200 rounded-lg shadow-xl p-2.5 transition-all duration-300">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-bold text-slate-800">Recent Trades</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 font-mono">max 40 / 7d</span>
            <div className="p-0.5 bg-amber-100 rounded">
              <History className="w-2.5 h-2.5 text-amber-600" />
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
                  <div className={`${
                    trade.exitReason === 'TP' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'
                  } border rounded p-1`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-bold uppercase ${
                          trade.exitReason === 'TP' ? 'text-emerald-500' : 'text-rose-400'
                        }`}>SELL</span>
                        {trade.exitReason && (
                          <span className={`text-[7px] px-1 py-0.5 rounded font-bold ${
                            trade.exitReason === 'TP'
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-rose-100 text-rose-500'
                          }`}>{trade.exitReason}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-slate-800">{formatCurrency(trade.price)}</span>
                          {trade.profit !== undefined && (
                            <span className={`text-[8px] font-bold ${
                              trade.profit >= 0 ? 'text-emerald-500' : 'text-rose-400'
                            }`}>
                              {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                          {trade.pnl !== undefined && (
                            <span className={`text-[8px] font-semibold ${
                              trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-400'
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
            <div className="flex items-center justify-center h-20 text-slate-500 text-xs">
              No trades yet
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
    <div className="flex flex-col gap-2">
      <div className="bg-white/90 border border-amber-200 rounded-lg shadow-xl p-3 transition-all duration-300">
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
              <div className="text-[10px] text-emerald-900 font-bold mb-1 tracking-wide">ACTUAL PROFIT</div>
              <div
                className={`text-3xl font-black ${
                  data.metrics.portfolioReturnWithCommission >= 0 ? 'text-emerald-600' : 'text-rose-400'
                }`}
              >
                {formatPercent(data.metrics.portfolioReturnWithCommission)}
              </div>
              {data.metrics.totalPnl !== undefined && (
                <div className={`text-xs font-bold mt-1 ${
                  data.metrics.totalPnl >= 0 ? 'text-emerald-600' : 'text-rose-400'
                }`}>
                  {data.metrics.totalPnl >= 0 ? '+' : ''}{data.metrics.totalPnl.toFixed(2)} USDC
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between items-center bg-amber-50/80 p-1.5 rounded-lg border border-amber-200">
              <span className="text-[9px] text-slate-600 font-semibold">Portfolio Return</span>
              <span className={`text-xs font-bold ${
                data.metrics.portfolioReturn >= 0 ? 'text-emerald-600' : 'text-rose-400'
              }`}>
                {formatPercent(data.metrics.portfolioReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center bg-amber-50/80 p-1.5 rounded-lg border border-amber-200">
              <span className="text-[9px] text-slate-600 font-semibold">Market Change</span>
              <span className={`text-xs font-bold ${
                data.metrics.marketReturn >= 0 ? 'text-emerald-600' : 'text-rose-400'
              }`}>
                {formatPercent(data.metrics.marketReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center bg-amber-50/80 p-1.5 rounded-lg border border-amber-200">
              <span className="text-[9px] text-slate-600 font-semibold">Avg Trade Return</span>
              <span className={`text-xs font-bold ${
                data.metrics.avgTradeReturn >= 0 ? 'text-emerald-600' : 'text-rose-400'
              }`}>
                {formatPercent(data.metrics.avgTradeReturn)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/90 border border-amber-200 rounded-lg shadow-xl p-3 transition-all duration-300">
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
            <span className="text-[10px] text-emerald-600 font-semibold">Profit Exits (TP)</span>
            <span className="text-base font-bold text-emerald-600">{data.metrics.takeProfitCount}</span>
          </div>
          <div className="flex justify-between items-center bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
            <span className="text-[10px] text-rose-400 font-semibold">Loss Exits (SL)</span>
            <span className="text-base font-bold text-rose-400">{data.metrics.stopLossCount}</span>
          </div>
          {data.metrics.totalTrades !== undefined && (
            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-600 font-semibold">Total Trades</span>
              <span className="text-sm font-bold text-slate-700">{data.metrics.totalTrades}</span>
            </div>
          )}
          <div className="border-t border-amber-200 pt-2">
            <div className="text-[10px] text-slate-600 mb-1 font-semibold">Win Rate</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-stone-100 rounded-lg h-3.5 overflow-hidden border border-stone-200 shadow-inner">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-400 h-3.5 transition-all duration-500"
                  style={{ width: `${winRate}%` }}
                />
              </div>
              <span className="text-sm font-bold text-orange-700 min-w-[45px]">
                {winRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
