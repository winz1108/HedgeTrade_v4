import { useMemo } from 'react';
import { PriceChart } from '../PriceChart';
import { DashboardData, TradeEvent } from '../../types/dashboard';

interface BinanceSpotData {
  success: boolean;
  data: {
    currentPrice: number;
    serverTime: number;
    wsHealthy: boolean;
    exchange: string;
    symbol: string;
    account: {
      id: string;
      name: string;
      mode: string;
      totalAsset: number;
      initialAsset: number;
      currencies: {
        [key: string]: {
          quantity: number;
          valueUsd: number;
        };
      };
      returnPct: number;
    };
    position: {
      inPosition: boolean;
      side: 'LONG' | 'SHORT' | null;
      entryPrice: number | null;
      entryTime: number | null;
      currentPnl: number;
      mfe: number;
      ppActivated: boolean;
      ppStop: number | null;
      ppReversalPrice: number | null;
      peakPrice: number | null;
    };
    strategy: {
      version: string;
      entryConditionsLong: { [key: string]: boolean };
      entryConditionsShort: { [key: string]: boolean };
      indicators: {
        [key: string]: any;
      };
      pp_reversal_price: number | null;
    };
    metrics: {
      totalTrades: number;
      winRate: number;
      avgPnl: number;
      totalPnl: number;
    };
    trades: Array<{
      timestamp: number;
      type: string;
      side: string;
      entryPrice: number;
      exitPrice: number;
      quantity: number;
      pnlPercent: number;
      reason: string;
      holdSeconds: number;
    }>;
  };
}

interface Props {
  data: BinanceSpotData;
  priceHistories: {
    '1m'?: any[];
    '5m'?: any[];
    '15m'?: any[];
    '30m'?: any[];
    '1h'?: any[];
    '4h'?: any[];
    '1d'?: any[];
  };
}

export function BinanceFuturesPriceChart({ data: apiData, priceHistories }: Props) {
  const data = apiData.data;

  const transformedData = useMemo((): DashboardData | null => {
    const getCandles = (timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'): any[] => {
      let candles: any[] = priceHistories[timeframe] || [];

      let processedCandles = candles.map(c => ({
        ...c,
        timestamp: c.time ? c.time * 1000 : c.timestamp,
      }));

      const indicators = data.strategy?.indicators?.[timeframe];
      if (indicators) {
        const macdLine = indicators.macd_line || [];
        const macdSignal = indicators.macd_signal || [];
        const macdHist = indicators.macd_hist || [];

        processedCandles = processedCandles.map((candle, idx) => ({
          ...candle,
          macd: macdLine[idx] ?? candle.macd,
          signal: macdSignal[idx] ?? candle.signal,
          histogram: macdHist[idx] ?? candle.histogram,
        }));
      }

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

    const allTrades = data.trades || [];

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const trades = allTrades
      .filter(trade => trade.timestamp >= oneWeekAgo)
      .slice(-40);

    return {
      version: data.strategy.version,
      currentAsset: data.account.totalAsset,
      currentBTC: data.account.currencies?.BTC?.valueUsd || 0,
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
        isHolding: data.position.inPosition,
        buyPrice: data.position.entryPrice || undefined,
        buyTime: data.position.entryTime || undefined,
        currentProfit: data.position.currentPnl,
        positionSide: data.position.side || undefined,
        ppReversalPrice: data.strategy.pp_reversal_price || undefined,
      },
      metrics: {
        portfolioReturn: 0,
        marketReturn: 0,
        avgTradeReturn: 0,
        takeProfitCount: 0,
        stopLossCount: 0,
      },
    };
  }, [data, priceHistories]);

  if (!transformedData) {
    return (
      <div className="w-full bg-white border border-amber-200 rounded-lg shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-slate-800 font-bold">No chart data available</div>
        </div>
      </div>
    );
  }

  return (
    <PriceChart
      data={transformedData}
      onTradeHover={(trade: TradeEvent | null) => {}}
      onTimeframeChange={(timeframe: string) => {}}
      darkMode={false}
    />
  );
}
