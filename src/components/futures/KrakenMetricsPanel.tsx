import { KrakenDashboardData, V10StrategyStatus, ExitConditions, ExitConditionTRAIL } from '../../types/dashboard';
import { DollarSign, Activity, Target, History, ShieldAlert, TrendingUp } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/time';
import { useRef, useEffect } from 'react';

interface Props {
  data: KrakenDashboardData;
  position: 'left' | 'right' | 'trades';
}

interface ExitConditionsPanelProps {
  exitConditions?: ExitConditions;
  exitPrices?: { vwapTarget?: number; cutThresholdMae?: number; rideTrailPrice?: number; [key: string]: any };
  inPosition: boolean;
  strategyParams?: { rideConsecN?: number; [key: string]: any };
  entryMode?: 'SW' | 'RIDE';
  currentPnl?: number;
  mfePct?: number;
  maePct?: number;
  currentPrice?: number;
  entryPrice?: number;
  positionSide?: 'LONG' | 'SHORT' | null;
}

function ConditionDot({ met }: { met: boolean }) {
  return (
    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${
      met ? 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]' : 'bg-slate-600'
    }`} />
  );
}

function ProgressBar({ current, target, reverse = false, color, positionSide }: { current: number; target: number; reverse?: boolean; color?: string; positionSide?: 'LONG' | 'SHORT' | null }) {
  let pct: number;
  pct = target !== 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
  const sideColor = positionSide === 'SHORT' ? 'bg-orange-400' : 'bg-cyan-400';
  const barColor = color ?? sideColor;
  return (
    <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function VwapRangeBar({ maePct, entryPrice, currentPrice, vwapTarget, positionSide, reached }: {
  maePct: number; entryPrice: number; currentPrice: number; vwapTarget: number; positionSide?: 'LONG' | 'SHORT' | null; reached: boolean;
}) {
  const isShort = positionSide === 'SHORT';
  const maePrice = isShort ? entryPrice * (1 + Math.abs(maePct) / 100) : entryPrice * (1 - Math.abs(maePct) / 100);
  const lo = Math.min(maePrice, vwapTarget);
  const hi = Math.max(maePrice, vwapTarget);
  const range = hi - lo;
  const fillPct = range > 0 ? Math.min(100, Math.max(0, ((currentPrice - lo) / range) * 100)) : 0;
  const sideColor = isShort ? 'bg-orange-400' : 'bg-cyan-400';
  return (
    <div className="flex items-center gap-1.5">
      <ConditionDot met={reached} />
      <span className={`text-[9px] w-[30px] flex-shrink-0 tabular-nums ${reached ? (isShort ? 'text-orange-300' : 'text-cyan-300') : 'text-slate-500'}`}>
        {maePrice.toFixed(0)}
      </span>
      <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${sideColor}`}
          style={{ width: `${reached ? 100 : fillPct}%` }}
        />
      </div>
      <span className={`text-[9px] tabular-nums w-[44px] text-right flex-shrink-0 ${reached ? (isShort ? 'text-orange-300' : 'text-cyan-300') : 'text-slate-500'}`}>
        {vwapTarget.toFixed(0)}
      </span>
    </div>
  );
}

function ExitConditionsPanel({ exitConditions, exitPrices, inPosition, strategyParams, entryMode, currentPnl, mfePct, maePct, currentPrice, entryPrice, positionSide }: ExitConditionsPanelProps) {
  const vwap = exitConditions?.VWAP;
  const cut = exitConditions?.CUT;
  const rTrail = exitConditions?.RTRAIL;
  const swTrail = exitConditions?.TRAIL;
  const isRide = entryMode === 'RIDE';

  const hasData = !!(vwap || cut || rTrail || swTrail);

  if (!inPosition) return null;

  return (
    <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="text-[11px] font-bold text-slate-200 tracking-wide uppercase">Exit Conditions</div>
          {isRide && (
            <span className="px-1 py-px text-[7px] font-bold bg-blue-500/30 text-blue-300 border border-blue-400/40 rounded">
              RIDE
            </span>
          )}
        </div>
        <ShieldAlert className="w-3 h-3 text-slate-500" />
      </div>

      {!hasData ? (
        <div className="flex flex-col gap-1">
          {(isRide ? ['RTRAIL', 'CUT'] : ['VWAP', 'TRAIL', 'CUT']).map(name => (
            <div key={name} className="flex items-center justify-between bg-slate-700/20 border border-slate-700/50 rounded px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-700 flex-shrink-0" />
                <span className="text-[10px] text-slate-600 font-semibold">{name}</span>
              </div>
              <span className="text-[9px] text-slate-700">--</span>
            </div>
          ))}
        </div>
      ) : isRide ? (
        <div className="flex flex-col gap-1.5">
          {rTrail && (() => {
            const isShort = positionSide === 'SHORT';
            const rActiveColor = isShort ? 'text-orange-300' : 'text-cyan-300';
            const rActiveBg = isShort ? 'bg-orange-900/30 border-orange-500/50' : 'bg-cyan-900/30 border-cyan-500/50';
            const rActiveDot = isShort
              ? 'bg-orange-400 shadow-[0_0_5px_rgba(251,146,60,0.9)]'
              : 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.9)]';
            return (
            <div className={`rounded-md border p-1.5 transition-all ${
              rTrail.targetReached
                ? rActiveBg
                : 'bg-slate-700/20 border-slate-700/50'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    rTrail.targetReached
                      ? rActiveDot
                      : 'bg-slate-600'
                  }`} />
                  <span className={`text-[10px] font-bold ${rTrail.targetReached ? rActiveColor : 'text-slate-400'}`}>RTRAIL</span>
                  <span className="text-[8px] text-slate-500">추세탑승</span>
                </div>
                {rTrail.targetReached && exitPrices?.rideTrailPrice != null && (
                  <span className={`text-[10px] font-bold tabular-nums ${rActiveColor}`}>
                    ${exitPrices.rideTrailPrice.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <ConditionDot met={rTrail.targetReached} />
                  <span className={`text-[9px] w-[30px] flex-shrink-0 ${rTrail.targetReached ? rActiveColor : 'text-slate-500'}`}>MFE</span>
                  <ProgressBar current={rTrail.mfePct} target={rTrail.trailTarget} positionSide={positionSide} />
                  <span className={`text-[9px] tabular-nums w-[44px] text-right flex-shrink-0 ${rTrail.targetReached ? rActiveColor : 'text-slate-500'}`}>
                    +{rTrail.mfePct.toFixed(2)}%
                  </span>
                </div>
                {rTrail.targetReached ? (
                  <div className={`flex items-center gap-1.5 ${isShort ? 'bg-orange-500/10' : 'bg-cyan-500/10'} rounded px-1 py-0.5`}>
                    <TrendingUp className={`w-2.5 h-2.5 ${isShort ? 'text-orange-400' : 'text-cyan-400'}`} />
                    <span className={`text-[9px] ${rActiveColor} font-semibold`}>트레일링</span>
                    <span className={`text-[9px] tabular-nums ${isShort ? 'text-orange-200' : 'text-cyan-200'} font-bold`}>
                      스톱 {rTrail.trailStop >= 0 ? '+' : ''}{rTrail.trailStop.toFixed(2)}%
                    </span>
                    <span className="text-[9px] text-slate-500">|</span>
                    <span className="text-[9px] tabular-nums text-slate-300">
                      현재 {rTrail.currentPnl >= 0 ? '+' : ''}{rTrail.currentPnl.toFixed(2)}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-500 flex-1">
                      목표 +{rTrail.trailTarget.toFixed(1)}% | 트레일 {rTrail.trailPct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            );
          })()}

          {cut && (
            <div className={`rounded-md border p-1.5 transition-all ${
              cut.armed
                ? 'bg-rose-900/30 border-rose-600/50'
                : 'bg-slate-700/20 border-slate-700/50'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    cut.armed ? 'bg-rose-400 shadow-[0_0_5px_rgba(248,113,113,0.9)]' : 'bg-slate-600'
                  }`} />
                  <span className={`text-[10px] font-bold ${cut.armed ? 'text-rose-300' : 'text-slate-400'}`}>CUT</span>
                  <span className="text-[8px] text-slate-500">손절</span>
                </div>
                <span className={`text-[10px] font-bold tabular-nums ${cut.armed ? 'text-rose-300' : 'text-slate-500'}`}>
                  MAE {(cut.maeThreshold ?? exitPrices?.cutThresholdMae ?? 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <ConditionDot met={cut.maeOk} />
                  <span className={`text-[9px] w-[30px] flex-shrink-0 ${cut.maeOk ? 'text-rose-300' : 'text-slate-600'}`}>MAE</span>
                  <ProgressBar current={Math.abs(cut.maeCurrent ?? 0)} target={Math.abs(cut.maeThreshold ?? 1)} positionSide={positionSide} />
                  <span className={`text-[9px] tabular-nums w-[36px] text-right flex-shrink-0 ${cut.maeOk ? 'text-rose-400' : 'text-slate-500'}`}>
                    {(cut.maeCurrent ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ConditionDot met={cut.emaReversed} />
                  <span className={`text-[9px] flex-1 ${cut.emaReversed ? 'text-rose-300' : 'text-slate-600'}`}>1m EMA 역전</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {vwap && (() => {
            const vwapTarget = exitPrices?.vwapTarget ?? vwap.vwapTarget;
            const vwapReached = currentPrice != null && vwapTarget != null
              ? (positionSide === 'SHORT' ? currentPrice <= vwapTarget : currentPrice >= vwapTarget)
              : false;
            const isShort = positionSide === 'SHORT';
            const vwapActiveColor = isShort ? 'text-orange-300' : 'text-cyan-300';
            const vwapActiveBg = isShort ? 'bg-orange-900/30 border-orange-500/50' : 'bg-cyan-900/30 border-cyan-500/50';
            const vwapActiveDot = isShort
              ? 'bg-orange-400 shadow-[0_0_5px_rgba(251,146,60,0.9)]'
              : 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.9)]';
            return (
              <div className={`rounded-md border p-1.5 transition-all ${
                vwapReached
                  ? vwapActiveBg
                  : 'bg-slate-700/20 border-slate-700/50'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      vwapReached ? vwapActiveDot : 'bg-slate-600'
                    }`} />
                    <span className={`text-[10px] font-bold ${vwapReached ? vwapActiveColor : 'text-slate-400'}`}>VWAP</span>
                    <span className="text-[8px] text-slate-500">익절</span>
                  </div>
                  {vwapTarget != null && (
                    <span className={`text-[10px] font-bold tabular-nums ${vwapReached ? vwapActiveColor : 'text-slate-500'}`}>
                      ${vwapTarget.toFixed(1)}
                    </span>
                  )}
                </div>
                {currentPrice != null && entryPrice != null && vwapTarget != null && (
                  <VwapRangeBar
                    maePct={maePct ?? 0}
                    entryPrice={entryPrice}
                    currentPrice={currentPrice}
                    vwapTarget={vwapTarget}
                    positionSide={positionSide}
                    reached={vwapReached}
                  />
                )}
              </div>
            );
          })()}

          {swTrail && (() => {
            const isShort = positionSide === 'SHORT';
            const trailActiveColor = isShort ? 'text-orange-300' : 'text-cyan-300';
            const trailActiveBg = isShort ? 'bg-orange-900/30 border-orange-500/50' : 'bg-cyan-900/30 border-cyan-500/50';
            const trailActiveDot = isShort
              ? 'bg-orange-400 shadow-[0_0_5px_rgba(251,146,60,0.9)]'
              : 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.9)]';
            return (
            <div className={`rounded-md border p-1.5 transition-all ${
              swTrail.targetReached
                ? trailActiveBg
                : 'bg-slate-700/20 border-slate-700/50'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    swTrail.targetReached
                      ? trailActiveDot
                      : 'bg-slate-600'
                  }`} />
                  <span className={`text-[10px] font-bold ${swTrail.targetReached ? trailActiveColor : 'text-slate-400'}`}>TRAIL</span>
                  <span className="text-[8px] text-slate-500">조기익절</span>
                </div>
                {swTrail.targetReached && exitPrices?.trailPrice != null && (
                  <span className={`text-[10px] font-bold tabular-nums ${trailActiveColor}`}>
                    ${exitPrices.trailPrice.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <ConditionDot met={swTrail.targetReached} />
                  <span className={`text-[9px] w-[30px] flex-shrink-0 ${swTrail.targetReached ? trailActiveColor : 'text-slate-500'}`}>MFE</span>
                  <ProgressBar current={swTrail.mfePct} target={swTrail.trailTarget} positionSide={positionSide} />
                  <span className={`text-[9px] tabular-nums w-[44px] text-right flex-shrink-0 ${swTrail.targetReached ? trailActiveColor : 'text-slate-500'}`}>
                    +{swTrail.mfePct.toFixed(2)}%
                  </span>
                </div>
                {swTrail.targetReached ? (
                  <div className={`flex items-center gap-1.5 ${isShort ? 'bg-orange-500/10' : 'bg-cyan-500/10'} rounded px-1 py-0.5`}>
                    <TrendingUp className={`w-2.5 h-2.5 ${isShort ? 'text-orange-400' : 'text-cyan-400'}`} />
                    <span className={`text-[9px] ${trailActiveColor} font-semibold`}>트레일링</span>
                    <span className={`text-[9px] tabular-nums ${isShort ? 'text-orange-200' : 'text-cyan-200'} font-bold`}>
                      스톱 {swTrail.trailStop >= 0 ? '+' : ''}{swTrail.trailStop.toFixed(2)}%
                    </span>
                    <span className="text-[9px] text-slate-500">|</span>
                    <span className="text-[9px] tabular-nums text-slate-300">
                      현재 {swTrail.currentPnl >= 0 ? '+' : ''}{swTrail.currentPnl.toFixed(2)}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-500 flex-1">
                      목표 +{swTrail.trailTarget.toFixed(1)}% | 트레일 {swTrail.trailPct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            );
          })()}

          {cut && (
            <div className={`rounded-md border p-1.5 transition-all ${
              cut.armed
                ? 'bg-rose-900/30 border-rose-600/50'
                : 'bg-slate-700/20 border-slate-700/50'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    cut.armed
                      ? 'bg-rose-400 shadow-[0_0_5px_rgba(248,113,113,0.9)]'
                      : 'bg-slate-600'
                  }`} />
                  <span className={`text-[10px] font-bold ${cut.armed ? 'text-rose-300' : 'text-slate-400'}`}>CUT</span>
                  <span className="text-[8px] text-slate-500">손절</span>
                  {(cut.consecutiveCuts ?? 0) > 0 && (
                    <span className="text-[8px] font-bold text-rose-400 bg-rose-500/20 px-1 rounded">
                      x{cut.consecutiveCuts}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-bold tabular-nums ${cut.armed ? 'text-rose-300' : 'text-slate-500'}`}>
                  MAE {(cut.maeThreshold ?? exitPrices?.cutThresholdMae ?? 0).toFixed(1)}%
                </span>
              </div>
              {(() => {
                const steps = strategyParams?.cutProgSteps;
                if (steps && steps.length > 1) {
                  const currentIdx = cut.consecutiveCuts ?? 0;
                  return (
                    <div className="flex items-center gap-0.5 mb-1">
                      {steps.map((step: number, i: number) => {
                        const isActive = i === Math.min(currentIdx, steps.length - 1);
                        const isPast = i < currentIdx;
                        return (
                          <div key={i} className="flex items-center gap-0.5">
                            <div className={`text-[8px] tabular-nums px-1 py-px rounded transition-all ${
                              isActive
                                ? 'bg-rose-500/40 text-rose-300 font-bold ring-1 ring-rose-400/50'
                                : isPast
                                  ? 'bg-rose-500/15 text-rose-400/60'
                                  : 'bg-slate-700/40 text-slate-600'
                            }`}>
                              {step.toFixed(1)}
                            </div>
                            {i < steps.length - 1 && (
                              <div className={`w-1.5 h-px ${isPast ? 'bg-rose-500/40' : 'bg-slate-700'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return null;
              })()}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <ConditionDot met={cut.maeOk} />
                  <span className={`text-[9px] w-[30px] flex-shrink-0 ${cut.maeOk ? 'text-rose-300' : 'text-slate-600'}`}>MAE</span>
                  <ProgressBar current={Math.abs(cut.maeCurrent ?? 0)} target={Math.abs(cut.maeThreshold ?? 1)} positionSide={positionSide} />
                  <span className={`text-[9px] tabular-nums w-[36px] text-right flex-shrink-0 ${cut.maeOk ? 'text-rose-400' : 'text-slate-500'}`}>
                    {(cut.maeCurrent ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ConditionDot met={cut.emaReversed} />
                  <span className={`text-[9px] flex-1 ${cut.emaReversed ? 'text-rose-300' : 'text-slate-600'}`}>1m EMA 역전</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
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
    const entryDetails = data.strategyStatus?.entryDetails || data.strategyA?.entry_details;

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

          {entryDetails?.VWAP ? (() => {
            const vwap = entryDetails.VWAP!;
            const longDist = vwap.long_distance_pct;
            const shortDist = vwap.short_distance_pct;
            const closerSide = longDist >= shortDist ? 'LONG' : 'SHORT';

            return (
              <div className="grid grid-cols-2 gap-1.5">
                {(['LONG', 'SHORT'] as const).map(side => {
                  const isLongSide = side === 'LONG';
                  const isCloser = side === closerSide;
                  const met = isLongSide ? vwap.long_met : vwap.short_met;
                  const rawDist = isLongSide ? longDist : shortDist;
                  const targetPrice = isLongSide ? vwap.lower : vwap.upper;
                  const maxRange = 1.0;
                  const progressPct = met || rawDist >= 0
                    ? 100
                    : Math.max(0, Math.min(100, (1 - Math.abs(rawDist) / maxRange) * 100));

                  const isNear = progressPct >= 70;

                  const panelBg = met
                    ? (isLongSide ? 'bg-cyan-500/20 border-cyan-400/60' : 'bg-orange-500/20 border-orange-400/60')
                    : isCloser && isNear
                      ? (isLongSide ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-orange-500/10 border-orange-500/30')
                      : 'bg-slate-800/30 border-slate-700/50';
                  const labelColor = met
                    ? (isLongSide ? 'text-cyan-300 font-bold' : 'text-orange-300 font-bold')
                    : isCloser ? (isLongSide ? 'text-cyan-400' : 'text-orange-400') : 'text-slate-500';

                  const distLabel = met
                    ? (rawDist > 0 ? `+${rawDist.toFixed(3)}%` : '0.000%')
                    : `${rawDist.toFixed(3)}%`;
                  const distColor = met
                    ? (isLongSide ? 'text-cyan-300' : 'text-orange-300')
                    : isNear ? (isLongSide ? 'text-cyan-400' : 'text-orange-400') : 'text-slate-400';

                  const barTrack = 'bg-slate-700/60';
                  const barFill = met
                    ? (isLongSide ? 'bg-cyan-400' : 'bg-orange-400')
                    : isNear
                      ? (isLongSide ? 'bg-cyan-400/70' : 'bg-orange-400/70')
                      : (isLongSide ? 'bg-cyan-500/30' : 'bg-orange-500/30');

                  return (
                    <div key={side} className={`rounded-md border p-1.5 transition-all duration-300 ${panelBg}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] font-semibold tracking-wide ${labelColor}`}>{side}</span>
                        {met && <span className="text-[8px] font-bold text-emerald-400 tracking-wider animate-pulse">MET</span>}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          {isLongSide ? (
                            <>
                              <span className="text-[9px] tabular-nums text-slate-500">{targetPrice.toFixed(1)}</span>
                              <span className={`text-[9px] tabular-nums font-medium ${distColor}`}>{distLabel}</span>
                            </>
                          ) : (
                            <>
                              <span className={`text-[9px] tabular-nums font-medium ${distColor}`}>{distLabel}</span>
                              <span className="text-[9px] tabular-nums text-slate-500">{targetPrice.toFixed(1)}</span>
                            </>
                          )}
                        </div>
                        <div className={`${barTrack} rounded-full h-[3px] overflow-hidden`}>
                          {isLongSide ? (
                            <div className={`h-full rounded-full transition-all duration-500 ease-out ml-auto ${barFill} ${met ? 'shadow-[0_0_4px_rgba(34,211,238,0.4)]' : ''}`}
                              style={{ width: `${progressPct}%` }} />
                          ) : (
                            <div className={`h-full rounded-full transition-all duration-500 ease-out ${barFill} ${met ? 'shadow-[0_0_4px_rgba(251,146,60,0.4)]' : ''}`}
                              style={{ width: `${progressPct}%` }} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })() : (
            <div className="flex items-center justify-center h-8 text-slate-500 text-[11px]">
              Waiting...
            </div>
          )}
          {!hasPosition && (ss?.consecCutCount ?? 0) >= 1 && (
            <div className="mt-1.5 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[9px] font-semibold text-amber-300">
                연속CUT {ss?.consecCutCount}/{ss?.strategyParams?.rideConsecN ?? 2}
              </span>
              {(ss?.consecCutCount ?? 0) >= (ss?.strategyParams?.rideConsecN ?? 2) - 1 && (
                <span className="text-[8px] text-amber-200 bg-amber-500/20 px-1 rounded">RIDE 예고</span>
              )}
            </div>
          )}
        </div>

        <ExitConditionsPanel
          exitConditions={ss?.exitConditions}
          exitPrices={ss?.exitPrices}
          inPosition={!!hasPosition}
          strategyParams={ss?.strategyParams}
          entryMode={ss?.entryMode || data.position?.entry_mode || data.strategyA?.entry_mode}
          currentPnl={currentPnl}
          mfePct={ss?.mfe ?? data.strategyA?.mfe}
          maePct={ss?.mae ?? data.strategyA?.mae}
          currentPrice={data.currentPrice}
          entryPrice={data.position?.entry_price ?? ss?.entryPrice}
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
