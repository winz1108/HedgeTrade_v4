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
      ? 'bg-gradient-to-r from-cyan-500 to-cyan-400'
      : dark ? 'bg-slate-600/30' : 'bg-stone-300/40';

  const glow = met
    ? 'shadow-[0_0_8px_rgba(52,211,153,0.4)]'
    : active
      ? 'shadow-[0_0_6px_rgba(34,211,238,0.3)]'
      : '';

  const textColor = met
    ? (dark ? 'text-emerald-300' : 'text-emerald-700')
    : active
      ? (dark ? 'text-cyan-300' : 'text-cyan-700')
      : (dark ? 'text-slate-500' : 'text-stone-400');

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-semibold ${textColor}`}>{label}</span>
        <span className={`text-[9px] tabular-nums font-bold ${textColor}`}>{valueDisplay}</span>
      </div>
      <div className={`relative ${active || met ? trackBg : inactiveTrackBg} rounded-full h-2.5 overflow-hidden`}>
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

function ExitBar({
  value,
  min,
  max,
  label,
  leftLabel,
  rightLabel,
  fillFromRight,
  variant,
  dark,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  leftLabel: string;
  rightLabel: string;
  fillFromRight?: boolean;
  variant: 'danger' | 'profit' | 'hold-long' | 'hold-short' | 'dim';
  dark: boolean;
}) {
  const range = max - min;
  const clamped = Math.max(min, Math.min(max, value));
  const pct = range > 0 ? ((clamped - min) / range) * 100 : 0;

  const trackBg = variant === 'dim'
    ? (dark ? 'bg-slate-800/40' : 'bg-stone-100/60')
    : (dark ? 'bg-slate-700/50' : 'bg-stone-200/70');

  const fills: Record<typeof variant, string> = {
    danger: 'bg-gradient-to-r from-rose-500 to-rose-400',
    profit: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    'hold-long': 'bg-gradient-to-r from-cyan-500 to-cyan-400',
    'hold-short': 'bg-gradient-to-r from-orange-500 to-orange-400',
    dim: dark ? 'bg-slate-600/30' : 'bg-stone-300/40',
  };

  const glows: Record<typeof variant, string> = {
    danger: 'shadow-[0_0_6px_rgba(251,113,133,0.4)]',
    profit: 'shadow-[0_0_6px_rgba(52,211,153,0.4)]',
    'hold-long': 'shadow-[0_0_6px_rgba(34,211,238,0.3)]',
    'hold-short': 'shadow-[0_0_6px_rgba(251,146,60,0.3)]',
    dim: '',
  };

  const labelColors: Record<typeof variant, string> = {
    danger: dark ? 'text-rose-300' : 'text-rose-700',
    profit: dark ? 'text-emerald-300' : 'text-emerald-700',
    'hold-long': dark ? 'text-cyan-300' : 'text-cyan-700',
    'hold-short': dark ? 'text-orange-300' : 'text-orange-700',
    dim: dark ? 'text-slate-500' : 'text-stone-400',
  };

  const fillPct = fillFromRight ? (100 - pct) : pct;
  const fillStyle = fillFromRight
    ? { right: 0, width: `${100 - pct}%` }
    : { left: 0, width: `${pct}%` };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-semibold ${labelColors[variant]}`}>{label}</span>
        <span className={`text-[9px] tabular-nums font-bold ${labelColors[variant]}`}>
          ${clamped.toFixed(0)}
        </span>
      </div>
      <div className={`relative ${trackBg} rounded-full h-2.5 overflow-hidden`}>
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-500 ease-out ${fills[variant]} ${glows[variant]}`}
          style={fillStyle}
        />
      </div>
      <div className={`flex justify-between text-[8px] ${dark ? 'text-slate-600' : 'text-stone-400'}`}>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

function BeBar({
  value,
  max,
  label,
  activated,
  variant,
  dark,
}: {
  value: number;
  max: number;
  label: string;
  activated: boolean;
  variant: 'hold-long' | 'hold-short' | 'profit' | 'dim';
  dark: boolean;
}) {
  const pct = max > 0 ? (Math.min(value, max) / max) * 100 : 0;

  const trackBg = variant === 'dim'
    ? (dark ? 'bg-slate-800/40' : 'bg-stone-100/60')
    : (dark ? 'bg-slate-700/50' : 'bg-stone-200/70');

  const fills: Record<typeof variant, string> = {
    profit: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    'hold-long': 'bg-gradient-to-r from-cyan-500 to-cyan-400',
    'hold-short': 'bg-gradient-to-r from-orange-500 to-orange-400',
    dim: dark ? 'bg-slate-600/30' : 'bg-stone-300/40',
  };

  const glows: Record<typeof variant, string> = {
    profit: 'shadow-[0_0_6px_rgba(52,211,153,0.4)]',
    'hold-long': 'shadow-[0_0_6px_rgba(34,211,238,0.3)]',
    'hold-short': 'shadow-[0_0_6px_rgba(251,146,60,0.3)]',
    dim: '',
  };

  const labelColors: Record<typeof variant, string> = {
    profit: dark ? 'text-emerald-300' : 'text-emerald-700',
    'hold-long': dark ? 'text-cyan-300' : 'text-cyan-700',
    'hold-short': dark ? 'text-orange-300' : 'text-orange-700',
    dim: dark ? 'text-slate-500' : 'text-stone-400',
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-semibold ${labelColors[variant]}`}>{label}</span>
        <span className={`text-[9px] tabular-nums font-bold ${labelColors[variant]}`}>
          {activated ? 'Active' : `${value.toFixed(2)}%`}
        </span>
      </div>
      <div className={`relative ${trackBg} rounded-full h-2.5 overflow-hidden`}>
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-500 ease-out ${fills[variant]} ${glows[variant]}`}
          style={{ left: 0, width: `${pct}%` }}
        />
      </div>
      <div className={`flex justify-between text-[8px] ${dark ? 'text-slate-600' : 'text-stone-400'}`}>
        <span>0%</span>
        <span>{max.toFixed(2)}%</span>
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

  const sl = exitPanel.sl;
  const tp = exitPanel.tp;
  const be = exitPanel.be;
  const emaExit = exitPanel.ema_exit;
  const currentPrice = exitPanel.pnl?.current_price ?? emaExit?.current_close ?? exitPanel.entry_price ?? 0;
  const entryPrice = exitPanel.entry_price ?? 0;
  const pnlPct = exitPanel.pnl?.current ?? 0;
  const isLong = exitPanel.direction === 'LONG';
  const isProfit = pnlPct >= 0;
  const dirColor = isLong ? (dark ? 'text-cyan-400' : 'text-cyan-600') : (dark ? 'text-orange-400' : 'text-orange-600');
  const holdVariant = isLong ? 'hold-long' as const : 'hold-short' as const;

  const beActivated = be?.activated === true;
  const beThreshold = be?.threshold ?? be?.max ?? 2.01;
  const bePeak = be?.current ?? be?.peak ?? 0;

  // Highlighting: loss=SL, profit<BE=BE, profit>=BE=TP+EMA
  const slHighlighted = !isProfit;
  const beHighlighted = isProfit && !beActivated;
  const tpHighlighted = isProfit && beActivated;

  // SL bar
  const slPrice = sl?.price ?? 0;
  const tpPrice = tp?.price ?? 0;
  const ema20Price = emaExit?.ema20 ?? 0;

  // Determine SL bar params based on direction
  let slMin: number, slMax: number, slFillFromRight: boolean;
  if (isLong) {
    slMin = slPrice; slMax = entryPrice; slFillFromRight = true;
  } else {
    slMin = entryPrice; slMax = slPrice; slFillFromRight = false;
  }

  // TP bar params
  let tpMin: number, tpMax: number, tpFillFromRight: boolean;
  if (isLong) {
    tpMin = entryPrice; tpMax = tpPrice; tpFillFromRight = false;
  } else {
    tpMin = tpPrice; tpMax = entryPrice; tpFillFromRight = true;
  }

  // EMA bar params (only shown when BE activated)
  let emaMin: number, emaMax: number, emaFillFromRight: boolean;
  if (isLong) {
    emaMin = ema20Price; emaMax = tpPrice; emaFillFromRight = false;
  } else {
    emaMin = tpPrice; emaMax = ema20Price; emaFillFromRight = true;
  }

  // Panel bg on critical
  let activeBg = panelBg;
  if (sl?.met) {
    activeBg = dark ? 'bg-rose-900/40 border-rose-500/60' : 'bg-rose-50 border-rose-400';
  } else if (tp?.met) {
    activeBg = dark ? 'bg-emerald-900/30 border-emerald-500/50' : 'bg-emerald-50 border-emerald-400';
  }

  // Determine variants
  const slVariant = (): 'danger' | 'profit' | 'hold-long' | 'hold-short' | 'dim' => {
    if (sl?.active === false) return 'dim';
    if (sl?.met || slHighlighted) return 'danger';
    return 'dim';
  };

  const tpVariant = (): 'danger' | 'profit' | 'hold-long' | 'hold-short' | 'dim' => {
    if (tp?.active === false) return 'dim';
    if (tp?.met || tpHighlighted) return 'profit';
    return 'dim';
  };

  const beVariant = (): 'hold-long' | 'hold-short' | 'profit' | 'dim' => {
    if (be?.active === false) return 'dim';
    if (beActivated) return 'profit';
    if (beHighlighted) return holdVariant;
    return 'dim';
  };

  const emaVariant = (): 'danger' | 'profit' | 'hold-long' | 'hold-short' | 'dim' => {
    if (emaExit?.active === false) return 'dim';
    if (emaExit?.met) return 'danger';
    return holdVariant;
  };

  return (
    <div className={`${activeBg} border rounded-lg shadow-sm p-2.5 space-y-2 transition-colors duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${titleCls}`}>Exit</h3>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-bold ${dirColor}`}>{exitPanel.direction}</span>
          {exitPanel.leverage > 0 && (
            <span className={`text-[9px] ${dimText}`}>{exitPanel.leverage}x</span>
          )}
          <span className={`text-[9px] font-bold tabular-nums ${pnlPct >= 0 ? (dark ? 'text-emerald-300' : 'text-emerald-700') : (dark ? 'text-rose-300' : 'text-rose-700')}`}>
            {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Bar 1: SL */}
      <ExitBar
        value={currentPrice}
        min={slMin}
        max={slMax}
        label="Stop Loss"
        leftLabel={isLong ? `$${slPrice.toFixed(0)}` : `$${entryPrice.toFixed(0)}`}
        rightLabel={isLong ? `$${entryPrice.toFixed(0)}` : `$${slPrice.toFixed(0)}`}
        fillFromRight={slFillFromRight}
        variant={slVariant()}
        dark={dark}
      />

      {/* Bar 2: TP */}
      <ExitBar
        value={currentPrice}
        min={tpMin}
        max={tpMax}
        label="Take Profit"
        leftLabel={isLong ? `$${entryPrice.toFixed(0)}` : `$${tpPrice.toFixed(0)}`}
        rightLabel={isLong ? `$${tpPrice.toFixed(0)}` : `$${entryPrice.toFixed(0)}`}
        fillFromRight={tpFillFromRight}
        variant={tpVariant()}
        dark={dark}
      />

      {/* Bar 3: BE or EMA Exit */}
      {beActivated && emaExit ? (
        <ExitBar
          value={currentPrice}
          min={emaMin}
          max={emaMax}
          label="EMA20 Exit"
          leftLabel={isLong ? `$${ema20Price.toFixed(0)}` : `$${tpPrice.toFixed(0)}`}
          rightLabel={isLong ? `$${tpPrice.toFixed(0)}` : `$${ema20Price.toFixed(0)}`}
          fillFromRight={emaFillFromRight}
          variant={emaVariant()}
          dark={dark}
        />
      ) : (
        <BeBar
          value={bePeak}
          max={beThreshold}
          label="Break-Even"
          activated={beActivated}
          variant={beVariant()}
          dark={dark}
        />
      )}

      {/* Hold info */}
      {(exitPanel.bars_held != null || exitPanel.hold_minutes != null || exitPanel.hold_hours != null) && (
        <div className={`flex items-center gap-3 text-[9px] ${dimText} border-t ${dark ? 'border-slate-700/50' : 'border-stone-200'} pt-1`}>
          {exitPanel.bars_held != null && <span>{exitPanel.bars_held} bars</span>}
          {exitPanel.hold_hours != null && <span>{(exitPanel.hold_hours / 24).toFixed(1)}d</span>}
          {exitPanel.hold_minutes != null && !exitPanel.hold_hours && <span>{Math.floor(exitPanel.hold_minutes / 60)}h {Math.round(exitPanel.hold_minutes % 60)}m</span>}
          {exitPanel.mfe != null && <span>MFE <span className={dark ? 'text-emerald-400' : 'text-emerald-600'}>+{exitPanel.mfe.toFixed(2)}%</span></span>}
          {exitPanel.mae != null && <span>MAE <span className={dark ? 'text-rose-400' : 'text-rose-600'}>{exitPanel.mae.toFixed(2)}%</span></span>}
        </div>
      )}
    </div>
  );
}
