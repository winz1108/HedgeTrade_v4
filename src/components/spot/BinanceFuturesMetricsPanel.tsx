import { DollarSign, Activity, Target, History } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/time';
import { useRef, useEffect } from 'react';
import type { BFDashboardData, V10StrategyStatus } from '../../types/dashboard';

interface Props {
  data: BFDashboardData;
  position: 'left' | 'right' | 'trades';
  currentTime: number;
}

const V10_ENTRY_CONDITIONS: { key: string; label: string }[] = [
  { key: '1h_ema_bu', label: '1h EMA bu' },
  { key: '1h_ema_bd', label: '1h EMA bd' },
  { key: '1h_adx_20', label: '1h ADX >= 15' },
];

const formatHoldingDuration = (entryTime: number, currentTime: number): string => {
  const diffMs = currentTime - entryTime;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (hours > 0) return `${hours}h ${remainMinutes}m`;
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
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' };
  }
  return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' };
};

export function BinanceFuturesMetricsPanel({ data, position, currentTime }: Props) {
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
    const hasPosition = data.position.inPosition;
    const positionSide = data.position.side;
    const entryPrice = data.position.entryPrice;
    const currentPnl = data.position.currentPnl;
    const ss = data.strategyStatus;
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
        <div className="bg-white border border-amber-200 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-slate-800">Status</h3>
            <Activity className="w-3 h-3 text-slate-600" />
          </div>

          <div className="space-y-1.5">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-2 border border-amber-300">
              <div className="text-[10px] text-amber-700 font-medium mb-0.5">TOTAL ASSET</div>
              <div className="text-xl font-bold text-slate-900 mb-1">
                {formatCurrency(data.account.totalAsset)}
              </div>
              <div className="space-y-0.5 pt-1 border-t border-amber-300">
                {data.account.currencies && Object.entries(data.account.currencies).length > 0 ? (
                  <>
                    {(() => {
                      const currencies = Object.entries(data.account.currencies);
                      const primaryOrder = ['BTC', 'USDT', 'USD'];
                      const sorted = currencies.sort(([a], [b]) => {
                        const aIndex = primaryOrder.indexOf(a);
                        const bIndex = primaryOrder.indexOf(b);
                        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                        if (aIndex !== -1) return -1;
                        if (bIndex !== -1) return 1;
                        return a.localeCompare(b);
                      });

                      return sorted.map(([currency, info]) => {
                        let textColor = 'text-emerald-700';
                        if (currency === 'BTC') textColor = 'text-amber-700';
                        else if (currency === 'USDT') textColor = 'text-emerald-700';

                        return (
                          <div key={currency} className="flex justify-between items-center">
                            <span className="text-[9px] text-slate-600">{currency}</span>
                            <span className={`text-[11px] font-bold ${textColor}`}>
                              {formatCurrency(info.valueUsd)}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-600">Available</span>
                    <span className="text-[11px] font-bold text-emerald-700">
                      {formatCurrency(data.account.totalAsset)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-600">Leverage</span>
                  <span className="text-[11px] font-bold text-amber-700">{leverage}x</span>
                </div>
              </div>
            </div>

            <div className="border-t border-amber-200 pt-1.5">
              <div className="text-[10px] text-slate-800 mb-1 font-medium">POSITION</div>
              {hasPosition && entryPrice ? (
                <div className="space-y-0.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-1.5 border border-amber-300">
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
                    <span className="text-[11px] font-bold text-slate-900">{formatCurrency(entryPrice)}</span>
                  </div>
                  {liquidationPrice && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500">Liquidation</span>
                      <span className="text-[11px] font-bold text-slate-600">{formatCurrency(liquidationPrice)}</span>
                    </div>
                  )}
                  {currentPnl !== undefined && currentPnl !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-amber-700">P&L</span>
                      <span className={`text-[11px] font-bold ${
                        currentPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {currentPnl >= 0 ? '+' : ''}{currentPnl.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {data.position.entryTime && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-amber-700">Duration</span>
                      <span className="text-[11px] font-bold text-amber-700">
                        {formatHoldingDuration(data.position.entryTime, currentTime)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-2 py-1 bg-stone-100 text-slate-600 rounded text-[10px] font-bold inline-block border border-stone-300">
                  NO POSITION
                </div>
              )}
            </div>
          </div>
        </div>

        {!hasPosition ? (
          <div className="bg-white border border-amber-200 rounded-lg shadow-sm p-2">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[11px] font-bold text-slate-800">Entry Conditions</h3>
              {ss && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  ss.allBuyMet ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-stone-100 text-slate-500 border border-stone-300'
                }`}>
                  {ss.allBuyMet ? 'READY' : 'NOT MET'}
                </span>
              )}
            </div>

            {ss?.buyConditions ? (
              <div className="space-y-1.5">
                <div className="grid grid-cols-1 gap-1">
                  {V10_ENTRY_CONDITIONS.map(({ key, label }) => {
                    const met = ss.buyConditions?.[key];
                    return (
                      <div key={key} className={`flex items-center gap-1.5 px-1.5 py-1 rounded ${met ? 'bg-emerald-50 border border-emerald-200' : 'bg-stone-50 border border-stone-200'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${met ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                        <span className={`text-[9px] font-medium ${met ? 'text-emerald-700' : 'text-slate-500'}`}>{label}</span>
                        {key === '1h_adx_20' && ss.indicators?.['1h']?.adx !== undefined && (
                          <span className={`text-[8px] ml-auto font-bold ${met ? 'text-emerald-600' : 'text-slate-400'}`}>{ss.indicators['1h'].adx.toFixed(1)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {ss.indicators?.['5m'] && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-1.5">
                    <div className="text-[8px] text-amber-600 font-bold mb-0.5">5m EMA Breakout</div>
                    <div className="grid grid-cols-2 gap-1">
                      {ss.indicators['5m'].bd !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] text-rose-500">bd</span>
                          <span className="text-[9px] font-bold text-rose-600">${ss.indicators['5m'].bd.toFixed(0)}</span>
                        </div>
                      )}
                      {ss.indicators['5m'].bu !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] text-emerald-500">bu</span>
                          <span className="text-[9px] font-bold text-emerald-600">${ss.indicators['5m'].bu.toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-stone-50 border border-stone-200 rounded p-1.5">
                  <div className="text-[8px] text-slate-500">bd 상향 돌파 = LONG, 하향 돌파 = SHORT (시장가)</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-12 text-slate-600 text-[10px]">
                Waiting...
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-amber-300 rounded-lg shadow-sm p-2">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[11px] font-bold text-slate-800">Exit Conditions</h3>
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-0.5 mb-1.5">
                <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                  <span className="text-[8px] text-amber-600">MFE</span>
                  <span className="text-[10px] font-bold text-amber-700">
                    {ss?.mfe != null ? `+${ss.mfe.toFixed(2)}%` : data.position.mfe != null ? `+${data.position.mfe.toFixed(2)}%` : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                  <span className="text-[8px] text-rose-500">MAE</span>
                  <span className="text-[10px] font-bold text-rose-600">
                    {ss?.mae != null ? `${ss.mae.toFixed(2)}%` : data.position.mae != null ? `${data.position.mae.toFixed(2)}%` : '-'}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-[9px] font-bold text-blue-700">EMA Exit</span>
                </div>
                <div className="text-[8px] text-blue-600">{"1h EMA band break (MFE>=0.3%, PnL>=0.2%)"}</div>
                {ss?.exitPrices?.ema_exit && (
                  <div className="text-[9px] font-bold text-blue-700 mt-0.5">${ss.exitPrices.ema_exit.toFixed(2)}</div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-1.5">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  <span className="text-[9px] font-bold text-yellow-700">VREG Exit</span>
                </div>
                <div className="text-[8px] text-yellow-600">Vol spike + regression break</div>
                {ss?.exitPrices?.vreg_exit && (
                  <div className="text-[9px] font-bold text-yellow-700 mt-0.5">${ss.exitPrices.vreg_exit.toFixed(2)}</div>
                )}
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded p-1.5">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-[9px] font-bold text-rose-700">CUT</span>
                </div>
                <div className="text-[8px] text-rose-600">MAE {'<'} -0.5% + 1m EMA reversal</div>
                {ss?.exitPrices?.cut_threshold_mae && (
                  <div className="text-[9px] font-bold text-rose-700 mt-0.5">{ss.exitPrices.cut_threshold_mae.toFixed(2)}%</div>
                )}
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded p-1.5">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-500" />
                  <span className="text-[9px] font-bold text-stone-600">FLIP</span>
                </div>
                <div className="text-[8px] text-stone-500">CUT after reverse re-entry</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (position === 'right') {
    const formatPercent = (value: number | undefined) => {
      if (value === undefined || value === null) return '0.00%';
      if (typeof value !== 'number' || isNaN(value)) return '0.00%';
      return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    const totalTrades = data.metrics?.totalTrades ?? 0;
    const winRate = data.metrics?.winRate ?? 0;
    const avgPnl = data.metrics?.avgPnl ?? 0;
    const totalPnl = data.metrics?.totalPnl ?? 0;
    const marketReturn = data.metrics?.marketReturn ?? 0;

    const tp = Math.round(totalTrades * (winRate / 100));
    const sl = totalTrades - tp;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="bg-white border border-amber-300 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-slate-800">Performance</h3>
            <DollarSign className="w-3 h-3 text-amber-600" />
          </div>

          <div className="space-y-1.5">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-2 rounded-lg border border-emerald-300">
              <div className="text-[10px] text-emerald-700 font-bold mb-0.5">NET PROFIT</div>
              <div
                className={`text-2xl font-black ${
                  data.account.returnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatPercent(data.account.returnPct * 100)}
              </div>
              {totalPnl !== undefined && (
                <div className={`text-[11px] font-bold mt-0.5 ${
                  totalPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} USD
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between items-center bg-stone-50 p-1 rounded border border-stone-300">
                <span className="text-[9px] text-slate-800 font-medium">Portfolio Return</span>
                <span className={`text-[11px] font-bold ${
                  (data.account.returnPct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatPercent((data.account.returnPct ?? 0) * 100)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-stone-50 p-1 rounded border border-stone-300">
                <span className="text-[9px] text-slate-800 font-medium">Market Change (30d)</span>
                <span className={`text-[11px] font-bold ${
                  marketReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatPercent(marketReturn)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-stone-50 p-1 rounded border border-stone-300">
                <span className="text-[9px] text-slate-800 font-medium">Avg Trade Return</span>
                <span className={`text-[11px] font-bold ${
                  avgPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatPercent(avgPnl)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-slate-800">Statistics</h3>
            <Target className="w-3 h-3 text-slate-600" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center bg-emerald-50 p-1.5 rounded border border-emerald-300">
              <span className="text-[10px] text-emerald-700 font-bold">Profit (TP)</span>
              <span className="text-sm font-bold text-emerald-700">{tp}</span>
            </div>
            <div className="flex justify-between items-center bg-rose-50 p-1.5 rounded border border-rose-300">
              <span className="text-[10px] text-rose-700 font-bold">Loss (SL)</span>
              <span className="text-sm font-bold text-rose-700">{sl}</span>
            </div>
            <div className="flex justify-between items-center bg-stone-50 p-1 rounded border border-stone-300">
              <span className="text-[10px] text-slate-600 font-bold">Total</span>
              <span className="text-xs font-bold text-slate-600">{totalTrades}</span>
            </div>
            <div className="border-t border-amber-200 pt-1 mt-1">
              <div className="text-[10px] text-slate-800 mb-1 font-bold">WIN RATE</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-stone-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 transition-all duration-500"
                    style={{ width: `${winRate}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-amber-700 min-w-[40px]">
                  {winRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (position === 'trades') {
    const oneWeekAgo = currentTime - (7 * 24 * 60 * 60 * 1000);
    const allTrades = (data.recentTrades || data.trades || []) as any[];
    const recentTrades = [...allTrades]
      .filter(trade => trade.timestamp >= oneWeekAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 40);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef<number>(0);

    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const handleScroll = () => { scrollPositionRef.current = container.scrollTop; };
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
      <div className="bg-white border border-amber-200 rounded-lg shadow-sm p-2 flex flex-col" style={{ height: '100%' }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[11px] font-bold text-slate-800">Recent Trades</h3>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-600">7d</span>
            <History className="w-2.5 h-2.5 text-slate-600" />
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="space-y-0.5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-400 scrollbar-track-transparent"
          style={{ minHeight: 0 }}
        >
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => {
              const isLong = (trade as any).side !== 'SHORT';
              const isEntry = trade.type === 'buy';

              return (
                <div key={`${trade.timestamp}-${index}`}>
                  {isEntry ? (
                    <div className={`${isLong ? 'bg-cyan-50 border-cyan-300' : 'bg-orange-50 border-orange-300'} border rounded p-1`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold ${isLong ? 'text-cyan-700' : 'text-orange-700'}`}>
                          {isLong ? 'LONG' : 'SHORT'}
                        </span>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-900">{formatCurrency(trade.price)}</span>
                          <span className="text-[8px] text-slate-600">{formatLocalDateTime(trade.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`${getExitReasonColor(trade.profit).bg} ${getExitReasonColor(trade.profit).border} border rounded p-1`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-bold ${getExitReasonColor(trade.profit).text}`}>EXIT</span>
                          {trade.exitReason && (
                            <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${
                              typeof trade.profit === 'number' && trade.profit >= 0
                                ? 'bg-emerald-500 text-white'
                                : 'bg-rose-500 text-white'
                            }`} title={trade.exitReason}>{getExitReasonLabel(trade.exitReason)}</span>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-800">{formatCurrency(trade.price)}</span>
                            {typeof trade.profit === 'number' && (
                              <span className={`text-[9px] font-bold ${
                                trade.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                            {typeof trade.pnl === 'number' && (
                              <span className={`text-[8px] font-bold ${
                                trade.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
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
              );
            })
          ) : (
            <div className="flex items-center justify-center h-20 text-slate-500 text-[10px]">
              No trades
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
