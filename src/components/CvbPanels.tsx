interface CvbEntryPanelProps {
  entryPanel: any;
  dark?: boolean;
}

interface CvbExitPanelProps {
  exitPanel: any;
  dark?: boolean;
}

function CvbProgressBar({
  value,
  min,
  max,
  threshold,
  label,
  valueDisplay,
  met,
  active,
  dark,
}: {
  value: number;
  min: number;
  max: number;
  threshold?: number;
  label: string;
  valueDisplay: string;
  met?: boolean;
  active: boolean;
  dark: boolean;
}) {
  const range = max - min;
  const clamped = Math.max(min, Math.min(max, value));
  const pct = range > 0 ? ((clamped - min) / range) * 100 : 0;
  const thPct = threshold != null && range > 0
    ? ((Math.max(min, Math.min(max, threshold)) - min) / range) * 100
    : null;

  const trackBg = dark ? 'bg-slate-700/50' : 'bg-stone-200/70';
  const inactiveTrackBg = dark ? 'bg-slate-800/40' : 'bg-stone-100/60';

  const fillColor = met
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
    : active
      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
      : dark ? 'bg-slate-600/30' : 'bg-stone-300/40';

  const glow = met
    ? 'shadow-[0_0_8px_rgba(52,211,153,0.4)]'
    : active
      ? 'shadow-[0_0_8px_rgba(251,191,36,0.3)]'
      : '';

  const textColor = met
    ? (dark ? 'text-emerald-300' : 'text-emerald-700')
    : active
      ? (dark ? 'text-amber-300' : 'text-amber-700')
      : (dark ? 'text-slate-500' : 'text-stone-400');

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-semibold ${textColor}`}>{label}</span>
        <span className={`text-[9px] tabular-nums font-bold ${textColor}`}>{valueDisplay}</span>
      </div>
      <div className={`relative ${active ? trackBg : inactiveTrackBg} rounded-full h-3 overflow-hidden`}>
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-500 ease-out ${fillColor} ${glow}`}
          style={{ left: 0, width: `${pct}%` }}
        />
        {thPct != null && (
          <div
            className={`absolute top-0 h-full w-[2px] z-10 ${met ? (dark ? 'bg-emerald-400/60' : 'bg-emerald-600/60') : (dark ? 'bg-rose-400/60' : 'bg-rose-600/60')}`}
            style={{ left: `${thPct}%` }}
          />
        )}
      </div>
    </div>
  );
}

function PnlBar({
  current,
  slLevel,
  tpLevel,
  dark,
}: {
  current: number;
  slLevel: number;
  tpLevel: number;
  dark: boolean;
}) {
  const min = slLevel;
  const max = tpLevel;
  const range = max - min;
  const clamped = Math.max(min, Math.min(max, current));
  const pct = range > 0 ? ((clamped - min) / range) * 100 : 50;
  const zeroPct = range > 0 ? ((0 - min) / range) * 100 : 50;

  const isProfit = current >= 0;
  const fillColor = isProfit
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
    : 'bg-gradient-to-r from-rose-500 to-rose-400';
  const glow = isProfit
    ? 'shadow-[0_0_6px_rgba(52,211,153,0.3)]'
    : 'shadow-[0_0_6px_rgba(251,113,133,0.3)]';
  const textColor = isProfit
    ? (dark ? 'text-emerald-300' : 'text-emerald-700')
    : (dark ? 'text-rose-300' : 'text-rose-700');

  const fillLeft = isProfit ? zeroPct : pct;
  const fillWidth = Math.abs(pct - zeroPct);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-semibold ${dark ? 'text-slate-300' : 'text-stone-600'}`}>PnL</span>
        <span className={`text-[9px] tabular-nums font-bold ${textColor}`}>
          {current >= 0 ? '+' : ''}{current.toFixed(2)}%
        </span>
      </div>
      <div className={`relative ${dark ? 'bg-slate-700/50' : 'bg-stone-200/70'} rounded-full h-3 overflow-hidden`}>
        {/* Zero line */}
        <div
          className={`absolute top-0 h-full w-[1px] z-10 ${dark ? 'bg-slate-400/40' : 'bg-stone-400/40'}`}
          style={{ left: `${zeroPct}%` }}
        />
        {/* Fill */}
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-500 ease-out ${fillColor} ${glow}`}
          style={{ left: `${fillLeft}%`, width: `${Math.max(fillWidth, 0.5)}%` }}
        />
      </div>
      <div className={`flex justify-between text-[8px] ${dark ? 'text-slate-500' : 'text-stone-400'}`}>
        <span>SL {slLevel.toFixed(1)}%</span>
        <span>TP +{tpLevel.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function CvbEntryPanel({ entryPanel, dark = true }: CvbEntryPanelProps) {
  const panelBg = dark ? 'bg-slate-800/95 border-slate-700' : 'bg-white border-stone-200';
  const titleCls = dark ? 'text-slate-100' : 'text-slate-800';
  const dimText = dark ? 'text-slate-500' : 'text-stone-400';

  if (!entryPanel) {
    return (
      <div className={`${panelBg} border rounded-lg shadow-sm p-2.5`}>
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${titleCls}`}>CVB Entry</h3>
        <div className="text-center py-2">
          <span className={`text-[10px] ${dimText}`}>Waiting...</span>
        </div>
      </div>
    );
  }

  if (entryPanel.ml_disabled) {
    return (
      <div className={`${panelBg} border rounded-lg shadow-sm p-2.5`}>
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${titleCls}`}>Entry</h3>
        <div className="py-1">
          <span className={`text-[9px] ${dimText}`}>{entryPanel.strategy || 'ML disabled'}</span>
        </div>
      </div>
    );
  }

  const re = entryPanel.range_expansion;
  const forming = entryPanel.forming_bar;

  return (
    <div className={`${panelBg} border rounded-lg shadow-sm p-2.5 space-y-2`}>
      <h3 className={`text-[10px] font-bold tracking-wide uppercase ${titleCls}`}>CVB Entry</h3>

      {re && (
        <CvbProgressBar
          value={re.current}
          min={re.min ?? 0}
          max={re.max ?? 3.4}
          threshold={re.threshold ?? 1.7}
          label={re.label || 'Range Expansion'}
          valueDisplay={`${re.current?.toFixed(2)}x`}
          met={re.met}
          active={re.active !== false}
          dark={dark}
        />
      )}

      {forming && (
        <CvbProgressBar
          value={forming.current ?? 0}
          min={forming.min ?? 0}
          max={forming.max ?? 3000}
          label="Volume"
          valueDisplay={`${forming.pct?.toFixed(1) ?? '0'}%`}
          active={true}
          dark={dark}
        />
      )}

      {entryPanel.avg_r && (
        <div className={`flex justify-between text-[9px] ${dimText} border-t ${dark ? 'border-slate-700/50' : 'border-stone-200'} pt-1`}>
          <span>Avg R: <span className={dark ? 'text-slate-300' : 'text-slate-600'}>{entryPanel.avg_r.value?.toFixed(3)}%</span></span>
          {entryPanel.ema20 && <span>EMA20: <span className={dark ? 'text-slate-300' : 'text-slate-600'}>${entryPanel.ema20.value?.toFixed(0)}</span></span>}
        </div>
      )}
    </div>
  );
}

export function CvbExitPanel({ exitPanel, dark = true }: CvbExitPanelProps) {
  const panelBg = dark ? 'bg-slate-800/95 border-slate-700' : 'bg-white border-stone-200';
  const titleCls = dark ? 'text-slate-100' : 'text-slate-800';
  const dimText = dark ? 'text-slate-500' : 'text-stone-400';

  if (!exitPanel || !exitPanel.active) return null;

  const pnl = exitPanel.pnl;
  const sl = exitPanel.sl;
  const tp = exitPanel.tp;
  const be = exitPanel.be;
  const emaExit = exitPanel.ema_exit;

  const isLong = exitPanel.direction === 'LONG';
  const dirColor = isLong ? (dark ? 'text-cyan-400' : 'text-cyan-600') : (dark ? 'text-orange-400' : 'text-orange-600');

  let activeBg = panelBg;
  if (sl?.met) {
    activeBg = dark ? 'bg-rose-900/50 border-rose-500/70' : 'bg-rose-50 border-rose-400';
  } else if (tp?.met) {
    activeBg = dark ? 'bg-emerald-900/40 border-emerald-500/60' : 'bg-emerald-50 border-emerald-400';
  } else if (emaExit?.met && emaExit?.profit_met) {
    activeBg = dark ? 'bg-amber-900/30 border-amber-500/50' : 'bg-amber-50 border-amber-300';
  }

  return (
    <div className={`${activeBg} border rounded-lg shadow-sm p-2.5 space-y-2 transition-colors duration-300`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${titleCls}`}>CVB Exit</h3>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-bold ${dirColor}`}>{exitPanel.direction}</span>
          {exitPanel.leverage && (
            <span className={`text-[9px] ${dimText}`}>{exitPanel.leverage}x</span>
          )}
        </div>
      </div>

      {/* Status indicators */}
      {sl?.met && (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]" />
          <span className={`text-[9px] font-bold tracking-wider uppercase ${dark ? 'text-rose-300' : 'text-rose-700'}`}>STOP LOSS</span>
        </div>
      )}
      {tp?.met && (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span className={`text-[9px] font-bold tracking-wider uppercase ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>TAKE PROFIT</span>
        </div>
      )}

      {/* PnL bar */}
      {pnl && (
        <PnlBar
          current={pnl.current ?? 0}
          slLevel={sl?.level ?? pnl.min ?? -8}
          tpLevel={tp?.level ?? pnl.max ?? 8}
          dark={dark}
        />
      )}

      {/* BE progress */}
      {be && (
        <CvbProgressBar
          value={be.progress ?? 0}
          min={0}
          max={100}
          label={be.activated ? 'BE Active' : 'BE Progress'}
          valueDisplay={`${(be.progress ?? 0).toFixed(0)}%`}
          met={be.activated}
          active={!be.activated && (be.progress ?? 0) > 30}
          dark={dark}
        />
      )}

      {/* EMA exit condition */}
      {emaExit && (
        <div className={`flex items-center justify-between text-[9px] ${emaExit.met && emaExit.profit_met ? (dark ? 'text-amber-300' : 'text-amber-700') : dimText}`}>
          <span>EMA20 Exit</span>
          <span className="font-bold">{emaExit.met ? (emaExit.profit_met ? 'TRIGGERED' : 'wait profit') : 'inactive'}</span>
        </div>
      )}

      {/* Hold info */}
      {(exitPanel.bars_held != null || exitPanel.hold_minutes != null || exitPanel.hold_hours != null) && (
        <div className={`flex items-center gap-3 text-[9px] ${dimText} border-t ${dark ? 'border-slate-700/50' : 'border-stone-200'} pt-1`}>
          {exitPanel.bars_held != null && <span>Hold: <span className={dark ? 'text-slate-300' : 'text-slate-600'}>{exitPanel.bars_held} bars</span></span>}
          {exitPanel.hold_hours != null && <span>Hold: <span className={dark ? 'text-slate-300' : 'text-slate-600'}>{(exitPanel.hold_hours / 24).toFixed(1)}d</span></span>}
          {exitPanel.hold_minutes != null && !exitPanel.hold_hours && <span>{Math.floor(exitPanel.hold_minutes / 60)}h {Math.round(exitPanel.hold_minutes % 60)}m</span>}
          {exitPanel.mfe != null && <span>MFE: <span className={dark ? 'text-emerald-400' : 'text-emerald-600'}>+{exitPanel.mfe.toFixed(2)}%</span></span>}
          {exitPanel.mae != null && <span>MAE: <span className={dark ? 'text-rose-400' : 'text-rose-600'}>{exitPanel.mae.toFixed(2)}%</span></span>}
        </div>
      )}
    </div>
  );
}
