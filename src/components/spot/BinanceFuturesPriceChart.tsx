import { useMemo } from 'react';
import { PriceChart } from '../PriceChart';
import { DashboardData, TradeEvent, BFDashboardData } from '../../types/dashboard';

interface Props {
  data: BFDashboardData;
  onTimeframeChange?: (timeframe: string) => void;
}

export function BinanceFuturesPriceChart({ data, onTimeframeChange }: Props) {
  const transformedData = useMemo((): DashboardData | null => {
    const toMs = (v: number): number => {
      if (!v) return 0;
      return v < 1e12 ? v * 1000 : v;
    };

    const getCandles = (timeframe: string): any[] => {
      const candles: any[] = data.priceHistories?.[timeframe] || [];

      return candles.map(c => {
        const raw = c.open_time_ms ?? c.timestamp ?? c.time ?? 0;
        return {
          ...c,
          timestamp: toMs(raw),
        };
      });
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

  const v10Strategy = useMemo(() => {
    const base = data.strategyStatus;
    const stratInd = data.strategy?.indicators;

    if (!base && !stratInd) return null;

    const merged = base ? { ...base } : { inPosition: data.position?.inPosition ?? false } as any;

    if (stratInd && (!merged.indicators || Object.keys(merged.indicators).length === 0)) {
      merged.indicators = stratInd;
    } else if (stratInd && merged.indicators) {
      merged.indicators = { ...stratInd, ...merged.indicators };
    }

    return merged;
  }, [data.strategyStatus, data.strategy?.indicators, data.position?.inPosition]);

  return (
    <PriceChart
      data={transformedData}
      onTradeHover={(_trade: TradeEvent | null) => {}}
      onTimeframeChange={(timeframe: string) => onTimeframeChange?.(timeframe)}
      darkMode={false}
      v10Strategy={v10Strategy}
    />
  );
}
