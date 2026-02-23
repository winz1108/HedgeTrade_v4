import { useMemo } from 'react';
import { PriceChart } from '../PriceChart';
import { KrakenDashboardData, DashboardData, TradeEvent } from '../../types/dashboard';

interface Props {
  data: KrakenDashboardData;
}

export function KrakenPriceChart({ data }: Props) {
  const transformedData = useMemo((): DashboardData => {
    const priceHistory1m = data.priceHistory1m || [];
    const priceHistory5m = data.priceHistory5m;
    const priceHistory15m = data.priceHistory15m;
    const priceHistory30m = data.priceHistory30m;
    const priceHistory1h = data.priceHistory1h;
    const priceHistory4h = data.priceHistory4h;
    const priceHistory1d = data.priceHistory1d;

    return {
      version: data.version,
      currentAsset: data.balance.portfolioValue,
      currentBTC: data.balance.portfolioValue,
      currentCash: 0,
      initialAsset: 10000,
      currentTime: data.currentTime || Date.now(),
      currentPrice: data.currentPrice,
      priceHistory1m,
      priceHistory5m,
      priceHistory15m,
      priceHistory30m,
      priceHistory1h,
      priceHistory4h,
      priceHistory1d,
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

  if (!transformedData.priceHistory1m || transformedData.priceHistory1m.length === 0) {
    return (
      <div className="w-full bg-white/95 border border-slate-200 rounded-lg shadow-sm p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-slate-700 font-bold">No chart data available</div>
          <div className="text-slate-500 text-sm mt-1">
            priceHistory1m: {transformedData.priceHistory1m?.length || 0} candles
          </div>
        </div>
      </div>
    );
  }

  return (
    <PriceChart
      data={transformedData}
      onTradeHover={(trade: TradeEvent | null) => {}}
      onTimeframeChange={(timeframe: string) => {}}
    />
  );
}
