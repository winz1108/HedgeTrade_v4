import { useMemo } from 'react';
import { PriceChart } from '../PriceChart';
import { BinanceFuturesDashboardData, DashboardData, TradeEvent } from '../../types/dashboard';

interface Props {
  data: BinanceFuturesDashboardData;
}

export function BinanceFuturesPriceChart({ data }: Props) {
  const transformedData = useMemo((): DashboardData | null => {
    const getCandles = (timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'): any[] => {
      let candles: any[] = [];

      if (data.priceHistories && data.priceHistories[timeframe]) {
        candles = data.priceHistories[timeframe];
      } else {
        const key = `priceHistory${timeframe}` as keyof typeof data;
        candles = (data[key] as any[]) || [];
      }

      let processedCandles = candles.map(c => ({
        ...c,
        timestamp: c.time ? c.time * 1000 : c.timestamp,
      }));

      return processedCandles;
    };

    const priceHistory1m = getCandles('1m');
    const priceHistory5m = getCandles('5m');
    const priceHistory15m = getCandles('15m');
    const priceHistory30m = getCandles('30m');
    const priceHistory1h = getCandles('1h');
    const priceHistory4h = getCandles('4h');
    const priceHistory1d = getCandles('1d');

    if (priceHistory1m.length === 0) {
      return null;
    }

    const requiredFields = ['macd', 'signal', 'histogram', 'ema_short', 'ema_long', 'bb_upper', 'bb_mid', 'bb_lower', 'adx', 'rsi'];
    const timeframes = { '1m': priceHistory1m, '5m': priceHistory5m, '15m': priceHistory15m, '30m': priceHistory30m, '1h': priceHistory1h, '4h': priceHistory4h, '1d': priceHistory1d };
    const missingByTimeframe: Record<string, string[]> = {};

    Object.entries(timeframes).forEach(([tf, candles]) => {
      if (candles.length > 0) {
        const sampleCandle = candles[0];
        const missing = requiredFields.filter(field => !(field in sampleCandle));
        if (missing.length > 0) {
          missingByTimeframe[tf] = missing;
        }
      }
    });

    if (Object.keys(missingByTimeframe).length > 0) {
      (window as any).__BINANCE_FUTURES_MISSING_FIELDS__ = missingByTimeframe;
    }

    const entryPrice = data.position?.entryPrice;
    const entryTime = data.position?.entryTime;
    const currentPnl = data.position?.currentPnl;

    if (data.position.inPosition && (!entryPrice || !entryTime)) {
      (window as any).__BINANCE_FUTURES_POSITION_ERROR__ = {
        inPosition: data.position.inPosition,
        entry_price: entryPrice,
        entry_time: entryTime,
        current_pnl: currentPnl,
      };
    }

    const allTrades = data.trades || [];

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const trades: TradeEvent[] = allTrades
      .filter(trade => trade.timestamp >= oneWeekAgo)
      .slice(-40)
      .map(trade => ({
        timestamp: trade.timestamp,
        type: trade.side === 'LONG' ? 'sell' : 'buy',
        price: trade.exitPrice,
        profit: trade.pnlPercent,
        quantity: trade.quantity,
        exitReason: trade.reason,
        side: trade.side,
        entryPrice: trade.entryPrice,
        entryTime: trade.timestamp - (trade.holdSeconds * 1000),
      }));

    return {
      version: data.strategy.version,
      currentAsset: data.account.totalAsset,
      currentBTC: data.account.totalAsset,
      currentCash: 0,
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
        isHolding: data.position.inPosition,
        buyPrice: data.position.entryPrice || undefined,
        buyTime: data.position.entryTime || undefined,
        currentProfit: data.position.currentPnl,
        positionSide: data.position.side || undefined,
        ppReversalPrice: data.position.ppReversalPrice,
      },
      metrics: {
        portfolioReturn: data.account.returnPct,
        marketReturn: 0,
        avgTradeReturn: data.metrics.avgPnl,
        takeProfitCount: 0,
        stopLossCount: 0,
      },
    };
  }, [data]);

  if (!transformedData) {
    const missingFields = (window as any).__BINANCE_FUTURES_MISSING_FIELDS__;
    const positionError = (window as any).__BINANCE_FUTURES_POSITION_ERROR__;

    return (
      <div className="w-full bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-slate-200 font-bold">No chart data available</div>
        </div>
        {missingFields && Object.keys(missingFields).length > 0 && (
          <div className="bg-red-900/20 border border-red-700 rounded p-4 mb-4">
            <div className="text-red-400 font-bold mb-2">Missing Indicator Fields</div>
            {Object.entries(missingFields).map(([tf, fields]) => (
              <div key={tf} className="text-xs text-red-300 mb-1">
                {tf}: {(fields as string[]).join(', ')}
              </div>
            ))}
          </div>
        )}
        {positionError && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded p-4">
            <div className="text-yellow-400 font-bold mb-2">Position Data Error</div>
            <pre className="text-xs text-yellow-300 overflow-auto">
              {JSON.stringify(positionError, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return <PriceChart data={transformedData} onTradeHover={() => {}} />;
}
