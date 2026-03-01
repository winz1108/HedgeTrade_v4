import { BinanceFuturesDashboardData } from '../../types/dashboard';
import { DollarSign, Activity, Target, History } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/time';
import { useRef, useEffect } from 'react';

interface Props {
  data: BinanceFuturesDashboardData;
  position: 'left' | 'right' | 'trades';
}

const LONG_ENTRY_CONDITIONS: { key: string; label: string }[] = [
  { key: '1m_golden_cross', label: '1m GC' },
  { key: '5m_above', label: '5m EMA5>13' },
  { key: '15m_ema38_above', label: '15m EMA3>8' },
  { key: '30m_slope_up', label: '30m Slope>0' },
  { key: '15m_bbw', label: '15m BBW>0.6%' },
  { key: '30m_gap', label: '30m Gap>0.08%' },
  { key: '30m_adx', label: '30m ADX>15' }
];

const SHORT_ENTRY_CONDITIONS: { key: string; label: string }[] = [
  { key: '1m_dead_cross', label: '1m DC' },
  { key: '5m_below', label: '5m EMA5<13' },
  { key: '15m_ema38_below', label: '15m EMA3<8' },
  { key: '30m_slope_down', label: '30m Slope<0' },
  { key: '15m_bbw', label: '15m BBW>0.6%' },
  { key: '30m_gap', label: '30m Gap<-0.08%' },
  { key: '30m_adx', label: '30m ADX>15' }
];

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
  if (reason === 'EARLY') return 'Early Exit';
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

export function BinanceFuturesMetricsPanel({ data, position }: Props) {
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
    const hasPosition = data.position?.inPosition;
    const positionSide = data.position?.side;
    const entryPrice = data.position?.entryPrice;
    const currentPnl = data.position?.currentPnl;
    const entryConditionsLong = data.strategy?.entryConditionsLong;
    const entryConditionsShort = data.strategy?.entryConditionsShort;

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
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Asset</span>
              <span className="font-mono text-white font-semibold">{formatCurrency(data.account.totalAsset)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Return</span>
              <span className={`font-mono font-semibold ${data.account.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.account.returnPct.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Position</span>
              <span className={`font-mono font-semibold ${
                hasPosition
                  ? positionSide === 'LONG' ? 'text-emerald-400' : 'text-rose-400'
                  : 'text-slate-400'
              }`}>
                {hasPosition ? positionSide : 'None'}
              </span>
            </div>
            {hasPosition && entryPrice && (
              <>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Entry</span>
                  <span className="font-mono text-white">${entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">PnL</span>
                  <span className={`font-mono font-semibold ${currentPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {currentPnl.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">MFE</span>
                  <span className="font-mono text-cyan-400 font-semibold">
                    {data.position.mfe.toFixed(2)}%
                  </span>
                </div>
                {data.position.ppActivated && data.position.ppStop !== null && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">PP Stop</span>
                    <span className="font-mono text-amber-400 font-semibold">
                      {data.position.ppStop.toFixed(2)}%
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-white">
              {positionSide === 'SHORT' ? 'Short' : 'Long'} Entry
            </h3>
            <Target className="w-3 h-3 text-slate-300" />
          </div>

          <div className="space-y-0.5">
            {(positionSide === 'SHORT' ? SHORT_ENTRY_CONDITIONS : LONG_ENTRY_CONDITIONS).map(cond => {
              const conditionsData = positionSide === 'SHORT' ? entryConditionsShort : entryConditionsLong;
              const met = conditionsData?.[cond.key as keyof typeof conditionsData] ?? false;
              return (
                <div key={cond.key} className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-400">{cond.label}</span>
                  <span className={`font-mono font-semibold ${met ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {met ? '✓' : '✗'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (position === 'right') {
    const indicators = data.strategy?.indicators;
    const hasPosition = data.position?.inPosition;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-white">Indicators</h3>
            <Activity className="w-3 h-3 text-slate-300" />
          </div>

          <div className="space-y-1">
            {indicators && (
              <>
                <div className="text-[9px] font-bold text-slate-300 mt-1 mb-0.5">1m</div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-400">EMA5</span>
                  <span className="font-mono text-white">${indicators['1m'].ema_short.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-400">Direction</span>
                  <span className={`font-mono ${indicators['1m'].above ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {indicators['1m'].above ? 'Above' : 'Below'}
                  </span>
                </div>

                <div className="text-[9px] font-bold text-slate-300 mt-2 mb-0.5">30m</div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-400">Slope</span>
                  <span className={`font-mono ${indicators['30m'].ema_slope >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {indicators['30m'].ema_slope.toFixed(4)}%
                  </span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-400">Gap</span>
                  <span className={`font-mono ${indicators['30m'].ema_gap_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {indicators['30m'].ema_gap_pct.toFixed(4)}%
                  </span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-400">ADX</span>
                  <span className="font-mono text-cyan-400">{indicators['30m'].adx.toFixed(2)}</span>
                </div>

                <div className="text-[9px] font-bold text-slate-300 mt-2 mb-0.5">15m BBW</div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-400">Width</span>
                  <span className="font-mono text-purple-400">{indicators['15m'].bbw.toFixed(4)}%</span>
                </div>

                <div className="text-[9px] font-bold text-slate-300 mt-2 mb-0.5">Market</div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-400">Regime</span>
                  <span className={`font-mono ${
                    indicators.market_regime === 'U' ? 'text-emerald-400' :
                    indicators.market_regime === 'D' ? 'text-rose-400' :
                    'text-amber-400'
                  }`}>
                    {indicators.market_regime === 'U' ? 'Uptrend' : indicators.market_regime === 'D' ? 'Downtrend' : 'Sideways'}
                  </span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-400">Health</span>
                  <span className="font-mono text-cyan-400">{indicators.trend_health_score}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-white">Performance</h3>
            <DollarSign className="w-3 h-3 text-slate-300" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-400">Total Trades</span>
              <span className="font-mono text-white">{data.metrics.totalTrades}</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-400">Win Rate</span>
              <span className={`font-mono ${data.metrics.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.metrics.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-400">Avg PnL</span>
              <span className={`font-mono ${data.metrics.avgPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.metrics.avgPnl.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-400">Total PnL</span>
              <span className={`font-mono ${data.metrics.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.metrics.totalPnl.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (position === 'trades') {
    const tradesListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (tradesListRef.current) {
        tradesListRef.current.scrollTop = tradesListRef.current.scrollHeight;
      }
    }, [data.trades]);

    return (
      <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2 flex flex-col h-full">
        <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
          <h3 className="text-[11px] font-bold text-white">Recent Trades</h3>
          <History className="w-3 h-3 text-slate-300" />
        </div>

        <div ref={tradesListRef} className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {data.trades && data.trades.length > 0 ? (
            data.trades.slice(-20).reverse().map((trade, idx) => {
              const colors = getExitReasonColor(trade.pnlPercent);
              const reasonLabel = getExitReasonLabel(trade.reason);

              return (
                <div
                  key={`${trade.timestamp}-${idx}`}
                  className={`p-1.5 rounded border ${colors.border} ${colors.bg}`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1">
                      <span className={`text-[9px] font-bold ${trade.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trade.side}
                      </span>
                      <span className={`text-[8px] px-1 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {reasonLabel}
                      </span>
                    </div>
                    <span className={`text-[9px] font-mono font-bold ${colors.text}`}>
                      {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-[8px] text-slate-400">
                    <span>{formatLocalDateTime(trade.timestamp)}</span>
                    <span>{Math.floor(trade.holdSeconds / 60)}m</span>
                  </div>
                  <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                    <span>Entry: ${trade.entryPrice.toFixed(2)}</span>
                    <span>Exit: ${trade.exitPrice.toFixed(2)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-slate-400 text-[10px] py-4">
              No trades yet
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
