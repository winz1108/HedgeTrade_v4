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
  pct,
  fillFromRight,
  label,
  valueDisplay,
  leftLabel,
  rightLabel,
  variant,
  dark,
}: {
  pct: number;
  fillFromRight?: boolean;
  label: string;
  valueDisplay: string;
  leftLabel: string;
  rightLabel: string;
  variant: 'danger' | 'long' | 'short' | 'dim';
  dark: boolean;
}) {
  const trackBg = variant === 'dim'
    ? (dark ? 'bg-slate-800/40' : 'bg-stone-100/60')
    : (dark ? 'bg-slate-700/50' : 'bg-stone-200/70');

  const fills = {
    danger: 'bg-gradient-to-r from-rose-500 to-rose-400',
    long: 'bg-gradient-to-r from-cyan-500 to-cyan-400',
    short: 'bg-gradient-to-r from-orange-500 to-orange-400',
    dim: dark ? 'bg-slate-600/30' : 'bg-stone-300/40',
  };

  const fillsReverse = {
    danger: 'bg-gradient-to-l from-rose-500 to-rose-400',
    long: 'bg-gradient-to-l from-cyan-500 to-cyan-400',
    short: 'bg-gradient-to-l from-orange-500 to-orange-400',
    dim: dark ? 'bg-slate-600/30' : 'bg-stone-300/40',
  };

  const glows = {
    danger: 'shadow-[0_0_6px_rgba(251,113,133,0.4)]',
    long: 'shadow-[0_0_6px_rgba(34,211,238,0.3)]',
    short: 'shadow-[0_0_6px_rgba(251,146,60,0.3)]',
    dim: '',
  };

  const labelColors = {
    danger: dark ? 'text-rose-300' : 'text-rose-700',
    long: dark ? 'text-cyan-300' : 'text-cyan-700',
    short: dark ? 'text-orange-300' : 'text-orange-700',
    dim: dark ? 'text-slate-500' : 'text-stone-400',
  };

  const clampedPct = Math.max(0, Math.min(100, pct));

  const barStyle = fillFromRight
    ? { right: 0, width: `${clampedPct}%` }
    : { left: 0, width: `${clampedPct}%` };

  const barFill = fillFromRight ? fillsReverse[variant] : fills[variant];

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-semibold ${labelColors[variant]}`}>{label}</span>
        <span className={`text-[9px] tabular-nums font-bold ${labelColors[variant]}`}>{valueDisplay}</span>
      </div>
      <div className={`relative ${trackBg} rounded-full h-2.5 overflow-hidden`}>
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-500 ease-out ${barFill} ${glows[variant]}`}
          style={barStyle}
        />
      </div>
      <div className={`flex justify-between text-[8px] ${dark ? 'text-slate-600' : 'text-stone-400'}`}>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
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
  const entryPrice = exitPanel.entry_price ?? 0;
  const pnlPct = exitPanel.pnl?.current ?? 0;
  const isLong = exitPanel.direction === 'LONG';
  const isProfit = pnlPct >= 0;
  const leverage = exitPanel.leverage || 1;

  // Current price: prefer ema_exit.current_close, then derive from entry + pnl
  const currentPrice = emaExit?.current_close
    ?? (entryPrice > 0 ? entryPrice * (1 + (isLong ? 1 : -1) * pnlPct / 100 / leverage) : 0);

  // Calculate SL/TP prices from level if not provided
  const slPrice = sl?.price ?? (entryPrice > 0 && sl?.level
    ? entryPrice * (1 + (isLong ? -1 : 1) * Math.abs(sl.level) / 100 / leverage)
    : 0);
  const tpPrice = tp?.price ?? (entryPrice > 0 && tp?.level
    ? entryPrice * (1 + (isLong ? 1 : -1) * Math.abs(tp.level) / 100 / leverage)
    : 0);
  const ema20Price = emaExit?.ema20 ?? 0;
  const beActivated = be?.activated === true;
  const beThreshold = be?.threshold ?? be?.max ?? 2.01;
  const bePeak = be?.current ?? be?.peak ?? be?.progress ?? 0;

  // Direction color
  const holdVariant = isLong ? 'long' as const : 'short' as const;

  // Activation logic:
  // Loss -> SL only active
  // Profit & BE not activated -> BE only active
  // BE activated -> TP + EMA active (BE bar becomes EMA)
  const slIsActive = !isProfit;
  const tpIsActive = isProfit && beActivated;
  const beIsActive = isProfit && !beActivated;

  // --- SL bar percentage ---
  // How close is price to SL? 0% = at entry (safe), 100% = at SL (danger)
  let slPct: number;
  if (isLong) {
    const range = entryPrice - slPrice;
    slPct = range > 0 ? ((entryPrice - currentPrice) / range) * 100 : 0;
  } else {
    const range = slPrice - entryPrice;
    slPct = range > 0 ? ((currentPrice - entryPrice) / range) * 100 : 0;
  }
  slPct = Math.max(0, Math.min(100, slPct));

  // --- TP bar percentage ---
  // How close is price to TP? 0% = at entry, 100% = at TP
  let tpPct: number;
  if (isLong) {
    const range = tpPrice - entryPrice;
    tpPct = range > 0 ? ((currentPrice - entryPrice) / range) * 100 : 0;
  } else {
    const range = entryPrice - tpPrice;
    tpPct = range > 0 ? ((entryPrice - currentPrice) / range) * 100 : 0;
  }
  tpPct = Math.max(0, Math.min(100, tpPct));

  // --- EMA bar percentage ---
  // LONG: EMA20 is lower bound, TP is upper. currentPrice in [EMA20, TP]
  // SHORT: TP is lower, EMA20 is upper. currentPrice in [TP, EMA20]
  let emaPct: number;
  if (isLong) {
    const range = tpPrice - ema20Price;
    emaPct = range > 0 ? ((currentPrice - ema20Price) / range) * 100 : 0;
  } else {
    const range = ema20Price - tpPrice;
    emaPct = range > 0 ? ((ema20Price - currentPrice) / range) * 100 : 0;
  }
  emaPct = Math.max(0, Math.min(100, emaPct));

  // --- BE bar percentage ---
  const bePct = beThreshold > 0 ? (Math.min(bePeak, beThreshold) / beThreshold) * 100 : 0;

  // Panel bg on critical state
  let activeBg = panelBg;
  if (sl?.met) {
    activeBg = dark ? 'bg-rose-900/40 border-rose-500/60' : 'bg-rose-50 border-rose-400';
  } else if (tp?.met) {
    activeBg = dark ? 'bg-emerald-900/30 border-emerald-500/50' : 'bg-emerald-50 border-emerald-400';
  }

  const dirColor = isLong ? (dark ? 'text-cyan-400' : 'text-cyan-600') : (dark ? 'text-orange-400' : 'text-orange-600');

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

      {/* Bar 1: SL - fills from right for LONG, from left for SHORT */}
      <ExitBar
        pct={slPct}
        fillFromRight={isLong}
        label="Stop Loss"
        valueDisplay={slPrice > 0 ? `$${slPrice.toFixed(0)}` : `${(sl?.level ?? 0).toFixed(1)}%`}
        leftLabel={isLong ? `$${slPrice.toFixed(0)}` : `$${entryPrice.toFixed(0)}`}
        rightLabel={isLong ? `$${entryPrice.toFixed(0)}` : `$${slPrice.toFixed(0)}`}
        variant={slIsActive || sl?.met ? 'danger' : 'dim'}
        dark={dark}
      />

      {/* Bar 2: TP - fills from left for LONG, from right for SHORT */}
      <ExitBar
        pct={tpPct}
        fillFromRight={!isLong}
        label="Take Profit"
        valueDisplay={tpPrice > 0 ? `$${tpPrice.toFixed(0)}` : `+${(tp?.level ?? 0).toFixed(1)}%`}
        leftLabel={isLong ? `$${entryPrice.toFixed(0)}` : `$${tpPrice.toFixed(0)}`}
        rightLabel={isLong ? `$${tpPrice.toFixed(0)}` : `$${entryPrice.toFixed(0)}`}
        variant={tpIsActive || tp?.met ? holdVariant : 'dim'}
        dark={dark}
      />

      {/* Bar 3: BE or EMA Exit (transitions when BE activated) */}
      {beActivated && emaExit ? (
        <ExitBar
          pct={emaPct}
          fillFromRight={!isLong}
          label="EMA20 Exit"
          valueDisplay={`$${ema20Price.toFixed(0)}`}
          leftLabel={isLong ? `$${ema20Price.toFixed(0)}` : `$${tpPrice.toFixed(0)}`}
          rightLabel={isLong ? `$${tpPrice.toFixed(0)}` : `$${ema20Price.toFixed(0)}`}
          variant={tpIsActive ? holdVariant : 'dim'}
          dark={dark}
        />
      ) : (
        <ExitBar
          pct={bePct}
          label="Break-Even"
          valueDisplay={`${bePeak.toFixed(2)}%`}
          leftLabel="0%"
          rightLabel={`${beThreshold.toFixed(2)}%`}
          variant={beIsActive ? holdVariant : 'dim'}
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
