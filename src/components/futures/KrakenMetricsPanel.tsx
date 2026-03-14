import { KrakenDashboardData, V10StrategyStatus, ExitConditions } from '../../types/dashboard';
import { DollarSign, Activity, Target, History, ShieldAlert } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/time';
import { useRef, useEffect } from 'react';

interface Props {
  data: KrakenDashboardData;
  position: 'left' | 'right' | 'trades';
}

interface ExitConditionsPanelProps {
  exitConditions?: ExitConditions;
  exitPrices?: { ema_exit?: number; vreg_exit?: number; cut_threshold_mae?: number };
  inPosition: boolean;
  strategyParams?: { vreg_vol_mult?: number; vreg_min_pnl?: number; [key: string]: any };
}

function ConditionDot({ met }: { met: boolean }) {
  return (
    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${
      met ? 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]' : 'bg-slate-600'
    }`} />
  );
}

function ProgressBar({ current, target, reverse = false, color }: { current: number; target: number; reverse?: boolean; color?: string }) {
  let pct: number;
  pct = target !== 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
  const met = reverse ? current <= target : current >= target;
  const barColor = color ?? (met ? 'bg-cyan-400' : 'bg-slate-500');
  return (
    <div className="flex-1 bg-slate-700 rounded-full h-1 overflow-hidden">
      <div
        className={`h-1 rounded-full transition-all duration-300 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function DistanceBar({ distance_pct, label }: { distance_pct: number; label: string }) {
  const isSafe = distance_pct >= 0;
  const absVal = Math.abs(distance_pct);
  const maxRange = 2;
  const pct = isSafe
    ? Math.min(100, (absVal / maxRange) * 100)
    : Math.min(100, (absVal / maxRange) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSafe ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      <span className={`text-[8px] ${isSafe ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      <div className="flex-1 bg-slate-700 rounded-full h-1 overflow-hidden">
        <div
          className={`h-1 rounded-full transition-all duration-300 ${isSafe ? 'bg-emerald-400' : 'bg-rose-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[8px] tabular-nums min-w-[44px] text-right ${isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isSafe ? `+${distance_pct.toFixed(2)}%` : `${distance_pct.toFixed(2)}%`}
      </span>
    </div>
  );
}

function ExitConditionsPanel({ exitConditions, exitPrices, inPosition, strategyParams }: ExitConditionsPanelProps) {
  const vreg = exitConditions?.VREG;
  const ema = exitConditions?.EMA;
  const cut = exitConditions?.CUT;

  const hasData = !!(vreg || ema || cut);

  if (!inPosition) return null;

  return (
    <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold">Exit Conditions</div>
        <ShieldAlert className="w-3 h-3 text-slate-500" />
      </div>

      {!hasData ? (
        <div className="flex flex-col gap-1">
          {(['VREG', 'EMA', 'CUT'] as const).map(name => (
            <div key={name} className="flex items-center justify-between bg-slate-700/20 border border-slate-700/50 rounded px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-700 flex-shrink-0" />
                <span className="text-[9px] text-slate-600 font-semibold">{name}</span>
                <span className="text-[8px] text-slate-700">{name === 'CUT' ? '손절' : '익절'}</span>
              </div>
              <span className="text-[8px] text-slate-700">--</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {vreg && (
            <div className={`rounded-md border p-1.5 transition-all ${
              vreg.armed
                ? 'bg-cyan-900/30 border-cyan-600/50'
                : 'bg-slate-700/20 border-slate-700/50'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    vreg.armed
                      ? 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.9)]'
                      : 'bg-slate-600'
                  }`} />
                  <span className={`text-[9px] font-bold ${vreg.armed ? 'text-cyan-300' : 'text-slate-400'}`}>VREG</span>
                  <span className="text-[7px] text-slate-500">익절</span>
                </div>
                {exitPrices?.vreg_exit != null && (
                  <span className={`text-[9px] font-bold tabular-nums ${vreg.armed ? 'text-cyan-300' : 'text-slate-500'}`}>
                    ${exitPrices.vreg_exit.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <ConditionDot met={vreg.bars_ok} />
                  <span className={`text-[8px] w-[30px] flex-shrink-0 ${vreg.bars_ok ? 'text-cyan-300' : 'text-slate-500'}`}>봉수</span>
                  <ProgressBar current={vreg.bars_held} target={vreg.bars_min} />
                  <span className={`text-[8px] tabular-nums w-[36px] text-right flex-shrink-0 ${vreg.bars_ok ? 'text-cyan-300' : 'text-slate-500'}`}>
                    {vreg.bars_held}/{vreg.bars_min}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ConditionDot met={vreg.pnl_ok} />
                  <span className={`text-[8px] w-[30px] flex-shrink-0 ${vreg.pnl_ok ? 'text-emerald-400' : 'text-slate-500'}`}>PnL</span>
                  <ProgressBar current={vreg.pnl_current} target={strategyParams?.vreg_min_pnl ?? 0.7} />
                  <span className={`text-[8px] tabular-nums w-[36px] text-right flex-shrink-0 ${vreg.pnl_ok ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {vreg.pnl_current >= 0 ? '+' : ''}{vreg.pnl_current.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ConditionDot met={vreg.vol_spike} />
                  <span className={`text-[8px] w-[30px] flex-shrink-0 ${vreg.vol_spike ? 'text-cyan-300' : 'text-slate-500'}`}>거래량</span>
                  {vreg.vol_current_ratio != null ? (
                    <>
                      <ProgressBar current={vreg.vol_current_ratio} target={strategyParams?.vreg_vol_mult ?? 3.0} />
                      <span className={`text-[8px] tabular-nums w-[36px] text-right flex-shrink-0 ${vreg.vol_spike ? 'text-cyan-300' : 'text-slate-500'}`}>
                        {vreg.vol_current_ratio.toFixed(1)}/{strategyParams?.vreg_vol_mult ?? 3.0}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 bg-slate-700 rounded-full h-1" />
                      <span className="text-[8px] text-slate-600 w-[36px] text-right flex-shrink-0">{strategyParams?.vreg_vol_mult ?? 3.0}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {ema && (
            <div className={`rounded-md border p-1.5 transition-all ${
              ema.armed
                ? 'bg-emerald-900/30 border-emerald-600/50'
                : 'bg-slate-700/20 border-slate-700/50'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    ema.armed
                      ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.9)]'
                      : 'bg-slate-600'
                  }`} />
                  <span className={`text-[9px] font-bold ${ema.armed ? 'text-emerald-300' : 'text-slate-400'}`}>EMA</span>
                  <span className="text-[7px] text-slate-500">익절</span>
                </div>
                {exitPrices?.ema_exit != null && (
                  <span className={`text-[9px] font-bold tabular-nums ${ema.armed ? 'text-emerald-300' : 'text-slate-500'}`}>
                    ${exitPrices.ema_exit.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <ConditionDot met={ema.mfe_ok} />
                  <span className={`text-[8px] w-[30px] flex-shrink-0 ${ema.mfe_ok ? 'text-slate-300' : 'text-slate-600'}`}>MFE</span>
                  <ProgressBar current={ema.mfe_current} target={ema.mfe_gate} />
                  <span className={`text-[8px] tabular-nums w-[36px] text-right flex-shrink-0 ${ema.mfe_ok ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {ema.mfe_current >= 0 ? '+' : ''}{ema.mfe_current.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ConditionDot met={ema.pnl_ok} />
                  <span className={`text-[8px] w-[30px] flex-shrink-0 ${ema.pnl_ok ? 'text-slate-300' : 'text-slate-600'}`}>PnL</span>
                  <ProgressBar current={ema.pnl_current} target={ema.pnl_gate} />
                  <span className={`text-[8px] tabular-nums w-[36px] text-right flex-shrink-0 ${ema.pnl_ok ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {ema.pnl_current >= 0 ? '+' : ''}{ema.pnl_current.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )}

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
                  <span className={`text-[9px] font-bold ${cut.armed ? 'text-rose-300' : 'text-slate-400'}`}>CUT</span>
                  <span className="text-[7px] text-slate-500">손절</span>
                </div>
                {exitPrices?.cut_threshold_mae != null && (
                  <span className={`text-[9px] font-bold tabular-nums ${cut.armed ? 'text-rose-300' : 'text-slate-500'}`}>
                    MAE {exitPrices.cut_threshold_mae.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <ConditionDot met={cut.mae_ok} />
                  <span className={`text-[8px] w-[30px] flex-shrink-0 ${cut.mae_ok ? 'text-rose-300' : 'text-slate-600'}`}>MAE</span>
                  <ProgressBar current={Math.abs(cut.mae_current ?? 0)} target={Math.abs(cut.mae_threshold ?? 1)} />
                  <span className={`text-[8px] tabular-nums w-[36px] text-right flex-shrink-0 ${cut.mae_ok ? 'text-rose-400' : 'text-slate-500'}`}>
                    {(cut.mae_current ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ConditionDot met={cut.ema_reversed} />
                  <span className={`text-[8px] flex-1 ${cut.ema_reversed ? 'text-rose-300' : 'text-slate-600'}`}>1m EMA 역전</span>
                  {ema?.band_distance_pct != null && (
                    <span className={`text-[8px] tabular-nums ${ema.band_distance_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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

          {entryDetails ? (
            <div className="grid grid-cols-2 gap-1.5">
              {(['LONG', 'SHORT'] as const).map(side => {
                const isLongSide = side === 'LONG';
                const accentColor = isLongSide ? 'text-cyan-400' : 'text-orange-400';
                const barActive = isLongSide ? 'bg-cyan-400' : 'bg-orange-400';
                const textActive = isLongSide ? 'text-cyan-300' : 'text-orange-300';
                const panelActiveBg = isLongSide ? 'bg-cyan-500/15 border-cyan-500/40' : 'bg-orange-500/15 border-orange-500/40';

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
                    value = rawPct > 80 ? `${rawPct.toFixed(1)}% 진입불가` : `${rawPct.toFixed(1)}%`;
                  } else {
                    rawPct = range.short_pct ?? (100 - (range.position_pct ?? 0));
                    met = rawPct >= 20;
                    value = rawPct < 20 ? `${rawPct.toFixed(1)}% 진입불가` : `${rawPct.toFixed(1)}%`;
                  }
                  rows.push({ label: 'Range', pct: Math.min(100, rawPct), met, value, isRange: true, rangePct: rawPct, isShortRange: !isLongSide });
                }

                const allMet = rows.length > 0 && rows.every(r => r.met);

                return (
                  <div key={side} className={`rounded-md border p-1.5 transition-all duration-300 ${allMet ? panelActiveBg : 'bg-slate-700/40 border-transparent'}`}>
                    <div className={`text-[8px] font-semibold tracking-wide mb-1.5 ${accentColor}`}>{side}</div>
                    <div className="flex flex-col gap-1">
                      {rows.map(row => (
                        <div key={row.label} className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-[8px] ${row.met ? textActive : row.isRange && (row.isShortRange ? (row.rangePct ?? 0) < 20 : (row.rangePct ?? 0) > 80) ? 'text-slate-400' : 'text-slate-500'}`}>{row.label}</span>
                            <span className={`text-[8px] tabular-nums ${row.met ? textActive : row.isRange && (row.isShortRange ? (row.rangePct ?? 0) < 20 : (row.rangePct ?? 0) > 80) ? 'text-slate-400' : 'text-slate-500'}`}>{row.value}</span>
                          </div>
                          {row.isRange ? (
                            <div className="relative bg-slate-700 rounded-full h-1 overflow-hidden">
                              <div className="absolute right-0 top-0 h-1 bg-slate-500/60" style={{ width: '20%' }} />
                              {row.isShortRange ? (
                                <div
                                  className={`h-1 rounded-full transition-all duration-300 absolute right-0 top-0 z-10 ${(row.rangePct ?? 0) < 20 ? 'bg-slate-500' : barActive}`}
                                  style={{ width: `${row.pct}%` }}
                                />
                              ) : (
                                <div
                                  className={`h-1 rounded-full transition-all duration-300 relative z-10 ${(row.rangePct ?? 0) > 80 ? 'bg-slate-500' : barActive}`}
                                  style={{ width: `${row.pct}%` }}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="bg-slate-700 rounded-full h-1 overflow-hidden">
                              <div className={`h-1 rounded-full transition-all duration-300 ${row.met ? barActive : 'bg-slate-600/60'}`} style={{ width: `${row.pct}%` }} />
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
            <div className="flex items-center justify-center h-8 text-slate-500 text-[10px]">
              Waiting...
            </div>
          )}
        </div>

        <ExitConditionsPanel
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
