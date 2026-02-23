import { useMemo } from 'react';
import { PriceChart } from '../PriceChart';
import { KrakenDashboardData, DashboardData, TradeEvent } from '../../types/dashboard';

interface Props {
  data: KrakenDashboardData;
}

export function KrakenPriceChart({ data }: Props) {
  const transformedData = useMemo((): DashboardData => {
    return {
      version: data.version,
      currentAsset: data.balance.portfolioValue,
      currentBTC: data.balance.portfolioValue,
      currentCash: 0,
      initialAsset: 10000,
      currentTime: data.currentTime || Date.now(),
      currentPrice: data.currentPrice,
      priceHistory1m: data.priceHistory1m || [],
      priceHistory5m: data.priceHistory5m,
      priceHistory15m: data.priceHistory15m,
      priceHistory30m: data.priceHistory30m,
      priceHistory1h: data.priceHistory1h,
      priceHistory4h: data.priceHistory4h,
      priceHistory1d: data.priceHistory1d,
      pricePredictions: [],
      trades: data.recentTrades || [],
      holding: {
        isHolding: data.position.in_position,
        buyPrice: data.position.entry_price,
        currentProfit: data.position.unrealizedPnlPct,
      },
      metrics: {
        portfolioReturn: 0,
        marketReturn: 0,
        avgTradeReturn: 0,
        takeProfitCount: 0,
        stopLossCount: 0,
      },
    };
  }, [data]);

  return (
    <PriceChart
      data={transformedData}
      onTradeHover={(trade: TradeEvent | null) => {}}
      onTimeframeChange={(timeframe: string) => {}}
    />
  );
}
