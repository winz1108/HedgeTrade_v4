import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import type { ZBStatus, ZBZones, ZBTrade, ZBParams, ZBTradeExit } from '../../types/zoneBounce';

interface Props {
  status: ZBStatus | null;
  zones: ZBZones | null;
  trades: ZBTrade[];
  params: ZBParams | null;
  online: boolean;
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function ReasonIcon({ reason }: { reason: string }) {
  switch (reason) {
    case 'SL': return <span className="text-rose-500 text-[10px] font-bold">SL</span>;
    case 'Trail': return <span className="text-emerald-500 text-[10px] font-bold">TR</span>;
    case 'MaxHold': return <span className="text-amber-500 text-[10px] font-bold">MH</span>;
    default: return <span className="text-slate-400 text-[10px]">{reason}</span>;
  }
}

export function ZoneBouncePanel({ status, zones, trades, params, online }: Props) {
  const [showTrades, setShowTrades] = useState(false);
  const [showParams, setShowParams] = useState(false);

  const pos = status?.position;
  const sig = status?.signal;

  const cumulativePnl = trades
    .filter((t): t is ZBTradeExit => t.type === 'EXIT')
    .reduce((sum, t) => sum + t.pnl * 100, 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-white border border-amber-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-bold text-slate-800">ZoneBounce</span>
            {status?.version && (
              <span className="text-[9px] text-slate-400 font-mono">{status.version}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {status && (
              <span className="text-[10px] text-slate-500 font-mono">
                ATR {status.atr.toFixed(1)}
              </span>
            )}
            <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className={`text-[10px] ${online ? 'text-emerald-600' : 'text-rose-600'}`}>
              {online ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {pos ? (
          <div className="px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                  pos.dir === 'short'
                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                    : 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                }`}>
                  {pos.dir}
                </div>
                {pos.trailing && (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-amber-100 text-amber-700 border border-amber-300 rounded">
                    Trailing
                  </span>
                )}
                {pos.pending_exit && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold bg-rose-100 text-rose-700 border border-rose-300 rounded animate-pulse">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {pos.pending_exit_reason || 'Exit'}
                  </span>
                )}
              </div>
              <span className={`text-sm font-bold ${pos.unrealized_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {pos.unrealized_pct >= 0 ? '+' : ''}{pos.unrealized_pct.toFixed(3)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Entry</span>
                <span className="text-slate-800 font-semibold">${pos.entry_price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SL</span>
                <span className="text-rose-600 font-semibold">${pos.current_sl.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target</span>
                <span className="text-emerald-600 font-semibold">${pos.rr_target.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Risk</span>
                <span className="text-slate-700 font-medium">{pos.risk_pct.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hold</span>
                <span className="text-slate-700 font-medium flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {formatMinutes(pos.hold_minutes)}
                  <span className="text-slate-400">({pos.bars_held}b)</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Zone</span>
                <span className="text-slate-700 font-medium">{pos.zone_tests}x test</span>
              </div>
            </div>
          </div>
        ) : sig ? (
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase animate-pulse ${
                  sig.dir === 'short'
                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                    : 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                }`}>
                  {sig.dir} Signal
                </div>
              </div>
              <span className="text-[10px] text-slate-500">Zone {sig.zone_tests}x</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Zone</span>
                <span className="text-slate-800 font-semibold">${sig.zone_center.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SL</span>
                <span className="text-rose-600 font-semibold">${sig.sl_price.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-3 py-3 text-center">
            <span className="text-[11px] text-slate-400">No position or signal</span>
          </div>
        )}
      </div>

      {zones && (zones.supports.length > 0 || zones.resistances.length > 0) && (
        <div className="bg-white border border-amber-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-3 py-1.5 border-b border-amber-100">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Nearby Zones</span>
          </div>
          <div className="px-3 py-1.5 space-y-0.5 max-h-[120px] overflow-y-auto">
            {[...zones.supports.slice(0, 3), ...zones.resistances.slice(0, 3)]
              .sort((a, b) => a.dist_pct - b.dist_pct)
              .map((z, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] py-0.5">
                  <div className="flex items-center gap-1.5">
                    {z.type === 'S' ? (
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-rose-500" />
                    )}
                    <span className="text-slate-800 font-medium">${z.center.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${
                      z.strength === 'strong' ? 'text-amber-600' :
                      z.strength === 'medium' ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {z.tests}x
                    </span>
                    <span className="text-slate-400 w-12 text-right">{z.dist_pct.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-amber-200 rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={() => setShowTrades(!showTrades)}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-amber-50/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Trades</span>
            <span className="text-[9px] text-slate-400">
              {trades.filter(t => t.type === 'EXIT').length} closed
            </span>
            {cumulativePnl !== 0 && (
              <span className={`text-[10px] font-bold ${cumulativePnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {cumulativePnl >= 0 ? '+' : ''}{cumulativePnl.toFixed(2)}%
              </span>
            )}
          </div>
          {showTrades ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
        </button>
        {showTrades && (
          <div className="px-3 pb-2 space-y-0.5 max-h-[180px] overflow-y-auto border-t border-amber-100">
            {trades.length === 0 ? (
              <div className="text-center py-2 text-[10px] text-slate-400">No trades yet</div>
            ) : (
              [...trades].reverse().map((t, i) => (
                <div key={i} className={`flex items-center justify-between text-[10px] py-1 ${
                  i > 0 ? 'border-t border-slate-100' : 'mt-1'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-mono w-[70px]">{t.time}</span>
                    <span className={`font-semibold uppercase ${
                      t.dir === 'short' ? 'text-orange-600' : 'text-cyan-600'
                    }`}>
                      {t.dir[0].toUpperCase()}
                    </span>
                    {t.type === 'ENTRY' ? (
                      <span className="text-slate-500">@ ${t.entry_price.toLocaleString()}</span>
                    ) : (
                      <span className="text-slate-500">@ ${t.exit_price.toLocaleString()}</span>
                    )}
                  </div>
                  {t.type === 'EXIT' ? (
                    <div className="flex items-center gap-1.5">
                      <ReasonIcon reason={t.reason} />
                      <span className={`font-bold ${
                        t.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {t.pnl >= 0 ? '+' : ''}{(t.pnl * 100).toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-[9px]">ENTRY</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {params && (
        <div className="bg-white border border-amber-200 rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={() => setShowParams(!showParams)}
            className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-amber-50/50 transition-colors"
          >
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Parameters</span>
            {showParams ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
          </button>
          {showParams && (
            <div className="px-3 pb-2 border-t border-amber-100">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] mt-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">TF</span>
                  <span className="text-slate-700 font-medium">{params.tf_seconds / 60}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Zone Width</span>
                  <span className="text-slate-700 font-medium">{params.zw} ATR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SL Buffer</span>
                  <span className="text-slate-700 font-medium">{params.sl_buf} ATR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">RR Trigger</span>
                  <span className="text-slate-700 font-medium">{params.rr_trig}:1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trail</span>
                  <span className="text-slate-700 font-medium">{params.trail_m} ATR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Hold</span>
                  <span className="text-slate-700 font-medium">{(params.max_hold * params.tf_seconds / 3600).toFixed(0)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fee</span>
                  <span className="text-slate-700 font-medium">{(params.fee_rt * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Swing</span>
                  <span className="text-slate-700 font-medium">+-{params.pn}b</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
