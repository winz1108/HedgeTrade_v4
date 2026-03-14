import { KrakenDashboardData, V10StrategyStatus } from '../../types/dashboard';
import { DollarSign, Activity, Target, History } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/time';
import { useRef, useEffect } from 'react';

interface Props {
  data: KrakenDashboardData;
  position: 'left' | 'right' | 'trades';
}


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
  if (reason === 'HARD_SL') return 'Hard SL';
  if (reason === 'PP') return 'PP';
  if (reason.startsWith('PP_STOP')) return 'PP';
  if (reason === 'VANISH') return 'Vanish';
  if (reason === 'TIMEOUT') return 'Timeout';
  return reason;
};

const getExitReasonColor = (profit: number | undefined): { bg: string; text: string; border: string } => {
  if (profit === undefined || profit >= 0) {
    return { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-700' };
  } else {
    return { bg: 'bg-rose-900/30', text: 'text-rose-400', border: 'border-rose-700' };
  }
};

export function KrakenMetricsPanel({ data, position }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (position === 'left') {
    const leverage = 1;
    const hasPosition = data.position?.in_position;
    const positionSide = data.position?.position_side;
    const entryPrice = data.strategyA?.entry_price;
    const currentPnl = data.strategyA?.current_pnl;
    const ss = data.strategyStatus;
    const entryConditionsLong = data.strategyA?.entry_conditions_long;
    const entryConditionsShort = data.strategyA?.entry_conditions_short;

    let liquidationPrice: number | null = null;
    if (hasPosition && entryPrice) {
      if (positionSide === 'LONG') {
        liquidationPrice = entryPrice * (1 - 0.95 / leverage);
      } else if (positionSide === 'SHORT') {
        liquidationPrice = entryPrice * (1 + 0.95 / leverage);
      }
    }

    return (
      <div className="flex flex-col gap-1.5">
        <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-white">Status</h3>
            <Activity className="w-3 h-3 text-slate-300" />
          </div>

          <div className="space-y-1.5">
            <div className="bg-cyan-500/20 rounded-lg p-2 border border-cyan-500/50">
              <div className="text-[10px] text-cyan-300 font-medium mb-0.5">TOTAL ASSET</div>
              <div className="text-xl font-bold text-white mb-1">
                {formatCurrency(data.balance.portfolioValue)}
              </div>
              <div className="space-y-0.5 pt-1 border-t border-cyan-500/50">
                {data.balance.currencies && Object.entries(data.balance.currencies).length > 0 ? (
                  <>
                    {(() => {
                      const currencies = Object.entries(data.balance.currencies);
                      const primaryOrder = ['BTC', 'EUR', 'USD'];
                      const sorted = currencies.sort(([a], [b]) => {
                        const aIndex = primaryOrder.indexOf(a);
                        const bIndex = primaryOrder.indexOf(b);
                        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                        if (aIndex !== -1) return -1;
                        if (bIndex !== -1) return 1;
                        return a.localeCompare(b);
                      });

                      return sorted.map(([currency, info]) => {
                        let textColor = 'text-emerald-400'; // USD default

                        if (currency === 'BTC') {
                          textColor = 'text-yellow-400';
                        } else if (currency === 'EUR') {
                          textColor = 'text-blue-400';
                        }

                        return (
                          <div key={currency} className="flex justify-between items-center">
                            <span className="text-[9px] text-slate-300">{currency}</span>
                            <span className={`text-[11px] font-bold ${textColor}`}>
                              {formatCurrency(info.valueUsd)}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-300">Available</span>
                    <span className="text-[11px] font-bold text-emerald-400">
                      {formatCurrency(data.balance.available)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-300">Leverage</span>
                  <span className="text-[11px] font-bold text-cyan-400">
                    {leverage}x
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-1.5">
              <div className="text-[10px] text-white mb-1 font-medium">POSITION</div>
              {hasPosition && entryPrice ? (
                <div className="space-y-0.5 bg-cyan-500/20 rounded-lg p-1.5 border border-cyan-500/50">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-cyan-300">Side</span>
                    <span className={`text-[11px] font-bold ${
                      positionSide === 'LONG' ? 'text-cyan-400' : 'text-orange-400'
                    }`}>
                      {positionSide}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-cyan-300">Entry</span>
                    <span className="text-[11px] font-bold text-white">{formatCurrency(entryPrice)}</span>
                  </div>
                  {liquidationPrice && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-400">Liquidation</span>
                      <span className="text-[11px] font-bold text-slate-300">{formatCurrency(liquidationPrice)}</span>
                    </div>
                  )}
                  {currentPnl !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-cyan-300">P&L</span>
                      <span className={`text-[11px] font-bold ${
                        currentPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {currentPnl >= 0 ? '+' : ''}{currentPnl.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {data.strategyA?.entry_time && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-cyan-300">Duration</span>
                      <span className="text-[11px] font-bold text-cyan-400">
                        {formatHoldingDuration(data.strategyA.entry_time, data.currentTime)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-[10px] font-bold inline-block border border-slate-600">
                  NO POSITION
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-slate-200 tracking-wide uppercase">Entry Conditions</h3>
          </div>

          {(entryConditionsLong || entryConditionsShort) ? (
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-md bg-slate-700/40 p-1.5">
                <div className="text-[8px] text-cyan-400 font-semibold tracking-wide mb-1">LONG</div>
                {entryConditionsLong ? (
                  Object.entries(entryConditionsLong).map(([key, met]) => {
                    const isActive = met === true;
                    return (
                      <div key={`l-${key}`} className={`flex items-center gap-1.5 py-[3px] px-1 rounded transition-all ${isActive ? 'bg-cyan-500/20 border border-cyan-500/40' : 'bg-slate-700/30 border border-transparent'}`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${isActive ? 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.9)]' : 'bg-slate-600'}`} />
                        <span className={`text-[8px] font-medium ${isActive ? 'text-cyan-300' : 'text-slate-500'}`}>{key}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[8px] text-slate-500 py-1">-</div>
                )}
              </div>
              <div className="rounded-md bg-slate-700/40 p-1.5">
                <div className="text-[8px] text-orange-400 font-semibold tracking-wide mb-1">SHORT</div>
                {entryConditionsShort ? (
                  Object.entries(entryConditionsShort).map(([key, met]) => {
                    const isActive = met === true;
                    return (
                      <div key={`s-${key}`} className={`flex items-center gap-1.5 py-[3px] px-1 rounded transition-all ${isActive ? 'bg-orange-500/20 border border-orange-500/40' : 'bg-slate-700/30 border border-transparent'}`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${isActive ? 'bg-orange-400 shadow-[0_0_5px_rgba(251,146,60,0.9)]' : 'bg-slate-600'}`} />
                        <span className={`text-[8px] font-medium ${isActive ? 'text-orange-300' : 'text-slate-500'}`}>{key}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[8px] text-slate-500 py-1">-</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-8 text-slate-500 text-[10px]">
              Waiting...
            </div>
          )}
        </div>

        <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
          <div className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold mb-1.5">Exit Conditions</div>
          {(() => {
            const sc = data.sellConditions;
            const sa = data.strategyA;

            const hardSlThreshold = sc?.hard_sl?.threshold ?? sa?.hard_sl;
            const hardSlActive = sc?.hard_sl?.active ?? false;
            const ppActive = sc?.pp?.active ?? sa?.pp_active ?? sa?.pp_activated ?? false;
            const ppMfe = sc?.pp?.mfe ?? sa?.mfe;
            const ppStopLevel = sc?.pp?.stop_level ?? sa?.pp_stop;
            const vanishCurrent = typeof sc?.vanish?.current === 'number' ? sc.vanish.current : null;
            const vanishThreshold = sc?.vanish?.threshold ?? sa?.vanish_threshold;
            const vanishMet = sc?.vanish?.met ?? false;
            const timeoutElapsed = sc?.timeout?.elapsed;
            const timeoutRemaining = sc?.timeout?.remaining;
            const timeoutMet = sc?.timeout?.met ?? false;
            const floorPrice = sa?.floor_price ?? sa?.exit_prices?.floor_price;
            const slPrice = sa?.sl_price ?? sa?.exit_prices?.sl_price;
            const currentSlPct = sa?.current_sl_pct;

            const hasAnyData = floorPrice != null || slPrice != null || vanishCurrent !== null || timeoutElapsed != null || hardSlThreshold != null;

            if (!hasPosition && !hasAnyData) {
              return (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between bg-slate-700/30 border border-slate-600/50 rounded px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                      <span className="text-[9px] text-slate-500 font-medium">Stop Loss</span>
                    </div>
                    <span className="text-[9px] text-slate-600 tabular-nums">
                      {hardSlThreshold != null ? `${hardSlThreshold.toFixed(1)}%` : '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-700/30 border border-slate-600/50 rounded px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                      <span className="text-[9px] text-slate-500 font-medium">Peak Protection</span>
                    </div>
                    <span className="text-[9px] text-slate-600">--</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-700/30 border border-slate-600/50 rounded px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                      <span className="text-[9px] text-slate-500 font-medium">Vanish</span>
                    </div>
                    <span className="text-[9px] text-slate-600">
                      {vanishThreshold != null ? `/ ${vanishThreshold}` : '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-700/30 border border-slate-600/50 rounded px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                      <span className="text-[9px] text-slate-500 font-medium">Timeout</span>
                    </div>
                    <span className="text-[9px] text-slate-600">
                      {sa?.timeout_min != null ? `${sa.timeout_min}m limit` : '--'}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div className="flex flex-col gap-1">
                {floorPrice != null && (
                  <div className="flex items-center justify-between bg-slate-700/30 border border-slate-600 rounded px-2 py-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="text-[9px] text-slate-300 font-medium">Floor</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 tabular-nums">
                      ${floorPrice.toFixed(2)}
                    </span>
                  </div>
                )}

                {(slPrice != null || hardSlThreshold != null) && (
                  <div className={`flex items-center justify-between rounded px-2 py-1 border ${
                    hardSlActive
                      ? 'bg-rose-900/30 border-rose-600/60'
                      : 'bg-slate-700/30 border-slate-600'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hardSlActive ? 'bg-rose-400 shadow-[0_0_4px_rgba(248,113,113,0.9)]' : 'bg-rose-600'}`} />
                      <span className={`text-[9px] font-medium ${hardSlActive ? 'text-rose-300' : 'text-slate-300'}`}>
                        Stop Loss{currentSlPct != null ? ` (${currentSlPct.toFixed(1)}%)` : hardSlThreshold != null ? ` (${hardSlThreshold.toFixed(1)}%)` : ''}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold tabular-nums ${hardSlActive ? 'text-rose-300' : 'text-rose-500'}`}>
                      {slPrice != null ? `$${slPrice.toFixed(2)}` : '--'}
                    </span>
                  </div>
                )}

                <div className={`flex items-center justify-between rounded px-2 py-1 border ${
                  ppActive
                    ? 'bg-amber-900/30 border-amber-600/60'
                    : 'bg-slate-700/30 border-slate-600'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ppActive ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.9)]' : 'bg-slate-600'}`} />
                    <span className={`text-[9px] font-medium ${ppActive ? 'text-amber-300' : 'text-slate-500'}`}>
                      Peak Protection{ppMfe != null ? ` (MFE ${ppMfe.toFixed(2)}%)` : ''}
                    </span>
                  </div>
                  {ppStopLevel != null && ppActive ? (
                    <span className="text-[10px] font-bold text-amber-300 tabular-nums">
                      ${ppStopLevel.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-500">Waiting</span>
                  )}
                </div>

                <div className={`flex items-center justify-between rounded px-2 py-1 border ${
                  vanishMet
                    ? 'bg-rose-900/30 border-rose-600/60'
                    : 'bg-slate-700/30 border-slate-600'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${vanishMet ? 'bg-rose-400' : 'bg-slate-600'}`} />
                    <span className={`text-[9px] font-medium ${vanishMet ? 'text-rose-300' : 'text-slate-500'}`}>Vanish</span>
                  </div>
                  <span className={`text-[10px] font-bold tabular-nums ${vanishMet ? 'text-rose-300' : 'text-slate-400'}`}>
                    {vanishCurrent !== null
                      ? `${vanishCurrent.toFixed(2)}${vanishThreshold != null ? ` / ${vanishThreshold.toFixed(2)}` : ''}`
                      : vanishThreshold != null ? `/ ${vanishThreshold}` : '--'}
                  </span>
                </div>

                <div className={`flex items-center justify-between rounded px-2 py-1 border ${
                  timeoutMet
                    ? 'bg-rose-900/30 border-rose-600/60'
                    : 'bg-slate-700/30 border-slate-600'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${timeoutMet ? 'bg-rose-400' : 'bg-slate-600'}`} />
                    <span className={`text-[9px] font-medium ${timeoutMet ? 'text-rose-300' : 'text-slate-500'}`}>Timeout</span>
                  </div>
                  <span className={`text-[10px] font-bold tabular-nums ${timeoutMet ? 'text-rose-300' : 'text-slate-400'}`}>
                    {timeoutElapsed != null
                      ? `${timeoutElapsed.toFixed(0)}m${timeoutRemaining != null && !timeoutMet ? ` / ${timeoutRemaining.toFixed(0)}m left` : ''}`
                      : sa?.timeout_min != null ? `${sa.timeout_min}m limit` : '--'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
          <div className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold mb-1.5">Extremes</div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex justify-between items-center bg-slate-700/40 rounded-md px-2 py-1">
              <span className="text-[9px] text-slate-400">MFE</span>
              <span className="text-[10px] font-bold text-emerald-400 tabular-nums">
                {ss?.mfe != null ? `+${ss.mfe.toFixed(2)}%` : data.strategyA?.mfe != null ? `+${data.strategyA.mfe.toFixed(2)}%` : hasPosition ? '-' : '--'}
              </span>
            </div>
            <div className="flex justify-between items-center bg-slate-700/40 rounded-md px-2 py-1">
              <span className="text-[9px] text-slate-400">MAE</span>
              <span className="text-[10px] font-bold text-rose-400 tabular-nums">
                {ss?.mae != null ? `${ss.mae.toFixed(2)}%` : data.strategyA?.mae != null ? `${data.strategyA.mae.toFixed(2)}%` : hasPosition ? '-' : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (position === 'right') {
    const formatPercent = (value: number | undefined) => {
      if (value === undefined || value === null) return '0.00%';
      if (typeof value !== 'number' || isNaN(value)) return '0.00%';
      return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    return (
      <div className="flex flex-col gap-1.5">
        <div className="bg-slate-800/95 border border-cyan-500/50 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-white">Performance</h3>
            <DollarSign className="w-3 h-3 text-cyan-400" />
          </div>

          <div className="space-y-1.5">
            {data.metrics?.portfolioReturnWithCommission !== undefined && (
              <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 p-2 rounded-lg border border-emerald-700/50">
                <div className="text-[10px] text-emerald-300 font-bold mb-0.5">NET PROFIT</div>
                <div
                  className={`text-2xl font-black ${
                    data.metrics.portfolioReturnWithCommission >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatPercent(data.metrics.portfolioReturnWithCommission)}
                </div>
                {data.metrics.totalPnl !== undefined && (
                  <div className={`text-[11px] font-bold mt-0.5 ${
                    data.metrics.totalPnl >= 0 ? 'text-emerald-300' : 'text-rose-400'
                  }`}>
                    {data.metrics.totalPnl >= 0 ? '+' : ''}{data.metrics.totalPnl.toFixed(2)} USD
                  </div>
                )}
              </div>
            )}

            <div className="space-y-0.5">
              <div className="flex justify-between items-center bg-slate-700/30 p-1 rounded border border-slate-600">
                <span className="text-[9px] text-white font-medium">Portfolio Return</span>
                <span className={`text-[11px] font-bold ${
                  (data.metrics?.portfolioReturn ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatPercent(data.metrics?.portfolioReturn)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-700/30 p-1 rounded border border-slate-600">
                <span className="text-[9px] text-white font-medium">Market Change</span>
                <span className={`text-[11px] font-bold ${
                  (data.metrics?.marketReturn ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatPercent(data.metrics?.marketReturn)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-700/30 p-1 rounded border border-slate-600">
                <span className="text-[9px] text-white font-medium">Avg Trade Return</span>
                <span className={`text-[11px] font-bold ${
                  (data.metrics?.avgTradeReturn ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatPercent(data.metrics?.avgTradeReturn)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/95 border border-slate-600 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-white">Statistics</h3>
            <Target className="w-3 h-3 text-slate-300" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center bg-emerald-900/30 p-1.5 rounded border border-emerald-700/50">
              <span className="text-[10px] text-emerald-300 font-bold">Profit (TP)</span>
              <span className="text-sm font-bold text-emerald-400">{data.metrics?.takeProfitCount ?? 0}</span>
            </div>
            <div className="flex justify-between items-center bg-rose-900/30 p-1.5 rounded border border-rose-700/50">
              <span className="text-[10px] text-rose-300 font-bold">Loss (SL)</span>
              <span className="text-sm font-bold text-rose-400">{data.metrics?.stopLossCount ?? 0}</span>
            </div>
            {data.metrics?.totalTrades !== undefined && (
              <div className="flex justify-between items-center bg-slate-700/30 p-1 rounded border border-slate-600">
                <span className="text-[10px] text-slate-300 font-bold">Total</span>
                <span className="text-xs font-bold text-slate-300">{data.metrics.totalTrades}</span>
              </div>
            )}
            <div className="border-t border-slate-600 pt-1 mt-1">
              <div className="text-[10px] text-white mb-1 font-bold">WIN RATE</div>
              <div className="flex items-center gap-2">
                {(() => {
                  const tp = data.metrics?.takeProfitCount ?? 0;
                  const sl = data.metrics?.stopLossCount ?? 0;
                  const winRate = data.metrics?.winRate ?? (tp + sl > 0 ? (tp / (tp + sl)) * 100 : 0);
                  return (
                    <>
                      <div className="flex-1 bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-cyan-500 h-2.5 transition-all duration-500"
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-cyan-400 min-w-[40px]">
                        {winRate.toFixed(1)}%
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (position === 'trades') {
    const oneWeekAgo = data.currentTime - (7 * 24 * 60 * 60 * 1000);
    const recentTrades = [...data.recentTrades]
      .filter(trade => trade.timestamp >= oneWeekAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 40);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef<number>(0);

    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const handleScroll = () => {
        scrollPositionRef.current = container.scrollTop;
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
      const container = scrollContainerRef.current;
      if (container && scrollPositionRef.current > 0) {
        container.scrollTop = scrollPositionRef.current;
      }
    });

    return (
      <div className="bg-slate-800/95 border border-slate-600 rounded-lg shadow-sm p-2 flex flex-col" style={{ height: '100%' }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[11px] font-bold text-white">Recent Trades</h3>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-300">7d</span>
            <History className="w-2.5 h-2.5 text-slate-300" />
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="space-y-0.5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
          style={{ minHeight: 0 }}
        >
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => {
              const isLong = (trade as any).side !== 'SHORT';
              const sideColor = isLong ? 'cyan' : 'orange';

              return (
                <div key={`${trade.timestamp}-${index}`}>
                  {trade.type === 'buy' ? (
                    <div className={`${isLong ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-orange-900/20 border-orange-600/50'} border rounded p-1`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold ${isLong ? 'text-cyan-400' : 'text-orange-400'}`}>
                          {isLong ? 'LONG' : 'SHORT'}
                        </span>
                        <div className="flex flex-col items-end">
                          <span className={`text-[10px] font-bold text-white`}>{formatCurrency(trade.price)}</span>
                          <span className={`text-[8px] text-slate-300`}>{formatLocalDateTime(trade.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`${getExitReasonColor(trade.profit).bg} ${getExitReasonColor(trade.profit).border} border rounded p-1`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-bold ${getExitReasonColor(trade.profit).text}`}>EXIT</span>
                          {trade.exitReason && (
                            <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${
                              trade.profit !== undefined && trade.profit >= 0
                                ? 'bg-emerald-500 text-white'
                                : 'bg-rose-500 text-white'
                            }`} title={trade.exitReason}>{getExitReasonLabel(trade.exitReason)}</span>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-200">{formatCurrency(trade.price)}</span>
                            {trade.profit !== undefined && (
                              <span className={`text-[9px] font-bold ${
                                trade.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                                {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] text-slate-400">{formatLocalDateTime(trade.timestamp)}</span>
                            {trade.pnl !== undefined && (
                              <span className={`text-[8px] font-bold ${
                                trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
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
              );
            })
          ) : (
            <div className="flex items-center justify-center h-20 text-slate-400 text-[10px]">
              No trades
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
