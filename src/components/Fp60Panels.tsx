interface Fp60EntryPanelProps {
  fp60Panel: {
    pL: number;
    pS: number;
    thrL: number;
    thrS: number;
    baseL?: number;
    baseS?: number;
    tp_k?: number;
    sl_k?: number;
    v24?: number;
    bars_ready?: boolean;
  } | null;
  volumePct?: number;
  dark?: boolean;
}

interface Fp60ExitPanelProps {
  position: {
    side: 'LONG' | 'SHORT';
    entry_price: number;
    tp_price: number;
    sl_price: number;
    leverage?: number;
    pnl_pct?: number;
    hold_minutes?: number;
    bars_held?: number;
  } | null;
  currentPrice: number;
  dark?: boolean;
}

const GAUGE_MAX = 0.75;
const BAR_H = 'h-[6px]';

export function Fp60EntryPanel({ fp60Panel, volumePct, dark = true }: Fp60EntryPanelProps) {
  const bg = dark ? 'bg-slate-800/95 border-slate-700/80' : 'bg-white border-stone-200';
  const label = dark ? 'text-slate-400' : 'text-stone-500';
  const val = dark ? 'text-slate-200' : 'text-slate-700';
  const trackBg = dark ? 'bg-slate-700/50' : 'bg-stone-200/70';

  if (!fp60Panel) {
    return (
      <div className={`${bg} border rounded-lg p-2.5`}>
        <h3 className={`text-[10px] font-semibold tracking-wide uppercase ${label}`}>FP60 Entry</h3>
        <div className="text-center py-2">
          <span className={`text-[10px] ${label}`}>Waiting...</span>
        </div>
      </div>
    );
  }

  const pL = fp60Panel.pL ?? 0;
  const pS = fp60Panel.pS ?? 0;
  const thrL = fp60Panel.thrL ?? 0.636;
  const thrS = fp60Panel.thrS ?? 0.644;
  const pLPct = (Math.min(pL, GAUGE_MAX) / GAUGE_MAX) * 50;
  const pSPct = (Math.min(pS, GAUGE_MAX) / GAUGE_MAX) * 50;
  const thrLPct = (thrL / GAUGE_MAX) * 50;
  const thrSPct = (thrS / GAUGE_MAX) * 50;

  const longActive = pL >= thrL;
  const shortActive = pS >= thrS;
  const formPct = Math.max(0, Math.min(100, volumePct ?? 0));

  const sColor = dark
    ? (shortActive ? 'text-amber-400' : 'text-amber-500/60')
    : (shortActive ? 'text-amber-600' : 'text-amber-500/60');
  const lColor = dark
    ? (longActive ? 'text-teal-400' : 'text-teal-500/60')
    : (longActive ? 'text-teal-600' : 'text-teal-500/60');

  const sFill = shortActive
    ? (dark ? 'bg-amber-400' : 'bg-amber-500')
    : (dark ? 'bg-amber-500/40' : 'bg-amber-400/50');
  const lFill = longActive
    ? (dark ? 'bg-teal-400' : 'bg-teal-500')
    : (dark ? 'bg-teal-500/40' : 'bg-teal-400/50');

  return (
    <div className={`${bg} border rounded-lg p-2.5 space-y-2.5`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-[10px] font-semibold tracking-wide uppercase ${label}`}>FP60 Entry</h3>
        {(longActive || shortActive) && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
            longActive
              ? (dark ? 'bg-teal-500/15 text-teal-400' : 'bg-teal-50 text-teal-600')
              : (dark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600')
          }`}>
            {longActive && shortActive ? (pL >= pS ? 'LONG' : 'SHORT') : longActive ? 'LONG' : 'SHORT'}
          </span>
        )}
      </div>

      {/* Mirror gauge */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className={`text-[9px] tabular-nums font-medium ${sColor}`}>
            pS {pS.toFixed(3)}
          </span>
          <span className={`text-[9px] tabular-nums font-medium ${lColor}`}>
            {pL.toFixed(3)} pL
          </span>
        </div>

        <div className={`relative ${trackBg} rounded ${BAR_H} overflow-hidden`}>
          <div
            className={`absolute inset-y-0 rounded-l transition-all duration-500 ease-out ${sFill}`}
            style={{ right: '50%', width: `${pSPct}%` }}
          />
          <div
            className={`absolute inset-y-0 rounded-r transition-all duration-500 ease-out ${lFill}`}
            style={{ left: '50%', width: `${pLPct}%` }}
          />
          <div
            className={`absolute top-0 h-full w-px ${dark ? 'bg-amber-400/40' : 'bg-amber-500/40'}`}
            style={{ left: `${50 - thrSPct}%` }}
          />
          <div
            className={`absolute top-0 h-full w-px ${dark ? 'bg-teal-400/40' : 'bg-teal-500/40'}`}
            style={{ left: `${50 + thrLPct}%` }}
          />
        </div>
      </div>

      {/* Forming bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-medium ${label}`}>Forming</span>
          <span className={`text-[9px] tabular-nums font-medium ${val}`}>{formPct.toFixed(0)}%</span>
        </div>
        <div className={`relative ${trackBg} rounded ${BAR_H} overflow-hidden`}>
          <div
            className={`absolute inset-y-0 left-0 rounded transition-all duration-300 ease-out ${
              dark ? 'bg-slate-400/70' : 'bg-stone-400/70'
            }`}
            style={{ width: `${formPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}


export function Fp60ExitPanel({ position, currentPrice, dark = true }: Fp60ExitPanelProps) {
  const bg = dark ? 'bg-slate-800/95 border-slate-700/80' : 'bg-white border-stone-200';
  const label = dark ? 'text-slate-400' : 'text-stone-500';
  const trackBg = dark ? 'bg-slate-700/50' : 'bg-stone-200/70';

  if (!position || !position.side || position.entry_price == null) return null;

  const { side, entry_price, tp_price, sl_price, leverage, pnl_pct, hold_minutes, bars_held } = position;
  const isLong = side === 'LONG';
  const hasTpSl = tp_price != null && sl_price != null;

  const inProfit = isLong ? currentPrice > entry_price : currentPrice < entry_price;
  const pnl = pnl_pct ?? 0;

  const sideColor = isLong
    ? (dark ? 'text-teal-400' : 'text-teal-600')
    : (dark ? 'text-amber-400' : 'text-amber-600');

  const formatDuration = (min: number) => {
    if (min >= 1440) {
      const d = Math.floor(min / 1440);
      const h = Math.floor((min % 1440) / 60);
      return `${d}d ${h}h`;
    }
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  let entryPct = 50;
  let clampedCurrentPct = 50;
  let fillLeft = 50;
  let fillWidth = 0;
  let leftLabel = '';
  let rightLabel = '';

  if (hasTpSl) {
    const leftPrice = isLong ? sl_price : tp_price;
    const rightPrice = isLong ? tp_price : sl_price;
    const totalRange = rightPrice - leftPrice;
    entryPct = totalRange > 0 ? ((entry_price - leftPrice) / totalRange) * 100 : 50;
    const currentPct = totalRange > 0 ? ((currentPrice - leftPrice) / totalRange) * 100 : 50;
    clampedCurrentPct = Math.max(0, Math.min(100, currentPct));
    fillLeft = Math.min(entryPct, clampedCurrentPct);
    fillWidth = Math.abs(clampedCurrentPct - entryPct);
    leftLabel = `${isLong ? 'SL' : 'TP'} $${leftPrice.toFixed(0)}`;
    rightLabel = `${isLong ? 'TP' : 'SL'} $${rightPrice.toFixed(0)}`;
  } else {
    const spread = Math.abs(currentPrice - entry_price) || entry_price * 0.05;
    const lo = Math.min(entry_price, currentPrice) - spread * 0.3;
    const hi = Math.max(entry_price, currentPrice) + spread * 0.3;
    const range = hi - lo;
    entryPct = range > 0 ? ((entry_price - lo) / range) * 100 : 50;
    clampedCurrentPct = range > 0 ? Math.max(0, Math.min(100, ((currentPrice - lo) / range) * 100)) : 50;
    fillLeft = Math.min(entryPct, clampedCurrentPct);
    fillWidth = Math.abs(clampedCurrentPct - entryPct);
    leftLabel = `$${Math.round(Math.min(entry_price, currentPrice) - spread * 0.3)}`;
    rightLabel = `$${Math.round(Math.max(entry_price, currentPrice) + spread * 0.3)}`;
  }

  const fillColor = inProfit
    ? (dark ? 'bg-teal-500/60' : 'bg-teal-400/60')
    : (dark ? 'bg-rose-500/40' : 'bg-rose-400/40');

  const pnlColor = pnl >= 0
    ? (dark ? 'text-teal-400' : 'text-teal-600')
    : (dark ? 'text-rose-400' : 'text-rose-600');

  return (
    <div className={`${bg} border rounded-lg p-2.5 space-y-2.5`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-[10px] font-semibold tracking-wide uppercase ${label}`}>Position</h3>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-bold ${sideColor}`}>{side}</span>
          {leverage != null && leverage > 0 && (
            <span className={`text-[9px] ${label}`}>{leverage}x</span>
          )}
        </div>
      </div>

      {/* Price bar */}
      <div className="space-y-1">
        <div className={`relative ${trackBg} rounded ${BAR_H} overflow-hidden`}>
          <div
            className={`absolute inset-y-0 rounded transition-all duration-500 ease-out ${fillColor}`}
            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          />
          {/* Entry marker */}
          <div
            className={`absolute top-0 h-full w-px z-20 ${dark ? 'bg-slate-300/70' : 'bg-slate-500/70'}`}
            style={{ left: `${entryPct}%` }}
          />
          {/* Current price dot */}
          <div
            className={`absolute z-20 w-1.5 h-1.5 rounded-full ${dark ? 'bg-white' : 'bg-slate-800'}`}
            style={{ left: `${clampedCurrentPct}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
          />
        </div>

        <div className={`flex justify-between text-[8px] ${label}`}>
          <span>{leftLabel}</span>
          <span className={dark ? 'text-slate-300' : 'text-stone-600'}>Entry ${entry_price.toFixed(0)}</span>
          <span>{rightLabel}</span>
        </div>
      </div>

      {/* Info row */}
      <div className={`flex items-center justify-between text-[9px] ${label} border-t ${dark ? 'border-slate-700/50' : 'border-stone-200'} pt-1.5`}>
        <div className="flex items-center gap-2">
          <span className={`font-bold tabular-nums ${pnlColor}`}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
          </span>
          <span className={`tabular-nums ${dark ? 'text-slate-500' : 'text-stone-400'}`}>${currentPrice.toFixed(0)}</span>
        </div>
        <div className="flex items-center gap-2">
          {bars_held != null && <span>{bars_held} bars</span>}
          {hold_minutes != null && <span>{formatDuration(hold_minutes)}</span>}
        </div>
      </div>
    </div>
  );
}
