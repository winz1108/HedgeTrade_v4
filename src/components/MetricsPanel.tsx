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
  if (reason.startsWith('15M_REVERSAL')) return '15m';
  if (reason === 'DEAD_CROSS_1h') return '1h DC';
  if (reason.startsWith('SMART_SCORE')) return 'Smart';
  if (reason.startsWith('SMART_FLOOR')) return 'Smart';
  return reason.length > 6 ? reason.substring(0, 6) : reason;
};

const getExitReasonColor = (reason?: string): { bg: string; text: string; border: string } => {
  if (!reason) return { bg: 'bg-slate-800/40', text: 'text-slate-300', border: 'border-slate-700' };
  if (reason === 'TP') return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
  if (reason.startsWith('15M_REVERSAL')) return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' };
  if (reason === 'DEAD_CROSS_1h') return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' };
  if (reason.startsWith('SMART_')) return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' };
  return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' };
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
    const conditionsTotal = MAIN_CONDITIONS.length + MULTI_TF_CONDITIONS.length + SLOPE_CONDITIONS.length + BBW_CONDITIONS.length;

    return (
      <div className="flex flex-col gap-2">
        <div className="bg-slate-900/50 border border-slate-800 p-2">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Portfolio</span>
            <span className="text-[10px] font-mono text-slate-500">{formatCurrency(data.currentAsset)}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[8px] text-slate-500 uppercase tracking-wide">BTC</span>
              <span className="text-[9px] font-mono text-slate-300">{formatCurrency(data.currentBTC || 0)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[8px] text-slate-500 uppercase tracking-wide">USDC</span>
              <span className="text-[9px] font-mono text-slate-300">{formatCurrency(data.currentCash || 0)}</span>
            </div>
          </div>
        </div>

        {data.holding.isHolding && (
          <div className="bg-blue-500/10 border border-blue-500/30 p-2">
            <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-blue-500/30">
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Position</span>
              {data.holding.buyTime && (
                <span className="text-[8px] font-mono text-blue-400/70">
                  {formatHoldingDuration(data.holding.buyTime, data.currentTime)}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[8px] text-slate-400 uppercase tracking-wide">Entry</span>
                <span className="text-[9px] font-mono text-slate-300">{formatCurrency(data.holding.buyPrice!)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[8px] text-slate-400 uppercase tracking-wide">P&L</span>
                <span className={`text-[10px] font-mono font-semibold ${
                  (data.holding.currentProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {typeof data.holding.currentProfit === 'number'
                    ? `${data.holding.currentProfit >= 0 ? '+' : ''}${data.holding.currentProfit.toFixed(2)}%`
                    : '0.00%'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900/50 border border-slate-800 p-2">
          <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Entry Cond.</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-mono text-slate-500">{conditionsMet}/{conditionsTotal}</span>
              <div className={`w-1 h-1 rounded-full ${conditionsMet === conditionsTotal ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
            </div>
          </div>

          {strategy ? (
            <div className="space-y-1">
              {MAIN_CONDITIONS.map(({ key, label }) => {
                const met = strategy.buyConditions[key];
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className={`text-[8px] uppercase tracking-wide ${met ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {label}
                    </span>
                    <div className={`w-1 h-1 rounded-full ${met ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                  </div>
                );
              })}

              <div className="pt-1 mt-1 border-t border-slate-800">
                <div className="text-[7px] text-slate-500 mb-0.5 uppercase tracking-wide">EMA Above</div>
                <div className="flex gap-2">
                  {MULTI_TF_CONDITIONS.map(({ key, label }) => {
                    const met = strategy.buyConditions[key];
                    return (
                      <div key={key} className="flex items-center gap-1">
                        <span className={`text-[8px] ${met ? 'text-emerald-400' : 'text-slate-600'}`}>{label}</span>
                        <div className={`w-0.5 h-0.5 rounded-full ${met ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1 mt-1 border-t border-slate-800">
                <div className="text-[7px] text-slate-500 mb-0.5 uppercase tracking-wide">BBW</div>
                <div className="flex gap-2">
                  {BBW_CONDITIONS.map(({ key, label }) => {
                    const met = strategy.buyConditions[key];
                    return (
                      <div key={key} className="flex items-center gap-1">
                        <span className={`text-[8px] ${met ? 'text-emerald-400' : 'text-slate-600'}`}>{label}</span>
                        <div className={`w-0.5 h-0.5 rounded-full ${met ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1 mt-1 border-t border-slate-800">
                <div className="text-[7px] text-slate-500 mb-0.5 uppercase tracking-wide">Slope Up</div>
                <div className="flex gap-2">
                  {SLOPE_CONDITIONS.map(({ key, label }) => {
                    const met = strategy.buyConditions[key];
                    return (
                      <div key={key} className="flex items-center gap-1">
                        <span className={`text-[8px] ${met ? 'text-emerald-400' : 'text-slate-600'}`}>{label}</span>
                        <div className={`w-0.5 h-0.5 rounded-full ${met ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-10 text-slate-600 text-[8px]">
              Waiting...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (position === 'right') {
    const winRate = data.metrics.totalTrades > 0
      ? (data.metrics.takeProfitCount / data.metrics.totalTrades) * 100
      : 0;

    return (
      <div className="flex flex-col gap-2">
        <div className="bg-slate-900/50 border border-slate-800 p-2">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Exit Cond.</span>
            {data.strategyStatus?.sellConditions?.any_sell && (
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-semibold text-red-400 uppercase">ACTIVE</span>
                <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></div>
              </div>
            )}
          </div>

          {data.strategyStatus?.sellConditions ? (
            <div className="space-y-1.5">
              {data.strategyStatus.sellConditions.smart_trail && (
                <div className={`p-1.5 border ${
                  data.strategyStatus.sellConditions.smart_trail.met
                    ? 'bg-red-500/10 border-red-500/30'
                    : data.strategyStatus.sellConditions.smart_trail.active
                    ? 'bg-orange-500/10 border-orange-500/30'
                    : 'bg-slate-800/40 border-slate-700'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span className={`text-[8px] uppercase font-semibold ${
                        data.strategyStatus.sellConditions.smart_trail.met
                          ? 'text-red-400'
                          : data.strategyStatus.sellConditions.smart_trail.active
                          ? 'text-orange-400'
                          : 'text-slate-500'
                      }`}>15m EMA Rev</span>
                      {data.strategyStatus.sellConditions.smart_trail.active && (
                        <span className="text-[7px] font-semibold px-1 bg-orange-500/20 text-orange-400">ACT</span>
                      )}
                    </div>
                    <div className={`w-1 h-1 rounded-full ${
                      data.strategyStatus.sellConditions.smart_trail.met ? 'bg-red-500' : 'bg-slate-700'
                    }`}></div>
                  </div>

                  <div className="flex gap-1 mb-1">
                    <div className="flex-1 bg-slate-900/50 border border-slate-700 p-1">
                      <div className="text-[7px] text-slate-500 mb-0.5">EMA3</div>
                      <div className="font-mono text-[8px] text-slate-300">
                        ${data.strategyStatus.sellConditions.smart_trail['15m_ema3'].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="flex-1 bg-slate-900/50 border border-slate-700 p-1">
                      <div className="text-[7px] text-slate-500 mb-0.5">EMA8</div>
                      <div className="font-mono text-[8px] text-slate-300">
                        ${data.strategyStatus.sellConditions.smart_trail['15m_ema8'].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between px-1 py-0.5 mb-1 border ${
                    data.strategyStatus.sellConditions.smart_trail['15m_above']
                      ? 'bg-slate-900/30 border-slate-700'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <span className="text-[7px] text-slate-400 uppercase">Status</span>
                    <span className={`text-[7px] font-semibold ${
                      data.strategyStatus.sellConditions.smart_trail['15m_above']
                        ? 'text-slate-400'
                        : 'text-red-400'
                    }`}>
                      {data.strategyStatus.sellConditions.smart_trail['15m_above'] ? 'Above' : 'Reversed'}
                    </span>
                  </div>

                  {data.strategyStatus.sellConditions.smart_trail.entry_price > 0 && (
                    <div className="bg-slate-900/50 border border-slate-700 p-1 space-y-0.5 mb-1">
                      <div className="flex justify-between text-[7px]">
                        <span className="text-slate-500">Entry</span>
                        <span className="font-mono text-slate-300">
                          ${data.strategyStatus.sellConditions.smart_trail.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-[7px]">
                        <span className="text-slate-500">Peak</span>
                        <div className="flex items-center gap-0.5">
                          <span className="font-mono text-slate-300">
                            ${data.strategyStatus.sellConditions.smart_trail.peak_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[7px] font-semibold px-0.5 bg-blue-500/20 text-blue-400">
                            +{((data.strategyStatus.sellConditions.smart_trail.peak_price / data.strategyStatus.sellConditions.smart_trail.entry_price - 1) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-[7px] text-slate-500">
                      {{'U':'Up','S':'Side','D':'Down'}[data.strategyStatus.sellConditions.smart_trail.regime] || data.strategyStatus.sellConditions.smart_trail.regime}
                    </span>
                    <span className="text-[7px] font-mono text-slate-400">
                      {data.strategyStatus.sellConditions.smart_trail.score}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className={`text-[8px] uppercase tracking-wide ${
                  data.strategyStatus.sellConditions.dead_cross.met ? 'text-red-400' : 'text-slate-600'
                }`}>
                  1h Dead Cross
                </span>
                <div className={`w-1 h-1 rounded-full ${
                  data.strategyStatus.sellConditions.dead_cross.met ? 'bg-red-500' : 'bg-slate-700'
                }`}></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-10 text-slate-600 text-[8px]">
              Waiting...
            </div>
          )}
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-2">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Performance</span>
          </div>

          {data.metrics.portfolioReturnWithCommission !== undefined && (
            <div className="mb-2 pb-2 border-b border-slate-800">
              <div className="text-[7px] text-slate-500 mb-0.5 uppercase tracking-wide">Net Profit</div>
              <div className={`text-lg font-mono font-bold ${
                data.metrics.portfolioReturnWithCommission >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {formatPercent(data.metrics.portfolioReturnWithCommission)}
              </div>
              {data.metrics.totalPnl !== undefined && (
                <div className={`text-[8px] font-mono ${
                  data.metrics.totalPnl >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'
                }`}>
                  {data.metrics.totalPnl >= 0 ? '+' : ''}{data.metrics.totalPnl.toFixed(2)} USDC
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5 mb-2 pb-2 border-b border-slate-800">
            <div className="flex items-baseline justify-between">
              <span className="text-[7px] text-slate-500 uppercase tracking-wide">Portfolio</span>
              <span className={`text-[8px] font-mono ${
                data.metrics.portfolioReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {formatPercent(data.metrics.portfolioReturn)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[7px] text-slate-500 uppercase tracking-wide">Market</span>
              <span className={`text-[8px] font-mono ${
                data.metrics.marketReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {formatPercent(data.metrics.marketReturn)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[7px] text-slate-500 uppercase tracking-wide">Avg Trade</span>
              <span className={`text-[8px] font-mono ${
                data.metrics.avgTradeReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {formatPercent(data.metrics.avgTradeReturn)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[7px] text-emerald-500 uppercase tracking-wide">Profit</span>
              <span className="text-sm font-semibold text-emerald-400">{data.metrics.takeProfitCount}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[7px] text-red-500 uppercase tracking-wide">Loss</span>
              <span className="text-sm font-semibold text-red-400">{data.metrics.stopLossCount}</span>
            </div>
            {data.metrics.totalTrades !== undefined && (
              <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
                <span className="text-[7px] text-slate-500 uppercase tracking-wide">Total</span>
                <span className="text-xs font-semibold text-slate-400">{data.metrics.totalTrades}</span>
              </div>
            )}
            <div className="pt-1 border-t border-slate-800">
              <div className="text-[7px] text-slate-500 mb-1 uppercase tracking-wide">Win Rate</div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 bg-slate-800 h-1 overflow-hidden">
                  <div
                    className="bg-blue-500 h-1 transition-all duration-500"
                    style={{ width: `${winRate}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono text-slate-400 min-w-[32px]">
                  {winRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
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
      <div className="bg-slate-900/50 border border-slate-800 p-2 mt-2">
        <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recent Trades</span>
          <span className="text-[8px] font-mono text-slate-500">7d</span>
        </div>

        <div className="space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent" style={{ maxHeight: '160px' }}>
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => (
              <div key={`${trade.timestamp}-${index}`}>
                {trade.type === 'buy' ? (
                  <div className="bg-blue-500/10 border border-blue-500/30 p-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-semibold text-blue-400 uppercase">BUY</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-mono text-slate-300">{formatCurrency(trade.price)}</span>
                        <span className="text-[7px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`${getExitReasonColor(trade.exitReason).bg} ${getExitReasonColor(trade.exitReason).border} border p-1`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5">
                        <span className={`text-[8px] font-semibold ${getExitReasonColor(trade.exitReason).text} uppercase`}>SELL</span>
                        {trade.exitReason && (
                          <span className={`text-[7px] px-1 font-semibold ${
                            trade.profit !== undefined && trade.profit >= 0
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`} title={trade.exitReason}>{getExitReasonLabel(trade.exitReason)}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-0.5">
                          <span className="text-[8px] font-mono text-slate-300">{formatCurrency(trade.price)}</span>
                          {trade.profit !== undefined && (
                            <span className={`text-[8px] font-mono font-semibold ${
                              trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <span className="text-[7px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                          {trade.pnl !== undefined && (
                            <span className={`text-[7px] font-mono font-semibold ${
                              trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
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
            <div className="flex items-center justify-center h-16 text-slate-600 text-[8px]">
              No trades
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
