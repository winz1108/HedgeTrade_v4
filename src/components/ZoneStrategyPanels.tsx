import { Clock } from 'lucide-react';
import type { ZoneData, ZoneExitConditions } from '../types/dashboard';

interface EntryPanelProps {
  zoneData: ZoneData | null | undefined;
  currentPrice: number;
  dark?: boolean;
}

interface ExitPanelProps {
  exitConditions: ZoneExitConditions | null | undefined;
  positionSide: 'LONG' | 'SHORT' | string | null | undefined;
  dark?: boolean;
}

export function ZoneEntryPanel({ zoneData, currentPrice, dark = true }: EntryPanelProps) {
  const support = zoneData?.nearestSupport;
  const resistance = zoneData?.nearestResistance;

  const supportPrice = support?.center ?? 0;
  const resistancePrice = resistance?.center ?? 0;

  const hasData = supportPrice > 0 && resistancePrice > 0 && currentPrice > 0;

  let ratio = 0.5;
  if (hasData) {
    const range = resistancePrice - supportPrice;
    if (range > 0) {
      ratio = (currentPrice - supportPrice) / range;
      ratio = Math.max(0, Math.min(1, ratio));
    }
  }

  const isLongBias = ratio < 0.5;
  const isShortBias = ratio > 0.5;
  const isCenter = Math.abs(ratio - 0.5) < 0.05;

  const bg = dark ? 'bg-slate-800/95 border-slate-700' : 'bg-white border-stone-200';
  const inactiveTxt = dark ? 'text-slate-500' : 'text-stone-400';
  const barBg = dark ? 'bg-slate-700' : 'bg-stone-100';
  const barBorder = dark ? 'border-slate-600' : 'border-stone-200';
  const cyanTxt = dark ? 'text-cyan-400' : 'text-cyan-600';
  const orangeTxt = dark ? 'text-orange-400' : 'text-orange-600';
  const separatorTxt = dark ? 'text-slate-600' : 'text-stone-300';

  const signalData = zoneData?.signal;
  const signalDir = signalData?.dir as string | undefined;

  return (
    <div className={`${bg} border rounded-lg shadow-sm p-2`}>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
          Entry
        </h3>
        {zoneData && (
          <span className={`text-[8px] font-bold tabular-nums ${dark ? 'text-slate-500' : 'text-stone-500'}`}>
            ATR {zoneData.atr?.toFixed(1)} | {zoneData.zoneCount} zones
          </span>
        )}
      </div>

      {hasData ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px] mb-0.5">
            <span className={`tabular-nums ${isLongBias || isCenter ? `${cyanTxt} font-bold` : inactiveTxt}`}>
              ${supportPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className={`tabular-nums ${isShortBias || isCenter ? `${orangeTxt} font-bold` : inactiveTxt}`}>
              ${resistancePrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className={`relative h-3 ${barBg} rounded-full overflow-hidden border ${barBorder}`}>
            {isLongBias || isCenter ? (
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${(1 - ratio) * 100}%` }}
              />
            ) : (
              <div
                className="absolute right-0 top-0 h-full bg-gradient-to-l from-orange-500 to-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${ratio * 100}%` }}
              />
            )}
          </div>

          <div className="flex items-center justify-between text-[8px]">
            <div className={`flex items-center gap-1 ${isLongBias || isCenter ? cyanTxt : inactiveTxt}`}>
              <span className="font-bold">LONG</span>
              <span className={separatorTxt}>|</span>
              <span>{(support?.dist_pct ?? 0).toFixed(2)}%</span>
              <span className={separatorTxt}>|</span>
              <span>{support?.tests ?? 0}x {support?.strength ?? 'weak'}</span>
            </div>
            <div className={`flex items-center gap-1 ${isShortBias || isCenter ? orangeTxt : inactiveTxt}`}>
              <span>{resistance?.tests ?? 0}x {resistance?.strength ?? 'weak'}</span>
              <span className={separatorTxt}>|</span>
              <span>{(resistance?.dist_pct ?? 0).toFixed(2)}%</span>
              <span className={separatorTxt}>|</span>
              <span className="font-bold">SHORT</span>
            </div>
          </div>

          {signalData && signalDir && (
            <div className={`mt-1 rounded border p-1.5 ${
              signalDir === 'long'
                ? dark ? 'bg-cyan-900/30 border-cyan-500/40' : 'bg-cyan-50 border-cyan-300'
                : dark ? 'bg-orange-900/30 border-orange-500/40' : 'bg-orange-50 border-orange-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    signalDir === 'long' ? 'bg-cyan-400' : 'bg-orange-400'
                  }`} />
                  <span className={`text-[9px] font-bold uppercase ${
                    signalDir === 'long'
                      ? dark ? 'text-cyan-300' : 'text-cyan-700'
                      : dark ? 'text-orange-300' : 'text-orange-700'
                  }`}>
                    {signalDir} Signal
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-2">
          <span className={`text-[10px] ${dark ? 'text-slate-500' : 'text-stone-400'}`}>Waiting for zone data...</span>
        </div>
      )}
    </div>
  );
}

export function ZoneExitPanel({ exitConditions, positionSide, dark = true }: ExitPanelProps) {
  if (!exitConditions) return null;

  const sl = exitConditions.SL;
  const trail = exitConditions.TRAIL;
  const timeout = exitConditions.TIMEOUT;

  if (!sl && !trail && !timeout) return null;

  const isShort = positionSide === 'SHORT' || positionSide === 'short';
  const sideColor = dark
    ? (isShort ? 'text-orange-400' : 'text-cyan-400')
    : (isShort ? 'text-orange-600' : 'text-cyan-600');
  const sideFill = isShort ? 'bg-orange-400' : 'bg-cyan-400';
  const sideBg = dark
    ? (isShort ? 'bg-orange-900/30 border-orange-500/40' : 'bg-cyan-900/30 border-cyan-500/40')
    : (isShort ? 'bg-orange-50 border-orange-300' : 'bg-cyan-50 border-cyan-300');

  const inactiveBg = dark ? 'bg-slate-700/20 border-slate-700/50' : 'bg-stone-50 border-stone-200';
  const inactiveDot = dark ? 'bg-slate-600' : 'bg-stone-300';
  const inactiveTxt = dark ? 'text-slate-300' : 'text-slate-600';
  const inactiveNum = dark ? 'text-slate-500' : 'text-stone-400';
  const barBg = dark ? 'bg-slate-700' : 'bg-stone-200';
  const inactiveFill = dark ? 'bg-slate-500' : 'bg-stone-400';
  const panelBg = dark ? 'bg-slate-800/95 border-slate-700' : 'bg-white border-stone-200';
  const headerTxt = dark ? 'text-slate-200' : 'text-slate-700';
  const dangerBg = dark ? 'bg-rose-900/30 border-rose-500/50' : 'bg-rose-50 border-rose-300';
  const dangerTxt = dark ? 'text-rose-400' : 'text-rose-600';
  const dangerDot = dark
    ? 'bg-rose-400 shadow-[0_0_4px_rgba(248,113,113,0.8)] animate-pulse'
    : 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.8)] animate-pulse';

  const trailActive = trail?.armed ?? false;
  let trailProgress = 0;
  if (trail) {
    if (trailActive) {
      trailProgress = 100;
    } else if (trail.trigger_pct > 0) {
      trailProgress = Math.max(0, Math.min(100, (trail.peak_pnl / trail.trigger_pct) * 100));
    }
  }

  let slProgress = 0;
  let slDanger = false;
  if (sl) {
    const distPct = Math.abs(sl.distance_pct);
    if (distPct > 0) {
      slProgress = Math.max(0, Math.min(100, (Math.abs(sl.current_pnl_pct) / distPct) * 100));
    }
    const pnlSign = isShort ? -sl.current_pnl_pct : sl.current_pnl_pct;
    slDanger = pnlSign < 0 && slProgress >= 80;
  }

  const timePct = timeout?.pct ?? 0;
  const timeDanger = timePct >= 80;
  const maxBars = timeout?.max_bars ?? 864;
  const barsHeld = timeout?.bars_held ?? 0;
  const hoursLeft = Math.max(0, ((maxBars - barsHeld) * 5) / 60);

  const currentPnl = sl?.current_pnl_pct ?? 0;

  return (
    <div className={`${panelBg} border rounded-lg shadow-sm p-2`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className={`text-[10px] font-bold tracking-wide uppercase ${headerTxt}`}>Exit</div>
        <span className={`text-[8px] font-bold ${sideColor}`}>
          {currentPnl >= 0 ? '+' : ''}{currentPnl.toFixed(2)}%
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {trail && (
          <div className={`rounded-md border p-1.5 transition-all ${trailActive ? sideBg : inactiveBg}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  trailActive
                    ? `${isShort ? 'bg-orange-400 shadow-[0_0_4px_rgba(251,146,60,0.8)]' : 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]'}`
                    : inactiveDot
                }`} />
                <span className={`text-[10px] font-bold ${trailActive ? sideColor : inactiveTxt}`}>TRAIL</span>
              </div>
              <span className={`text-[8px] font-bold ${trailActive ? sideColor : inactiveNum}`}>
                {trailActive ? 'Active' : `RR 2:1 $${trail.trigger_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-[8px] tabular-nums w-[28px] flex-shrink-0 ${inactiveNum}`}>0%</span>
              <div className={`flex-1 ${barBg} rounded-full h-3 overflow-hidden`}>
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${trailActive ? sideFill : inactiveFill}`}
                  style={{ width: `${trailProgress}%` }}
                />
              </div>
              <span className={`text-[8px] tabular-nums w-[28px] text-right flex-shrink-0 ${inactiveNum}`}>
                {trail.trigger_pct.toFixed(1)}%
              </span>
            </div>
            {trailActive && (
              <div className={`mt-0.5 text-[7px] text-center ${inactiveNum}`}>
                Extreme ${trail.extreme.toLocaleString(undefined, { maximumFractionDigits: 0 })} | TrailSL ${trail.trail_sl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            )}
          </div>
        )}

        {sl && (
          <div className={`rounded-md border p-1.5 transition-all ${slDanger ? dangerBg : inactiveBg}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${slDanger ? dangerDot : inactiveDot}`} />
                <span className={`text-[10px] font-bold ${slDanger ? dangerTxt : inactiveTxt}`}>SL</span>
              </div>
              <span className={`text-[8px] font-bold tabular-nums ${slDanger ? dangerTxt : inactiveNum}`}>
                ${sl.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-[8px] tabular-nums w-[42px] flex-shrink-0 ${slDanger ? dangerTxt : inactiveNum}`}>
                ${sl.entry_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <div className={`flex-1 ${barBg} rounded-full h-3 overflow-hidden relative`}>
                <div
                  className={`absolute right-0 top-0 h-3 rounded-full transition-all duration-300 ${slDanger ? 'bg-rose-500' : inactiveFill}`}
                  style={{ width: `${slProgress}%` }}
                />
              </div>
              <span className={`text-[8px] tabular-nums w-[42px] text-right flex-shrink-0 ${slDanger ? dangerTxt : inactiveNum}`}>
                ${sl.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        )}

        {timeout && (
          <div className={`rounded-md border p-1.5 transition-all ${timeDanger ? sideBg : inactiveBg}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Clock className={`w-3 h-3 ${timeDanger ? sideColor : dark ? 'text-slate-600' : 'text-stone-400'}`} />
                <span className={`text-[10px] font-bold ${timeDanger ? sideColor : inactiveTxt}`}>TIME</span>
              </div>
              <span className={`text-[8px] font-bold tabular-nums ${timeDanger ? sideColor : inactiveNum}`}>
                {hoursLeft > 0 ? `${hoursLeft.toFixed(1)}h left` : 'Expired'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-[8px] tabular-nums w-[28px] flex-shrink-0 ${timeDanger ? sideColor : inactiveNum}`}>
                0h
              </span>
              <div className={`flex-1 ${barBg} rounded-full h-3 overflow-hidden`}>
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${timeDanger ? sideFill : inactiveFill}`}
                  style={{ width: `${timePct}%` }}
                />
              </div>
              <span className={`text-[8px] tabular-nums w-[28px] text-right flex-shrink-0 ${timeDanger ? sideColor : inactiveNum}`}>
                72h
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
