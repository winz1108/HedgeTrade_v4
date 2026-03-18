import { DollarSign, Activity, Target, History, ShieldAlert } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/time';
import { useRef, useEffect } from 'react';
import type { BFDashboardData, V10StrategyStatus, ExitConditions } from '../../types/dashboard';

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
  exitPrices?: { ema_exit?: number; vreg_exit?: number; cut_threshold_mae?: number };
  inPosition: boolean;
  strategyParams?: { vreg_vol_mult?: number; vreg_min_pnl?: number; [key: string]: any };
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

function BDistanceBar({ distance_pct, label }: { distance_pct: number; label: string }) {
  const isSafe = distance_pct >= 0;
  const absVal = Math.abs(distance_pct);
  const maxRange = 2;
  const pct = Math.min(100, (absVal / maxRange) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSafe ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      <span className={`text-[8px] ${isSafe ? 'text-slate-500' : 'text-stone-400'}`}>{label}</span>
      <div className="flex-1 bg-stone-200 rounded-full h-1 overflow-hidden">
        <div
          className={`h-1 rounded-full transition-all duration-300 ${isSafe ? 'bg-emerald-500' : 'bg-rose-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[8px] tabular-nums min-w-[44px] text-right ${isSafe ? 'text-emerald-600' : 'text-rose-500'}`}>
        {isSafe ? `+${distance_pct.toFixed(2)}%` : `${distance_pct.toFixed(2)}%`}
      </span>
    </div>
  );
}

function BinanceExitConditionsPanel({ exitConditions, exitPrices, inPosition, strategyParams }: BinanceExitConditionsPanelProps) {
  const vreg = exitConditions?.VREG;
  const ema = exitConditions?.EMA;
  const cut = exitConditions?.CUT;
  const hasData = !!(vreg || ema || cut);

  if (!inPosition) return null;

  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[9px] text-slate-500 uppercase tracking-wide font-semibold">Exit Conditions</div>
        <ShieldAlert className="w-3 h-3 text-slate-400" />
      </div>

      {!hasData ? (
        <div className="flex flex-col gap-1">
          {(['VREG', 'EMA', 'CUT'] as const).map(name => (
            <div key={name} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0" />
                <span className="text-[9px] text-stone-400 font-semibold">{name}</span>
                <span className="text-[8px] text-stone-300">{name === 'CUT' ? '손절' : '익절'}</span>
              </div>
              <span className="text-[8px] text-stone-300">--</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {vreg && (
            <div className={`rounded-md border p-1.5 transition-all ${
              vreg.armed
                ? 'bg-cyan-50 border-cyan-300'
                : 'bg-stone-50 border-stone-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    vreg.armed ? 'bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.8)]' : 'bg-stone-300'
                  }`} />
                  <span className={`text-[9px] font-bold ${vreg.armed ? 'text-cyan-700' : 'text-slate-500'}`}>VREG</span>
                  <span className="text-[7px] text-stone-400">익절</span>
                </div>
                {exitPrices?.vreg_exit != null && (
                  <span className={`text-[9px] font-bold tabular-nums ${vreg.armed ? 'text-cyan-700' : 'text-slate-400'}`}>
                    ${exitPrices.vreg_exit.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <BConditionDot met={vreg.bars_ok} />
                  <span className={`text-[8px] w-[30px] flex-shrink-0 ${vreg.bars_ok ? 'text-amber-400' : 'text-stone-500'}`}>봉수</span>
                  <BProgressBar current={vreg.bars_held} target={vreg.bars_min} />
                  <span className={`text-[8px] tabular-nums w-[36px] text-right flex-shrink-0 ${vreg.bars_ok ? 'text-amber-400' : 'text-stone-500'}`}>
                    {vreg.bars_held}/{vreg.bars_min}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BConditionDot met={vreg.pnl_ok} />
                  <span className={`text-[8px] w-[30px] flex-shrink-0 ${vreg.pnl_ok ? 'text-emerald-600' : 'text-stone-500'}`}>PnL</span>
                  <BProgressBar current={vreg.pnl_current} target={vreg.pnl_min ?? strategyParams?.vreg_min_pnl ?? 0.3} />
                  <span className={`text-[8px] tabular-nums w-[36px] text-right flex-shrink-0 ${vreg.pnl_ok ? 'text-emerald-600' : 'text-stone-500'}`}>
                    {vreg.pnl_current >= 0 ? '+' : ''}{vreg.pnl_current.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BConditionDot met={vreg.vol_spike} />
                  <span className={`text-[8px] w-[30px] flex-shrink-0 ${vreg.vol_spike ? 'text-amber-400' : 'text-stone-500'}`}>거래량</span>
                  {vreg.vol_current_ratio != null ? (
                    <>
                      <BProgressBar current={vreg.vol_current_ratio} target={vreg.vol_threshold ?? strategyParams?.vreg_vol_mult ?? 1.0} />
                      <span className={`text-[8px] tabular-nums w-[36px] text-right flex-shrink-0 ${vreg.vol_spike ? 'text-amber-400' : 'text-stone-500'}`}>
                        {vreg.vol_current_ratio.toFixed(1)}/{(vreg.vol_threshold ?? strategyParams?.vreg_vol_mult ?? 1.0).toFixed(1)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[8px] text-stone-500 w-[36px] text-right flex-shrink-0">{(vreg.vol_threshold ?? strategyParams?.vreg_vol_mult ?? 1.0).toFixed(1)}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {ema && (
            <div className={`rounded-md border p-1.5 transition-all ${
              ema.armed
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-stone-50 border-stone-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    ema.armed ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'bg-stone-300'
                  }`} />
                  <span className={`text-[9px] font-bold ${ema.armed ? 'text-emerald-700' : 'text-slate-500'}`}>EMA</span>
                  <span className="text-[7px] text-stone-400">익절</span>
                </div>
                {exitPrices?.ema_exit != null && (
                  <span className={`text-[9px] font-bold tabular-nums ${ema.armed ? 'text-emerald-700' : 'text-slate-400'}`}>
                    ${exitPrices.ema_exit.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <BConditionDot met={ema.mfe_ok} />
                  <span className={`text-[8px] w-[30px] flex-shrink-0 ${ema.mfe_ok ? 'text-slate-600' : 'text-stone-400'}`}>MFE</span>
                  <BProgressBar current={ema.mfe_current} target={ema.mfe_gate} />
                  <span className={`text-[8px] tabular-nums w-[36px] text-right flex-shrink-0 ${ema.mfe_ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {ema.mfe_current >= 0 ? '+' : ''}{ema.mfe_current.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BConditionDot met={ema.pnl_ok} />
                  <span className={`text-[8px] w-[30px] flex-shrink-0 ${ema.pnl_ok ? 'text-slate-600' : 'text-stone-400'}`}>PnL</span>
                  <BProgressBar current={ema.pnl_current} target={ema.pnl_gate} />
                  <span className={`text-[8px] tabular-nums w-[36px] text-right flex-shrink-0 ${ema.pnl_ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {ema.pnl_current >= 0 ? '+' : ''}{ema.pnl_current.toFixed(2)}%
                  </span>
                </div>
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
                  <span className={`text-[9px] font-bold ${cut.armed ? 'text-rose-700' : 'text-slate-500'}`}>CUT</span>
                  <span className="text-[7px] text-stone-400">손절</span>
                </div>
                {exitPrices?.cut_threshold_mae != null && (
                  <span className={`text-[9px] font-bold tabular-nums ${cut.armed ? 'text-rose-700' : 'text-slate-400'}`}>
                    MAE {exitPrices.cut_threshold_mae.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <BConditionDot met={cut.mae_ok} />
                  <span className={`text-[8px] w-[30px] flex-shrink-0 ${cut.mae_ok ? 'text-rose-600' : 'text-stone-400'}`}>MAE</span>
                  <BProgressBar current={Math.abs(cut.mae_current ?? 0)} target={Math.abs(cut.mae_threshold ?? 1)} />
                  <span className={`text-[8px] tabular-nums w-[36px] text-right flex-shrink-0 ${cut.mae_ok ? 'text-rose-600' : 'text-slate-400'}`}>
                    {(cut.mae_current ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BConditionDot met={cut.ema_reversed} />
                  <span className={`text-[8px] flex-1 ${cut.ema_reversed ? 'text-rose-700' : 'text-stone-400'}`}>1m EMA 역전</span>
                  {ema?.band_distance_pct != null && (
                    <span className={`text-[8px] tabular-nums ${ema.band_distance_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {ema.band_distance_pct >= 0 ? '+' : ''}{ema.band_distance_pct.toFixed(2)}%
                    </span>
                  )}
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

          {entryDetails ? (
            <div className="grid grid-cols-2 gap-1.5">
              {(['LONG', 'SHORT'] as const).map(side => {
                const isLongSide = side === 'LONG';
                const accentColor = isLongSide ? 'text-cyan-600' : 'text-orange-600';
                const barActive = isLongSide ? 'bg-cyan-500' : 'bg-orange-500';
                const textActive = isLongSide ? 'text-cyan-700' : 'text-orange-700';

                const rows: { label: string; pct: number; met: boolean; value: string; isRange?: boolean; rangePct?: number; isShortRange?: boolean }[] = [];

                if (entryDetails.ADX) {
                  const adx = entryDetails.ADX!;
                  const met = adx.current >= adx.threshold;
                  rows.push({ label: 'ADX', pct: Math.min(100, (adx.current / adx.threshold) * 100), met, value: `${adx.current.toFixed(1)}/${adx.threshold}` });
                }

                const emaEntry = entryDetails.EMA ?? entryDetails.ema ?? entryDetails['5m_ema'];
                if (emaEntry) {
                  if (isLongSide) {
                    const met = emaEntry.long_met ?? false;
                    const dist = emaEntry.long_distance_pct ?? 0;
                    const value = met ? '진입 가능' : `${dist.toFixed(2)}% 남음`;
                    rows.push({ label: 'EMA', pct: met ? 100 : 0, met, value });
                  } else {
                    const met = emaEntry.short_met ?? false;
                    const dist = emaEntry.short_distance_pct ?? 0;
                    const value = met ? '진입 가능' : `${dist.toFixed(2)}% 남음`;
                    rows.push({ label: 'EMA', pct: met ? 100 : 0, met, value });
                  }
                }

                if (entryDetails.Range) {
                  const range = entryDetails.Range!;
                  let rawPct: number; let met: boolean; let value: string;
                  if (isLongSide) {
                    rawPct = range.long_pct ?? range.position_pct ?? 0;
                    met = rawPct <= 80;
                    value = `${rawPct.toFixed(1)}%`;
                  } else {
                    rawPct = range.short_pct ?? (100 - (range.position_pct ?? 0));
                    met = rawPct <= 80;
                    value = `${rawPct.toFixed(1)}%`;
                  }
                  rows.push({ label: 'Range', pct: Math.min(100, rawPct), met, value, isRange: true, rangePct: rawPct, isShortRange: !isLongSide });
                }

                const allMet = rows.length > 0 && rows.every(r => r.met);
                const panelActiveBg = isLongSide ? 'bg-cyan-50 border-cyan-300' : 'bg-orange-50 border-orange-300';

                return (
                  <div key={side} className={`rounded-md border p-1.5 transition-all duration-300 ${allMet ? panelActiveBg : 'bg-stone-50 border-stone-200'}`}>
                    <div className={`text-[8px] font-semibold tracking-wide mb-1.5 ${accentColor}`}>{side}</div>
                    <div className="flex flex-col gap-1">
                      {rows.map(row => (
                        <div key={row.label} className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-[8px] ${row.met ? textActive : row.isRange && !row.met ? 'text-red-500' : 'text-stone-400'}`}>{row.label}</span>
                            <span className={`text-[8px] tabular-nums ${row.met ? textActive : row.isRange && !row.met ? 'text-red-500' : 'text-stone-400'}`}>{row.value}</span>
                          </div>
                          {row.isRange ? (
                            <div className="relative bg-stone-200 rounded-full h-1 overflow-hidden">
                              {row.isShortRange
                                ? <div className="absolute left-0 top-0 h-1 bg-stone-400/80" style={{ width: '20%' }} />
                                : <div className="absolute right-0 top-0 h-1 bg-stone-400/80" style={{ width: '20%' }} />
                              }
                              {row.isShortRange ? (
                                <div
                                  className={`h-1 rounded-full transition-all duration-300 absolute right-0 top-0 z-10 ${row.met ? barActive : 'bg-red-600'}`}
                                  style={{ width: `${row.pct}%` }}
                                />
                              ) : (
                                <div
                                  className={`h-1 rounded-full transition-all duration-300 relative z-10 ${row.met ? barActive : 'bg-red-600'}`}
                                  style={{ width: `${row.pct}%` }}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="bg-stone-200 rounded-full h-1 overflow-hidden">
                              <div className={`h-1 rounded-full transition-all duration-300 ${row.met ? barActive : 'bg-stone-300'}`} style={{ width: `${row.pct}%` }} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-8 text-slate-400 text-[10px]">
              Waiting...
            </div>
          )}
        </div>

        <BinanceExitConditionsPanel
          exitConditions={ss?.exitConditions}
          exitPrices={ss?.exitPrices}
          inPosition={!!hasPosition}
          strategyParams={ss?.strategy_params}
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
