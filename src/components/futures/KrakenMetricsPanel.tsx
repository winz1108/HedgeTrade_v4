import { KrakenDashboardData, ExitConditions, V32Data } from '../../types/dashboard';
import { DollarSign, Activity, Target, History, ShieldAlert, Clock } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/time';
import { useRef, useEffect } from 'react';

interface Props {
  data: KrakenDashboardData;
  position: 'left' | 'right' | 'trades';
}

interface ExitConditionsPanelProps {
  exitConditions?: ExitConditions;
  exitPrices?: { slPrice?: number; trailPrice?: number; [key: string]: any };
  inPosition: boolean;
  mfePct?: number;
  currentPrice?: number;
  positionSide?: 'LONG' | 'SHORT' | null;
  v32?: V32Data;
}

function ExitConditionsPanel({ exitConditions, exitPrices, inPosition, mfePct, currentPrice, positionSide, v32 }: ExitConditionsPanelProps) {
  if (!inPosition) return null;

  const isShort = positionSide === 'SHORT';
  const sideColor = isShort ? 'text-orange-300' : 'text-cyan-300';
  const sideBg = isShort ? 'bg-orange-900/30 border-orange-500/50' : 'bg-cyan-900/30 border-cyan-500/50';

  const slPrice = v32?.sl_price ?? exitPrices?.slPrice ?? exitConditions?.SL?.slPrice;
  const trailPrice = v32?.trail_price ?? exitPrices?.trailPrice;
  const peakPnl = v32?.peak_pnl ?? exitConditions?.V32TRAIL?.peakPnl ?? mfePct ?? 0;
  const barsHeld = v32?.bars_held ?? exitConditions?.TIME?.barsHeld ?? 0;
  const maxBars = v32?.max_bars ?? exitConditions?.TIME?.maxBars ?? 24;
  const timeProgress = maxBars > 0 ? Math.min(100, (barsHeld / maxBars) * 100) : 0;

  const slArmed = exitConditions?.SL?.armed ?? !!slPrice;
  const trailArmed = exitConditions?.V32TRAIL?.armed ?? (peakPnl > 0);

  const slDistance = slPrice && currentPrice
    ? (isShort ? ((slPrice - currentPrice) / currentPrice * 100) : ((currentPrice - slPrice) / currentPrice * 100))
    : 0;

  return (
    <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] font-bold text-slate-200 tracking-wide uppercase">Exit Conditions</div>
        <ShieldAlert className="w-3 h-3 text-slate-500" />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className={`rounded-md border p-1.5 transition-all ${
          trailArmed ? sideBg : 'bg-slate-700/20 border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                trailArmed
                  ? (isShort ? 'bg-orange-400 shadow-[0_0_5px_rgba(251,146,60,0.9)]' : 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.9)]')
                  : 'bg-slate-600'
              }`} />
              <span className={`text-[10px] font-bold ${trailArmed ? sideColor : 'text-slate-400'}`}>TRAIL</span>
              <span className="text-[8px] text-slate-500">ATR Trailing</span>
            </div>
            {trailPrice != null && (
              <span className={`text-[10px] font-bold tabular-nums ${trailArmed ? sideColor : 'text-slate-500'}`}>
                ${trailPrice.toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] w-[50px] flex-shrink-0 ${trailArmed ? sideColor : 'text-slate-600'}`}>Peak</span>
            <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${isShort ? 'bg-orange-400' : 'bg-cyan-400'}`}
                style={{ width: `${Math.min(100, Math.max(0, peakPnl * 20))}%` }} />
            </div>
            <span className={`text-[9px] tabular-nums w-[40px] text-right flex-shrink-0 ${trailArmed ? sideColor : 'text-slate-500'}`}>
              +{peakPnl.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className={`rounded-md border p-1.5 transition-all ${
          slArmed ? 'bg-rose-900/30 border-rose-600/50' : 'bg-slate-700/20 border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                slArmed ? 'bg-rose-400 shadow-[0_0_5px_rgba(248,113,113,0.9)]' : 'bg-slate-600'
              }`} />
              <span className={`text-[10px] font-bold ${slArmed ? 'text-rose-300' : 'text-slate-400'}`}>SL</span>
              <span className="text-[8px] text-slate-500">0.5x ATR</span>
            </div>
            {slPrice != null && (
              <span className={`text-[10px] font-bold tabular-nums ${slArmed ? 'text-rose-300' : 'text-slate-500'}`}>
                ${slPrice.toFixed(1)}
              </span>
            )}
          </div>
          {slDistance !== 0 && (
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] w-[50px] flex-shrink-0 ${slArmed ? 'text-rose-300' : 'text-slate-600'}`}>Dist.</span>
              <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 rounded-full transition-all duration-300 bg-rose-400"
                  style={{ width: `${Math.min(100, Math.max(5, 100 - Math.abs(slDistance) * 20))}%` }} />
              </div>
              <span className={`text-[9px] tabular-nums w-[40px] text-right flex-shrink-0 ${slArmed ? 'text-rose-400' : 'text-slate-500'}`}>
                {slDistance.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        <div className={`rounded-md border p-1.5 transition-all ${
          timeProgress >= 80 ? 'bg-amber-900/30 border-amber-600/50' : 'bg-slate-700/20 border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5">
              <Clock className={`w-3 h-3 ${timeProgress >= 80 ? 'text-amber-400' : 'text-slate-600'}`} />
              <span className={`text-[10px] font-bold ${timeProgress >= 80 ? 'text-amber-300' : 'text-slate-400'}`}>TIMEOUT</span>
              <span className="text-[8px] text-slate-500">{maxBars}h max</span>
            </div>
            <span className={`text-[10px] font-bold tabular-nums ${timeProgress >= 80 ? 'text-amber-300' : 'text-slate-500'}`}>
              {maxBars - barsHeld > 0 ? `${maxBars - barsHeld}h left` : 'Expired'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] w-[50px] flex-shrink-0 tabular-nums ${timeProgress >= 80 ? 'text-amber-400' : 'text-slate-600'}`}>{barsHeld}h</span>
            <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${
                timeProgress >= 90 ? 'bg-rose-400' : timeProgress >= 80 ? 'bg-amber-400' : 'bg-slate-500'
              }`} style={{ width: `${timeProgress}%` }} />
            </div>
            <span className={`text-[9px] tabular-nums w-[30px] text-right flex-shrink-0 ${
              timeProgress >= 80 ? 'text-amber-400' : 'text-slate-500'
            }`}>
              {timeProgress.toFixed(0)}%
            </span>
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

        {(() => {
          const v32 = ss?.v32;
          const patProx = v32?.pattern_proximity;
          const ema200Dir = v32?.ema200_direction ?? 0;
          const htfAlign = v32?.htf_alignment ?? 0;
          const inVz = v32?.in_value_zone ?? false;
          const vzComputed = inVz || (v32?.ema20 != null && v32?.ema50 != null && v32?.atr != null &&
            data.currentPrice >= Math.min(v32.ema20!, v32.ema50!) - 2 * v32.atr! &&
            data.currentPrice <= Math.max(v32.ema20!, v32.ema50!) + 2 * v32.atr!);

          const longConds = entryConditionsLong || {};
          const shortConds = entryConditionsShort || {};
          const longMet = Object.values(longConds).filter(Boolean).length;
          const shortMet = Object.values(shortConds).filter(Boolean).length;
          const longTotal = Math.max(Object.keys(longConds).length, 3);
          const shortTotal = Math.max(Object.keys(shortConds).length, 3);

          const PAT_NAMES: Record<string, string> = { '382': '38.2% Retrace', ENG: 'Engulfing', REV: 'Reversal', DBL: 'Double B/T', FLAG: 'Flag', RSI_DIV: 'RSI Diverg.' };
          const PAT_KEYS = ['382', 'ENG', 'REV', 'DBL', 'FLAG', 'RSI_DIV'] as const;

          const envRows = [
            { key: 'ema200', label: 'Trend', met: ema200Dir !== 0, dir: ema200Dir, status: ema200Dir === 1 ? 'Uptrend' : ema200Dir === -1 ? 'Downtrend' : 'Flat' },
            { key: 'htf', label: '4h Align', met: htfAlign !== 0, dir: htfAlign, status: htfAlign === 1 ? 'Bullish' : htfAlign === -1 ? 'Bearish' : 'Neutral' },
            { key: 'vz', label: 'Value Zone', met: vzComputed, dir: 0, status: vzComputed ? 'Inside' : 'Outside' },
          ];

          const getStyle = (met: boolean, dir: number) => {
            if (!met) return { bg: 'bg-slate-700/15 border-slate-700/30', text: 'text-slate-500', dot: 'bg-slate-600' };
            if (dir === 1) return { bg: 'bg-cyan-900/30 border-cyan-500/40', text: 'text-cyan-300', dot: 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]' };
            if (dir === -1) return { bg: 'bg-orange-900/30 border-orange-500/40', text: 'text-orange-300', dot: 'bg-orange-400 shadow-[0_0_5px_rgba(251,146,60,0.8)]' };
            return { bg: 'bg-emerald-900/30 border-emerald-500/40', text: 'text-emerald-300', dot: 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]' };
          };

          return (
            <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-[11px] font-bold text-slate-200 tracking-wide uppercase">Entry</h3>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${longMet >= longTotal ? 'bg-cyan-900/40 text-cyan-300 border-cyan-500/50' : 'bg-slate-700/30 text-slate-500 border-slate-600'}`}>
                    LONG {longMet}/{longTotal}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${shortMet >= shortTotal ? 'bg-orange-900/40 text-orange-300 border-orange-500/50' : 'bg-slate-700/30 text-slate-500 border-slate-600'}`}>
                    SHORT {shortMet}/{shortTotal}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 mb-1.5">
                {envRows.map(c => {
                  const st = getStyle(c.met, c.dir);
                  return (
                    <div key={c.key} className={`rounded border px-1.5 py-1 transition-all ${st.bg}`}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                        <span className={`text-[9px] font-bold flex-shrink-0 ${st.text}`}>{c.label}</span>
                        <span className={`text-[10px] font-bold ml-auto ${c.met ? st.text : 'text-slate-500'}`}>{c.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-700 pt-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Patterns</span>
                  {v32?.rsi != null && (
                    <span className={`text-[9px] font-bold tabular-nums ${v32.rsi > 70 ? 'text-rose-400' : v32.rsi < 30 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      RSI {v32.rsi.toFixed(0)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  {PAT_KEYS.map(pk => {
                    const info = patProx?.[pk];
                    const prox = info?.proximity ?? 0;
                    const ready = info?.ready ?? false;
                    const detail = info?.detail;
                    const dir = info?.dir ?? 0;
                    const pct = Math.min(100, prox * 100);
                    const barColor = ready
                      ? (dir === 1 ? 'bg-cyan-400' : dir === -1 ? 'bg-orange-400' : 'bg-emerald-400')
                      : pct > 60 ? 'bg-amber-500' : 'bg-slate-600';
                    const textColor = ready
                      ? (dir === 1 ? 'text-cyan-300' : dir === -1 ? 'text-orange-300' : 'text-emerald-300')
                      : 'text-slate-500';
                    const bgColor = ready
                      ? (dir === 1 ? 'bg-cyan-900/30 border-cyan-500/40' : dir === -1 ? 'bg-orange-900/30 border-orange-500/40' : 'bg-emerald-900/30 border-emerald-500/40')
                      : 'bg-slate-700/15 border-slate-700/30';
                    return (
                      <div key={pk} className={`rounded border px-1.5 py-0.5 transition-all ${bgColor}`} title={detail || undefined}>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold w-[72px] flex-shrink-0 ${textColor}`}>{PAT_NAMES[pk] || pk}</span>
                          <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden min-w-[30px]">
                            <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-[9px] font-bold tabular-nums w-[28px] text-right flex-shrink-0 ${textColor}`}>
                            {ready ? (dir === 1 ? 'BUY' : dir === -1 ? 'SELL' : 'GO') : `${(prox * 100).toFixed(0)}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        <ExitConditionsPanel
          exitConditions={ss?.exitConditions}
          exitPrices={ss?.exitPrices}
          inPosition={!!hasPosition}
          mfePct={ss?.mfe ?? data.strategyA?.mfe}
          currentPrice={data.currentPrice}
          positionSide={data.position?.position_side}
          v32={ss?.v32}
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
