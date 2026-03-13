import { useMemo } from 'react';
import { PriceChart } from '../PriceChart';
import { DashboardData, TradeEvent, BFDashboardData } from '../../types/dashboard';

interface Props {
  data: BFDashboardData;
}

export function BinanceFuturesPriceChart({ data }: Props) {
  const transformedData = useMemo((): DashboardData | null => {
    const getCandles = (timeframe: string): any[] => {
      const candles: any[] = data.priceHistories?.[timeframe] || [];

      return candles.map(c => ({
        ...c,
        timestamp: c.time ? c.time * 1000 : c.timestamp,
      }));
    };

    const priceHistory1m = getCandles('1m');
    const priceHistory5m = getCandles('5m');
    const priceHistory15m = getCandles('15m');
    const priceHistory30m = getCandles('30m');
    const priceHistory1h = getCandles('1h');
    const priceHistory4h = getCandles('4h');
    const priceHistory1d = getCandles('1d');

    if (priceHistory1m.length === 0) return null;

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const trades: TradeEvent[] = (data.recentTrades || [])
      .filter(t => t.timestamp >= oneWeekAgo)
      .slice(-40);

    return {
      version: data.strategy?.version,
      currentAsset: data.account.totalAsset,
      currentBTC: 0,
      currentCash: data.account.currencies?.USDT?.quantity || 0,
      initialAsset: data.account.initialAsset,
      currentTime: data.serverTime || Date.now(),
      currentPrice: data.currentPrice,
      priceHistory1m,
      priceHistory5m,
      priceHistory15m,
      priceHistory30m,
      priceHistory1h,
      priceHistory4h,
      priceHistory1d,
      pricePredictions: [],
      trades,
      holding: {
        isHolding: data.position.inPosition ?? data.position.in_position ?? false,
        buyPrice: data.position.entryPrice || data.position.entry_price || undefined,
        buyTime: data.position.entryTime || data.position.entry_time || undefined,
        currentProfit: data.position.currentPnl ?? data.position.current_pnl,
        positionSide: data.position.side || data.position.position_side || undefined,
        ppReversalPrice: data.strategy?.pp_reversal_price || data.position.ppReversalPrice || data.position.pp_reversal_price || undefined,
        floorPrice: data.position.floorPrice ?? data.position.floor_price ?? null,
        slPrice: data.position.slPrice ?? data.position.sl_price ?? undefined,
        currentSlPct: data.position.currentSlPct ?? data.position.current_sl_pct ?? undefined,
        exitFloorPrice: data.position.exit_prices?.floor_price ?? data.position.floorPrice ?? data.position.floor_price ?? null,
        exitSlPrice: data.position.exit_prices?.sl_price ?? data.position.slPrice ?? data.position.sl_price ?? undefined,
      },
      metrics: {
        portfolioReturn: 0,
        marketReturn: data.metrics?.marketReturn || 0,
        avgTradeReturn: data.metrics?.avgPnl || 0,
        takeProfitCount: 0,
        stopLossCount: 0,
        totalTrades: data.metrics?.totalTrades,
        winRate: data.metrics?.winRate,
        totalPnl: data.metrics?.totalPnl,
      },
    };
  }, [data]);

  if (!transformedData) {
    return (
      <div className="w-full bg-white border border-amber-200 rounded-lg shadow-sm p-8">
        <div className="text-center">
          <div className="text-slate-800 font-bold">Loading chart data...</div>
        </div>
      </div>
    );
  }

  return (
    <PriceChart
      data={transformedData}
      onTradeHover={(_trade: TradeEvent | null) => {}}
      onTimeframeChange={(_timeframe: string) => {}}
      darkMode={false}
      v10Strategy={data.strategyStatus || null}
    />
  );
}
