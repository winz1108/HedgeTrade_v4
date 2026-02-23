import { KrakenDashboardData } from '../../types/dashboard';
import { DollarSign, Activity, Target, History } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/time';
import { useRef, useEffect } from 'react';

interface Props {
  data: KrakenDashboardData;
  position: 'left' | 'right' | 'trades';
}

const FUTURES_ENTRY_CONDITIONS: { key: string; label: string }[] = [
  { key: '1m_golden_cross', label: '1m GC (Entry)' },
  { key: '5m_above', label: '5m EMA(5>13)' },
  { key: '15m_above', label: '15m EMA(3>8)' },
  { key: '30m_slope_up', label: '30m Slope+' },
  { key: '5m_bbw', label: '5m BBW>0.5%' },
  { key: '15m_bbw', label: '15m BBW>0.6%' },
  { key: '30m_gap', label: '30m Gap>0.08%' },
  { key: '30m_adx', label: '30m ADX>15' },
  { key: '1h_adx', label: '1h ADX>20' }
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
  if (reason === 'VANISH') return 'Vanish';
  if (reason === 'TIMEOUT') return 'Timeout';
  return reason.length > 8 ? reason.substring(0, 8) : reason;
};

const getExitReasonColor = (reason?: string): { bg: string; text: string; border: string } => {
  if (!reason) return { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-700' };
  if (reason === 'TP') return { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-700' };
  if (reason === 'PP') return { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-700' };
  if (reason === 'HARD_SL') return { bg: 'bg-rose-900/30', text: 'text-rose-400', border: 'border-rose-700' };
  if (reason === 'SL') return { bg: 'bg-rose-900/30', text: 'text-rose-400', border: 'border-rose-700' };
  if (reason === 'VANISH') return { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-700' };
  if (reason === 'TIMEOUT') return { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-700' };
  return { bg: 'bg-slate-700/30', text: 'text-slate-300', border: 'border-slate-600' };
};

export function KrakenMetricsPanel({ data, position }: Props) {
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
    const hasPosition = data.position?.in_position;
    const positionSide = data.position?.position_side;
    const entryPrice = data.strategyA?.entry_price;
    const currentPnl = data.strategyA?.current_pnl;
    const entryConditions = data.strategyA?.entry_conditions_live;
    const conditionsMet = entryConditions ? Object.values(entryConditions).filter(Boolean).length : 0;
    const conditionsTotal = 9;

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
            <div className="bg-blue-900/20 rounded-lg p-2 border border-blue-700/50">
              <div className="text-[10px] text-blue-300 font-medium mb-0.5">TOTAL ASSET</div>
              <div className="text-xl font-bold text-white mb-1">
                {formatCurrency(data.balance.portfolioValue)}
              </div>
              <div className="space-y-0.5 pt-1 border-t border-blue-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-300">Available</span>
                  <span className="text-[11px] font-bold text-emerald-400">
                    {formatCurrency(data.balance.available)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-300">Leverage</span>
                  <span className="text-[11px] font-bold text-blue-400">
                    {leverage}x
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-1.5">
              <div className="text-[10px] text-white mb-1 font-medium">POSITION</div>
              {hasPosition && entryPrice ? (
                <div className="space-y-0.5 bg-blue-900/20 rounded-lg p-1.5 border border-blue-700/50">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-blue-300">Side</span>
                    <span className={`text-[11px] font-bold ${
                      positionSide === 'LONG' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {positionSide}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-blue-300">Entry</span>
                    <span className="text-[11px] font-bold text-white">{formatCurrency(entryPrice)}</span>
                  </div>
                  {liquidationPrice && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-rose-300">Liquidation</span>
                      <span className="text-[11px] font-bold text-rose-400">{formatCurrency(liquidationPrice)}</span>
                    </div>
                  )}
                  {currentPnl !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-blue-300">P&L</span>
                      <span className={`text-[11px] font-bold ${
                        currentPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {currentPnl >= 0 ? '+' : ''}{currentPnl.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {data.strategyA?.entry_time && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-blue-300">Duration</span>
                      <span className="text-[11px] font-bold text-blue-200">
                        {formatHoldingDuration(data.strategyA.entry_time, data.currentTime)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-[10px] font-bold inline-block border border-slate-600">
                  NO POSITION
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-800/95 border border-emerald-700/50 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-white">Entry Conditions</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
              {conditionsMet}/{conditionsTotal}
            </span>
          </div>

          {entryConditions ? (
            <div className="grid grid-cols-2 gap-1">
              {FUTURES_ENTRY_CONDITIONS.map(({ key, label }) => {
                const condition = entryConditions[key];
                const isObject = typeof condition === 'object' && condition !== null;
                const longMet = isObject ? (condition as any).long : false;
                const shortMet = isObject ? (condition as any).short : false;
                const bothMet = longMet && shortMet;
                const anyMet = longMet || shortMet;

                return (
                  <div
                    key={key}
                    className={`flex items-center gap-1.5 px-1.5 py-1 rounded border ${
                      bothMet
                        ? 'bg-blue-900/30 border-blue-600/50'
                        : longMet
                        ? 'bg-emerald-900/30 border-emerald-600/50'
                        : shortMet
                        ? 'bg-rose-900/30 border-rose-600/50'
                        : 'bg-slate-700/30 border-slate-600'
                    }`}
                  >
                    <div className="flex gap-0.5 flex-shrink-0">
                      {isObject ? (
                        <>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            longMet ? 'bg-emerald-400' : 'bg-slate-600'
                          }`} title="Long" />
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            shortMet ? 'bg-rose-400' : 'bg-slate-600'
                          }`} title="Short" />
                        </>
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      )}
                    </div>
                    <span className={`text-[9px] font-medium leading-tight ${
                      bothMet
                        ? 'text-blue-300'
                        : longMet
                        ? 'text-emerald-300'
                        : shortMet
                        ? 'text-rose-300'
                        : 'text-slate-400'
                    }`}>
                      {label}
                      {bothMet && <span className="text-[8px] ml-0.5">(L/S)</span>}
                      {longMet && !bothMet && <span className="text-[8px] ml-0.5">(L)</span>}
                      {shortMet && !bothMet && <span className="text-[8px] ml-0.5">(S)</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-12 text-slate-300 text-[10px]">
              Waiting...
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
        <div className="bg-slate-800/95 border border-blue-700/50 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-white">Performance</h3>
            <DollarSign className="w-3 h-3 text-blue-400" />
          </div>

          <div className="space-y-1.5">
            {data.metrics?.portfolioReturnWithCommission !== undefined && (
              <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 p-2 rounded-lg border border-emerald-700/50">
                <div className="text-[10px] text-emerald-300 font-bold mb-0.5">NET PROFIT</div>
                <div
                  className={`text-2xl font-black ${
                    data.metrics.portfolioReturnWithCommission >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatPercent(data.metrics.portfolioReturnWithCommission)}
                </div>
                {data.metrics.totalPnl !== undefined && (
                  <div className={`text-[11px] font-bold mt-0.5 ${
                    data.metrics.totalPnl >= 0 ? 'text-emerald-300' : 'text-rose-400'
                  }`}>
                    {data.metrics.totalPnl >= 0 ? '+' : ''}{data.metrics.totalPnl.toFixed(2)} USD
                  </div>
                )}
              </div>
            )}

            <div className="space-y-0.5">
              <div className="flex justify-between items-center bg-slate-700/30 p-1 rounded border border-slate-600">
                <span className="text-[9px] text-white font-medium">Portfolio Return</span>
                <span className={`text-[11px] font-bold ${
                  (data.metrics?.portfolioReturn ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatPercent(data.metrics?.portfolioReturn)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-700/30 p-1 rounded border border-slate-600">
                <span className="text-[9px] text-white font-medium">Market Change</span>
                <span className={`text-[11px] font-bold ${
                  (data.metrics?.marketReturn ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatPercent(data.metrics?.marketReturn)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-700/30 p-1 rounded border border-slate-600">
                <span className="text-[9px] text-white font-medium">Avg Trade Return</span>
                <span className={`text-[11px] font-bold ${
                  (data.metrics?.avgTradeReturn ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatPercent(data.metrics?.avgTradeReturn)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/95 border border-slate-600 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-white">Statistics</h3>
            <Target className="w-3 h-3 text-slate-300" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center bg-emerald-900/30 p-1.5 rounded border border-emerald-700/50">
              <span className="text-[10px] text-emerald-300 font-bold">Profit (TP)</span>
              <span className="text-sm font-bold text-emerald-400">{data.metrics?.takeProfitCount ?? 0}</span>
            </div>
            <div className="flex justify-between items-center bg-rose-900/30 p-1.5 rounded border border-rose-700/50">
              <span className="text-[10px] text-rose-300 font-bold">Loss (SL)</span>
              <span className="text-sm font-bold text-rose-400">{data.metrics?.stopLossCount ?? 0}</span>
            </div>
            {data.metrics?.totalTrades !== undefined && (
              <div className="flex justify-between items-center bg-slate-700/30 p-1 rounded border border-slate-600">
                <span className="text-[10px] text-slate-300 font-bold">Total</span>
                <span className="text-xs font-bold text-slate-300">{data.metrics.totalTrades}</span>
              </div>
            )}
            <div className="border-t border-slate-600 pt-1 mt-1">
              <div className="text-[10px] text-white mb-1 font-bold">WIN RATE</div>
              <div className="flex items-center gap-2">
                {(() => {
                  const tp = data.metrics?.takeProfitCount ?? 0;
                  const sl = data.metrics?.stopLossCount ?? 0;
                  const winRate = data.metrics?.winRate ?? (tp + sl > 0 ? (tp / (tp + sl)) * 100 : 0);
                  return (
                    <>
                      <div className="flex-1 bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 transition-all duration-500"
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-blue-400 min-w-[40px]">
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
    const oneWeekAgo = data.currentTime - (7 * 24 * 60 * 60 * 1000);
    const recentTrades = [...data.recentTrades]
      .filter(trade => trade.timestamp >= oneWeekAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 40);

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

    return (
      <div className="bg-slate-800/95 border border-slate-600 rounded-lg shadow-sm p-2 flex flex-col" style={{ height: '100%' }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[11px] font-bold text-white">Recent Trades</h3>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-300">7d</span>
            <History className="w-2.5 h-2.5 text-slate-300" />
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="space-y-0.5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
          style={{ minHeight: 0 }}
        >
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => (
              <div key={`${trade.timestamp}-${index}`}>
                {trade.type === 'buy' ? (
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded p-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-400">
                        {(trade as any).side === 'SHORT' ? 'SHORT' : 'LONG'}
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-white">{formatCurrency(trade.price)}</span>
                        <span className="text-[8px] text-slate-300">{formatLocalDateTime(trade.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`${getExitReasonColor(trade.exitReason).bg} ${getExitReasonColor(trade.exitReason).border} border rounded p-1`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold ${getExitReasonColor(trade.exitReason).text}`}>EXIT</span>
                        {trade.exitReason && (
                          <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${
                            trade.profit !== undefined && trade.profit >= 0
                              ? 'bg-emerald-500 text-white'
                              : 'bg-rose-500 text-white'
                          }`} title={trade.exitReason}>{getExitReasonLabel(trade.exitReason)}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-200">{formatCurrency(trade.price)}</span>
                          {trade.profit !== undefined && (
                            <span className={`text-[9px] font-bold ${
                              trade.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-slate-400">{formatLocalDateTime(trade.timestamp)}</span>
                          {trade.pnl !== undefined && (
                            <span className={`text-[8px] font-bold ${
                              trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-20 text-slate-400 text-[10px]">
              No trades
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
