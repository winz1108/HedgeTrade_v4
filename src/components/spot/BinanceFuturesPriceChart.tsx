import { useMemo } from 'react';
import { PriceChart } from '../PriceChart';
import { DashboardData, TradeEvent } from '../../types/dashboard';

interface Props {
  data: any;
  priceHistories: {
    [tf: string]: any[];
  };
}

export function BinanceFuturesPriceChart({ data: apiData, priceHistories }: Props) {
  const d = apiData?.data;

  const transformedData = useMemo((): DashboardData | null => {
    if (!d) return null;

    const getCandles = (timeframe: string): any[] => {
      const candles: any[] = priceHistories[timeframe] || [];

      return candles.map(c => ({
        ...c,
        timestamp: c.time ? c.time * 1000 : c.timestamp,
        ema_short: c.ema_short,
        ema_long: c.ema_long,
        ema3: c.ema3,
        ema8: c.ema8,
        bb_upper: c.bb_upper,
        bb_mid: c.bb_mid,
        bb_lower: c.bb_lower,
        bbw: c.bbw,
        macd: c.macd || c.macd_line,
        signal: c.signal || c.macd_signal,
        histogram: c.histogram || c.macd_hist,
        rsi: c.rsi,
        adx: c.adx,
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

    const trades: TradeEvent[] = (d.trades || []).map((t: any) => ({
      timestamp: t.timestamp,
      type: t.type === 'exit' ? 'sell' : 'buy',
      price: t.type === 'exit' ? t.exitPrice : t.entryPrice,
      profit: t.pnlPercent,
      side: t.side,
      exitReason: t.reason,
    }));

    return {
      version: d.strategy?.version,
      currentAsset: d.account?.totalAsset || 0,
      currentBTC: 0,
      currentCash: d.account?.currencies?.USDT?.quantity || 0,
      initialAsset: d.account?.initialAsset || 0,
      currentTime: d.serverTime || Date.now(),
      currentPrice: d.currentPrice,
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
        isHolding: d.position?.inPosition || false,
        buyPrice: d.position?.entryPrice || undefined,
        buyTime: d.position?.entryTime || undefined,
        currentProfit: d.position?.currentPnl,
        positionSide: d.position?.side || undefined,
        ppReversalPrice: d.strategy?.pp_reversal_price || d.position?.ppReversalPrice || undefined,
      },
      metrics: {
        portfolioReturn: 0,
        marketReturn: d.metrics?.marketReturn || 0,
        avgTradeReturn: d.metrics?.avgPnl || 0,
        takeProfitCount: 0,
        stopLossCount: 0,
        totalTrades: d.metrics?.totalTrades,
        winRate: d.metrics?.winRate,
        totalPnl: d.metrics?.totalPnl,
      },
    };
  }, [d, priceHistories]);

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
    />
  );
}
