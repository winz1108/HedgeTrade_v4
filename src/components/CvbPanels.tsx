interface CvbEntryPanelProps {
  entryPanel: any;
  dark?: boolean;
  candidateSide?: 'LONG' | 'SHORT';
}

interface CvbExitPanelProps {
  exitPanel: any;
  dark?: boolean;
}

function ProgressBar({
  pct,
  fillFrom,
  centerDirection,
  threshold,
  label,
  valueDisplay,
  met,
  active,
  dark,
  leftLabel,
  rightLabel,
  side,
}: {
  pct: number;
  fillFrom?: 'left' | 'right' | 'center';
  centerDirection?: 'left' | 'right';
  threshold?: number | null;
  label: string;
  valueDisplay: string;
  met?: boolean;
  active: boolean;
  dark: boolean;
  leftLabel?: string;
  rightLabel?: string;
  side?: 'LONG' | 'SHORT';
}) {
  const clampedPct = Math.max(0, Math.min(100, pct));
  const trackBg = active || met
    ? (dark ? 'bg-slate-700/50' : 'bg-stone-200/70')
    : (dark ? 'bg-slate-800/40' : 'bg-stone-100/60');

  const isLong = side !== 'SHORT';

  const fillColor = met
    ? (isLong ? 'bg-gradient-to-r from-cyan-500 to-cyan-400' : 'bg-gradient-to-r from-orange-500 to-orange-400')
    : active
      ? (isLong ? 'bg-gradient-to-r from-cyan-500/80 to-cyan-400/80' : 'bg-gradient-to-r from-orange-500/80 to-orange-400/80')
      : dark ? 'bg-slate-600/30' : 'bg-stone-300/40';

  const fillColorReverse = met
    ? (isLong ? 'bg-gradient-to-l from-cyan-500 to-cyan-400' : 'bg-gradient-to-l from-orange-500 to-orange-400')
    : active
      ? (isLong ? 'bg-gradient-to-l from-cyan-500/80 to-cyan-400/80' : 'bg-gradient-to-l from-orange-500/80 to-orange-400/80')
      : dark ? 'bg-slate-600/30' : 'bg-stone-300/40';

  const glow = met
    ? (isLong ? 'shadow-[0_0_8px_rgba(34,211,238,0.4)]' : 'shadow-[0_0_8px_rgba(251,146,60,0.4)]')
    : active
      ? (isLong ? 'shadow-[0_0_6px_rgba(34,211,238,0.3)]' : 'shadow-[0_0_6px_rgba(251,146,60,0.3)]')
      : '';

  const textColor = met
    ? (isLong ? (dark ? 'text-cyan-300' : 'text-cyan-700') : (dark ? 'text-orange-300' : 'text-orange-700'))
    : active
      ? (isLong ? (dark ? 'text-cyan-300' : 'text-cyan-700') : (dark ? 'text-orange-300' : 'text-orange-700'))
      : (dark ? 'text-slate-500' : 'text-stone-400');

  let barStyle: React.CSSProperties;
  let barClass: string;

  if (fillFrom === 'right') {
    barStyle = { right: 0, width: `${clampedPct}%` };
    barClass = fillColorReverse;
  } else if (fillFrom === 'center') {
    // Center-fill: positive = right of center, negative = left of center
    // pct here represents distance from center (0-50% of full width)
    const halfPct = clampedPct / 2;
    if (centerDirection === 'right') {
      barStyle = { left: '50%', width: `${halfPct}%` };
      barClass = fillColor;
    } else {
      barStyle = { right: '50%', width: `${halfPct}%` };
      barClass = fillColorReverse;
    }
  } else {
    barStyle = { left: 0, width: `${clampedPct}%` };
    barClass = fillColor;
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-semibold ${textColor}`}>{label}</span>
        <span className={`text-[9px] tabular-nums font-bold ${textColor}`}>{valueDisplay}</span>
      </div>
      <div className={`relative ${trackBg} rounded-full h-2.5 overflow-hidden`}>
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-500 ease-out ${barClass} ${glow}`}
          style={barStyle}
        />
        {threshold != null && (
          <div
            className={`absolute top-0 h-full w-[2px] z-10 ${met ? (dark ? 'bg-emerald-400/60' : 'bg-emerald-600/60') : (dark ? 'bg-amber-400/70' : 'bg-amber-600/70')}`}
            style={{ left: `${Math.max(0, Math.min(100, threshold))}%` }}
          />
        )}
        {fillFrom === 'center' && (
          <div
            className={`absolute top-0 h-full w-[1px] z-10 ${dark ? 'bg-slate-500/50' : 'bg-stone-400/50'}`}
            style={{ left: '50%' }}
          />
        )}
      </div>
      {(leftLabel || rightLabel) && (
        <div className={`flex justify-between text-[8px] ${dark ? 'text-slate-600' : 'text-stone-400'}`}>
          <span>{leftLabel || ''}</span>
          <span>{rightLabel || ''}</span>
        </div>
      )}
    </div>
  );
}

function ExitBar({
  progressPct,
  fillFrom,
  label,
  valueDisplay,
  leftLabel,
  rightLabel,
  met,
  active,
  variant,
  dark,
}: {
  progressPct: number;
  fillFrom: 'left' | 'right';
  label: string;
  valueDisplay: string;
  leftLabel: string;
  rightLabel: string;
  met?: boolean;
  active?: boolean;
  variant: 'danger' | 'profit' | 'dim';
  dark: boolean;
}) {
  const trackBg = variant === 'dim'
    ? (dark ? 'bg-slate-800/40' : 'bg-stone-100/60')
    : (dark ? 'bg-slate-700/50' : 'bg-stone-200/70');

  const fills: Record<string, string> = {
    danger: 'bg-gradient-to-r from-rose-500 to-rose-400',
    profit: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    dim: dark ? 'bg-slate-600/30' : 'bg-stone-300/40',
  };
  const fillsReverse: Record<string, string> = {
    danger: 'bg-gradient-to-l from-rose-500 to-rose-400',
    profit: 'bg-gradient-to-l from-emerald-500 to-emerald-400',
    dim: dark ? 'bg-slate-600/30' : 'bg-stone-300/40',
  };
  const glows: Record<string, string> = {
    danger: 'shadow-[0_0_6px_rgba(251,113,133,0.4)]',
    profit: 'shadow-[0_0_6px_rgba(52,211,153,0.4)]',
    dim: '',
  };
  const labelColors: Record<string, string> = {
    danger: dark ? 'text-rose-300' : 'text-rose-700',
    profit: dark ? 'text-emerald-300' : 'text-emerald-700',
    dim: dark ? 'text-slate-500' : 'text-stone-400',
  };

  const clampedPct = Math.max(0, Math.min(100, progressPct));
  const barStyle = fillFrom === 'right'
    ? { right: 0, width: `${clampedPct}%` }
    : { left: 0, width: `${clampedPct}%` };
  const barFill = fillFrom === 'right' ? fillsReverse[variant] : fills[variant];

  const effectiveVariant = (active === false || (!active && !met)) ? 'dim' : variant;
  const effLabelColor = labelColors[effectiveVariant];

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-semibold ${effLabelColor}`}>{label}</span>
        <span className={`text-[9px] tabular-nums font-bold ${effLabelColor}`}>{valueDisplay}</span>
      </div>
      <div className={`relative ${trackBg} rounded-full h-2.5 overflow-hidden`}>
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-500 ease-out ${barFill} ${met ? glows[variant] : ''}`}
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

export function CvbEntryPanel({ entryPanel, dark = true, candidateSide }: CvbEntryPanelProps) {
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

  const re = entryPanel.range_expansion;
  const emaSlope = entryPanel.ema_slope;
  const forming = entryPanel.forming_bar;
  const side = candidateSide || 'LONG';

  // Range Expansion: left-fill, threshold line at 1.5/max position
  const reMin = re?.min ?? 0;
  const reMax = re?.max ?? 3.0;
  const reRange = reMax - reMin;
  const reCurrent = re?.current ?? 0;
  const reThreshold = re?.threshold ?? 1.5;
  const rePct = reRange > 0 ? ((Math.min(reMax, Math.max(reMin, reCurrent)) - reMin) / reRange) * 100 : 0;
  const reThPct = reRange > 0 ? ((reThreshold - reMin) / reRange) * 100 : 50;

  // EMA Slope: center-fill, one direction from center based on sign
  const slopeMax = emaSlope?.max ?? 1;
  const slopeCurrent = emaSlope?.current ?? 0;
  const slopeDir: 'left' | 'right' = slopeCurrent >= 0 ? 'right' : 'left';
  const slopePct = slopeMax > 0
    ? (Math.abs(slopeCurrent) / slopeMax) * 100
    : 0;

  // Forming bar: left-fill 0-100%
  const formingPct = forming?.pct ?? 0;

  return (
    <div className={`${panelBg} border rounded-lg shadow-sm p-2.5 space-y-2`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${titleCls}`}>CVB Entry</h3>
        <span className={`text-[9px] font-bold ${side === 'LONG' ? (dark ? 'text-cyan-400' : 'text-cyan-600') : (dark ? 'text-orange-400' : 'text-orange-600')}`}>
          {side}
        </span>
      </div>

      {re && (
        <ProgressBar
          pct={rePct}
          fillFrom="left"
          threshold={reThPct}
          label="Range Expansion"
          valueDisplay={`${reCurrent.toFixed(2)}x`}
          met={re.met}
          active={re.active !== false}
          dark={dark}
          leftLabel={`${reMin}`}
          rightLabel={`${reMax}x`}
          side={side}
        />
      )}

      {emaSlope && (
        <ProgressBar
          pct={slopePct}
          fillFrom="center"
          centerDirection={slopeDir}
          label="EMA20 Slope"
          valueDisplay={`${slopeCurrent > 0 ? '+' : ''}${slopeCurrent.toFixed(3)}%`}
          met={emaSlope.met}
          active={emaSlope.active !== false}
          dark={dark}
          leftLabel="Bearish"
          rightLabel="Bullish"
          side={side}
        />
      )}

      {forming && (
        <ProgressBar
          pct={formingPct}
          fillFrom="left"
          label={forming.label || 'Forming Bar'}
          valueDisplay={`${formingPct.toFixed(1)}%`}
          active={true}
          dark={dark}
          leftLabel="0"
          rightLabel={forming.max ? `$${(forming.max / 1e6).toFixed(1)}M` : ''}
          side={side}
        />
      )}

      {(entryPanel.avg_r || entryPanel.ema20) && (
        <div className={`flex justify-between text-[9px] ${dimText} border-t ${dark ? 'border-slate-700/50' : 'border-stone-200'} pt-1`}>
          {entryPanel.avg_r && <span>Avg R: <span className={dark ? 'text-slate-300' : 'text-slate-600'}>{entryPanel.avg_r.value?.toFixed(3)}%</span></span>}
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
  const direction = exitPanel.direction;
  const leverage = exitPanel.leverage || 1;
  const entryPrice = exitPanel.entry_price ?? 0;
  const currentPnl = exitPanel.current_pnl ?? 0;
  const isLong = direction === 'LONG';

  // SL bar: fill_from from API, or derive
  const slFillFrom = sl?.fill_from || (isLong ? 'right' : 'left');
  const slProgressPct = sl?.progress_pct ?? 0;
  const slMet = sl?.met ?? false;

  // TP bar: fill_from from API, or derive
  const tpFillFrom = tp?.fill_from || (isLong ? 'left' : 'right');
  const tpProgressPct = tp?.progress_pct ?? 0;
  const tpMet = tp?.met ?? false;

  let activeBg = panelBg;
  if (slMet) {
    activeBg = dark ? 'bg-rose-900/40 border-rose-500/60' : 'bg-rose-50 border-rose-400';
  } else if (tpMet) {
    activeBg = dark ? 'bg-emerald-900/30 border-emerald-500/50' : 'bg-emerald-50 border-emerald-400';
  }

  const dirColor = isLong ? (dark ? 'text-cyan-400' : 'text-cyan-600') : (dark ? 'text-orange-400' : 'text-orange-600');

  return (
    <div className={`${activeBg} border rounded-lg shadow-sm p-2.5 space-y-2 transition-colors duration-300`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${titleCls}`}>Exit</h3>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-bold ${dirColor}`}>{direction}</span>
          {leverage > 0 && (
            <span className={`text-[9px] ${dimText}`}>{leverage}x</span>
          )}
          <span className={`text-[9px] font-bold tabular-nums ${currentPnl >= 0 ? (dark ? 'text-emerald-300' : 'text-emerald-700') : (dark ? 'text-rose-300' : 'text-rose-700')}`}>
            {currentPnl >= 0 ? '+' : ''}{currentPnl.toFixed(2)}%
          </span>
        </div>
      </div>

      {sl && sl.active !== false && (
        <ExitBar
          progressPct={slProgressPct}
          fillFrom={slFillFrom as 'left' | 'right'}
          label={sl.label || 'Stop Loss'}
          valueDisplay={sl.target ? `$${sl.target.toFixed(0)}` : `${(sl.level_pct ?? 0).toFixed(1)}%`}
          leftLabel={`$${(sl.min ?? 0).toFixed(0)}`}
          rightLabel={`$${(sl.max ?? 0).toFixed(0)}`}
          met={slMet}
          active={sl.active}
          variant="danger"
          dark={dark}
        />
      )}

      {tp && tp.active !== false && (
        <ExitBar
          progressPct={tpProgressPct}
          fillFrom={tpFillFrom as 'left' | 'right'}
          label={tp.label || 'Take Profit'}
          valueDisplay={tp.target ? `$${tp.target.toFixed(0)}` : ''}
          leftLabel={`$${(tp.min ?? 0).toFixed(0)}`}
          rightLabel={`$${(tp.max ?? 0).toFixed(0)}`}
          met={tpMet}
          active={tp.active}
          variant="profit"
          dark={dark}
        />
      )}

      {(exitPanel.bars_held != null || exitPanel.hold_minutes != null) && (
        <div className={`flex items-center gap-3 text-[9px] ${dimText} border-t ${dark ? 'border-slate-700/50' : 'border-stone-200'} pt-1`}>
          {exitPanel.bars_held != null && <span>{exitPanel.bars_held} bars</span>}
          {exitPanel.hold_minutes != null && <span>{Math.floor(exitPanel.hold_minutes / 60)}h {Math.round(exitPanel.hold_minutes % 60)}m</span>}
          {entryPrice > 0 && <span className={dimText}>Entry: ${entryPrice.toFixed(0)}</span>}
        </div>
      )}
    </div>
  );
}
