import { Clock, ShieldOff } from 'lucide-react';
import type { ZoneData, ZoneExitConditions, SkippedSignal } from '../types/dashboard';

interface EntryPanelProps {
  zoneData: ZoneData | null | undefined;
  currentPrice: number;
  dark?: boolean;
  inPosition?: boolean;
  variant?: 'kraken' | 'binance';
}

interface ExitPanelProps {
  exitConditions: ZoneExitConditions | null | undefined;
  positionSide: 'LONG' | 'SHORT' | string | null | undefined;
  dark?: boolean;
  currentPrice?: number;
  pendingExit?: boolean;
  pendingExitReason?: string | null;
}

export function ZoneEntryPanel({ zoneData, currentPrice, dark = true, inPosition = false, variant = 'kraken' }: EntryPanelProps) {
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
  const dimTxt = dark ? 'text-slate-500' : 'text-stone-400';
  const barBg = dark ? 'bg-slate-700' : 'bg-stone-100';
  const barBorder = dark ? 'border-slate-600' : 'border-stone-200';
  const separatorTxt = dark ? 'text-slate-600' : 'text-stone-300';

  const inactiveFill = dark ? 'bg-slate-500' : 'bg-stone-400';

  const shortActiveTxt = inPosition ? dimTxt
    : variant === 'kraken' ? 'text-orange-400' : 'text-orange-600';
  const longActiveTxt = inPosition ? dimTxt
    : variant === 'kraken' ? 'text-cyan-400' : 'text-cyan-500';
  const shortBarGrad = variant === 'kraken'
    ? 'bg-orange-400/80' : 'bg-orange-500/70';
  const longBarGrad = variant === 'kraken'
    ? 'bg-cyan-400/80' : 'bg-cyan-500/70';
  const inactiveTxt = dimTxt;

  const signalData = zoneData?.signal;
  const signalDir = signalData?.dir as string | undefined;
  const skipped = zoneData?.skipped_signal as SkippedSignal | null | undefined;

  const longFillPct = (1 - ratio) * 100;
  const shortFillPct = ratio * 100;

  return (
    <div className={`${bg} border rounded-lg shadow-sm p-2`}>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
          Entry
        </h3>
        {zoneData && (
          <span className={`text-[8px] tabular-nums ${dark ? 'text-slate-400' : 'text-stone-500'}`}>
            ATR {zoneData.atr?.toFixed(1)}
            {skipped ? ` | SL $${skipped.sl_distance.toFixed(0)} (${skipped.sl_atr_ratio.toFixed(2)}x)` : ''}
          </span>
        )}
      </div>

      {skipped?.blocked && !inPosition && (
        <div className={`flex items-center gap-1.5 mb-1.5 rounded px-1.5 py-1 ${
          dark ? 'bg-rose-900/30 border border-rose-500/30' : 'bg-rose-50 border border-rose-200'
        }`}>
          <ShieldOff className={`w-3 h-3 flex-shrink-0 ${dark ? 'text-rose-400' : 'text-rose-500'}`} />
          <span className={`text-[8px] font-medium ${dark ? 'text-rose-300' : 'text-rose-600'}`}>
            {skipped.dir.toUpperCase()} blocked -- SL/ATR {skipped.sl_atr_ratio.toFixed(2)} &lt; {skipped.min_required.toFixed(1)}
          </span>
        </div>
      )}

      {hasData ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px] mb-0.5">
            <span className={`tabular-nums ${!inPosition && (isShortBias || isCenter) ? `${shortActiveTxt} font-bold` : inactiveTxt}`}>
              ${supportPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className={`tabular-nums ${!inPosition && (isLongBias || isCenter) ? `${longActiveTxt} font-bold` : inactiveTxt}`}>
              ${resistancePrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className={`relative h-3 ${barBg} rounded-full overflow-hidden border ${barBorder}`}>
            {inPosition ? (
              isLongBias || isCenter ? (
                <div
                  className={`absolute right-0 top-0 h-full ${inactiveFill} rounded-full transition-all duration-500`}
                  style={{ width: `${longFillPct}%` }}
                />
              ) : (
                <div
                  className={`absolute left-0 top-0 h-full ${inactiveFill} rounded-full transition-all duration-500`}
                  style={{ width: `${shortFillPct}%` }}
                />
              )
            ) : isLongBias || isCenter ? (
              <div
                className={`absolute right-0 top-0 h-full ${longBarGrad} rounded-full transition-all duration-500`}
                style={{ width: `${longFillPct}%` }}
              />
            ) : (
              <div
                className={`absolute left-0 top-0 h-full ${shortBarGrad} rounded-full transition-all duration-500`}
                style={{ width: `${shortFillPct}%` }}
              />
            )}
          </div>

          <div className="flex items-center justify-between text-[8px]">
            <div className={`flex items-center gap-1 ${!inPosition && (isLongBias || isCenter) ? longActiveTxt : inactiveTxt}`}>
              <span className="font-bold">LONG</span>
              <span className={separatorTxt}>|</span>
              <span>{(support?.dist_pct ?? 0).toFixed(2)}%</span>
              <span className={separatorTxt}>|</span>
              <span>{support?.tests ?? 0}x {support?.strength ?? 'weak'}</span>
            </div>
            <div className={`flex items-center gap-1 ${!inPosition && (isShortBias || isCenter) ? shortActiveTxt : inactiveTxt}`}>
              <span>{resistance?.tests ?? 0}x {resistance?.strength ?? 'weak'}</span>
              <span className={separatorTxt}>|</span>
              <span>{(resistance?.dist_pct ?? 0).toFixed(2)}%</span>
              <span className={separatorTxt}>|</span>
              <span className="font-bold">SHORT</span>
            </div>
          </div>

          {!inPosition && signalData && signalDir && (
            <div className={`mt-1 rounded border p-1.5 ${
              signalDir === 'long'
                ? variant === 'kraken' ? 'bg-slate-700/50 border-slate-500/40' : 'bg-stone-100 border-stone-300'
                : variant === 'kraken' ? 'bg-slate-600/30 border-white/20' : 'bg-orange-50 border-orange-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    signalDir === 'long'
                      ? variant === 'kraken' ? 'bg-slate-300' : 'bg-stone-500'
                      : variant === 'kraken' ? 'bg-white' : 'bg-orange-500'
                  }`} />
                  <span className={`text-[9px] font-bold uppercase ${
                    signalDir === 'long'
                      ? variant === 'kraken' ? 'text-slate-300' : 'text-stone-600'
                      : variant === 'kraken' ? 'text-white' : 'text-orange-700'
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

export function ZoneExitPanel({ exitConditions, positionSide, dark = true, currentPrice = 0, pendingExit = false, pendingExitReason }: ExitPanelProps) {
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

  const entryPrice = sl?.entry_price ?? 0;
  const price = currentPrice || entryPrice;

  const trailArmed = trail?.armed ?? false;
  const mfePrice = trail?.mfe_price ?? trail?.extreme ?? 0;

  const pendingTrail = pendingExit && (pendingExitReason === 'Trail' || pendingExitReason === 'EXIT_SW_TRAIL' || pendingExitReason === 'EXIT_R_TRAIL');
  const pendingSL = pendingExit && (pendingExitReason === 'SL' || pendingExitReason === 'HARD_SL');

  let trailBarPct = 0;
  let trailInProfit = false;
  if (trail && price && entryPrice) {
    if (trailArmed) {
      const trailSlPrice = trail.trail_sl;
      if (isShort) {
        const range = mfePrice > 0 && trailSlPrice > 0 ? trailSlPrice - mfePrice : 1;
        trailBarPct = range > 0 ? Math.max(0, ((trailSlPrice - price) / range) * 100) : 0;
      } else {
        const range = mfePrice > 0 && trailSlPrice > 0 ? mfePrice - trailSlPrice : 1;
        trailBarPct = range > 0 ? Math.max(0, ((price - trailSlPrice) / range) * 100) : 0;
      }
      trailInProfit = true;
    } else {
      const triggerPrice = trail.trigger_price;
      if (isShort) {
        const range = entryPrice - triggerPrice;
        trailBarPct = range > 0 ? Math.max(0, ((entryPrice - price) / range) * 100) : 0;
        trailInProfit = price < entryPrice;
      } else {
        const range = triggerPrice - entryPrice;
        trailBarPct = range > 0 ? Math.max(0, ((price - entryPrice) / range) * 100) : 0;
        trailInProfit = price > entryPrice;
      }
    }
  }
  if (pendingTrail) {
    trailInProfit = true;
    trailBarPct = Math.max(trailBarPct, 100);
  }
  const trailBarVisual = Math.min(trailBarPct, 100);

  let slBarPct = 0;
  let slInLoss = false;
  if (sl && price && entryPrice) {
    const slPrice = sl.price;
    if (isShort) {
      const range = slPrice - entryPrice;
      slBarPct = range > 0 ? Math.max(0, ((price - entryPrice) / range) * 100) : 0;
      slInLoss = price > entryPrice;
    } else {
      const range = entryPrice - slPrice;
      slBarPct = range > 0 ? Math.max(0, ((entryPrice - price) / range) * 100) : 0;
      slInLoss = price < entryPrice;
    }
  }
  if (pendingSL) {
    slInLoss = true;
    slBarPct = Math.max(slBarPct, 100);
  }
  const slBarVisual = Math.min(slBarPct, 100);
  const slDanger = (slInLoss && slBarPct >= 80) || pendingSL;

  const timePct = timeout?.pct ?? 0;
  const timeDanger = timePct >= 80;
  const maxBars = timeout?.max_bars ?? 864;
  const barsHeld = timeout?.bars_held ?? 0;
  const hoursLeft = Math.max(0, ((maxBars - barsHeld) * 5) / 60);

  return (
    <div className={`${panelBg} border rounded-lg shadow-sm p-2`}>
      <div className="mb-1.5">
        <div className={`text-[10px] font-bold tracking-wide uppercase ${headerTxt}`}>Exit</div>
      </div>

      <div className="flex flex-col gap-1.5">
        {trail && (() => {
          const trailActive = trailInProfit && trailBarPct > 0;
          const activeBg = trailActive ? sideBg : inactiveBg;
          const activeDot = trailActive
            ? `${isShort ? 'bg-orange-400 shadow-[0_0_4px_rgba(251,146,60,0.8)]' : 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]'}`
            : inactiveDot;
          const activeTxt = trailActive ? sideColor : inactiveTxt;
          const activeNum = trailActive ? sideColor : inactiveNum;
          const activeFill = trailActive ? sideFill : inactiveFill;

          let leftVal: string, rightVal: string, headerRight: string;
          let barDir: 'ltr' | 'rtl';

          if (trailArmed) {
            const trailSlPrice = trail.trail_sl;
            if (isShort) {
              leftVal = `$${mfePrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
              rightVal = `$${trailSlPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
              barDir = 'rtl';
            } else {
              leftVal = `$${trailSlPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
              rightVal = `$${mfePrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
              barDir = 'ltr';
            }
            headerRight = `MFE ${trail.peak_pnl.toFixed(2)}%`;
          } else {
            const triggerPrice = trail.trigger_price;
            const achievePct = `${trailBarPct.toFixed(0)}%`;
            if (isShort) {
              leftVal = `$${triggerPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
              rightVal = `$${entryPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
              barDir = 'rtl';
            } else {
              leftVal = `$${entryPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
              rightVal = `$${triggerPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
              barDir = 'ltr';
            }
            headerRight = achievePct;
          }

          return (
            <div className={`rounded-md border p-1.5 transition-all ${activeBg}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeDot}`} />
                  <span className={`text-[10px] font-bold ${activeTxt}`}>TRAIL</span>
                </div>
                <span className={`text-[8px] font-bold tabular-nums ${activeNum}`}>
                  {headerRight}
                </span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <span className={`text-[8px] tabular-nums w-[42px] flex-shrink-0 ${activeNum}`}>
                  {leftVal}
                </span>
                <div className={`w-[calc(100%-100px)] ${barBg} rounded-full h-3 overflow-hidden relative`}>
                  {trailBarVisual > 0 && (
                    <div
                      className={`absolute ${barDir === 'ltr' ? 'left-0' : 'right-0'} top-0 h-3 rounded-full transition-all duration-300 ${activeFill}`}
                      style={{ width: `${trailBarVisual}%` }}
                    />
                  )}
                </div>
                <span className={`text-[8px] tabular-nums w-[42px] text-right flex-shrink-0 ${activeNum}`}>
                  {rightVal}
                </span>
              </div>
            </div>
          );
        })()}

        {sl && (() => {
          const slActive = slInLoss && slBarPct > 0;
          const slBgStyle = slDanger ? dangerBg : (slActive ? dangerBg : inactiveBg);
          const slDotStyle = slDanger ? dangerDot : (slActive ? (dark ? 'bg-rose-400' : 'bg-rose-500') : inactiveDot);
          const slTxtStyle = slDanger ? dangerTxt : (slActive ? dangerTxt : inactiveTxt);
          const slNumStyle = slDanger ? dangerTxt : (slActive ? dangerTxt : inactiveNum);
          const slFillColor = slDanger ? 'bg-rose-500' : (slActive ? 'bg-rose-400/60' : inactiveFill);

          const slPriceFmt = `$${sl.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          const entryFmt = `$${sl.entry_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          const slLossPct = Math.abs(sl.distance_pct).toFixed(2);

          let leftVal: string, rightVal: string;
          let barDir: 'ltr' | 'rtl';

          if (isShort) {
            leftVal = entryFmt;
            rightVal = slPriceFmt;
            barDir = 'ltr';
          } else {
            leftVal = slPriceFmt;
            rightVal = entryFmt;
            barDir = 'rtl';
          }

          return (
            <div className={`rounded-md border p-1.5 transition-all ${slBgStyle}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${slDotStyle}`} />
                  <span className={`text-[10px] font-bold ${slTxtStyle}`}>SL</span>
                </div>
                <span className={`text-[8px] font-bold tabular-nums ${slNumStyle}`}>
                  -{slLossPct}%
                </span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <span className={`text-[8px] tabular-nums w-[42px] flex-shrink-0 ${slNumStyle}`}>
                  {leftVal}
                </span>
                <div className={`w-[calc(100%-100px)] ${barBg} rounded-full h-3 overflow-hidden relative`}>
                  {slBarVisual > 0 && (
                    <div
                      className={`absolute ${barDir === 'ltr' ? 'left-0' : 'right-0'} top-0 h-3 rounded-full transition-all duration-300 ${slFillColor}`}
                      style={{ width: `${slBarVisual}%` }}
                    />
                  )}
                </div>
                <span className={`text-[8px] tabular-nums w-[42px] text-right flex-shrink-0 ${slNumStyle}`}>
                  {rightVal}
                </span>
              </div>
            </div>
          );
        })()}

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
            <div className="flex items-center gap-1 justify-center">
              <span className={`text-[8px] tabular-nums w-[42px] flex-shrink-0 ${timeDanger ? sideColor : inactiveNum}`}>
                0h
              </span>
              <div className={`w-[calc(100%-100px)] ${barBg} rounded-full h-3 overflow-hidden`}>
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${timeDanger ? sideFill : inactiveFill}`}
                  style={{ width: `${timePct}%` }}
                />
              </div>
              <span className={`text-[8px] tabular-nums w-[42px] text-right flex-shrink-0 ${timeDanger ? sideColor : inactiveNum}`}>
                72h
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
