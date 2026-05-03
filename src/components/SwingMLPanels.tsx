
export interface SwingMLData {
  current_pred: number;
  pred_history?: number[];
  entry_pred?: number;
  entry_ml?: {
    eq_score?: number;
    eq_threshold?: number;
    model?: string;
  };
  exit_ml?: {
    exit_pred?: number;
    exit_threshold?: number;
    should_exit?: boolean;
    hard_sl_pct?: number;
  };
  hold_bars?: number;
  mfe?: number;
  mae?: number;
  bar_count?: number;
  filter_values?: {
    rng_24h?: number;
    sw_live?: number;
    realized_vol_48?: number;
  };
  entry_filters?: {
    rng_24h_th?: number;
    rng_24h_now?: number;
    rng_pass?: boolean;
    sw_live_th?: number;
    sw_live_now?: number;
    sw_pass?: boolean;
    rv_filter?: boolean;
    rv_q75?: number;
    rv_now?: number;
    rv_pass?: boolean;
  };
  exit_rules?: {
    reversal?: string;
    shift_reversal?: string;
    of_adverse?: string;
  };
}

export interface SwingExitConditions {
  SHIFT_ADVERSE?: { active: boolean; loss_th_pct?: number; shift_th?: number; description?: string; };
  OF_ADVERSE?: { active: boolean; of_th?: number; loss_th_pct?: number; description?: string; };
  REVERSAL?: { active: boolean; description?: string; };
}

interface SwingMLPanelsProps {
  swingMl: SwingMLData | null | undefined;
  inPosition: boolean;
  positionSide?: 'LONG' | 'SHORT' | string | null;
  exitConditions?: SwingExitConditions | null;
  currentPnl?: number | null;
  dark?: boolean;
}

const EQ_THRESHOLD = 0.80;
const EXIT_THRESHOLD = -0.03;
const HARD_SL_LIMIT = -2.5;

type BarColor = 'cyan' | 'orange' | 'emerald' | 'rose';

function ProgressBar({
  value,
  min,
  max,
  threshold,
  threshold2,
  label,
  valueDisplay,
  color,
  active,
  dark,
  reverse = false,
  centered = false,
}: {
  value: number;
  min: number;
  max: number;
  threshold?: number;
  threshold2?: number;
  label: string;
  valueDisplay: string;
  color: BarColor;
  active: boolean;
  dark: boolean;
  reverse?: boolean;
  centered?: boolean;
}) {
  const range = max - min;
  const clamped = Math.max(min, Math.min(max, value));
  const pct = ((clamped - min) / range) * 100;
  const thPct = threshold != null ? ((Math.max(min, Math.min(max, threshold)) - min) / range) * 100 : null;
  const th2Pct = threshold2 != null ? ((Math.max(min, Math.min(max, threshold2)) - min) / range) * 100 : null;

  const trackBg = dark ? 'bg-slate-700/40' : 'bg-stone-200/60';
  const inactiveTrackBg = dark ? 'bg-slate-800/40' : 'bg-stone-100/60';

  const fillColors: Record<BarColor, string> = {
    cyan: dark ? 'bg-cyan-400' : 'bg-cyan-500',
    orange: dark ? 'bg-orange-400' : 'bg-orange-500',
    emerald: dark ? 'bg-emerald-400' : 'bg-emerald-500',
    rose: dark ? 'bg-rose-400' : 'bg-rose-500',
  };

  const textColors: Record<BarColor, string> = {
    cyan: dark ? 'text-cyan-300' : 'text-cyan-700',
    orange: dark ? 'text-orange-300' : 'text-orange-700',
    emerald: dark ? 'text-emerald-300' : 'text-emerald-700',
    rose: dark ? 'text-rose-300' : 'text-rose-700',
  };

  const inactiveFill = dark ? 'bg-slate-600/30' : 'bg-stone-300/40';
  const inactiveText = dark ? 'text-slate-600' : 'text-stone-400';

  const currentFill = active ? fillColors[color] : inactiveFill;
  const currentText = active ? textColors[color] : inactiveText;

  // Centered mode: fill from center (50%) outward
  const centerPct = 50;
  const fillWidth = centered ? Math.abs(pct - centerPct) : 0;
  const fillLeft = centered ? (pct >= centerPct ? centerPct : pct) : 0;

  const thLineCls = active ? (dark ? 'bg-white/50' : 'bg-slate-600/50') : (dark ? 'bg-slate-600/30' : 'bg-stone-400/30');

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className={`text-[9px] ${active ? 'font-semibold' : 'font-normal'} ${currentText}`}>{label}</span>
        <span className={`text-[9px] tabular-nums ${active ? 'font-bold' : 'font-normal'} ${currentText}`}>{valueDisplay}</span>
      </div>
      <div className={`relative ${active ? trackBg : inactiveTrackBg} rounded-full h-2 overflow-hidden`}>
        {/* Center line for centered mode */}
        {centered && (
          <div
            className={`absolute top-0 h-full w-[1px] ${dark ? 'bg-slate-500/60' : 'bg-stone-400/60'}`}
            style={{ left: '50%' }}
          />
        )}
        {/* Fill */}
        <div
          className={`absolute top-0 h-full rounded-full transition-all duration-500 ${currentFill}`}
          style={centered
            ? { left: `${fillLeft}%`, width: `${fillWidth}%` }
            : reverse
              ? { right: 0, width: `${100 - pct}%` }
              : { left: 0, width: `${pct}%` }
          }
        />
        {/* Threshold lines */}
        {thPct != null && (
          <div
            className={`absolute top-0 h-full w-[2px] ${thLineCls} rounded-full`}
            style={{ left: `${thPct}%` }}
          />
        )}
        {th2Pct != null && (
          <div
            className={`absolute top-0 h-full w-[2px] ${thLineCls} rounded-full`}
            style={{ left: `${th2Pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

/** ENTRY ML Panel */
export function EntryMLPanel({ swingMl, dark = true }: SwingMLPanelsProps) {
  const panelBg = dark ? 'bg-slate-800/95 border-slate-700' : 'bg-white border-stone-200';
  const titleCls = dark ? 'text-slate-100' : 'text-slate-800';
  const dimText = dark ? 'text-slate-500' : 'text-stone-400';

  const currentPred = swingMl?.current_pred;

  if (currentPred == null) {
    return (
      <div className={`${panelBg} border rounded-lg shadow-sm p-2.5`}>
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${titleCls}`}>Entry ML</h3>
        <div className="text-center py-2">
          <span className={`text-[10px] ${dimText}`}>Waiting...</span>
        </div>
      </div>
    );
  }

  // Swing Score: always active, positive = orange, negative = cyan
  const swingVal = currentPred;
  const swingActive = true;
  const swingColor: BarColor = swingVal >= 0 ? 'orange' : 'cyan';

  return (
    <div className={`${panelBg} border rounded-lg shadow-sm p-2.5 space-y-1.5`}>
      <h3 className={`text-[10px] font-bold tracking-wide uppercase ${titleCls}`}>Entry ML</h3>

      <ProgressBar
        value={swingVal}
        min={-1}
        max={1}
        threshold={-0.9}
        threshold2={0.9}
        label="Swing Score"
        valueDisplay={`${swingVal >= 0 ? '+' : ''}${swingVal.toFixed(2)}`}
        color={swingColor}
        active={swingActive}
        dark={dark}
        centered
      />
    </div>
  );
}

/** EXIT ML Panel */
export function ExitMLPanel({ swingMl, inPosition, positionSide, currentPnl, dark = true }: SwingMLPanelsProps) {
  const panelBg = dark ? 'bg-slate-800/95 border-slate-700' : 'bg-white border-stone-200';
  const titleCls = dark ? 'text-slate-100' : 'text-slate-800';
  const dimText = dark ? 'text-slate-500' : 'text-stone-400';

  if (!inPosition) return null;

  const exitPred = swingMl?.exit_ml?.exit_pred ?? 0;
  const exitThreshold = swingMl?.exit_ml?.exit_threshold ?? EXIT_THRESHOLD;
  const shouldExit = swingMl?.exit_ml?.should_exit ?? false;
  const pnl = currentPnl ?? 0;
  const holdBars = swingMl?.hold_bars;
  const mfe = swingMl?.mfe;
  const mae = swingMl?.mae;

  const isHardSl = pnl <= HARD_SL_LIMIT;

  // Status: only show when exit signal or hard SL
  const showStatus = isHardSl || shouldExit;
  const statusLabel = isHardSl ? 'HARD SL' : 'EXIT SIGNAL';
  const statusCls = dark ? 'text-rose-300' : 'text-rose-700';
  const dotCls = dark ? 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]' : 'bg-rose-500';

  // ML Score bar: centered, rose when below threshold (exit zone), emerald when above (hold zone)
  const mlActive = exitPred !== 0;
  const mlColor: BarColor = exitPred <= exitThreshold ? 'rose' : 'emerald';

  // Hard SL bar: only active when loss >= 2%
  const slActive = pnl <= -2;

  // Panel highlight
  let activePanelBg = panelBg;
  if (isHardSl) {
    activePanelBg = dark ? 'bg-rose-900/50 border-rose-500/70' : 'bg-rose-50 border-rose-400';
  } else if (shouldExit) {
    activePanelBg = dark ? 'bg-rose-900/30 border-rose-500/50' : 'bg-rose-50 border-rose-300';
  }

  const mlHeaderColor = mlActive
    ? (mlColor === 'rose' ? (dark ? 'text-rose-300' : 'text-rose-700') : (dark ? 'text-emerald-300' : 'text-emerald-700'))
    : dark ? 'text-slate-400' : 'text-stone-500';

  return (
    <div className={`${activePanelBg} border rounded-lg shadow-sm p-2.5 space-y-2 transition-colors duration-300`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${titleCls}`}>Exit ML</h3>
        <span className={`text-[10px] tabular-nums ${mlActive ? 'font-bold' : 'font-normal'} ${mlHeaderColor}`}>
          {exitPred >= 0 ? '+' : ''}{exitPred.toFixed(3)}
        </span>
      </div>

      {/* Status - only shown for exit/hard SL */}
      {showStatus && (
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
          <span className={`text-[9px] font-bold tracking-wider uppercase ${statusCls}`}>{statusLabel}</span>
        </div>
      )}

      {/* ML Score bar: centered, range -0.5 to +0.5, threshold at -0.03 */}
      <ProgressBar
        value={exitPred}
        min={-0.5}
        max={0.5}
        threshold={exitThreshold}
        label="ML Score"
        valueDisplay={`${exitPred >= 0 ? '+' : ''}${exitPred.toFixed(3)}`}
        color={mlColor}
        active={mlActive}
        dark={dark}
        centered
      />

      {/* Hard SL bar: LONG fills from right, SHORT fills from left */}
      <ProgressBar
        value={slActive ? pnl : HARD_SL_LIMIT}
        min={HARD_SL_LIMIT}
        max={0}
        label="Hard SL"
        valueDisplay={`${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%`}
        color="rose"
        active={slActive}
        dark={dark}
        reverse={(positionSide ?? '').toUpperCase() === 'LONG'}
      />

      {/* Hold / MFE / MAE */}
      {(holdBars != null || mfe != null || mae != null) && (
        <div className={`flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[9px] ${dimText} border-t ${dark ? 'border-slate-700/50' : 'border-stone-200'} pt-1.5`}>
          {holdBars != null && <span>Hold: <span className={dark ? 'text-slate-300' : 'text-slate-600'}>{holdBars} bars</span></span>}
          {mfe != null && <span>MFE: <span className={dark ? 'text-emerald-400' : 'text-emerald-600'}>+{mfe.toFixed(2)}%</span></span>}
          {mae != null && <span>MAE: <span className={dark ? 'text-rose-400' : 'text-rose-600'}>{mae.toFixed(2)}%</span></span>}
        </div>
      )}
    </div>
  );
}

// Backward-compatible aliases
export const SwingMLPanel = EntryMLPanel;
export const SwingMLEntryPanel = EntryMLPanel;
export const SwingMLExitPanel = ExitMLPanel;
