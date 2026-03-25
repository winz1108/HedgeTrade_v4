import { DollarSign, Activity, Target, History, ShieldAlert, Clock, TrendingUp } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/time';
import { useRef, useEffect } from 'react';
import type { BFDashboardData, V10StrategyStatus, ExitConditions, V32Data } from '../../types/dashboard';

interface Props {
  data: BFDashboardData;
  position: 'left' | 'right' | 'trades';
  currentTime: number;
}

const formatHoldingDuration = (entryTime: number, currentTime: number): string => {
  const diffMs = currentTime - entryTime;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (hours > 0) return `${hours}h ${remainMinutes}m`;
  return `${minutes}m`;
};

const getExitReasonLabel = (reason?: string): string => {
  if (!reason) return 'TP';
  if (reason === 'TP') return 'TP';
  if (reason === 'SL') return 'SL';
  if (reason === 'HARD_SL') return 'Hard SL';
  if (reason === 'PP') return 'PP';
  if (reason.startsWith('PP_STOP')) return 'PP';
  if (reason === 'EARLY') return 'Early Exit';
  if (reason === 'VANISH') return 'Vanish';
  if (reason === 'TIMEOUT') return 'Timeout';
  if (reason === 'EXIT_SW_TRAIL') return 'TRAIL';
  if (reason === 'EXIT_R_TRAIL') return 'RTRAIL';
  if (reason === 'EXIT_R_CUT') return 'RCUT';
  return reason;
};

const getExitReasonColor = (profit: number | undefined): { bg: string; text: string; border: string } => {
  if (profit === undefined || profit >= 0) {
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' };
  }
  return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' };
};

const PATTERN_LABELS: Record<string, string> = {
  '382': '38.2% Retracement',
  'ENG': 'Engulfing',
  'REV': 'Reversal',
  'DBL': 'Double Bottom/Top',
  'FLAG': 'Flag Pattern',
  'RSI_DIV': 'RSI Divergence',
};

function EntryConditionsPanel({ ss, currentPrice }: { ss?: V10StrategyStatus; currentPrice: number }) {
  const v32 = ss?.v32;
  const ema200Dir = v32?.ema200_direction ?? 0;
  const htfAlign = v32?.htf_alignment ?? 0;
  const ema20 = v32?.ema20;
  const ema50 = v32?.ema50;
  const ema200 = v32?.ema200;
  const atr = v32?.atr;
  const isInValueZone = ema20 != null && ema50 != null && atr != null && currentPrice
    ? (currentPrice >= Math.min(ema20, ema50) - 2 * atr && currentPrice <= Math.max(ema20, ema50) + 2 * atr)
    : false;
  const entryPattern = v32?.entry_pattern;

  const trendDirection = ema200Dir === 1 ? 'long' : ema200Dir === -1 ? 'short' : 'neutral';
  const htfDirection = htfAlign === 1 ? 'long' : htfAlign === -1 ? 'short' : 'neutral';

  const conditions = [
    {
      key: 'htf',
      label: '4h HTF',
      met: htfAlign !== 0,
      detail: htfAlign === 1 ? 'Bullish' : htfAlign === -1 ? 'Bearish' : 'Neutral',
      sub: v32?.htf_ema50 != null ? `EMA50: $${v32.htf_ema50.toFixed(0)}` : null,
      direction: htfDirection,
    },
    {
      key: 'trend',
      label: 'EMA200',
      met: ema200Dir !== 0,
      detail: ema200Dir === 1 ? 'Uptrend' : ema200Dir === -1 ? 'Downtrend' : 'Flat',
      sub: ema200 != null ? `$${ema200.toFixed(0)} (${currentPrice > ema200 ? '+' : ''}${((currentPrice - ema200) / ema200 * 100).toFixed(2)}%)` : null,
      direction: trendDirection,
    },
    {
      key: 'vz',
      label: 'Value Zone',
      met: isInValueZone,
      detail: isInValueZone ? 'In Zone' : 'Outside',
      sub: ema20 != null && ema50 != null ? `EMA20: $${ema20.toFixed(0)} / EMA50: $${ema50.toFixed(0)}` : null,
      direction: isInValueZone ? 'active' : 'neutral',
    },
    {
      key: 'pattern',
      label: 'Pattern',
      met: !!entryPattern,
      detail: entryPattern ? (PATTERN_LABELS[entryPattern] || entryPattern) : 'Scanning...',
      sub: entryPattern ? `1h candle close` : '6 patterns monitored',
      direction: entryPattern ? 'active' : 'neutral',
    },
  ];

  const metCount = conditions.filter(c => c.met).length;
  const progressPct = (metCount / conditions.length) * 100;

  const getConditionStyle = (met: boolean, direction: string) => {
    if (!met) return { bg: 'bg-stone-50 border-stone-200', text: 'text-stone-400', detail: 'text-stone-400', dot: 'bg-stone-300' };
    if (direction === 'long') return { bg: 'bg-cyan-50 border-cyan-400', text: 'text-cyan-700', detail: 'text-cyan-600', dot: 'bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.9)]' };
    if (direction === 'short') return { bg: 'bg-orange-50 border-orange-400', text: 'text-orange-700', detail: 'text-orange-600', dot: 'bg-orange-500 shadow-[0_0_6px_rgba(251,146,60,0.9)]' };
    return { bg: 'bg-emerald-50 border-emerald-400', text: 'text-emerald-700', detail: 'text-emerald-600', dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]' };
  };

  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-bold text-slate-700 tracking-wide uppercase">Entry Conditions</h3>
        <div className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
          progressPct >= 100 ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-stone-100 text-slate-500 border border-stone-200'
        }`}>{metCount}/{conditions.length}</div>
      </div>

      <div className="mb-2">
        <div className="bg-stone-200 rounded-full h-2 overflow-hidden">
          <div className={`h-2 rounded-full transition-all duration-500 ${
            progressPct >= 100 ? 'bg-emerald-500' : progressPct >= 75 ? 'bg-cyan-500' : progressPct >= 50 ? 'bg-amber-500' : 'bg-stone-400'
          }`} style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {conditions.map(c => {
          const style = getConditionStyle(c.met, c.direction);
          return (
            <div key={c.key} className={`rounded-md border p-1.5 transition-all duration-300 ${style.bg}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${style.dot}`} />
                <span className={`text-[10px] font-bold flex-shrink-0 ${style.text}`}>{c.label}</span>
                <span className={`text-[10px] font-bold ml-auto tabular-nums ${style.detail}`}>{c.detail}</span>
              </div>
              {c.sub && (
                <div className={`text-[8px] mt-0.5 ml-3.5 ${c.met ? style.detail : 'text-stone-400'} opacity-80`}>{c.sub}</div>
              )}
            </div>
          );
        })}
      </div>

      {(v32?.rsi != null || v32?.atr != null) && (
        <div className="mt-1.5 flex items-center gap-3 bg-stone-50 rounded-md border border-stone-200 px-2 py-1">
          {v32?.rsi != null && (
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-stone-500 font-medium">RSI(14)</span>
              <span className={`text-[10px] font-bold tabular-nums ${
                v32.rsi > 70 ? 'text-rose-600' : v32.rsi < 30 ? 'text-emerald-600' : 'text-slate-700'
              }`}>{v32.rsi.toFixed(1)}</span>
            </div>
          )}
          {v32?.atr != null && (
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-stone-500 font-medium">ATR(14)</span>
              <span className="text-[10px] font-bold tabular-nums text-slate-700">${v32.atr.toFixed(0)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ExitPanelProps {
  exitConditions?: ExitConditions;
  exitPrices?: { slPrice?: number; trailPrice?: number; [key: string]: any };
  inPosition: boolean;
  currentPnl?: number;
  mfePct?: number;
  currentPrice?: number;
  entryPrice?: number;
  positionSide?: 'LONG' | 'SHORT' | null;
  v32?: V32Data;
}

function ExitConditionsPanel({ exitConditions, exitPrices, inPosition, currentPnl, mfePct, currentPrice, entryPrice, positionSide, v32 }: ExitPanelProps) {
  if (!inPosition) return null;

  const isShort = positionSide === 'SHORT';

  const trailPrice = v32?.trail_price ?? exitPrices?.trailPrice;
  const peakPnl = v32?.peak_pnl ?? exitConditions?.V32TRAIL?.peakPnl ?? mfePct ?? 0;
  const trailArmed = exitConditions?.V32TRAIL?.armed ?? (peakPnl > 0.5);
  const trailLevel = exitConditions?.V32TRAIL?.currentLevel;

  const slPrice = v32?.sl_price ?? exitPrices?.slPrice ?? exitConditions?.SL?.slPrice;
  const slArmed = exitConditions?.SL?.armed ?? !!slPrice;
  const slDistance = slPrice && currentPrice
    ? (isShort ? ((slPrice - currentPrice) / currentPrice * 100) : ((currentPrice - slPrice) / currentPrice * 100))
    : null;

  const barsHeld = v32?.bars_held ?? exitConditions?.TIME?.barsHeld ?? 0;
  const maxBars = v32?.max_bars ?? exitConditions?.TIME?.maxBars ?? 24;
  const timeProgress = maxBars > 0 ? Math.min(100, (barsHeld / maxBars) * 100) : 0;
  const remainingHours = maxBars - barsHeld;

  const sideActiveColors = isShort
    ? { bg: 'bg-orange-50 border-orange-400', text: 'text-orange-700', dot: 'bg-orange-500 shadow-[0_0_6px_rgba(251,146,60,0.9)]', bar: 'bg-orange-500' }
    : { bg: 'bg-cyan-50 border-cyan-400', text: 'text-cyan-700', dot: 'bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.9)]', bar: 'bg-cyan-500' };

  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] font-bold text-slate-700 tracking-wide uppercase">Exit Conditions</div>
        <ShieldAlert className="w-3 h-3 text-slate-400" />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className={`rounded-md border p-2 transition-all duration-300 ${
          trailArmed ? sideActiveColors.bg : 'bg-stone-50 border-stone-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                trailArmed ? sideActiveColors.dot : 'bg-stone-300'
              }`} />
              <span className={`text-[10px] font-bold ${trailArmed ? sideActiveColors.text : 'text-slate-500'}`}>TRAIL</span>
              <span className="text-[8px] text-stone-400">ATR Trailing</span>
            </div>
            {trailPrice != null && (
              <span className={`text-[10px] font-bold tabular-nums ${trailArmed ? sideActiveColors.text : 'text-slate-400'}`}>
                ${trailPrice.toFixed(1)}
              </span>
            )}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] w-[36px] flex-shrink-0 ${trailArmed ? sideActiveColors.text : 'text-stone-400'}`}>Peak</span>
              <div className="flex-1 bg-stone-200 rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${trailArmed ? sideActiveColors.bar : 'bg-stone-300'}`}
                  style={{ width: `${Math.min(100, Math.max(0, peakPnl * 20))}%` }} />
              </div>
              <span className={`text-[9px] tabular-nums w-[44px] text-right flex-shrink-0 font-bold ${trailArmed ? sideActiveColors.text : 'text-stone-400'}`}>
                +{peakPnl.toFixed(2)}%
              </span>
            </div>
            {trailArmed && currentPnl != null && (
              <div className={`flex items-center gap-1.5 ${isShort ? 'bg-orange-100/60' : 'bg-cyan-100/60'} rounded px-1.5 py-0.5 mt-0.5`}>
                <TrendingUp className={`w-2.5 h-2.5 ${sideActiveColors.text}`} />
                <span className={`text-[8px] font-semibold ${sideActiveColors.text}`}>Trailing active</span>
                <span className={`text-[9px] tabular-nums font-bold ml-auto ${currentPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {currentPnl >= 0 ? '+' : ''}{currentPnl.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-md border p-2 transition-all duration-300 ${
          slArmed ? 'bg-rose-50 border-rose-400' : 'bg-stone-50 border-stone-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                slArmed ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]' : 'bg-stone-300'
              }`} />
              <span className={`text-[10px] font-bold ${slArmed ? 'text-rose-700' : 'text-slate-500'}`}>SL</span>
              <span className="text-[8px] text-stone-400">0.5 x ATR</span>
            </div>
            {slPrice != null && (
              <span className={`text-[10px] font-bold tabular-nums ${slArmed ? 'text-rose-700' : 'text-slate-400'}`}>
                ${slPrice.toFixed(1)}
              </span>
            )}
          </div>
          {slDistance != null && (
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] w-[36px] flex-shrink-0 ${slArmed ? 'text-rose-600' : 'text-stone-400'}`}>Dist.</span>
              <div className="flex-1 bg-stone-200 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 rounded-full transition-all duration-300 bg-rose-400"
                  style={{ width: `${Math.min(100, Math.max(5, 100 - Math.abs(slDistance) * 15))}%` }} />
              </div>
              <span className={`text-[9px] tabular-nums w-[44px] text-right flex-shrink-0 font-bold ${
                slDistance < 0.5 ? 'text-rose-600' : slArmed ? 'text-rose-600' : 'text-slate-400'
              }`}>
                {slDistance.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        <div className={`rounded-md border p-2 transition-all duration-300 ${
          timeProgress >= 75 ? 'bg-amber-50 border-amber-400' : 'bg-stone-50 border-stone-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Clock className={`w-3.5 h-3.5 ${timeProgress >= 75 ? 'text-amber-600' : 'text-stone-400'}`} />
              <span className={`text-[10px] font-bold ${timeProgress >= 75 ? 'text-amber-700' : 'text-slate-500'}`}>TIMEOUT</span>
              <span className="text-[8px] text-stone-400">{maxBars}h max</span>
            </div>
            <span className={`text-[10px] font-bold tabular-nums ${timeProgress >= 75 ? 'text-amber-700' : 'text-slate-400'}`}>
              {remainingHours > 0 ? `${remainingHours}h left` : 'Expired'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] w-[36px] flex-shrink-0 tabular-nums ${timeProgress >= 75 ? 'text-amber-600' : 'text-stone-400'}`}>
              {barsHeld}h
            </span>
            <div className="flex-1 bg-stone-200 rounded-full h-1.5 overflow-hidden">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${
                timeProgress >= 90 ? 'bg-rose-500' : timeProgress >= 75 ? 'bg-amber-500' : 'bg-stone-400'
              }`} style={{ width: `${timeProgress}%` }} />
            </div>
            <span className={`text-[9px] tabular-nums w-[36px] text-right flex-shrink-0 font-bold ${
              timeProgress >= 75 ? 'text-amber-600' : 'text-slate-400'
            }`}>
              {timeProgress.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BinanceFuturesMetricsPanel({ data, position, currentTime }: Props) {
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
    const hasPosition = data.position.inPosition;
    const positionSide = data.position.side;
    const entryPrice = data.position.entryPrice;
    const currentPnl = data.position.currentPnl;
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
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-slate-800">Status</h3>
            <Activity className="w-3 h-3 text-slate-600" />
          </div>

          <div className="space-y-1.5">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-2 border border-amber-300">
              <div className="text-[10px] text-amber-700 font-medium mb-0.5">TOTAL ASSET</div>
              <div className="text-xl font-bold text-slate-900 mb-1">
                {formatCurrency(data.account.totalAsset)}
              </div>
              <div className="space-y-0.5 pt-1 border-t border-amber-300">
                {data.account.currencies && Object.entries(data.account.currencies).length > 0 ? (
                  <>
                    {(() => {
                      const currencies = Object.entries(data.account.currencies);
                      const primaryOrder = ['BTC', 'USDT', 'USD'];
                      const sorted = currencies.sort(([a], [b]) => {
                        const aIndex = primaryOrder.indexOf(a);
                        const bIndex = primaryOrder.indexOf(b);
                        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                        if (aIndex !== -1) return -1;
                        if (bIndex !== -1) return 1;
                        return a.localeCompare(b);
                      });

                      return sorted.map(([currency, info]) => {
                        let textColor = 'text-emerald-700';
                        if (currency === 'BTC') textColor = 'text-amber-700';
                        else if (currency === 'USDT') textColor = 'text-emerald-700';

                        return (
                          <div key={currency} className="flex justify-between items-center">
                            <span className="text-[9px] text-slate-600">{currency}</span>
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
                    <span className="text-[9px] text-slate-600">Available</span>
                    <span className="text-[11px] font-bold text-emerald-700">
                      {formatCurrency(data.account.totalAsset)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-600">Leverage</span>
                  <span className="text-[11px] font-bold text-amber-700">{leverage}x</span>
                </div>
              </div>
            </div>

            <div className="border-t border-stone-200 pt-1.5">
              <div className="text-[10px] text-slate-800 mb-1 font-medium">POSITION</div>
              {hasPosition && entryPrice ? (
                <div className="space-y-0.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-1.5 border border-amber-300">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-amber-700">Side</span>
                    <span className={`text-[11px] font-bold ${
                      positionSide === 'LONG' ? 'text-cyan-600' : 'text-orange-600'
                    }`}>
                      {positionSide}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-amber-700">Entry</span>
                    <span className="text-[11px] font-bold text-slate-900">{formatCurrency(entryPrice)}</span>
                  </div>
                  {liquidationPrice && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500">Liquidation</span>
                      <span className="text-[11px] font-bold text-slate-600">{formatCurrency(liquidationPrice)}</span>
                    </div>
                  )}
                  {currentPnl !== undefined && currentPnl !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-amber-700">P&L</span>
                      <span className={`text-[11px] font-bold ${
                        currentPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {currentPnl >= 0 ? '+' : ''}{currentPnl.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {data.position.entryTime && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-amber-700">Duration</span>
                      <span className="text-[11px] font-bold text-amber-700">
                        {formatHoldingDuration(data.position.entryTime, currentTime)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-2 py-1 bg-stone-100 text-slate-600 rounded text-[10px] font-bold inline-block border border-stone-300">
                  NO POSITION
                </div>
              )}
            </div>
          </div>
        </div>

        <EntryConditionsPanel ss={ss} currentPrice={data.currentPrice} />

        <ExitConditionsPanel
          exitConditions={ss?.exitConditions}
          exitPrices={ss?.exitPrices}
          inPosition={!!hasPosition}
          currentPnl={currentPnl}
          mfePct={data.position.mfe}
          currentPrice={data.currentPrice}
          entryPrice={entryPrice ?? undefined}
          positionSide={positionSide}
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

    const totalTrades = data.metrics?.totalTrades ?? 0;
    const winRate = data.metrics?.winRate ?? 0;
    const avgPnl = data.metrics?.avgPnl ?? 0;
    const totalPnl = data.metrics?.totalPnl ?? 0;
    const marketReturn = data.metrics?.marketReturn ?? 0;

    const tp = Math.round(totalTrades * (winRate / 100));
    const sl = totalTrades - tp;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-slate-800">Performance</h3>
            <DollarSign className="w-3 h-3 text-slate-400" />
          </div>

          <div className="space-y-1.5">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-2 rounded-lg border border-emerald-300">
              <div className="text-[10px] text-emerald-700 font-bold mb-0.5">NET PROFIT</div>
              <div
                className={`text-2xl font-black ${
                  data.account.returnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatPercent(data.account.returnPct * 100)}
              </div>
              {totalPnl !== undefined && (
                <div className={`text-[11px] font-bold mt-0.5 ${
                  totalPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} USD
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between items-center bg-stone-50 p-1 rounded border border-stone-300">
                <span className="text-[9px] text-slate-800 font-medium">Portfolio Return</span>
                <span className={`text-[11px] font-bold ${
                  (data.account.returnPct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatPercent((data.account.returnPct ?? 0) * 100)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-stone-50 p-1 rounded border border-stone-300">
                <span className="text-[9px] text-slate-800 font-medium">Market Change (30d)</span>
                <span className={`text-[11px] font-bold ${
                  marketReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatPercent(marketReturn)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-stone-50 p-1 rounded border border-stone-300">
                <span className="text-[9px] text-slate-800 font-medium">Avg Trade Return</span>
                <span className={`text-[11px] font-bold ${
                  avgPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatPercent(avgPnl)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-slate-800">Statistics</h3>
            <Target className="w-3 h-3 text-slate-600" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center bg-emerald-50 p-1.5 rounded border border-emerald-300">
              <span className="text-[10px] text-emerald-700 font-bold">Profit (TP)</span>
              <span className="text-sm font-bold text-emerald-700">{tp}</span>
            </div>
            <div className="flex justify-between items-center bg-rose-50 p-1.5 rounded border border-rose-300">
              <span className="text-[10px] text-rose-700 font-bold">Loss (SL)</span>
              <span className="text-sm font-bold text-rose-700">{sl}</span>
            </div>
            <div className="flex justify-between items-center bg-stone-50 p-1 rounded border border-stone-300">
              <span className="text-[10px] text-slate-600 font-bold">Total</span>
              <span className="text-xs font-bold text-slate-600">{totalTrades}</span>
            </div>
            <div className="border-t border-stone-200 pt-1 mt-1">
              <div className="text-[10px] text-slate-800 mb-1 font-bold">WIN RATE</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-stone-200 rounded-full h-2.5 overflow-hidden">
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
  }

  if (position === 'trades') {
    const oneWeekAgo = currentTime - (7 * 24 * 60 * 60 * 1000);
    const allTrades = (data.recentTrades || data.trades || []) as any[];
    const recentTrades = [...allTrades]
      .filter(trade => trade.timestamp >= oneWeekAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 40);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef<number>(0);

    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const handleScroll = () => { scrollPositionRef.current = container.scrollTop; };
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
      <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-2 flex flex-col" style={{ height: '100%' }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[11px] font-bold text-slate-800">Recent Trades</h3>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-600">7d</span>
            <History className="w-2.5 h-2.5 text-slate-600" />
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="space-y-0.5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-400 scrollbar-track-transparent"
          style={{ minHeight: 0 }}
        >
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => {
              const isLong = (trade as any).side !== 'SHORT';
              const isEntry = trade.type === 'buy';

              return (
                <div key={`${trade.timestamp}-${index}`}>
                  {isEntry ? (
                    <div className={`${isLong ? 'bg-cyan-50 border-cyan-300' : 'bg-orange-50 border-orange-300'} border rounded p-1`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold ${isLong ? 'text-cyan-700' : 'text-orange-700'}`}>
                          {isLong ? 'LONG' : 'SHORT'}
                        </span>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-900">{formatCurrency(trade.price)}</span>
                          <span className="text-[8px] text-slate-600">{formatLocalDateTime(trade.timestamp)}</span>
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
                              typeof trade.profit === 'number' && trade.profit >= 0
                                ? 'bg-emerald-500 text-white'
                                : 'bg-rose-500 text-white'
                            }`} title={trade.exitReason}>{getExitReasonLabel(trade.exitReason)}</span>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-800">{formatCurrency(trade.price)}</span>
                            {typeof trade.profit === 'number' && (
                              <span className={`text-[9px] font-bold ${
                                trade.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                            {typeof trade.pnl === 'number' && (
                              <span className={`text-[8px] font-bold ${
                                trade.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
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
            <div className="flex items-center justify-center h-20 text-slate-500 text-[10px]">
              No trades
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
