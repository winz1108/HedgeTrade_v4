import { TrendingUp, TrendingDown, Gauge, Activity, ShieldAlert } from 'lucide-react';
import type {
  GearPanel,
  V29EntryDetails,
  V29NextEntry,
  V29ActiveEntry,
  Sim1y,
} from '../types/dashboard';

/* ---------------------------------------------------------------------------
 * GearExitPanel — single 3-shape progress panel (gear0 / gear1 / gear2)
 * -------------------------------------------------------------------------*/

interface GearExitPanelProps {
  gearPanel: GearPanel | null | undefined;
  dark?: boolean;
  positionSide?: 'LONG' | 'SHORT' | string | null | undefined;
  leverage?: number | null;
  slPrice?: number | null;
  signalSlPrice?: number | null;
  signalSlActive?: boolean;
  currentPrice?: number | null;
}

export function GearExitPanel({ gearPanel, dark = true, positionSide, leverage, slPrice, signalSlPrice, signalSlActive = true, currentPrice }: GearExitPanelProps) {
  const panelBg = dark ? 'bg-slate-800/95 border-slate-700' : 'bg-white border-stone-200';
  const title = dark ? 'text-slate-100' : 'text-slate-800';
  const subText = dark ? 'text-slate-300' : 'text-slate-600';
  const dimText = dark ? 'text-slate-500' : 'text-stone-400';

  // Hide both panels entirely when no active position
  if (!gearPanel || !gearPanel.active) {
    return null;
  }

  const {
    stage,
    left_label,
    left_price,
    right_label,
    right_price,
    current_price,
    progress,
    active_lock_price,
    mfe_pct,
    g1_min_mfe_pct,
    ride_trigger_pct,
  } = gearPanel;

  const isLong = (positionSide ?? '').toString().toUpperCase() === 'LONG';
  const entryPrice = left_price;
  // Prefer live websocket price for smooth realtime P&L; fall back to gear snapshot.
  const livePrice = typeof currentPrice === 'number' && currentPrice > 0 ? currentPrice : current_price;
  const pnlPct =
    entryPrice > 0
      ? ((livePrice - entryPrice) / entryPrice) * 100 * (isLong ? 1 : -1)
      : 0;
  const isLoss = pnlPct < 0;

  const fmtPrice = (n: number): string =>
    n >= 1000 ? n.toFixed(2) : n.toFixed(n < 1 ? 6 : 4);

  const DirIcon = isLong ? TrendingUp : TrendingDown;

  // Strip trailing "(+0.20%)" / "(-1.2%)" style suffixes from labels
  const cleanLabel = (label: string): string =>
    (label || '').replace(/\s*\(\s*[-+]?\d+(?:\.\d+)?\s*%?\s*\)\s*$/g, '').trim();

  // ====================================================================
  // SL PANEL: shows Signal SL (±0.8%, conditional) + Max SL (±3%, hard) on
  // a single axis. Price bar fills from entry outward toward Max SL.
  //   LONG  → [Max SL] ──── [Signal SL] ──── [Entry]   (loss goes left)
  //   SHORT → [Entry] ──── [Signal SL] ──── [Max SL]   (loss goes right)
  // ====================================================================
  const slActive = isLoss;
  const slValid = typeof slPrice === 'number' && slPrice > 0 && entryPrice > 0;
  const sigValid =
    typeof signalSlPrice === 'number' &&
    (signalSlPrice ?? 0) > 0 &&
    entryPrice > 0 &&
    slValid &&
    Math.abs((signalSlPrice as number) - entryPrice) < Math.abs((slPrice as number) - entryPrice);

  // Bar range = entry → max_sl.  Marker position = live price's distance from entry.
  let slProgress = 0;
  if (slValid && slPrice) {
    const total = Math.abs(entryPrice - slPrice);
    const travelled = isLoss ? Math.abs(livePrice - entryPrice) : 0;
    slProgress = total > 0 ? Math.min(100, Math.max(0, (travelled / total) * 100)) : 0;
  } else if (isLoss) {
    slProgress = Math.min(100, Math.abs(pnlPct) * 50);
  }

  // Signal SL tick position (percentage of entry→max_sl distance).
  let sigTickPct: number | null = null;
  if (sigValid && slPrice && signalSlPrice) {
    const total = Math.abs(entryPrice - slPrice);
    const sigDist = Math.abs(signalSlPrice - entryPrice);
    sigTickPct = total > 0 ? Math.min(100, Math.max(0, (sigDist / total) * 100)) : null;
  }

  const slSubBg = slActive
    ? dark
      ? 'bg-gradient-to-br from-rose-950/50 via-slate-900/60 to-slate-900/60 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.18)]'
      : 'bg-gradient-to-br from-rose-50 via-stone-50 to-stone-50 border-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
    : dark
      ? 'bg-slate-900/40 border-slate-700/60'
      : 'bg-stone-50 border-stone-200';

  const sigColorActive = dark ? 'text-amber-300' : 'text-amber-700';
  const sigColorIdle = dark ? 'text-slate-500' : 'text-stone-400';
  const maxColorActive = dark ? 'text-rose-300' : 'text-rose-700';

  const slPanel = (
    <div
      className={`${slSubBg} border rounded-md p-2 ${
        slActive ? '' : 'opacity-55 grayscale-[35%]'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <ShieldAlert
            className={`w-3 h-3 ${
              slActive ? (dark ? 'text-rose-400' : 'text-rose-600') : dark ? 'text-slate-500' : 'text-stone-400'
            }`}
          />
          <h3 className={`text-[10px] font-bold tracking-wide uppercase ${title}`}>SL</h3>
        </div>
        <div className="flex items-center gap-1">
          {sigValid && (
            <span
              className={`text-[8px] font-bold tracking-wider px-1 py-0.5 border rounded ${
                signalSlActive
                  ? dark
                    ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                  : dark
                    ? 'bg-slate-700/60 text-slate-500 border-slate-600'
                    : 'bg-stone-100 text-stone-400 border-stone-300'
              }`}
              title={signalSlActive ? 'Signal SL armed (MFE < 0.2%)' : 'Signal SL disarmed (floor took over)'}
            >
              SIG {signalSlActive ? 'ON' : 'OFF'}
            </span>
          )}
          <span
            className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 border rounded ${
              slActive
                ? dark
                  ? 'bg-rose-500/25 text-rose-200 border-rose-400/60 shadow-[0_0_8px_rgba(244,63,94,0.45)]'
                  : 'bg-rose-100 text-rose-700 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.35)]'
                : dark
                  ? 'bg-slate-700/70 text-slate-400 border-slate-600'
                  : 'bg-stone-100 text-stone-500 border-stone-300'
            }`}
          >
            {slActive ? 'SL · ACTIVE' : 'SL · STANDBY'}
          </span>
        </div>
      </div>

      {/* SL bar with Signal SL tick */}
      <div
        className={`relative ${
          dark ? 'bg-slate-700/40' : 'bg-stone-200/80'
        } rounded-full h-2.5 overflow-hidden`}
      >
        <div
          className={`absolute inset-y-0 rounded-full transition-all duration-500 ${
            slActive
              ? dark ? 'bg-rose-400/90' : 'bg-rose-500'
              : dark ? 'bg-slate-500/70' : 'bg-stone-400/70'
          }`}
          style={
            isLong
              ? { right: 0, width: `${slProgress}%` }
              : { left: 0, width: `${slProgress}%` }
          }
        />
        {sigTickPct != null && (
          <div
            className={`absolute top-[-2px] bottom-[-2px] w-[2px] ${
              signalSlActive
                ? dark ? 'bg-amber-300' : 'bg-amber-500'
                : dark ? 'bg-slate-500' : 'bg-stone-400'
            } ${signalSlActive ? '' : 'opacity-50'}`}
            style={isLong ? { right: `${sigTickPct}%` } : { left: `${sigTickPct}%` }}
            title={`Signal SL ${fmtPrice(signalSlPrice as number)}`}
          />
        )}
      </div>

      {/* 3-column labels: Max SL / Signal SL / Entry (mirrored for SHORT) */}
      <div className="flex justify-between items-start mt-1">
        <div className="flex flex-col items-start min-w-0">
          <span className={`text-[8px] uppercase tracking-wide ${dimText}`}>
            {isLong ? 'Max SL' : 'Entry'}
          </span>
          <span
            className={`text-[10px] font-bold truncate ${
              isLong
                ? slActive ? maxColorActive : dimText
                : subText
            }`}
          >
            {isLong ? (slValid ? fmtPrice(slPrice as number) : '—') : fmtPrice(entryPrice)}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className={`text-[8px] uppercase tracking-wide ${dimText}`}>Signal SL</span>
          <span
            className={`text-[10px] font-bold ${
              sigValid ? (signalSlActive ? sigColorActive : sigColorIdle) : dimText
            }`}
          >
            {sigValid ? fmtPrice(signalSlPrice as number) : '—'}
          </span>
        </div>
        <div className="flex flex-col items-end min-w-0">
          <span className={`text-[8px] uppercase tracking-wide ${dimText}`}>
            {isLong ? 'Entry' : 'Max SL'}
          </span>
          <span
            className={`text-[10px] font-bold truncate ${
              isLong
                ? subText
                : slActive ? maxColorActive : dimText
            }`}
          >
            {isLong ? fmtPrice(entryPrice) : (slValid ? fmtPrice(slPrice as number) : '—')}
          </span>
        </div>
      </div>
    </div>
  );

  // ====================================================================
  // GEAR PANEL (always rendered). Active ⇢ gear1/gear2, Greyed otherwise.
  // ====================================================================
  const clampedProgress = Math.max(0, Math.min(100, progress));

  // Shape tone per stage. In profit, gear0 is "arming" (greyed/inactive look),
  // gear1 active (amber), gear2 active (emerald with glow).
  const isGearActive = stage === 'gear1' || stage === 'gear2';
  const shape = (() => {
    if (stage === 'gear2') {
      return {
        badge: 'Gear 2 · RIDE',
        badgeCls: dark
          ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/60'
          : 'bg-emerald-100 text-emerald-800 border-emerald-400',
        track: dark ? 'bg-slate-700/80 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300',
        fill: 'bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300',
        glow: 'shadow-[0_0_12px_rgba(16,185,129,0.55)]',
        text: dark ? 'text-emerald-300' : 'text-emerald-700',
        iconColor: dark ? 'text-emerald-300' : 'text-emerald-600',
      };
    }
    if (stage === 'gear1') {
      return {
        badge: 'Gear 1 · SAFE',
        badgeCls: dark
          ? 'bg-amber-500/25 text-amber-200 border-amber-400/50'
          : 'bg-amber-100 text-amber-800 border-amber-400',
        track: dark ? 'bg-slate-700/80 border-amber-500/30' : 'bg-amber-50 border-amber-300',
        fill: 'bg-gradient-to-r from-amber-500 to-yellow-400',
        glow: 'shadow-[0_0_6px_rgba(251,191,36,0.35)]',
        text: dark ? 'text-amber-300' : 'text-amber-700',
        iconColor: dark ? 'text-amber-300' : 'text-amber-600',
      };
    }
    // gear0 in profit → deactivated grey look
    return {
      badge: 'Gear 0 · ARMING',
      badgeCls: dark
        ? 'bg-slate-700/70 text-slate-400 border-slate-600'
        : 'bg-stone-100 text-stone-500 border-stone-300',
      track: dark ? 'bg-slate-700/40 border-slate-700' : 'bg-stone-100 border-stone-200',
      fill: dark ? 'bg-slate-600' : 'bg-stone-300',
      glow: '',
      text: dark ? 'text-slate-400' : 'text-stone-500',
      iconColor: dark ? 'text-slate-500' : 'text-stone-400',
    };
  })();

  // Gear panel is active only when in profit AND gear1/gear2
  const gearActiveNow = !isLoss && isGearActive;
  const wrapperDim = gearActiveNow ? '' : 'opacity-55 grayscale-[35%]';

  const gearSubBg = (() => {
    if (!gearActiveNow) {
      return dark ? 'bg-slate-900/40 border-slate-700/60' : 'bg-stone-50 border-stone-200';
    }
    if (stage === 'gear2') {
      return dark
        ? 'bg-gradient-to-br from-emerald-950/50 via-slate-900/60 to-slate-900/60 border-emerald-500/45 shadow-[0_0_10px_rgba(16,185,129,0.20)]'
        : 'bg-gradient-to-br from-emerald-50 via-stone-50 to-stone-50 border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.18)]';
    }
    return dark
      ? 'bg-gradient-to-br from-amber-950/50 via-slate-900/60 to-slate-900/60 border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.20)]'
      : 'bg-gradient-to-br from-amber-50 via-stone-50 to-stone-50 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.18)]';
  })();

  const gearPanelNode = (
    <div className={`${gearSubBg} border rounded-md p-2 ${wrapperDim}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Gauge className={`w-3 h-3 ${shape.iconColor}`} />
          <h3 className={`text-[10px] font-bold tracking-wide uppercase ${title}`}>Gear</h3>
        </div>
        <span
          className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 border rounded ${shape.badgeCls} ${shape.glow}`}
        >
          {shape.badge}
        </span>
      </div>

      {/* Progress bar — thicker to align with SL bar */}
      <div className={`relative ${dark ? 'bg-slate-700/40' : 'bg-stone-200/80'} rounded-full h-2.5 overflow-hidden`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
            gearActiveNow
              ? stage === 'gear2'
                ? dark ? 'bg-emerald-400/90' : 'bg-emerald-500'
                : dark ? 'bg-amber-400/90' : 'bg-amber-500'
              : dark ? 'bg-slate-500/70' : 'bg-stone-400/70'
          }`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      {/* Left/Right price labels (current price removed — progress bar conveys it) */}
      <div className="flex justify-between items-center mt-1">
        <div className="flex flex-col items-start">
          <span className={`text-[8px] uppercase tracking-wide ${dimText}`}>{cleanLabel(left_label)}</span>
          <span className={`text-[10px] font-bold ${shape.text}`}>{fmtPrice(left_price)}</span>
        </div>
        <div className="flex items-center gap-1">
          <DirIcon className={`w-2.5 h-2.5 ${isLong ? 'text-cyan-400' : 'text-orange-400'}`} />
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-[8px] uppercase tracking-wide ${dimText}`}>{cleanLabel(right_label)}</span>
          <span className={`text-[10px] font-bold ${shape.text}`}>{fmtPrice(right_price)}</span>
        </div>
      </div>

      {/* Metrics row */}
      <div className={`mt-1.5 grid grid-cols-3 gap-1 text-[9px] ${subText}`}>
        <div className="flex flex-col items-center">
          <span className={`${dimText} uppercase tracking-wide`}>MFE</span>
          <span className={`font-bold ${mfe_pct >= 0 ? (dark ? 'text-emerald-400' : 'text-emerald-600') : (dark ? 'text-rose-400' : 'text-rose-600')}`}>
            {mfe_pct >= 0 ? '+' : ''}{mfe_pct.toFixed(2)}%
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className={`${dimText} uppercase tracking-wide`}>G1 Arm</span>
          <span className="font-bold">{g1_min_mfe_pct.toFixed(2)}%</span>
        </div>
        <div className="flex flex-col items-center">
          <span className={`${dimText} uppercase tracking-wide`}>G2 Arm</span>
          <span className="font-bold">{ride_trigger_pct.toFixed(2)}%</span>
        </div>
      </div>

      {active_lock_price > 0 && isGearActive && (
        <div className="mt-1.5 flex justify-between items-center">
          <span className={`text-[9px] uppercase tracking-wide ${dimText}`}>Floor</span>
          <span className={`text-[10px] font-bold ${shape.text}`}>{fmtPrice(active_lock_price)}</span>
        </div>
      )}
    </div>
  );

  // Wrap Gear + SL inside a single EXIT panel (Gear on top, SL on bottom).
  const exitWrapperBg = dark ? 'bg-slate-800/95 border-slate-700' : 'bg-white border-stone-200';
  return (
    <div className={`${exitWrapperBg} border rounded-lg shadow-sm p-2`}>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className={`text-[11px] font-bold tracking-wider uppercase ${title}`}>Exit</h3>
        {leverage != null && leverage > 1 && (
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 border rounded ${
              dark
                ? 'bg-amber-500/15 text-amber-300 border-amber-400/40'
                : 'bg-amber-50 text-amber-700 border-amber-300'
            }`}
          >
            {leverage}x
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {gearPanelNode}
        {slPanel}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * V2hEntryPanel — shows up to 3 next_entries OR 1 active_entry
 * -------------------------------------------------------------------------*/

interface V2hEntryPanelProps {
  v29: V29EntryDetails | null | undefined;
  dark?: boolean;
}

function tfToMs(tf: string): number {
  switch (tf) {
    case '15m':
      return 15 * 60 * 1000;
    case '30m':
      return 30 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '4h':
      return 4 * 60 * 60 * 1000;
    case '1d':
      return 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}

function Sim1yCells({ sim, dark }: { sim: Sim1y | null; dark: boolean }) {
  const dimText = dark ? 'text-slate-500' : 'text-stone-400';
  const label = dark ? 'text-slate-300' : 'text-slate-600';
  if (!sim) {
    return <div className={`text-[9px] ${dimText}`}>시뮬 데이터 없음</div>;
  }
  const goodBad = (v: number) =>
    v >= 0 ? (dark ? 'text-emerald-400' : 'text-emerald-600') : dark ? 'text-rose-400' : 'text-rose-600';
  return (
    <div className="grid grid-cols-5 gap-1 mt-1">
      <div className="flex flex-col items-center">
        <span className={`text-[8px] uppercase ${dimText}`}>N</span>
        <span className={`text-[10px] font-bold ${label}`}>{sim.n}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className={`text-[8px] uppercase ${dimText}`}>WR</span>
        <span className={`text-[10px] font-bold ${label}`}>{sim.wr.toFixed(0)}%</span>
      </div>
      <div className="flex flex-col items-center">
        <span className={`text-[8px] uppercase ${dimText}`}>Ret</span>
        <span className={`text-[10px] font-bold ${goodBad(sim.cum_ret_pct)}`}>
          {sim.cum_ret_pct >= 0 ? '+' : ''}
          {sim.cum_ret_pct.toFixed(1)}%
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className={`text-[8px] uppercase ${dimText}`}>MDD</span>
        <span className={`text-[10px] font-bold ${dark ? 'text-rose-400' : 'text-rose-600'}`}>
          {sim.mdd_pct.toFixed(1)}%
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className={`text-[8px] uppercase ${dimText}`}>Hold</span>
        <span className={`text-[10px] font-bold ${label}`}>{sim.avg_hold_h.toFixed(1)}h</span>
      </div>
    </div>
  );
}

function NextEntryCard({
  entry,
  dark,
  rank,
}: {
  entry: V29NextEntry;
  dark: boolean;
  rank: number;
}) {
  const isLong = entry.side === 'LONG';
  const sideCls = isLong
    ? dark
      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
      : 'bg-cyan-50 border-cyan-300 text-cyan-700'
    : dark
      ? 'bg-orange-500/15 border-orange-500/50 text-orange-300'
      : 'bg-orange-50 border-orange-300 text-orange-700';
  const cardBg = dark ? 'bg-slate-900/60 border-slate-700' : 'bg-stone-50 border-stone-200';
  const label = dark ? 'text-slate-300' : 'text-slate-700';
  const dimText = dark ? 'text-slate-500' : 'text-stone-500';

  const fmtPrice = (n: number) => (n >= 1000 ? n.toFixed(2) : n.toFixed(n < 1 ? 6 : 4));

  return (
    <div className={`${cardBg} border rounded-lg p-1.5 space-y-1`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className={`text-[9px] font-bold ${dimText}`}>#{rank}</span>
          <span className={`text-[10px] font-bold ${label} truncate`}>{entry.strat}</span>
        </div>
        <span
          className={`text-[8px] font-bold px-1.5 py-0.5 border rounded tracking-wider ${sideCls}`}
        >
          {entry.side}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="flex flex-col">
          <span className={`text-[8px] uppercase ${dimText}`}>Entry</span>
          <span className={`text-[10px] font-bold ${label}`}>{fmtPrice(entry.expected_entry_price)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-[8px] uppercase ${dimText}`}>SL</span>
          <span className={`text-[10px] font-bold ${dark ? 'text-rose-400' : 'text-rose-600'}`}>
            {fmtPrice(entry.sl_price)}
            <span className={`ml-1 text-[8px] ${dimText}`}>({entry.sl_pct.toFixed(2)}%)</span>
          </span>
        </div>
      </div>
      <Sim1yCells sim={entry.sim_1y} dark={dark} />
    </div>
  );
}

function ActiveEntryCard({ active, dark }: { active: V29ActiveEntry; dark: boolean }) {
  const isLong = active.side === 'LONG';
  const sideCls = isLong
    ? dark
      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
      : 'bg-cyan-50 border-cyan-300 text-cyan-700'
    : dark
      ? 'bg-orange-500/15 border-orange-500/50 text-orange-300'
      : 'bg-orange-50 border-orange-300 text-orange-700';
  const cardBg = dark ? 'bg-slate-900/60 border-slate-700' : 'bg-stone-50 border-stone-200';
  const label = dark ? 'text-slate-300' : 'text-slate-700';

  return (
    <div className={`${cardBg} border rounded-lg p-1.5 space-y-1`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Activity className={`w-2.5 h-2.5 ${dark ? 'text-cyan-300' : 'text-cyan-600'}`} />
          <span className={`text-[10px] font-bold ${label} truncate`}>{active.strat}</span>
        </div>
        <span
          className={`text-[8px] font-bold px-1.5 py-0.5 border rounded tracking-wider ${sideCls}`}
        >
          {active.side}
        </span>
      </div>
      <Sim1yCells sim={active.sim_1y} dark={dark} />
    </div>
  );
}

export function V2hEntryPanel({ v29, dark = true }: V2hEntryPanelProps) {
  const panelBg = dark ? 'bg-slate-800/95 border-slate-700' : 'bg-white border-stone-200';
  const title = dark ? 'text-slate-100' : 'text-slate-800';
  const dimText = dark ? 'text-slate-500' : 'text-stone-400';
  const trackBg = dark ? 'bg-slate-700' : 'bg-stone-200';

  if (!v29) {
    return (
      <div className={`${panelBg} border rounded-lg shadow-sm p-2`}>
        <h3 className={`text-[10px] font-bold tracking-wide uppercase mb-1.5 ${title}`}>Entry</h3>
        <div className="text-center py-2">
          <span className={`text-[10px] ${dimText}`}>Waiting for data…</span>
        </div>
      </div>
    );
  }

  const inPosition = v29.in_position;

  return (
    <div className={`${panelBg} border rounded-lg shadow-sm p-2 space-y-1.5`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${title}`}>Entry</h3>
        <span className={`text-[8px] uppercase tracking-wider ${dimText}`}>
          {inPosition ? 'ACTIVE' : 'SCAN'}
        </span>
      </div>

      {inPosition ? (
        v29.active_entry ? (
          <ActiveEntryCard active={v29.active_entry} dark={dark} />
        ) : (
          <div className={`text-center py-2 text-[10px] ${dimText}`}>활성 전략 정보 없음</div>
        )
      ) : (
        <>
          {/* Time-to-next-bar progress bar */}
          {v29.last_scan?.at_ms > 0 && (() => {
            const span = tfToMs(v29.last_scan.tf || '1h');
            const elapsed = Math.max(0, Date.now() - v29.last_scan.at_ms);
            const pct = Math.max(0, Math.min(100, (elapsed / span) * 100));
            return (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[9px] uppercase tracking-wide ${dimText}`}>
                    Next {v29.last_scan.tf} close
                  </span>
                  <span className={`text-[9px] font-bold ${dimText}`}>{pct.toFixed(0)}%</span>
                </div>
                <div className={`${trackBg} rounded h-1.5 overflow-hidden`}>
                  <div
                    className={`${dark ? 'bg-cyan-400' : 'bg-cyan-500'} h-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {v29.next_entries && v29.next_entries.length > 0 ? (
            <div className="space-y-1">
              {v29.next_entries.slice(0, 3).map((entry, idx) => (
                <NextEntryCard
                  key={`${entry.strat}-${entry.side}-${idx}`}
                  entry={entry}
                  dark={dark}
                  rank={idx + 1}
                />
              ))}
            </div>
          ) : (
            <div className={`text-center py-2 text-[10px] ${dimText}`}>
              직전 봉 close 시점 진입 후보 없음 — 다음 봉 close 대기
            </div>
          )}
        </>
      )}
    </div>
  );
}
