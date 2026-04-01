import { KrakenDashboardData } from '../../types/dashboard';
import { DollarSign, Activity, Target, History } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/time';
import { useRef, useEffect } from 'react';
import type { ZBStatus, ZBZones } from '../../types/zoneBounce';
import { ZoneEntryPanel, ZoneExitPanel } from '../ZoneStrategyPanels';

interface Props {
  data: KrakenDashboardData;
  position: 'left' | 'right' | 'trades';
  zbStatus?: ZBStatus | null;
  zbZones?: ZBZones | null;
}

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
  if (reason === 'Trail') return 'TRAIL';
  if (reason === 'SL') return 'SL';
  if (reason === 'MH') return 'TIMEOUT';
  if (reason === 'HARD_SL') return 'Hard SL';
  if (reason === 'PP') return 'PP';
  if (reason.startsWith('PP_STOP')) return 'PP';
  if (reason === 'VANISH') return 'Vanish';
  if (reason === 'TIMEOUT') return 'Timeout';
  if (reason === 'EXIT_SW_TRAIL') return 'TRAIL';
  if (reason === 'EXIT_R_TRAIL') return 'RTRAIL';
  if (reason === 'EXIT_R_CUT') return 'RCUT';
  return reason;
};

const getExitReasonColor = (profit: number | undefined): { bg: string; text: string; border: string } => {
  if (profit === undefined || profit >= 0) {
    return { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-700' };
  }
  return { bg: 'bg-rose-900/30', text: 'text-rose-400', border: 'border-rose-700' };
};

function ZBEntryPanelDark({ zbStatus, zbZones, data }: { zbStatus?: ZBStatus | null; zbZones?: ZBZones | null; data: KrakenDashboardData }) {
  const hasPosition = data.position?.in_position || !!zbStatus?.position;
  const zoneData = data.zoneData;
  if (zoneData) {
    return <ZoneEntryPanel zoneData={zoneData} currentPrice={data.currentPrice} dark={true} inPosition={hasPosition} />;
  }

  const nearestSupport = zbZones?.supports?.[0];
  const nearestResistance = zbZones?.resistances?.[0];
  const price = zbStatus?.price ?? 0;
  const supportPrice = nearestSupport?.center ?? 0;
  const resistancePrice = nearestResistance?.center ?? 0;
  const hasData = supportPrice > 0 && resistancePrice > 0 && price > 0;

  if (!hasData) {
    return (
      <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
        <h3 className="text-[10px] font-bold text-slate-200 tracking-wide uppercase mb-1.5">Entry</h3>
        <div className="text-center py-2">
          <span className="text-[10px] text-slate-500">Waiting for zone data...</span>
        </div>
      </div>
    );
  }

  return (
    <ZoneEntryPanel
      zoneData={{
        nearestSupport: nearestSupport ? { center: nearestSupport.center, top: nearestSupport.top, bot: nearestSupport.bot, tests: nearestSupport.tests, dist_pct: nearestSupport.dist_pct, strength: nearestSupport.strength } : null,
        nearestResistance: nearestResistance ? { center: nearestResistance.center, top: nearestResistance.top, bot: nearestResistance.bot, tests: nearestResistance.tests, dist_pct: nearestResistance.dist_pct, strength: nearestResistance.strength } : null,
        allSupports: [], allResistances: [],
        barCount: zbStatus?.bar_count ?? 0, zoneCount: 0, atr: zbStatus?.atr ?? 0,
        signal: zbStatus?.signal ?? null,
      }}
      currentPrice={price}
      dark={true}
      inPosition={hasPosition}
    />
  );
}

function ZBExitPanelDark({ zbStatus, data }: { zbStatus?: ZBStatus | null; data: KrakenDashboardData }) {
  const exitConditions = data.strategyA?.exit_conditions ?? (data as any).strategy?.exit_conditions ?? (data.strategyStatus as any)?.exitConditions;
  const positionSide = data.position?.position_side ?? data.position?.side ?? (zbStatus?.position?.dir === 'short' ? 'SHORT' : 'LONG');
  const cp = data.currentPrice ?? zbStatus?.price ?? 0;
  const hasPosition = data.position?.in_position;
  const rawLev = (data.position as any)?.entryLeverage ?? (data.position as any)?.entry_leverage ?? null;
  const lev = hasPosition ? (rawLev ?? 1) : null;

  const pos = zbStatus?.position;
  const isPendingExit = pos?.pending_exit ?? false;
  const pendingReason = pos?.pending_exit_reason ?? null;

  if (exitConditions) {
    return <ZoneExitPanel exitConditions={exitConditions} positionSide={positionSide} dark={true} currentPrice={cp} pendingExit={isPendingExit} pendingExitReason={pendingReason} leverage={lev} />;
  }

  if (!pos) return null;

  const isShort = pos.dir === 'short';
  const entryPrice = pos.entry_price;
  const currentSl = pos.current_sl;
  const rrTarget = pos.rr_target;
  const extreme = pos.extreme;

  return (
    <ZoneExitPanel
      exitConditions={{
        SL: {
          armed: true,
          price: currentSl,
          entry_price: entryPrice,
          distance_pct: isShort ? ((currentSl - entryPrice) / entryPrice) * 100 : ((entryPrice - currentSl) / entryPrice) * 100,
          current_pnl_pct: pos.unrealized_pct,
        },
        TRAIL: {
          armed: pos.trailing,
          trigger_price: rrTarget,
          trigger_pct: isShort ? ((entryPrice - rrTarget) / entryPrice) * 100 : ((rrTarget - entryPrice) / entryPrice) * 100,
          trail_sl: currentSl,
          extreme: extreme,
          peak_pnl: 0,
        },
        TIMEOUT: {
          armed: true,
          max_bars: 864,
          bars_held: pos.bars_held,
          pct: Math.min(100, (pos.bars_held / 864) * 100),
        },
      }}
      positionSide={positionSide}
      dark={true}
      currentPrice={cp}
      pendingExit={isPendingExit}
      pendingExitReason={pendingReason}
      leverage={lev}
    />
  );
}

export function KrakenMetricsPanel({ data, position, zbStatus, zbZones }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (position === 'left') {
    const hasPosition = data.position?.in_position;
    const rawLeverage = (data.position as any)?.entryLeverage ?? (data.position as any)?.entry_leverage ?? null;
    const leverage = hasPosition ? (rawLeverage ?? 1) : null;
    const positionSide = data.position?.position_side;
    const entryPrice = data.strategyA?.entry_price;
    const currentPnl = data.strategyA?.current_pnl;
    const zbPos = zbStatus?.position;

    let liquidationPrice: number | null = null;
    if (hasPosition && entryPrice && leverage != null) {
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
            <div className="flex items-center gap-1.5">
              {zbStatus && (
                <span className="text-[8px] font-mono text-slate-500">{zbStatus.version}</span>
              )}
              <Activity className="w-3 h-3 text-slate-300" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className={`rounded-lg p-2 border ${
              hasPosition && leverage != null && leverage >= 2
                ? (positionSide === 'LONG' || zbPos?.dir === 'long') ? 'asset-panel-long' : 'asset-panel-short'
                : 'bg-cyan-500/20 border-cyan-500/50'
            }`}>
              <div className="text-[10px] text-cyan-300 font-medium mb-0.5">TOTAL ASSET</div>
              <div className="text-xl font-bold text-white mb-1">
                {formatCurrency(data.balance.portfolioValue)}
              </div>
              <div className="space-y-0.5 pt-1 border-t border-cyan-500/50">
                {data.balance.currencies && Object.entries(data.balance.currencies).length > 0 ? (
                  <>
                    {(() => {
                      const currencies = Object.entries(data.balance.currencies);
                      const primaryOrder = ['BTC', 'EUR', 'USD'];
                      const sorted = currencies.sort(([a], [b]) => {
                        const aIndex = primaryOrder.indexOf(a);
                        const bIndex = primaryOrder.indexOf(b);
                        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                        if (aIndex !== -1) return -1;
                        if (bIndex !== -1) return 1;
                        return a.localeCompare(b);
                      });

                      return sorted.map(([currency, info]) => {
                        let textColor = 'text-emerald-400';
                        if (currency === 'BTC') textColor = 'text-yellow-400';
                        else if (currency === 'EUR') textColor = 'text-blue-400';

                        return (
                          <div key={currency} className="flex justify-between items-center">
                            <span className="text-[9px] text-slate-300">{currency}</span>
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
                    <span className="text-[9px] text-slate-300">Available</span>
                    <span className="text-[11px] font-bold text-emerald-400">
                      {formatCurrency(data.balance.available)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-700 pt-1.5">
              <div className="text-[10px] text-white mb-1 font-medium">POSITION</div>
              {(hasPosition && entryPrice) || zbPos ? (
                <div className={`space-y-0.5 rounded-lg p-1.5 border transition-all duration-500 ${
                  (positionSide === 'LONG' || zbPos?.dir === 'long')
                    ? 'position-panel-long'
                    : 'position-panel-short'
                } ${leverage != null && leverage >= 2 ? 'position-glow' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] ${
                      (positionSide === 'LONG' || zbPos?.dir === 'long') ? 'text-cyan-300' : 'text-orange-300'
                    }`}>Side</span>
                    <span className={`text-[11px] font-bold ${
                      (positionSide === 'LONG' || zbPos?.dir === 'long') ? 'text-cyan-400' : 'text-orange-400'
                    }`}>
                      {positionSide || zbPos?.dir?.toUpperCase()}
                    </span>
                  </div>
                  {leverage != null && (
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] ${
                        (positionSide === 'LONG' || zbPos?.dir === 'long') ? 'text-cyan-300' : 'text-orange-300'
                      }`}>Leverage</span>
                      <span className="text-[11px] font-bold text-amber-300">{leverage}x</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] ${
                      (positionSide === 'LONG' || zbPos?.dir === 'long') ? 'text-cyan-300' : 'text-orange-300'
                    }`}>Entry</span>
                    <span className="text-[11px] font-bold text-white">
                      {formatCurrency(entryPrice ?? zbPos?.entry_price ?? 0)}
                    </span>
                  </div>
                  {liquidationPrice && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-400">Liquidation</span>
                      <span className="text-[11px] font-bold text-slate-300">{formatCurrency(liquidationPrice)}</span>
                    </div>
                  )}
                  {(currentPnl !== undefined || zbPos) && (
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] ${
                        (positionSide === 'LONG' || zbPos?.dir === 'long') ? 'text-cyan-300' : 'text-orange-300'
                      }`}>P&L</span>
                      <span className={`text-[11px] font-bold ${
                        (currentPnl ?? zbPos?.unrealized_pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {(currentPnl ?? zbPos?.unrealized_pct ?? 0) >= 0 ? '+' : ''}
                        {(currentPnl ?? zbPos?.unrealized_pct ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {(data.strategyA?.entry_time || zbPos?.hold_minutes) && (
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] ${
                        (positionSide === 'LONG' || zbPos?.dir === 'long') ? 'text-cyan-300' : 'text-orange-300'
                      }`}>Duration</span>
                      <span className={`text-[11px] font-bold ${
                        (positionSide === 'LONG' || zbPos?.dir === 'long') ? 'text-cyan-400' : 'text-orange-400'
                      }`}>
                        {data.strategyA?.entry_time
                          ? formatHoldingDuration(data.strategyA.entry_time, data.currentTime)
                          : zbPos ? `${Math.floor((zbPos.hold_minutes ?? 0) / 60)}h ${(zbPos.hold_minutes ?? 0) % 60}m` : ''
                        }
                      </span>
                    </div>
                  )}
                  {zbPos && (
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] ${
                        (positionSide === 'LONG' || zbPos?.dir === 'long') ? 'text-cyan-300' : 'text-orange-300'
                      }`}>Risk</span>
                      <span className="text-[11px] font-bold text-slate-300">
                        {zbPos.risk_pct.toFixed(2)}% (${zbPos.risk.toFixed(0)})
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

        <ZBEntryPanelDark zbStatus={zbStatus} zbZones={zbZones} data={data} />

        <ZBExitPanelDark zbStatus={zbStatus} data={data} />
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
        <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold text-white">Performance</h3>
            <DollarSign className="w-3 h-3 text-slate-400" />
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

        <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
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
            <div className="border-t border-slate-700 pt-1 mt-1">
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
                          className="bg-cyan-500 h-2.5 transition-all duration-500"
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-cyan-400 min-w-[40px]">
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
      <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2 flex flex-col" style={{ height: '100%' }}>
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
            recentTrades.map((trade, index) => {
              const isLong = (trade as any).side !== 'SHORT';

              return (
                <div key={`${trade.timestamp}-${index}`}>
                  {trade.type === 'buy' ? (
                    <div className={`${isLong ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-orange-900/20 border-orange-600/50'} border rounded p-1`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold ${isLong ? 'text-cyan-400' : 'text-orange-400'}`}>
                          {isLong ? 'LONG' : 'SHORT'}
                        </span>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-white">{formatCurrency(trade.price)}</span>
                          <span className="text-[8px] text-slate-300">{formatLocalDateTime(trade.timestamp)}</span>
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
              );
            })
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
