import { useMemo } from 'react';
import { PriceChart } from '../PriceChart';
import { KrakenDashboardData, DashboardData, TradeEvent } from '../../types/dashboard';

interface Props {
  data: KrakenDashboardData;
}

export function KrakenPriceChart({ data }: Props) {
  const transformedData = useMemo((): DashboardData => {
    const addIndicatorsToCandles = (candles: any[], timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d') => {
      if (!candles || candles.length === 0) return candles;
      if (!data.indicators || !data.indicators[timeframe]) return candles;

      const indicators = data.indicators[timeframe];
      const lastCandle = candles[candles.length - 1];

      if ('ema_short' in indicators && 'ema_long' in indicators) {
        lastCandle.ema5 = indicators.ema_short;
        lastCandle.ema13 = indicators.ema_long;
      }

      if ('adx' in indicators) {
        lastCandle.adx = indicators.adx;
      }

      if ('bbw' in indicators) {
        lastCandle.bbWidth = indicators.bbw;
      }

      if (timeframe === '15m' && 'ema3' in indicators && 'ema8' in indicators) {
        lastCandle.ema3 = indicators.ema3;
        lastCandle.ema8 = indicators.ema8;
      }

      if (timeframe === '4h' && 'macd_hist' in indicators) {
        lastCandle.macd = indicators.macd_line;
        lastCandle.signal = indicators.macd_signal;
        lastCandle.histogram = indicators.macd_hist;
      }

      return candles;
    };

    const priceHistory1m = addIndicatorsToCandles([...(data.priceHistory1m || [])], '1m');
    const priceHistory5m = addIndicatorsToCandles([...(data.priceHistory5m || [])], '5m');
    const priceHistory15m = addIndicatorsToCandles([...(data.priceHistory15m || [])], '15m');
    const priceHistory30m = addIndicatorsToCandles([...(data.priceHistory30m || [])], '30m');
    const priceHistory1h = addIndicatorsToCandles([...(data.priceHistory1h || [])], '1h');
    const priceHistory4h = addIndicatorsToCandles([...(data.priceHistory4h || [])], '4h');
    const priceHistory1d = addIndicatorsToCandles([...(data.priceHistory1d || [])], '1d');

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
