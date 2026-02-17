import { TrendingDown, DollarSign, Activity, History, Target, Check, X } from 'lucide-react';
import { DashboardData, BuyConditions } from '../types/dashboard';
import { formatLocalDateTime } from '../utils/time';

interface MetricsPanelProps {
  data: DashboardData;
  position: 'left' | 'right' | 'trades';
}

const MAIN_CONDITIONS: { key: keyof BuyConditions; label: string }[] = [
  { key: '1m_golden_cross', label: '1m GC' },
  { key: '30m_gap',         label: '30m Gap' },
  { key: '30m_adx',         label: '30m ADX' },
];

const MULTI_TF_CONDITIONS: { key: keyof BuyConditions; label: string }[] = [
  { key: '5m_above',  label: '5m' },
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

const getExitReasonLabel = (reason?: string): string => {
  if (!reason) return 'TP';
  if (reason === 'TP') return 'TP';
  if (reason === 'SL') return 'SL';
  if (reason.startsWith('15M_REVERSAL')) return '15m Rev';
  if (reason === 'DEAD_CROSS_1h') return '1h DC';
  if (reason.startsWith('SMART_SCORE')) return 'Smart';
  if (reason.startsWith('SMART_FLOOR')) return 'Smart';
  return reason.length > 8 ? reason.substring(0, 8) : reason;
};

const getExitReasonColor = (reason?: string): { bg: string; text: string; border: string } => {
  if (!reason) return { bg: 'bg-green-50/50', text: 'text-green-600', border: 'border-green-200' };
  if (reason === 'TP') return { bg: 'bg-green-50/50', text: 'text-green-600', border: 'border-green-200' };
  if (reason.startsWith('15M_REVERSAL')) return { bg: 'bg-cyan-50/50', text: 'text-cyan-600', border: 'border-cyan-200' };
  if (reason === 'DEAD_CROSS_1h') return { bg: 'bg-red-50/50', text: 'text-red-600', border: 'border-red-200' };
  if (reason.startsWith('SMART_')) return { bg: 'bg-blue-50/50', text: 'text-blue-600', border: 'border-blue-200' };
  return { bg: 'bg-red-50/50', text: 'text-red-600', border: 'border-red-200' };
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
        <div className="bg-white/95 border border-slate-200 rounded-lg shadow-sm p-3">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Portfolio</h3>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="space-y-2">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-2.5 border border-slate-200">
              <div className="text-[9px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Total Asset</div>
              <div className="text-xl font-semibold text-slate-900 mb-2">
                {formatCurrency(data.currentAsset)}
              </div>
              <div className="space-y-1 pt-2 border-t border-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-medium text-slate-500">BTC</span>
                  <span className="text-[10px] font-semibold text-slate-700">
                    {formatCurrency(data.currentBTC || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-medium text-slate-500">USDC</span>
                  <span className="text-[10px] font-semibold text-slate-700">
                    {formatCurrency(data.currentCash || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <div className="text-[9px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Position</div>
              {data.holding.isHolding ? (
                <div className="space-y-1 bg-blue-50/50 rounded-lg p-2 border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-medium text-slate-600">Entry</span>
                    <span className="text-[10px] font-semibold text-slate-800">{formatCurrency(data.holding.buyPrice!)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-medium text-slate-600">P&L</span>
                    <span className={`text-[11px] font-semibold ${
                      (data.holding.currentProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {typeof data.holding.currentProfit === 'number'
                        ? `${data.holding.currentProfit >= 0 ? '+' : ''}${data.holding.currentProfit.toFixed(2)}%`
                        : '0.00%'}
                    </span>
                  </div>
                  {data.holding.buyTime && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-medium text-slate-600">Duration</span>
                      <span className="text-[10px] font-semibold text-slate-700">
                        {formatHoldingDuration(data.holding.buyTime, data.currentTime)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-2.5 py-1.5 bg-slate-50 text-slate-500 rounded border border-slate-200 text-[9px] font-medium text-center">
                  No Position
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/95 border border-slate-200 rounded-lg shadow-sm p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Entry Conditions</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-medium">{conditionsMet}/{conditionsTotal}</span>
              <div className={`w-2 h-2 rounded-full ${
                conditionsMet === conditionsTotal ? 'bg-green-500' : 'bg-slate-300'
              }`}></div>
            </div>
          </div>

          {strategy ? (
            <div className="space-y-2">
              {MAIN_CONDITIONS.map(({ key, label }) => {
                const met = strategy.buyConditions[key];
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-md border transition-all ${
                      met
                        ? 'bg-green-50/50 border-green-200 text-green-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <span className="text-[10px] font-medium">{label}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      met ? 'bg-green-500' : 'bg-slate-300'
                    }`}></div>
                  </div>
                );
              })}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <div className="text-[9px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">EMA Above</div>
                  <div className="space-y-1">
                    {MULTI_TF_CONDITIONS.map(({ key, label }) => {
                      const met = strategy.buyConditions[key];
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between px-2 py-1.5 rounded border text-[9px] font-medium transition-all ${
                            met
                              ? 'bg-green-50/50 border-green-200 text-green-600'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <span>{label}</span>
                          <div className={`w-1 h-1 rounded-full ${
                            met ? 'bg-green-500' : 'bg-slate-300'
                          }`}></div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">BBW</div>
                  <div className="space-y-1">
                    {BBW_CONDITIONS.map(({ key, label }) => {
                      const met = strategy.buyConditions[key];
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between px-2 py-1.5 rounded border text-[9px] font-medium transition-all ${
                            met
                              ? 'bg-green-50/50 border-green-200 text-green-600'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <span>{label}</span>
                          <div className={`w-1 h-1 rounded-full ${
                            met ? 'bg-green-500' : 'bg-slate-300'
                          }`}></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <div className="text-[9px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Slope Up</div>
                <div className="grid grid-cols-2 gap-1">
                  {SLOPE_CONDITIONS.map(({ key, label }) => {
                    const met = strategy.buyConditions[key];
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between px-2 py-1.5 rounded border text-[9px] font-medium transition-all ${
                          met
                            ? 'bg-green-50/50 border-green-200 text-green-600'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        <span>{label}</span>
                        <div className={`w-1 h-1 rounded-full ${
                          met ? 'bg-green-500' : 'bg-slate-300'
                        }`}></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-12 text-slate-400 text-[10px]">
              Waiting...
            </div>
          )}
        </div>

        <div className="bg-white/95 border border-slate-200 rounded-lg shadow-sm p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Exit Conditions</h3>
            {strategy?.sellConditions?.any_sell && (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-medium text-red-600">ACTIVE</span>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              </div>
            )}
          </div>

          {strategy?.sellConditions ? (
            <div className="space-y-2">
              {strategy.sellConditions.smart_trail && (
                <div className={`rounded-md border transition-all ${
                  strategy.sellConditions.smart_trail.met
                    ? 'bg-red-50/50 border-red-300'
                    : strategy.sellConditions.smart_trail.active
                    ? 'bg-blue-50/50 border-blue-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="px-2.5 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-medium ${
                          strategy.sellConditions.smart_trail.met
                            ? 'text-red-700'
                            : strategy.sellConditions.smart_trail.active
                            ? 'text-blue-700'
                            : 'text-slate-500'
                        }`}>15m EMA Reversal</span>
                        {strategy.sellConditions.smart_trail.active && (
                          <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">ACTIVE</span>
                        )}
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        strategy.sellConditions.smart_trail.met ? 'bg-red-500' : 'bg-slate-300'
                      }`}></div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      <div className={`rounded border p-1.5 ${
                        strategy.sellConditions.smart_trail.active
                          ? 'bg-white/50 border-blue-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="text-[8px] font-medium text-slate-500 mb-0.5">EMA3</div>
                        <div className="font-mono text-[9px] font-medium text-slate-700">
                          ${strategy.sellConditions.smart_trail['15m_ema3'].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className={`rounded border p-1.5 ${
                        strategy.sellConditions.smart_trail.active
                          ? 'bg-white/50 border-blue-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="text-[8px] font-medium text-slate-500 mb-0.5">EMA8</div>
                        <div className="font-mono text-[9px] font-medium text-slate-700">
                          ${strategy.sellConditions.smart_trail['15m_ema8'].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    <div className={`rounded border px-2 py-1 mb-2 ${
                      strategy.sellConditions.smart_trail['15m_above']
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-medium text-slate-600">Status</span>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                          strategy.sellConditions.smart_trail['15m_above']
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {strategy.sellConditions.smart_trail['15m_above'] ? 'Above' : 'Reversed'}
                        </span>
                      </div>
                    </div>

                    {strategy.sellConditions.smart_trail.entry_price > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded p-1.5 space-y-1">
                        <div className="flex justify-between text-[9px]">
                          <span className="font-medium text-slate-500">Entry</span>
                          <span className="font-mono font-medium text-slate-700">
                            ${strategy.sellConditions.smart_trail.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                          <span className="font-medium text-slate-500">Peak</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-medium text-slate-700">
                              ${strategy.sellConditions.smart_trail.peak_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-green-100 text-green-700">
                              +{((strategy.sellConditions.smart_trail.peak_price / strategy.sellConditions.smart_trail.entry_price - 1) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between text-[8px]">
                        <span className="font-medium text-slate-500">
                          {{'U':'Uptrend','S':'Sideways','D':'Downtrend'}[strategy.sellConditions.smart_trail.regime] || strategy.sellConditions.smart_trail.regime}
                        </span>
                        <span className="font-medium px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          Score: {strategy.sellConditions.smart_trail.score}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className={`flex items-center justify-between px-2.5 py-2 rounded-md border transition-all ${
                strategy.sellConditions.dead_cross.met
                  ? 'bg-red-50/50 border-red-300 text-red-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <span className="text-[10px] font-medium">1h Dead Cross</span>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  strategy.sellConditions.dead_cross.met ? 'bg-red-500' : 'bg-slate-300'
                }`}></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-12 text-slate-400 text-[10px]">
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
      <div className="bg-white/95 border border-slate-200 rounded-lg shadow-sm p-2.5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Recent Trades</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-medium text-slate-500">7d</span>
            <History className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        <div className="space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent" style={{ maxHeight: '140px' }}>
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => (
              <div key={`${trade.timestamp}-${index}`}>
                {trade.type === 'buy' ? (
                  <div className="bg-blue-50/50 border border-blue-200 rounded p-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-medium text-blue-600">BUY</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-slate-700">{formatCurrency(trade.price)}</span>
                        <span className="text-[8px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`${getExitReasonColor(trade.exitReason).bg} ${getExitReasonColor(trade.exitReason).border} border rounded p-1.5`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-medium ${getExitReasonColor(trade.exitReason).text}`}>SELL</span>
                        {trade.exitReason && (
                          <span className={`text-[8px] px-1 py-0.5 rounded font-medium ${
                            trade.profit !== undefined && trade.profit >= 0
                              ? 'bg-green-500 text-white'
                              : 'bg-red-500 text-white'
                          }`} title={trade.exitReason}>{getExitReasonLabel(trade.exitReason)}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-slate-700">{formatCurrency(trade.price)}</span>
                          {trade.profit !== undefined && (
                            <span className={`text-[9px] font-semibold ${
                              trade.profit >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                          {trade.pnl !== undefined && (
                            <span className={`text-[8px] font-semibold ${
                              trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
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
            <div className="flex items-center justify-center h-20 text-slate-400 text-[10px]">
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
    <div className="flex flex-col gap-2">
      <div className="bg-white/95 border border-slate-200 rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Performance</h3>
          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
        </div>

        <div className="space-y-2">
          {data.metrics.portfolioReturnWithCommission !== undefined && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-2.5 rounded-lg border border-slate-200">
              <div className="text-[9px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Net Profit</div>
              <div
                className={`text-2xl font-semibold ${
                  data.metrics.portfolioReturnWithCommission >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatPercent(data.metrics.portfolioReturnWithCommission)}
              </div>
              {data.metrics.totalPnl !== undefined && (
                <div className={`text-[10px] font-medium mt-1 ${
                  data.metrics.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {data.metrics.totalPnl >= 0 ? '+' : ''}{data.metrics.totalPnl.toFixed(2)} USDC
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-200">
              <span className="text-[9px] font-medium text-slate-600">Portfolio Return</span>
              <span className={`text-[10px] font-semibold ${
                data.metrics.portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercent(data.metrics.portfolioReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-200">
              <span className="text-[9px] font-medium text-slate-600">Market Change</span>
              <span className={`text-[10px] font-semibold ${
                data.metrics.marketReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercent(data.metrics.marketReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-200">
              <span className="text-[9px] font-medium text-slate-600">Avg Trade Return</span>
              <span className={`text-[10px] font-semibold ${
                data.metrics.avgTradeReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercent(data.metrics.avgTradeReturn)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/95 border border-slate-200 rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Statistics</h3>
          <Target className="w-3.5 h-3.5 text-slate-400" />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center bg-green-50/50 p-2 rounded border border-green-200">
            <span className="text-[9px] font-medium text-green-700">Profit (TP)</span>
            <span className="text-sm font-semibold text-green-600">{data.metrics.takeProfitCount}</span>
          </div>
          <div className="flex justify-between items-center bg-red-50/50 p-2 rounded border border-red-200">
            <span className="text-[9px] font-medium text-red-700">Loss (SL)</span>
            <span className="text-sm font-semibold text-red-600">{data.metrics.stopLossCount}</span>
          </div>
          {data.metrics.totalTrades !== undefined && (
            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-200">
              <span className="text-[9px] font-medium text-slate-600">Total</span>
              <span className="text-xs font-semibold text-slate-700">{data.metrics.totalTrades}</span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-2 mt-2">
            <div className="text-[9px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Win Rate</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 transition-all duration-500"
                  style={{ width: `${winRate}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-700 min-w-[42px]">
                {winRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
