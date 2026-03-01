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
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
  } else {
    return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
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
        <div className="bg-white/95 border border-stone-200 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-stone-800">Status</h3>
            <Activity className="w-3 h-3 text-stone-600" />
          </div>

          <div className="space-y-1.5">
            <div className="bg-amber-100/60 rounded-lg p-2 border border-amber-300/70">
              <div className="text-[10px] text-amber-700 font-medium mb-0.5">TOTAL ASSET</div>
              <div className="text-xl font-bold text-stone-900 mb-1">
                {formatCurrency(data.account.totalAsset)}
              </div>
              <div className="space-y-0.5 pt-1 border-t border-amber-300/70">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-stone-600">USD</span>
                  <span className="text-[11px] font-bold text-emerald-600">
                    {formatCurrency(data.account.totalAsset)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-stone-600">Leverage</span>
                  <span className="text-[11px] font-bold text-amber-700">
                    {leverage}x
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-stone-200 pt-1.5">
              <div className="text-[10px] text-stone-800 mb-1 font-medium">POSITION</div>
              {hasPosition && entryPrice ? (
                <div className="space-y-0.5 bg-amber-100/60 rounded-lg p-1.5 border border-amber-300/70">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-amber-700">Side</span>
                    <span className={`text-[11px] font-bold ${
                      positionSide === 'LONG' ? 'text-cyan-600' : 'text-orange-600'
                    }`}>
                      {positionSide}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-amber-700">Entry</span>
                    <span className="text-[11px] font-bold text-stone-900">{formatCurrency(entryPrice)}</span>
                  </div>
                  {liquidationPrice && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-stone-500">Liquidation</span>
                      <span className="text-[11px] font-bold text-stone-700">{formatCurrency(liquidationPrice)}</span>
                    </div>
                  )}
                  {currentPnl !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-amber-700">P&L</span>
                      <span className={`text-[11px] font-bold ${
                        currentPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {currentPnl >= 0 ? '+' : ''}{currentPnl.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {data.position?.entryTime && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-amber-700">Duration</span>
                      <span className="text-[11px] font-bold text-amber-700">
                        {formatHoldingDuration(data.position.entryTime, data.serverTime || Date.now())}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-2 py-1 bg-stone-200 text-stone-700 rounded text-[10px] font-bold inline-block border border-stone-300">
                  NO POSITION
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/95 border border-stone-200 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-stone-800">Entry Conditions</h3>
          </div>

          {entryConditionsLong && entryConditionsShort ? (
            <div className="space-y-2">
              <div className="bg-cyan-50/80 border border-cyan-300/60 rounded-lg p-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-cyan-700">LONG</span>
                  <span className="text-[9px] font-bold text-cyan-700">
                    {LONG_ENTRY_CONDITIONS.filter(({ key }) => entryConditionsLong[key]).length}/{LONG_ENTRY_CONDITIONS.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {LONG_ENTRY_CONDITIONS.map(({ key, label }) => {
                    const met = entryConditionsLong[key];

                    return (
                      <div
                        key={`long-${key}`}
                        className={`flex items-center gap-1 px-1 py-0.5 rounded ${
                          met
                            ? 'bg-cyan-200/50'
                            : 'bg-stone-100'
                        }`}
                      >
                        <div className={`w-1 h-1 rounded-full flex-shrink-0 ${
                          met ? 'bg-cyan-600' : 'bg-stone-400'
                        }`} />
                        <span className={`text-[8px] font-medium leading-tight ${
                          met ? 'text-cyan-800' : 'text-stone-500'
                        }`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-orange-50/80 border border-orange-300/60 rounded-lg p-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-orange-700">SHORT</span>
                  <span className="text-[9px] font-bold text-orange-700">
                    {SHORT_ENTRY_CONDITIONS.filter(({ key }) => entryConditionsShort[key]).length}/{SHORT_ENTRY_CONDITIONS.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {SHORT_ENTRY_CONDITIONS.map(({ key, label }) => {
                    const met = entryConditionsShort[key];

                    return (
                      <div
                        key={`short-${key}`}
                        className={`flex items-center gap-1 px-1 py-0.5 rounded ${
                          met
                            ? 'bg-orange-200/50'
                            : 'bg-stone-100'
                        }`}
                      >
                        <div className={`w-1 h-1 rounded-full flex-shrink-0 ${
                          met ? 'bg-orange-600' : 'bg-stone-400'
                        }`} />
                        <span className={`text-[8px] font-medium leading-tight ${
                          met ? 'text-orange-800' : 'text-stone-500'
                        }`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-12 text-stone-600 text-[10px]">
              Waiting...
            </div>
          )}
        </div>

        <div className="bg-white/95 border border-purple-300/60 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-stone-800">Profit Protection</h3>
          </div>

          {hasPosition && data.position ? (
            <div className="space-y-1">
              {data.position.mfe !== undefined && (
                <div className="bg-purple-50/80 border border-purple-300/60 rounded p-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-purple-700 font-medium">Max Profit (MFE)</span>
                    <span className="text-[11px] font-bold text-purple-700">
                      +{data.position.mfe.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-emerald-50/80 border border-emerald-300/60 rounded p-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-emerald-700 font-medium">Protected Profit</span>
                  <span className="text-[11px] font-bold text-emerald-700">
                    {data.position.ppStop !== null && data.position.ppStop !== undefined
                      ? `+${data.position.ppStop.toFixed(2)}%`
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-12 text-stone-600 text-[10px]">
              No position
            </div>
          )}
        </div>
      </div>
    );
  }

  if (position === 'right') {
    const formatPercent = (value: number | undefined) => {
      if (value === undefined || value === null) return '0.00%';
      if (typeof value !== 'number' || isNaN(value)) return '0.00%';
      return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    return (
      <div className="flex flex-col gap-1.5">
        <div className="bg-white/95 border border-amber-300/60 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-stone-800">Performance</h3>
            <DollarSign className="w-3 h-3 text-amber-700" />
          </div>

          <div className="space-y-1.5">
            <div className="bg-gradient-to-br from-emerald-100/60 to-teal-100/60 p-2 rounded-lg border border-emerald-300/60">
              <div className="text-[10px] text-emerald-800 font-bold mb-0.5">NET PROFIT</div>
              <div
                className={`text-2xl font-black ${
                  data.account.returnPct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatPercent(data.account.returnPct)}
              </div>
              {data.metrics?.totalPnl !== undefined && (
                <div className={`text-[11px] font-bold mt-0.5 ${
                  data.metrics.totalPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {data.metrics.totalPnl >= 0 ? '+' : ''}{data.metrics.totalPnl.toFixed(2)} USD
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between items-center bg-stone-100 p-1 rounded border border-stone-200">
                <span className="text-[9px] text-stone-800 font-medium">Portfolio Return</span>
                <span className={`text-[11px] font-bold ${
                  (data.account.returnPct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatPercent(data.account.returnPct)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-stone-100 p-1 rounded border border-stone-200">
                <span className="text-[9px] text-stone-800 font-medium">Market Change</span>
                <span className={`text-[11px] font-bold ${
                  (data.metrics?.marketReturn ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatPercent(data.metrics?.marketReturn)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-stone-100 p-1 rounded border border-stone-200">
                <span className="text-[9px] text-stone-800 font-medium">Avg Trade Return</span>
                <span className={`text-[11px] font-bold ${
                  (data.metrics?.avgPnl ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatPercent(data.metrics?.avgPnl)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/95 border border-stone-200 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-stone-800">Statistics</h3>
            <Target className="w-3 h-3 text-stone-600" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center bg-emerald-50/80 p-1.5 rounded border border-emerald-300/60">
              <span className="text-[10px] text-emerald-800 font-bold">Profit (TP)</span>
              <span className="text-sm font-bold text-emerald-700">{data.metrics?.takeProfitCount ?? 0}</span>
            </div>
            <div className="flex justify-between items-center bg-rose-50/80 p-1.5 rounded border border-rose-300/60">
              <span className="text-[10px] text-rose-800 font-bold">Loss (SL)</span>
              <span className="text-sm font-bold text-rose-700">{data.metrics?.stopLossCount ?? 0}</span>
            </div>
            {data.metrics?.totalTrades !== undefined && (
              <div className="flex justify-between items-center bg-stone-100 p-1 rounded border border-stone-200">
                <span className="text-[10px] text-stone-700 font-bold">Total</span>
                <span className="text-xs font-bold text-stone-700">{data.metrics.totalTrades}</span>
              </div>
            )}
            <div className="border-t border-stone-300 pt-1 mt-1">
              <div className="text-[10px] text-stone-800 mb-1 font-bold">WIN RATE</div>
              <div className="flex items-center gap-2">
                {(() => {
                  const winRate = data.metrics?.winRate ?? 0;
                  return (
                    <>
                      <div className="flex-1 bg-stone-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-2.5 transition-all duration-500"
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-amber-700 min-w-[40px]">
                        {winRate.toFixed(1)}%
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (position === 'trades') {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef<number>(0);

    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const handleScroll = () => {
        scrollPositionRef.current = container.scrollTop;
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
      const container = scrollContainerRef.current;
      if (container && scrollPositionRef.current > 0) {
        container.scrollTop = scrollPositionRef.current;
      }
    });

    const recentTrades = data.trades ? [...data.trades].slice(-40).reverse() : [];

    return (
      <div className="bg-white/95 border border-stone-200 rounded-lg shadow-sm p-2 flex flex-col" style={{ height: '100%' }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[11px] font-bold text-stone-800">Recent Trades</h3>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-stone-600">7d</span>
            <History className="w-2.5 h-2.5 text-stone-600" />
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="space-y-0.5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent"
          style={{ minHeight: 0 }}
        >
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => {
              const isLong = trade.side === 'LONG';
              const colors = getExitReasonColor(trade.pnlPercent);

              return (
                <div key={`${trade.timestamp}-${index}`}>
                  <div className={`${colors.bg} ${colors.border} border rounded p-1`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold ${isLong ? 'text-cyan-700' : 'text-orange-700'}`}>
                          {trade.side}
                        </span>
                        {trade.reason && (
                          <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${
                            trade.pnlPercent !== undefined && trade.pnlPercent >= 0
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}>{getExitReasonLabel(trade.reason)}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-stone-800">{formatCurrency(trade.exitPrice)}</span>
                          {trade.pnlPercent !== undefined && (
                            <span className={`text-[9px] font-bold ${
                              trade.pnlPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}>
                              {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-stone-600">{formatLocalDateTime(trade.timestamp)}</span>
                          {trade.holdSeconds !== undefined && (
                            <span className="text-[8px] text-stone-600">
                              {Math.floor(trade.holdSeconds / 60)}m
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-20 text-stone-500 text-[10px]">
              No trades
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
