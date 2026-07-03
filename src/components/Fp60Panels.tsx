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

export function Fp60EntryPanel({ fp60Panel, volumePct, dark = true }: Fp60EntryPanelProps) {
  const panelBg = dark ? 'bg-slate-800/95 border-slate-700' : 'bg-white border-stone-200';
  const titleCls = dark ? 'text-slate-100' : 'text-slate-800';
  const dimText = dark ? 'text-slate-500' : 'text-stone-400';

  if (!fp60Panel) {
    return (
      <div className={`${panelBg} border rounded-lg shadow-sm p-2.5`}>
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${titleCls}`}>FP60 Entry</h3>
        <div className="text-center py-2">
          <span className={`text-[10px] ${dimText}`}>Waiting...</span>
        </div>
      </div>
    );
  }

  const pL = fp60Panel.pL ?? 0;
  const pS = fp60Panel.pS ?? 0;
  const thrL = fp60Panel.thrL ?? 0.636;
  const thrS = fp60Panel.thrS ?? 0.644;
  const pLClamped = Math.min(pL, GAUGE_MAX);
  const pSClamped = Math.min(pS, GAUGE_MAX);
  const pLPct = (pLClamped / GAUGE_MAX) * 50;
  const pSPct = (pSClamped / GAUGE_MAX) * 50;
  const thrLPct = (thrL / GAUGE_MAX) * 50;
  const thrSPct = (thrS / GAUGE_MAX) * 50;

  const longActive = pL >= thrL;
  const shortActive = pS >= thrS;

  const formPct = Math.max(0, Math.min(100, volumePct ?? 0));

  return (
    <div className={`${panelBg} border rounded-lg shadow-sm p-2.5 space-y-2`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${titleCls}`}>FP60 Entry</h3>
        {(longActive || shortActive) && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
            longActive
              ? (dark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700')
              : (dark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700')
          }`}>
            {longActive && shortActive ? (pL >= pS ? 'LONG' : 'SHORT') : longActive ? 'LONG' : 'SHORT'}
          </span>
        )}
      </div>

      {/* Mirror gauge: pS (left) | pL (right) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className={`text-[9px] tabular-nums font-bold ${
            shortActive ? (dark ? 'text-orange-300' : 'text-orange-700') : (dark ? 'text-orange-400/70' : 'text-orange-600')
          }`}>
            pS {pS.toFixed(3)}
          </span>
          <span className={`text-[9px] tabular-nums font-bold ${
            longActive ? (dark ? 'text-cyan-300' : 'text-cyan-700') : (dark ? 'text-cyan-400/70' : 'text-cyan-600')
          }`}>
            pL {pL.toFixed(3)}
          </span>
        </div>

        <div className={`relative ${dark ? 'bg-slate-700/40' : 'bg-stone-200/60'} rounded-full h-3 overflow-hidden`}>
          {/* pS fill: grows from center toward left */}
          <div
            className={`absolute inset-y-0 rounded-l-full transition-all duration-500 ease-out ${
              shortActive
                ? 'bg-gradient-to-l from-orange-500 to-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.4)]'
                : 'bg-gradient-to-l from-orange-500/60 to-orange-400/50'
            }`}
            style={{ right: '50%', width: `${pSPct}%` }}
          />
          {/* pL fill: grows from center toward right */}
          <div
            className={`absolute inset-y-0 rounded-r-full transition-all duration-500 ease-out ${
              longActive
                ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                : 'bg-gradient-to-r from-cyan-500/60 to-cyan-400/50'
            }`}
            style={{ left: '50%', width: `${pLPct}%` }}
          />
          {/* Threshold markers */}
          <div className={`absolute top-0 h-full w-[1.5px] z-10 ${dark ? 'bg-orange-300/50' : 'bg-orange-500/50'}`}
            style={{ left: `${50 - thrSPct}%` }}
          />
          <div className={`absolute top-0 h-full w-[1.5px] z-10 ${dark ? 'bg-cyan-300/50' : 'bg-cyan-500/50'}`}
            style={{ left: `${50 + thrLPct}%` }}
          />
        </div>

        <div className={`flex justify-between text-[8px] ${dark ? 'text-slate-600' : 'text-stone-400'}`}>
          <span>0.75</span>
          <span>0</span>
          <span>0.75</span>
        </div>
      </div>

      {/* Forming bar */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-semibold ${dark ? 'text-slate-400' : 'text-stone-500'}`}>Forming</span>
          <span className={`text-[9px] tabular-nums font-bold ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{formPct.toFixed(0)}%</span>
        </div>
        <div className={`relative ${dark ? 'bg-slate-700/40' : 'bg-stone-200/60'} rounded-full h-3 overflow-hidden`}>
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out ${
              dark ? 'bg-gradient-to-r from-sky-500 to-sky-400' : 'bg-gradient-to-r from-sky-500 to-sky-400'
            }`}
            style={{ width: `${formPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}


export function Fp60ExitPanel({ position, currentPrice, dark = true }: Fp60ExitPanelProps) {
  const panelBg = dark ? 'bg-slate-800/95 border-slate-700' : 'bg-white border-stone-200';
  const titleCls = dark ? 'text-slate-100' : 'text-slate-800';
  const dimText = dark ? 'text-slate-500' : 'text-stone-400';

  if (!position || !position.side || position.entry_price == null) return null;

  const { side, entry_price, tp_price, sl_price, leverage, pnl_pct, hold_minutes, bars_held } = position;
  const isLong = side === 'LONG';
  const hasTpSl = tp_price != null && sl_price != null;

  const inProfit = isLong ? currentPrice > entry_price : currentPrice < entry_price;
  const pnl = pnl_pct ?? 0;
  const dirColor = isLong ? (dark ? 'text-cyan-400' : 'text-cyan-600') : (dark ? 'text-orange-400' : 'text-orange-600');

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

  // Entry is ALWAYS at 50% (center of the bar).
  // Current price position relative to entry:
  //   - LONG profit: fill goes RIGHT from center
  //   - LONG loss:   fill goes LEFT from center
  //   - SHORT profit: fill goes LEFT from center
  //   - SHORT loss:   fill goes RIGHT from center
  let leftLabel = '';
  let rightLabel = '';
  let fillLeft = 50;
  let fillWidth = 0;

  if (hasTpSl) {
    const leftPrice = isLong ? sl_price : tp_price;
    const rightPrice = isLong ? tp_price : sl_price;
    const totalRange = rightPrice - leftPrice;

    // How far is current from entry, mapped to bar %
    // Left half = entry to leftPrice (50% of bar)
    // Right half = entry to rightPrice (50% of bar)
    const leftDist = entry_price - leftPrice;
    const rightDist = rightPrice - entry_price;

    let currentPct: number;
    if (currentPrice <= entry_price) {
      const pct = leftDist > 0 ? ((entry_price - currentPrice) / leftDist) * 50 : 0;
      currentPct = 50 - Math.min(50, pct);
    } else {
      const pct = rightDist > 0 ? ((currentPrice - entry_price) / rightDist) * 50 : 0;
      currentPct = 50 + Math.min(50, pct);
    }

    fillLeft = Math.min(50, currentPct);
    fillWidth = Math.abs(currentPct - 50);

    leftLabel = `${isLong ? 'SL' : 'TP'} $${leftPrice.toFixed(0)}`;
    rightLabel = `${isLong ? 'TP' : 'SL'} $${rightPrice.toFixed(0)}`;
  } else {
    // No TP/SL: use percentage move to scale
    const pctMove = Math.abs(currentPrice - entry_price) / entry_price;
    const scaledPct = Math.min(50, pctMove * 1000); // 5% move = 50% of half

    if ((isLong && currentPrice < entry_price) || (!isLong && currentPrice > entry_price)) {
      // Loss side
      fillLeft = 50 - scaledPct;
      fillWidth = scaledPct;
    } else {
      fillLeft = 50;
      fillWidth = scaledPct;
    }

    const rangePct5 = entry_price * 0.05;
    leftLabel = `$${Math.round(entry_price - rangePct5)}`;
    rightLabel = `$${Math.round(entry_price + rangePct5)}`;
  }

  const fillColor = inProfit
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
    : 'bg-gradient-to-r from-red-500 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]';

  return (
    <div className={`${panelBg} border rounded-lg shadow-sm p-2.5 space-y-2 transition-colors duration-300`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-[10px] font-bold tracking-wide uppercase ${titleCls}`}>Position</h3>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-bold ${dirColor}`}>{side}</span>
          {leverage != null && leverage > 0 && (
            <span className={`text-[9px] ${dimText}`}>{leverage}x</span>
          )}
        </div>
      </div>

      {/* Price axis bar - entry always at center */}
      <div className="space-y-0.5">
        <div className={`relative ${dark ? 'bg-slate-700/50' : 'bg-stone-200/70'} rounded-full h-3 overflow-hidden`}>
          <div
            className={`absolute inset-y-0 rounded-full transition-all duration-500 ease-out ${fillColor}`}
            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          />
          {/* Entry center line */}
          <div
            className={`absolute top-0 h-full w-[1.5px] z-20 ${dark ? 'bg-slate-300/60' : 'bg-slate-600/60'}`}
            style={{ left: '50%' }}
          />
        </div>

        <div className={`flex justify-between text-[8px] ${dark ? 'text-slate-600' : 'text-stone-400'}`}>
          <span>{leftLabel}</span>
          <span className={`${dark ? 'text-slate-400' : 'text-stone-500'}`}>Entry ${entry_price.toFixed(0)}</span>
          <span>{rightLabel}</span>
        </div>
      </div>

      {/* Bottom info line */}
      <div className={`flex items-center justify-between text-[9px] ${dimText} border-t ${dark ? 'border-slate-700/50' : 'border-stone-200'} pt-1`}>
        <div className="flex items-center gap-2">
          <span className={`font-bold tabular-nums ${pnl >= 0 ? (dark ? 'text-emerald-300' : 'text-emerald-700') : (dark ? 'text-red-300' : 'text-red-700')}`}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
          </span>
          <span className={`tabular-nums ${dark ? 'text-slate-400' : 'text-stone-500'}`}>${currentPrice.toFixed(0)}</span>
        </div>
        <div className="flex items-center gap-2">
          {bars_held != null && <span>{bars_held} bars</span>}
          {hold_minutes != null && <span>{formatDuration(hold_minutes)}</span>}
        </div>
      </div>
    </div>
  );
}
