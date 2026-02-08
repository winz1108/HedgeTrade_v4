import { TrendingDown, DollarSign, Activity, History, Target, AlertTriangle, TrendingUp } from 'lucide-react';
import { DashboardData, BuyConditions, EarlyExitConditions } from '../types/dashboard';
import { formatLocalDateTime } from '../utils/time';

interface MetricsPanelProps {
  data: DashboardData;
  position: 'left' | 'right' | 'trades';
}

const MAIN_CONDITIONS: { key: keyof BuyConditions; label: string }[] = [
  { key: '1m_golden_cross', label: '1m Golden Cross' },
  { key: '30m_gap',         label: '30m EMA Gap' },
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
  { key: '30m_golden_maintained', label: '30m GC Hold' },
  { key: '30m_ema5_falling', label: 'EMA5 Down' },
  { key: '30m_ema13_falling', label: 'EMA13 Down' },
  { key: '1d_downtrend', label: '1d Downtrend' },
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
      <div className="flex flex-col gap-3">
        <div className="bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/60 rounded-xl shadow-sm p-3.5 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800 tracking-tight">Current Status</h3>
            <div className="p-1.5 bg-cyan-50 rounded-lg border border-cyan-100">
              <Activity className="w-3.5 h-3.5 text-cyan-600" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-xl p-3.5 border border-amber-200/60 shadow-sm">
              <div className="text-[10px] text-amber-700 font-medium mb-1.5 uppercase tracking-wide">Total Asset</div>
              <div className="text-2xl font-bold text-slate-900 mb-2.5">
                {formatCurrency(data.currentAsset)}
              </div>
              <div className="space-y-1.5 pt-2.5 border-t border-amber-200/50">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-600 font-medium uppercase tracking-wide">BTC</span>
                  <span className="text-xs font-semibold text-amber-700">
                    {formatCurrency(data.currentBTC || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-600 font-medium uppercase tracking-wide">USDC</span>
                  <span className="text-xs font-semibold text-emerald-600">
                    {formatCurrency(data.currentCash || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/60 pt-3">
              <div className="text-[10px] text-slate-700 mb-2 font-medium uppercase tracking-wide">Holding Status</div>
              {data.holding.isHolding ? (
                <div className="space-y-2 bg-gradient-to-br from-blue-50 to-cyan-50/50 rounded-xl p-3 border border-blue-200/60 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">In Position</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-600 font-medium">Buy Price</span>
                    <span className="text-[11px] font-semibold text-slate-800">{formatCurrency(data.holding.buyPrice!)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-600 font-medium">Current Profit</span>
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
                      <span className="text-[10px] text-slate-600 font-medium">Duration</span>
                      <span className="text-[11px] font-semibold text-slate-700">
                        {formatHoldingDuration(data.holding.buyTime, data.currentTime)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-semibold inline-block border border-slate-200 uppercase tracking-wide">
                  Not Holding
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-200/60 rounded-xl shadow-sm p-3 transition-all duration-300">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800 tracking-tight">Buy Signals</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                conditionsMet === conditionsTotal
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {conditionsMet}/{conditionsTotal}
              </span>
            </div>
            <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>

          {strategy ? (
            <div className="space-y-2.5">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/80 shadow-inner">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    conditionsMet === conditionsTotal
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm'
                      : 'bg-gradient-to-r from-slate-400 to-slate-300'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="space-y-2">
                {MAIN_CONDITIONS.map(({ key, label }) => {
                  const met = strategy.buyConditions[key];
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-200 ${
                        met
                          ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300/80 shadow-sm'
                          : 'bg-slate-50/80 border-slate-200/80'
                      }`}
                    >
                      <span className="text-[10px] font-medium text-slate-700">{label}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        met ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'
                      }`}>
                        {met ? 'ACTIVE' : 'WAIT'}
                      </span>
                    </div>
                  );
                })}

                <div className="pt-1">
                  <div className="text-[9px] font-semibold text-slate-600 mb-1.5 px-0.5 uppercase tracking-wide">Multi-TF EMA Above</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {MULTI_TF_CONDITIONS.map(({ key, label }) => {
                      const met = strategy.buyConditions[key];
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-medium border transition-all duration-200 ${
                            met
                              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200/80 shadow-sm'
                              : 'bg-slate-50/80 text-slate-500 border-slate-200/80'
                          }`}
                        >
                          <span className={`text-[10px] font-bold ${met ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {met ? '✓' : '○'}
                          </span>
                          <span className="font-medium">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-1">
                  <div className="text-[9px] font-semibold text-slate-600 mb-1.5 px-0.5 uppercase tracking-wide">Slope Up</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SLOPE_CONDITIONS.map(({ key, label }) => {
                      const met = strategy.buyConditions[key];
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-medium border transition-all duration-200 ${
                            met
                              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200/80 shadow-sm'
                              : 'bg-slate-50/80 text-slate-500 border-slate-200/80'
                          }`}
                        >
                          <span className={`text-[10px] font-bold ${met ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {met ? '✓' : '○'}
                          </span>
                          <span className="font-medium">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-1">
                  <div className="text-[9px] font-semibold text-slate-600 mb-1.5 px-0.5 uppercase tracking-wide">Bollinger Band Width</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {BBW_CONDITIONS.map(({ key, label }) => {
                      const met = strategy.buyConditions[key];
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-medium border transition-all duration-200 ${
                            met
                              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200/80 shadow-sm'
                              : 'bg-slate-50/80 text-slate-500 border-slate-200/80'
                          }`}
                        >
                          <span className={`text-[10px] font-bold ${met ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {met ? '✓' : '○'}
                          </span>
                          <span className="font-medium">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-16 text-slate-500 text-xs">
              Waiting for strategy data...
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-white to-blue-50/30 border border-blue-200/60 rounded-xl shadow-sm p-3 transition-all duration-300">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800 tracking-tight">Sell Signals</h3>
              {strategy?.sellConditions?.any_sell && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-500 text-white animate-pulse shadow-sm">
                  ACTIVE
                </span>
              )}
            </div>
            <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-100">
              <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>

          {strategy?.sellConditions ? (
            <div className="space-y-2">
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-200 ${
                strategy.sellConditions.dead_cross.met
                  ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300/80 shadow-sm'
                  : 'bg-slate-50/80 border-slate-200/80'
              }`}>
                <span className="text-[10px] font-medium text-slate-700">30m Dead Cross</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                  strategy.sellConditions.dead_cross.met ? 'bg-blue-500 text-white' : 'bg-slate-300 text-slate-600'
                }`}>
                  {strategy.sellConditions.dead_cross.met ? 'SELL' : 'WAIT'}
                </span>
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[9px] font-semibold text-slate-600 px-0.5 uppercase tracking-wide">Early Exit Conditions</div>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                    strategy.sellConditions.early_exit.met
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-slate-300 text-slate-600'
                  }`}>
                    {strategy.sellConditions.early_exit.conditions_met}/4
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {EARLY_EXIT_ORDER.map(({ key, label }) => {
                    const met = strategy.sellConditions.early_exit.conditions[key];
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-medium border transition-all duration-200 ${
                          met
                            ? 'bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-700 border-blue-200/80 shadow-sm'
                            : 'bg-slate-50/80 text-slate-500 border-slate-200/80'
                        }`}
                      >
                        <span className={`text-[10px] font-bold ${met ? 'text-blue-600' : 'text-slate-400'}`}>
                          {met ? '✓' : '○'}
                        </span>
                        <span className="font-medium truncate">{label}</span>
                      </div>
                    );
                  })}
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
      <div className="bg-gradient-to-br from-white to-amber-50/30 border border-amber-200/60 rounded-xl shadow-sm p-2.5 transition-all duration-300">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-semibold text-slate-800 tracking-tight">Recent Trades</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 font-mono">max 40 / 7d</span>
            <div className="p-0.5 bg-amber-100 rounded border border-amber-200">
              <History className="w-2.5 h-2.5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-transparent hover:scrollbar-thumb-slate-500" style={{ maxHeight: '140px' }}>
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => (
              <div key={`${trade.timestamp}-${index}`}>
                {trade.type === 'buy' ? (
                  <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/30 rounded-lg p-1 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase text-blue-600 tracking-wide">BUY</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-slate-800">{formatCurrency(trade.price)}</span>
                        <span className="text-[8px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`${
                    trade.exitReason === 'TP'
                      ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-400/30'
                      : 'bg-gradient-to-r from-rose-500/10 to-red-500/10 border-rose-400/30'
                  } border rounded-lg p-1 shadow-sm`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-bold uppercase tracking-wide ${
                          trade.exitReason === 'TP' ? 'text-emerald-600' : 'text-rose-500'
                        }`}>SELL</span>
                        {trade.exitReason && (
                          <span className={`text-[7px] px-1 py-0.5 rounded font-bold ${
                            trade.exitReason === 'TP'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-100 text-rose-600 border border-rose-200'
                          }`}>{trade.exitReason}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-slate-800">{formatCurrency(trade.price)}</span>
                          {trade.profit !== undefined && (
                            <span className={`text-[8px] font-bold ${
                              trade.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'
                            }`}>
                              {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                          {trade.pnl !== undefined && (
                            <span className={`text-[8px] font-semibold ${
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
    <div className="flex flex-col gap-3">
      <div className="bg-gradient-to-br from-white to-amber-50/30 border border-amber-200/60 rounded-xl shadow-sm p-3.5 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800 tracking-tight">Performance</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 font-mono">30d</span>
            <div className="p-1.5 bg-amber-100 rounded-lg border border-amber-200">
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {data.metrics.portfolioReturnWithCommission !== undefined && (
            <div className="bg-gradient-to-br from-emerald-500/15 to-teal-500/15 p-3.5 rounded-xl border border-emerald-400/40 shadow-sm">
              <div className="text-[10px] text-emerald-800 font-semibold mb-1.5 tracking-wide uppercase">Actual Profit</div>
              <div
                className={`text-3xl font-black ${
                  data.metrics.portfolioReturnWithCommission >= 0 ? 'text-emerald-600' : 'text-rose-500'
                }`}
              >
                {formatPercent(data.metrics.portfolioReturnWithCommission)}
              </div>
              {data.metrics.totalPnl !== undefined && (
                <div className={`text-xs font-bold mt-1.5 ${
                  data.metrics.totalPnl >= 0 ? 'text-emerald-700' : 'text-rose-500'
                }`}>
                  {data.metrics.totalPnl >= 0 ? '+' : ''}{data.metrics.totalPnl.toFixed(2)} USDC
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50/50 p-2 rounded-lg border border-amber-200/60">
              <span className="text-[9px] text-slate-700 font-medium uppercase tracking-wide">Portfolio Return</span>
              <span className={`text-xs font-bold ${
                data.metrics.portfolioReturn >= 0 ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                {formatPercent(data.metrics.portfolioReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50/50 p-2 rounded-lg border border-amber-200/60">
              <span className="text-[9px] text-slate-700 font-medium uppercase tracking-wide">Market Change</span>
              <span className={`text-xs font-bold ${
                data.metrics.marketReturn >= 0 ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                {formatPercent(data.metrics.marketReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50/50 p-2 rounded-lg border border-amber-200/60">
              <span className="text-[9px] text-slate-700 font-medium uppercase tracking-wide">Avg Trade Return</span>
              <span className={`text-xs font-bold ${
                data.metrics.avgTradeReturn >= 0 ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                {formatPercent(data.metrics.avgTradeReturn)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-white to-blue-50/30 border border-blue-200/60 rounded-xl shadow-sm p-3.5 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800 tracking-tight">Trade Statistics</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 font-mono">30d</span>
            <div className="p-1.5 bg-blue-100 rounded-lg border border-blue-200">
              <Target className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-2.5 rounded-lg border border-emerald-400/30 shadow-sm">
            <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wide">Profit Exits (TP)</span>
            <span className="text-base font-bold text-emerald-600">{data.metrics.takeProfitCount}</span>
          </div>
          <div className="flex justify-between items-center bg-gradient-to-r from-rose-500/10 to-red-500/10 p-2.5 rounded-lg border border-rose-400/30 shadow-sm">
            <span className="text-[10px] text-rose-600 font-semibold uppercase tracking-wide">Loss Exits (SL)</span>
            <span className="text-base font-bold text-rose-500">{data.metrics.stopLossCount}</span>
          </div>
          {data.metrics.totalTrades !== undefined && (
            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200/80">
              <span className="text-[10px] text-slate-700 font-semibold uppercase tracking-wide">Total Trades</span>
              <span className="text-sm font-bold text-slate-800">{data.metrics.totalTrades}</span>
            </div>
          )}
          <div className="border-t border-blue-200/60 pt-2.5 mt-2">
            <div className="text-[10px] text-slate-700 mb-2 font-semibold uppercase tracking-wide">Win Rate</div>
            <div className="flex items-center gap-2.5">
              <div className="flex-1 bg-slate-100 rounded-lg h-4 overflow-hidden border border-slate-200/80 shadow-inner">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-4 transition-all duration-500 shadow-sm"
                  style={{ width: `${winRate}%` }}
                />
              </div>
              <span className="text-sm font-bold text-amber-700 min-w-[45px]">
                {winRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
