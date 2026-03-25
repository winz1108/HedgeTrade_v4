import { KrakenDashboardData } from '../../types/dashboard';
import { DollarSign, Activity, Target, History, ShieldAlert, Clock } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/time';
import { useRef, useEffect } from 'react';

interface Props {
  data: KrakenDashboardData;
  position: 'left' | 'right' | 'trades';
}

interface ExitConditionsPanelProps {
  exitConds?: any;
  inPosition: boolean;
  currentPrice: number;
  entryPrice: number;
  positionSide?: 'LONG' | 'SHORT' | null;
}

function ExitConditionsPanel({ exitConds, inPosition, currentPrice, entryPrice, positionSide }: ExitConditionsPanelProps) {
  if (!inPosition || !exitConds) return null;

  const isShort = positionSide === 'SHORT';
  const barFill = isShort ? 'bg-orange-400' : 'bg-cyan-400';
  const sideText = isShort ? 'text-orange-300' : 'text-cyan-300';

  const sl = exitConds.SL || {};
  const trail = exitConds.TRAIL || {};
  const time = exitConds.TIME || {};

  const slPrice = sl.price > 0 ? sl.price : null;
  const triggerPrice = trail.trigger_price > 0 ? trail.trigger_price : null;
  const trailingActive = trail.trailing_active === true;
  const peakPrice = trail.peak_price > 0 ? trail.peak_price : null;
  const trailExitPrice = trail.trail_exit_price > 0 ? trail.trail_exit_price : null;

  const barsHeld = time.bars_held ?? 0;
  const maxBars = time.max_bars ?? 24;
  const hoursLeft = time.hours_left ?? (maxBars - barsHeld);
  const timePct = maxBars > 0 ? Math.min(100, (barsHeld / maxBars) * 100) : 0;

  const calcProgress = (left: number, right: number, current: number) => {
    if (right === left) return 50;
    return Math.max(0, Math.min(100, ((current - left) / (right - left)) * 100));
  };

  const slLossPct = slPrice
    ? (isShort
      ? Math.max(0, Math.min(100, ((currentPrice - entryPrice) / (slPrice - entryPrice)) * 100))
      : Math.max(0, Math.min(100, ((entryPrice - currentPrice) / (entryPrice - slPrice)) * 100)))
    : 0;

  let trailLeftLabel = '';
  let trailRightLabel = '';
  let trailProgress = 0;
  let trailPhaseLabel = '';

  if (trailingActive && peakPrice && trailExitPrice) {
    trailLeftLabel = `$${trailExitPrice.toFixed(0)}`;
    trailRightLabel = `$${peakPrice.toFixed(0)}`;
    trailProgress = calcProgress(trailExitPrice, peakPrice, currentPrice);
    trailPhaseLabel = 'Phase 2';
  } else if (triggerPrice) {
    trailLeftLabel = `$${entryPrice.toFixed(0)}`;
    trailRightLabel = `$${triggerPrice.toFixed(0)}`;
    const prog = isShort
      ? calcProgress(triggerPrice, entryPrice, currentPrice)
      : calcProgress(entryPrice, triggerPrice, currentPrice);
    trailProgress = Math.max(0, prog);
    trailPhaseLabel = 'Phase 1';
  }

  return (
    <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] font-bold text-slate-200 tracking-wide uppercase">Exit</div>
        <ShieldAlert className="w-3 h-3 text-slate-500" />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className={`rounded-md border p-1.5 transition-all ${
          trailingActive ? (isShort ? 'bg-orange-900/30 border-orange-500/50' : 'bg-cyan-900/30 border-cyan-500/50') : 'bg-slate-700/20 border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                trailingActive
                  ? (isShort ? 'bg-orange-400 shadow-[0_0_4px_rgba(251,146,60,0.8)]' : 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]')
                  : 'bg-slate-600'
              }`} />
              <span className={`text-[10px] font-bold ${trailingActive ? sideText : 'text-slate-300'}`}>TRAIL</span>
            </div>
            <span className={`text-[8px] font-bold ${trailingActive ? sideText : 'text-slate-500'}`}>{trailPhaseLabel}</span>
          </div>
          {(triggerPrice || trailingActive) && (
            <div className="flex items-center gap-1">
              <span className="text-[8px] tabular-nums text-slate-500 w-[42px] flex-shrink-0">{trailLeftLabel}</span>
              <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${barFill}`}
                  style={{ width: `${trailProgress}%` }} />
              </div>
              <span className="text-[8px] tabular-nums text-slate-500 w-[42px] text-right flex-shrink-0">{trailRightLabel}</span>
            </div>
          )}
        </div>

        <div className="rounded-md border p-1.5 bg-slate-700/20 border-slate-700/50">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${slPrice ? 'bg-rose-400 shadow-[0_0_4px_rgba(248,113,113,0.8)]' : 'bg-slate-600'}`} />
              <span className="text-[10px] font-bold text-slate-300">SL</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] tabular-nums text-slate-500 w-[42px] flex-shrink-0">{slPrice ? `$${slPrice.toFixed(0)}` : '--'}</span>
            <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden relative">
              <div className="absolute right-0 top-0 h-1.5 rounded-full transition-all duration-300 bg-rose-500"
                style={{ width: `${slLossPct}%` }} />
            </div>
            <span className="text-[8px] tabular-nums text-slate-500 w-[42px] text-right flex-shrink-0">${entryPrice.toFixed(0)}</span>
          </div>
        </div>

        <div className="rounded-md border p-1.5 bg-slate-700/20 border-slate-700/50">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Clock className={`w-3 h-3 ${timePct >= 80 ? sideText : 'text-slate-600'}`} />
              <span className={`text-[10px] font-bold ${timePct >= 80 ? sideText : 'text-slate-300'}`}>TIME</span>
            </div>
            <span className={`text-[9px] font-bold tabular-nums ${timePct >= 80 ? sideText : 'text-slate-500'}`}>
              {hoursLeft > 0 ? `${hoursLeft}h left` : 'Expired'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] tabular-nums text-slate-500 w-[20px] flex-shrink-0">0h</span>
            <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${barFill}`}
                style={{ width: `${timePct}%` }} />
            </div>
            <span className="text-[8px] tabular-nums text-slate-500 w-[24px] text-right flex-shrink-0">{maxBars}h</span>
          </div>
        </div>
      </div>
    </div>
  );
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
  if (reason === 'EXIT_SW_TRAIL') return 'TRAIL';
  if (reason === 'EXIT_R_TRAIL') return 'RTRAIL';
  if (reason === 'EXIT_R_CUT') return 'RCUT';
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
                        let textColor = 'text-emerald-400';
                        if (currency === 'BTC') textColor = 'text-yellow-400';
                        else if (currency === 'EUR') textColor = 'text-blue-400';

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

        {(() => {
          const v32 = ss?.v32;
          const env = v32?.env_status;
          const patProx = v32?.pattern_proximity;
          const htfAlign = v32?.htf_alignment ?? 0;

          const htfDist = env?.htf_align?.distance_pct ?? null;
          const htfLabel = htfAlign === 1 ? 'LONG' : htfAlign === -1 ? 'SHORT' : 'FLAT';
          const htfColor = htfAlign === 1 ? 'text-cyan-400' : htfAlign === -1 ? 'text-orange-400' : 'text-slate-500';
          const htfBg = htfAlign === 1 ? 'bg-cyan-900/30 border-cyan-500/40' : htfAlign === -1 ? 'bg-orange-900/30 border-orange-500/40' : 'bg-slate-700/30 border-slate-700/50';
          const htfDot = htfAlign === 1 ? 'bg-cyan-400' : htfAlign === -1 ? 'bg-orange-400' : 'bg-slate-600';

          const PAT_NAMES: Record<string, string> = { '382': '38.2%', ENG: 'Engulf', REV: 'Reversal', DBL: 'Dbl B/T', FLAG: 'Flag', RSI_DIV: 'RSI Div' };
          const PAT_KEYS = ['382', 'ENG', 'REV', 'DBL', 'FLAG', 'RSI_DIV'] as const;

          return (
            <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-1.5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10px] font-bold text-slate-200 tracking-wide uppercase">Entry</h3>
                <div className="flex items-center gap-1.5">
                  {v32?.rsi != null && (
                    <span className={`text-[8px] font-bold tabular-nums ${v32.rsi > 70 ? 'text-orange-400' : v32.rsi < 30 ? 'text-cyan-400' : 'text-slate-400'}`}>
                      RSI {v32.rsi.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>

              <div className={`rounded border p-1.5 mb-1 ${htfBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${htfDot}`} />
                    <span className="text-[8px] font-bold text-slate-400">HTF 4h EMA</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {htfDist != null && (
                      <span className={`text-[8px] tabular-nums ${htfColor}`}>
                        {htfDist > 0 ? '+' : ''}{htfDist.toFixed(2)}%
                      </span>
                    )}
                    <span className={`text-[9px] font-black ${htfColor}`}>{htfLabel}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                {PAT_KEYS.map(pk => {
                  const info = patProx?.[pk];
                  const prox = info?.proximity ?? 0;
                  const ready = info?.ready ?? false;
                  const detail = info?.detail;
                  const pct = Math.min(100, prox * 100);
                  const barColor = htfAlign >= 0 ? 'bg-cyan-400' : 'bg-orange-400';
                  const textColor = ready
                    ? (htfAlign >= 0 ? 'text-cyan-300' : 'text-orange-300')
                    : 'text-slate-500';
                  return (
                    <div key={pk} className="flex items-center gap-1" title={detail || undefined}>
                      <span className={`text-[8px] font-bold w-[34px] flex-shrink-0 ${textColor}`}>{PAT_NAMES[pk] || pk}</span>
                      <div className="flex-1 bg-slate-700 rounded-full h-1 overflow-hidden">
                        <div className={`h-1 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[7px] font-bold tabular-nums w-[18px] text-right flex-shrink-0 ${textColor}`}>{(prox * 100).toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <ExitConditionsPanel
          exitConds={(data.strategyA as any)?.exit_conditions}
          inPosition={!!hasPosition}
          currentPrice={data.currentPrice}
          entryPrice={entryPrice ?? 0}
          positionSide={data.position?.position_side}
        />
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
        <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-white">Performance</h3>
            <DollarSign className="w-3 h-3 text-slate-400" />
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

        <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
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
            <div className="border-t border-slate-700 pt-1 mt-1">
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
      <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2 flex flex-col" style={{ height: '100%' }}>
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

              return (
                <div key={`${trade.timestamp}-${index}`}>
                  {trade.type === 'buy' ? (
                    <div className={`${isLong ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-orange-900/20 border-orange-600/50'} border rounded p-1`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold ${isLong ? 'text-cyan-400' : 'text-orange-400'}`}>
                          {isLong ? 'LONG' : 'SHORT'}
                        </span>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-white">{formatCurrency(trade.price)}</span>
                          <span className="text-[8px] text-slate-300">{formatLocalDateTime(trade.timestamp)}</span>
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
