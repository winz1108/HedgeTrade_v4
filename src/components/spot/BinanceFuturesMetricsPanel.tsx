import { DollarSign, Activity, Target, History, ShieldAlert, TrendingUp } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/time';
import { useRef, useEffect } from 'react';
import type { BFDashboardData, V10StrategyStatus, ExitConditions, ExitConditionSW_TRAIL } from '../../types/dashboard';

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

interface BinanceExitConditionsPanelProps {
  exitConditions?: ExitConditions;
  exitPrices?: { vwap_target?: number; cut_threshold_mae?: number; ride_trail_price?: number; [key: string]: any };
  inPosition: boolean;
  strategyParams?: { ride_consec_n?: number; [key: string]: any };
  entryMode?: 'SW' | 'RIDE';
  currentPnl?: number;
}

function BConditionDot({ met }: { met: boolean }) {
  return (
    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${
      met ? 'bg-cyan-500 shadow-[0_0_4px_rgba(6,182,212,0.7)]' : 'bg-stone-300'
    }`} />
  );
}

function BProgressBar({ current, target }: { current: number; target: number }) {
  const pct = target !== 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
  const met = current >= target;
  return (
    <div className="flex-1 bg-stone-200 rounded-full h-1 overflow-hidden">
      <div
        className={`h-1 rounded-full transition-all duration-300 ${met ? 'bg-cyan-500' : 'bg-slate-400'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BVwapRangeBar({ maePct, distToVwap, currentPnl }: { maePct: number; distToVwap: number; currentPnl?: number }) {
  const maeAbs = Math.abs(maePct);
  const totalRange = maeAbs + Math.max(0, distToVwap);
  const pct = totalRange > 0 ? Math.min(100, (maeAbs / totalRange) * 100) : 0;
  const reached = distToVwap <= 0;
  const netPnl = (currentPnl ?? 0) - 0.1;
  const barColor = netPnl >= 0 ? 'bg-teal-500' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-1.5">
      <BConditionDot met={reached} />
      <span className={`text-[8px] flex-shrink-0 tabular-nums ${reached ? 'text-teal-600' : 'text-stone-400'}`}>
        {maePct.toFixed(1)}%
      </span>
      <div className="flex-1 bg-stone-200 rounded-full h-1 overflow-hidden relative">
        <div
          className={`h-1 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${reached ? 100 : pct}%` }}
        />
      </div>
      <span className={`text-[8px] flex-shrink-0 tabular-nums ${reached ? 'text-teal-600' : 'text-stone-500'}`}>
        {distToVwap >= 0 ? '+' : ''}{distToVwap.toFixed(2)}%
      </span>
    </div>
  );
}

function BinanceExitConditionsPanel({ exitConditions, exitPrices, inPosition, strategyParams, entryMode, currentPnl }: BinanceExitConditionsPanelProps) {
  const vwap = exitConditions?.VWAP;
  const cut = exitConditions?.CUT;
  const rTrail = exitConditions?.R_TRAIL;
  const swTrail = exitConditions?.SW_TRAIL;
  const isRide = entryMode === 'RIDE';
  const hasData = !!(vwap || cut || rTrail || swTrail);

  if (!inPosition) return null;

  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="text-[11px] font-bold text-slate-700 tracking-wide uppercase">Exit Conditions</div>
          {isRide && (
            <span className="px-1 py-px text-[7px] font-bold bg-blue-100 text-blue-700 border border-blue-300 rounded">
              RIDE
            </span>
          )}
        </div>
        <ShieldAlert className="w-3 h-3 text-slate-400" />
      </div>

      {!hasData ? (
        <div className="flex flex-col gap-1">
          {(isRide ? ['RTRAIL', 'CUT'] : ['VWAP', 'TRAIL', 'CUT']).map(name => (
            <div key={name} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0" />
                <span className="text-[10px] text-stone-400 font-semibold">{name}</span>
              </div>
              <span className="text-[9px] text-stone-300">--</span>
            </div>
          ))}
        </div>
      ) : isRide ? (
        <div className="flex flex-col gap-1.5">
          {rTrail && (
            <div className={`rounded-md border p-1.5 transition-all ${
              rTrail.target_reached
                ? 'bg-blue-50 border-blue-300'
                : 'bg-stone-50 border-stone-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    rTrail.target_reached
                      ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]'
                      : rTrail.armed ? 'bg-cyan-500' : 'bg-stone-300'
                  }`} />
                  <span className={`text-[10px] font-bold ${rTrail.target_reached ? 'text-blue-700' : rTrail.armed ? 'text-cyan-700' : 'text-slate-500'}`}>RTRAIL</span>
                  <span className="text-[8px] text-stone-400">추세탑승</span>
                </div>
                {rTrail.target_reached && exitPrices?.ride_trail_price != null && (
                  <span className="text-[10px] font-bold tabular-nums text-blue-700">
                    ${exitPrices.ride_trail_price.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <BConditionDot met={rTrail.target_reached} />
                  <span className={`text-[9px] w-[30px] flex-shrink-0 ${rTrail.target_reached ? 'text-blue-600' : 'text-stone-500'}`}>MFE</span>
                  <BProgressBar current={rTrail.ride_mfe_pct} target={rTrail.ride_target} />
                  <span className={`text-[9px] tabular-nums w-[44px] text-right flex-shrink-0 ${rTrail.target_reached ? 'text-blue-600' : 'text-stone-500'}`}>
                    +{rTrail.ride_mfe_pct.toFixed(2)}%
                  </span>
                </div>
                {rTrail.target_reached ? (
                  <div className="flex items-center gap-1.5 bg-blue-50 rounded px-1 py-0.5">
                    <TrendingUp className="w-2.5 h-2.5 text-blue-500" />
                    <span className="text-[9px] text-blue-700 font-semibold">트레일링</span>
                    <span className="text-[9px] tabular-nums text-blue-800 font-bold">
                      스톱 {rTrail.trail_stop >= 0 ? '+' : ''}{rTrail.trail_stop.toFixed(2)}%
                    </span>
                    <span className="text-[9px] text-stone-400">|</span>
                    <span className="text-[9px] tabular-nums text-slate-700">
                      현재 {rTrail.current_pnl >= 0 ? '+' : ''}{rTrail.current_pnl.toFixed(2)}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-stone-500 flex-1">
                      목표 +{rTrail.ride_target.toFixed(1)}% | 트레일 {rTrail.ride_trail_pct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {cut && (
            <div className={`rounded-md border p-1.5 transition-all ${
              cut.armed
                ? 'bg-rose-50 border-rose-300'
                : 'bg-stone-50 border-stone-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    cut.armed ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.8)]' : 'bg-stone-300'
                  }`} />
                  <span className={`text-[10px] font-bold ${cut.armed ? 'text-rose-700' : 'text-slate-500'}`}>CUT</span>
                  <span className="text-[8px] text-stone-400">손절</span>
                </div>
                <span className={`text-[10px] font-bold tabular-nums ${cut.armed ? 'text-rose-700' : 'text-slate-400'}`}>
                  MAE {(cut.mae_threshold ?? exitPrices?.cut_threshold_mae ?? 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <BConditionDot met={cut.mae_ok} />
                  <span className={`text-[9px] w-[30px] flex-shrink-0 ${cut.mae_ok ? 'text-rose-600' : 'text-stone-400'}`}>MAE</span>
                  <BProgressBar current={Math.abs(cut.mae_current ?? 0)} target={Math.abs(cut.mae_threshold ?? 1)} />
                  <span className={`text-[9px] tabular-nums w-[36px] text-right flex-shrink-0 ${cut.mae_ok ? 'text-rose-600' : 'text-slate-400'}`}>
                    {(cut.mae_current ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BConditionDot met={cut.ema_reversed} />
                  <span className={`text-[9px] flex-1 ${cut.ema_reversed ? 'text-rose-700' : 'text-stone-400'}`}>1m EMA 역전</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {vwap && (
            <div className={`rounded-md border p-1.5 transition-all ${
              vwap.armed
                ? 'bg-teal-50 border-teal-300'
                : 'bg-stone-50 border-stone-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    vwap.armed ? 'bg-teal-500 shadow-[0_0_5px_rgba(20,184,166,0.8)]' : 'bg-stone-300'
                  }`} />
                  <span className={`text-[10px] font-bold ${vwap.armed ? 'text-teal-700' : 'text-slate-500'}`}>VWAP</span>
                  <span className="text-[8px] text-stone-400">익절</span>
                </div>
                {(exitPrices?.vwap_target ?? vwap.vwap_target) != null && (
                  <span className={`text-[10px] font-bold tabular-nums ${vwap.armed ? 'text-teal-700' : 'text-slate-400'}`}>
                    ${(exitPrices?.vwap_target ?? vwap.vwap_target!).toFixed(1)}
                  </span>
                )}
              </div>
              {vwap.distance_to_vwap != null && (
                <BVwapRangeBar
                  maePct={cut?.mae_current ?? 0}
                  distToVwap={vwap.distance_to_vwap}
                  currentPnl={currentPnl}
                />
              )}
            </div>
          )}

          {swTrail && (
            <div className={`rounded-md border p-1.5 transition-all ${
              swTrail.target_reached
                ? 'bg-amber-50 border-amber-300'
                : swTrail.armed
                  ? 'bg-stone-50 border-amber-300/60'
                  : 'bg-stone-50 border-stone-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    swTrail.target_reached
                      ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]'
                      : swTrail.armed ? 'bg-amber-400/60' : 'bg-stone-300'
                  }`} />
                  <span className={`text-[10px] font-bold ${swTrail.target_reached ? 'text-amber-700' : swTrail.armed ? 'text-amber-600' : 'text-slate-500'}`}>TRAIL</span>
                  <span className="text-[8px] text-stone-400">조기익절</span>
                </div>
                {swTrail.target_reached && exitPrices?.sw_trail_price != null && (
                  <span className="text-[10px] font-bold tabular-nums text-amber-700">
                    ${exitPrices.sw_trail_price.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <BConditionDot met={swTrail.target_reached} />
                  <span className={`text-[9px] w-[30px] flex-shrink-0 ${swTrail.target_reached ? 'text-amber-600' : 'text-stone-500'}`}>MFE</span>
                  <BProgressBar current={swTrail.sw_mfe_pct} target={swTrail.sw_trail_target} />
                  <span className={`text-[9px] tabular-nums w-[44px] text-right flex-shrink-0 ${swTrail.target_reached ? 'text-amber-600' : 'text-stone-500'}`}>
                    +{swTrail.sw_mfe_pct.toFixed(2)}%
                  </span>
                </div>
                {swTrail.target_reached ? (
                  <div className="flex items-center gap-1.5 bg-amber-50 rounded px-1 py-0.5">
                    <TrendingUp className="w-2.5 h-2.5 text-amber-500" />
                    <span className="text-[9px] text-amber-700 font-semibold">트레일링</span>
                    <span className="text-[9px] tabular-nums text-amber-800 font-bold">
                      스톱 {swTrail.trail_stop >= 0 ? '+' : ''}{swTrail.trail_stop.toFixed(2)}%
                    </span>
                    <span className="text-[9px] text-stone-400">|</span>
                    <span className="text-[9px] tabular-nums text-slate-700">
                      현재 {swTrail.current_pnl >= 0 ? '+' : ''}{swTrail.current_pnl.toFixed(2)}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-stone-500 flex-1">
                      목표 +{swTrail.sw_trail_target.toFixed(1)}% | 트레일 {swTrail.sw_trail_pct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {cut && (
            <div className={`rounded-md border p-1.5 transition-all ${
              cut.armed
                ? 'bg-rose-50 border-rose-300'
                : 'bg-stone-50 border-stone-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    cut.armed ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.8)]' : 'bg-stone-300'
                  }`} />
                  <span className={`text-[10px] font-bold ${cut.armed ? 'text-rose-700' : 'text-slate-500'}`}>CUT</span>
                  <span className="text-[8px] text-stone-400">손절</span>
                  {(cut.consecutive_cuts ?? 0) > 0 && (
                    <span className="text-[8px] font-bold text-rose-600 bg-rose-100 px-1 rounded">
                      x{cut.consecutive_cuts}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-bold tabular-nums ${cut.armed ? 'text-rose-700' : 'text-slate-400'}`}>
                  MAE {(cut.mae_threshold ?? exitPrices?.cut_threshold_mae ?? 0).toFixed(1)}%
                </span>
              </div>
              {(() => {
                const steps = strategyParams?.cut_prog_steps;
                if (steps && steps.length > 1) {
                  const currentIdx = cut.consecutive_cuts ?? 0;
                  return (
                    <div className="flex items-center gap-0.5 mb-1">
                      {steps.map((step: number, i: number) => {
                        const isActive = i === Math.min(currentIdx, steps.length - 1);
                        const isPast = i < currentIdx;
                        return (
                          <div key={i} className="flex items-center gap-0.5">
                            <div className={`text-[8px] tabular-nums px-1 py-px rounded transition-all ${
                              isActive
                                ? 'bg-rose-200 text-rose-700 font-bold ring-1 ring-rose-400/50'
                                : isPast
                                  ? 'bg-rose-100 text-rose-400'
                                  : 'bg-stone-100 text-stone-400'
                            }`}>
                              {step.toFixed(1)}
                            </div>
                            {i < steps.length - 1 && (
                              <div className={`w-1.5 h-px ${isPast ? 'bg-rose-300' : 'bg-stone-200'}`} />
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
                  <BConditionDot met={cut.mae_ok} />
                  <span className={`text-[9px] w-[30px] flex-shrink-0 ${cut.mae_ok ? 'text-rose-600' : 'text-stone-400'}`}>MAE</span>
                  <BProgressBar current={Math.abs(cut.mae_current ?? 0)} target={Math.abs(cut.mae_threshold ?? 1)} />
                  <span className={`text-[9px] tabular-nums w-[36px] text-right flex-shrink-0 ${cut.mae_ok ? 'text-rose-600' : 'text-slate-400'}`}>
                    {(cut.mae_current ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BConditionDot met={cut.ema_reversed} />
                  <span className={`text-[9px] flex-1 ${cut.ema_reversed ? 'text-rose-700' : 'text-stone-400'}`}>1m EMA 역전</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
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
    const entryConditionsLong = data.strategy?.entryConditionsLong || data.strategy?.entry_conditions_long;
    const entryConditionsShort = data.strategy?.entryConditionsShort || data.strategy?.entry_conditions_short;
    const entryDetails = data.strategyStatus?.entryDetails || data.strategy?.entryDetails || data.strategy?.entry_details;

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
        <div className="bg-white border border-amber-200 rounded-lg shadow-sm p-2">
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

            <div className="border-t border-amber-200 pt-1.5">
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

        <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-slate-700 tracking-wide uppercase">Entry Conditions</h3>
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
                    ? (isLongSide ? 'bg-cyan-50 border-cyan-400' : 'bg-orange-50 border-orange-400')
                    : isCloser && isNear
                      ? (isLongSide ? 'bg-cyan-50/60 border-cyan-300' : 'bg-orange-50/60 border-orange-300')
                      : 'bg-stone-50/50 border-stone-200/50';
                  const labelColor = met
                    ? (isLongSide ? 'text-cyan-600 font-bold' : 'text-orange-600 font-bold')
                    : isCloser ? (isLongSide ? 'text-cyan-600' : 'text-orange-600') : 'text-stone-400';

                  const distLabel = met
                    ? (rawDist > 0 ? `+${rawDist.toFixed(3)}%` : '0.000%')
                    : `${rawDist.toFixed(3)}%`;
                  const distColor = met
                    ? (isLongSide ? 'text-cyan-700' : 'text-orange-700')
                    : isNear ? (isLongSide ? 'text-cyan-600' : 'text-orange-600') : 'text-stone-500';

                  const barTrack = 'bg-stone-200/80';
                  const barFill = met
                    ? (isLongSide ? 'bg-cyan-500' : 'bg-orange-500')
                    : isNear
                      ? (isLongSide ? 'bg-cyan-400/70' : 'bg-orange-400/70')
                      : 'bg-stone-300/60';

                  return (
                    <div key={side} className={`rounded-md border p-1.5 transition-all duration-300 ${panelBg}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] font-semibold tracking-wide ${labelColor}`}>{side}</span>
                        {met && <span className="text-[8px] font-bold text-emerald-600 tracking-wider animate-pulse">MET</span>}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          {isLongSide ? (
                            <>
                              <span className="text-[9px] tabular-nums text-stone-400">{targetPrice.toFixed(1)}</span>
                              <span className={`text-[9px] tabular-nums font-medium ${distColor}`}>{distLabel}</span>
                            </>
                          ) : (
                            <>
                              <span className={`text-[9px] tabular-nums font-medium ${distColor}`}>{distLabel}</span>
                              <span className="text-[9px] tabular-nums text-stone-400">{targetPrice.toFixed(1)}</span>
                            </>
                          )}
                        </div>
                        <div className={`${barTrack} rounded-full h-[3px] overflow-hidden`}>
                          {isLongSide ? (
                            <div className={`h-full rounded-full transition-all duration-500 ease-out ml-auto ${barFill} ${met ? 'shadow-[0_0_4px_rgba(6,182,212,0.3)]' : ''}`}
                              style={{ width: `${progressPct}%` }} />
                          ) : (
                            <div className={`h-full rounded-full transition-all duration-500 ease-out ${barFill} ${met ? 'shadow-[0_0_4px_rgba(249,115,22,0.3)]' : ''}`}
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
            <div className="flex items-center justify-center h-8 text-slate-400 text-[11px]">
              Waiting...
            </div>
          )}
          {!hasPosition && (ss?.consec_cut_count ?? 0) >= 1 && (
            <div className="mt-1.5 flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded px-2 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[9px] font-semibold text-amber-700">
                연속CUT {ss?.consec_cut_count}/{ss?.strategy_params?.ride_consec_n ?? 2}
              </span>
              {(ss?.consec_cut_count ?? 0) >= (ss?.strategy_params?.ride_consec_n ?? 2) - 1 && (
                <span className="text-[8px] text-amber-800 bg-amber-200 px-1 rounded">RIDE 예고</span>
              )}
            </div>
          )}
        </div>

        <BinanceExitConditionsPanel
          exitConditions={ss?.exitConditions}
          exitPrices={ss?.exitPrices}
          inPosition={!!hasPosition}
          strategyParams={ss?.strategy_params}
          entryMode={ss?.entry_mode || data.position?.entry_mode}
          currentPnl={currentPnl}
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
        <div className="bg-white border border-amber-300 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-slate-800">Performance</h3>
            <DollarSign className="w-3 h-3 text-amber-600" />
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

        <div className="bg-white border border-amber-200 rounded-lg shadow-sm p-2">
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
            <div className="border-t border-amber-200 pt-1 mt-1">
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
      <div className="bg-white border border-amber-200 rounded-lg shadow-sm p-2 flex flex-col" style={{ height: '100%' }}>
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
