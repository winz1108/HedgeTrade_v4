import { useMemo } from 'react';
import { PriceChart } from '../PriceChart';
import { KrakenDashboardData, DashboardData, TradeEvent } from '../../types/dashboard';

interface Props {
  data: KrakenDashboardData;
}

export function KrakenPriceChart({ data }: Props) {
  const transformedData = useMemo((): DashboardData | null => {
    const getCandles = (timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'): any[] => {
      let candles: any[] = [];

      if (data.priceHistories && data.priceHistories[timeframe]) {
        candles = data.priceHistories[timeframe];
      } else {
        const key = `priceHistory${timeframe}` as keyof typeof data;
        candles = (data[key] as any[]) || [];
      }

      // 백엔드는 time(초) 필드 사용, 프론트엔드는 timestamp(밀리초) 필요
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

    if (priceHistory1m.length === 0) {
      return null;
    }

    const sampleCandle = priceHistory1m[0];
    const missingFields: string[] = [];

    if (!('macd_line' in sampleCandle)) missingFields.push('macd_line');
    if (!('macd_signal' in sampleCandle)) missingFields.push('macd_signal');
    if (!('macd_hist' in sampleCandle)) missingFields.push('macd_hist');
    if (!('ema_short' in sampleCandle)) missingFields.push('ema_short');
    if (!('ema_long' in sampleCandle)) missingFields.push('ema_long');
    if (!('bb_upper' in sampleCandle)) missingFields.push('bb_upper');
    if (!('bb_mid' in sampleCandle)) missingFields.push('bb_mid');
    if (!('bb_lower' in sampleCandle)) missingFields.push('bb_lower');
    if (!('adx' in sampleCandle)) missingFields.push('adx');

    if (missingFields.length > 0) {
      (window as any).__KRAKEN_MISSING_FIELDS__ = missingFields;
    }

    const entryPrice = data.strategyA?.entry_price;
    const entryTime = data.strategyA?.entry_time;
    const currentPnl = data.strategyA?.current_pnl;

    if (data.position.in_position && (!entryPrice || !entryTime)) {
      (window as any).__KRAKEN_POSITION_ERROR__ = {
        in_position: data.position.in_position,
        entry_price: entryPrice,
        entry_time: entryTime,
        current_pnl: currentPnl,
      };
    }

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
        buyPrice: data.strategyA.entry_price,
        buyTime: data.strategyA.entry_time,
        currentProfit: data.strategyA.current_pnl,
        positionSide: data.position.position_side,
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

  if (!transformedData) {
    const missingFields = (window as any).__KRAKEN_MISSING_FIELDS__;
    const positionError = (window as any).__KRAKEN_POSITION_ERROR__;

    return (
      <div className="w-full bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-slate-200 font-bold">No chart data available</div>
        </div>
        {missingFields && missingFields.length > 0 && (
          <div className="bg-red-900/20 border border-red-700 rounded p-4 mb-4">
            <div className="text-red-400 font-bold mb-2">백엔드 데이터 누락:</div>
            <div className="text-red-300 text-sm">
              priceHistory 캔들에 다음 필드 추가 필요:
              <ul className="list-disc list-inside mt-2">
                {missingFields.map((field: string) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {positionError && (
          <div className="bg-orange-900/20 border border-orange-700 rounded p-4">
            <div className="text-orange-400 font-bold mb-2">포지션 데이터 오류:</div>
            <div className="text-orange-300 text-sm">
              in_position이 true인데 strategyA에 entry_price 또는 entry_time 없음
              <pre className="mt-2 text-xs bg-black/30 p-2 rounded">
                {JSON.stringify(positionError, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <PriceChart
      data={transformedData}
      onTradeHover={(trade: TradeEvent | null) => {}}
      onTimeframeChange={(timeframe: string) => {}}
      darkMode={true}
    />
  );
}
