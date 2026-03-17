import { useMemo } from 'react';
import { PriceChart } from '../PriceChart';
import { KrakenDashboardData, DashboardData, TradeEvent } from '../../types/dashboard';

interface Props {
  data: KrakenDashboardData;
  onTimeframeChange?: (timeframe: string) => void;
}

export function KrakenPriceChart({ data, onTimeframeChange }: Props) {
  const transformedData = useMemo((): DashboardData | null => {
    const toMs = (v: number): number => {
      if (!v) return 0;
      return v < 1e12 ? v * 1000 : v;
    };

    const getCandles = (timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'): any[] => {
      let candles: any[] = [];

      if (data.priceHistories && data.priceHistories[timeframe]) {
        candles = data.priceHistories[timeframe];
      } else {
        const key = `priceHistory${timeframe}` as keyof typeof data;
        candles = (data[key] as any[]) || [];
      }

      let processedCandles = candles.map(c => {
        const raw = c.open_time_ms ?? c.timestamp ?? c.time ?? 0;
        return {
          ...c,
          timestamp: toMs(raw),
        };
      });

      // 타임프레임별 MACD 데이터 병합
      const indicators = data.strategyA?.indicators?.[timeframe];
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

    // 백엔드 실제 필드명 (API_SPEC.md 기준)
    const requiredFields = ['macd', 'signal', 'histogram', 'ema_short', 'ema_long', 'bb_upper', 'bb_mid', 'bb_lower', 'adx'];
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
      (window as any).__KRAKEN_MISSING_FIELDS__ = missingByTimeframe;
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

    const allTrades = data.recentTrades || [];

    // 거래 데이터 필터링
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const trades = allTrades
      .filter(trade => {
        if (trade.exchange && trade.exchange !== 'kraken_futures') return false;
        const confirmed = (trade as any).confirmed;
        if (confirmed !== true) return false;
        if (trade.type === 'buy' && !trade.side) return false;
        return true;
      })
      .filter(trade => trade.timestamp >= oneWeekAgo)
      .slice(-40);

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
      trades,
      holding: {
        isHolding: data.position.in_position,
        buyPrice: data.strategyA.entry_price,
        buyTime: data.strategyA.entry_time,
        currentProfit: data.strategyA.current_pnl,
        positionSide: data.position.position_side,
        ppReversalPrice: data.strategyA.pp_reversal_price,
        floorPrice: data.strategyA.floor_price ?? null,
        slPrice: data.strategyA.sl_price ?? undefined,
        currentSlPct: data.strategyA.current_sl_pct ?? undefined,
        exitFloorPrice: data.strategyA.exit_prices?.floor_price ?? data.strategyA.floor_price ?? null,
        exitSlPrice: data.strategyA.exit_prices?.sl_price ?? data.strategyA.sl_price ?? undefined,
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
        {missingFields && Object.keys(missingFields).length > 0 && (
          <div className="bg-red-900/20 border border-red-700 rounded p-4 mb-4">
            <div className="text-red-400 font-bold mb-2">백엔드 데이터 누락:</div>
            <div className="text-red-300 text-sm">
              다음 타임프레임 캔들에 필드 추가 필요:
              {Object.entries(missingFields).map(([tf, fields]: [string, any]) => (
                <div key={tf} className="mt-2">
                  <div className="font-bold text-red-400">{tf}:</div>
                  <ul className="list-disc list-inside ml-4">
                    {fields.map((field: string) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              ))}
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

  const v10Strategy = useMemo(() => {
    const base = data.strategyStatus;
    const krakenInd = data.indicators;
    const rawData = data as any;

    const extractBdBu = (src: any): { bd?: number; bu?: number } => {
      if (!src) return {};
      return {
        bd: src.bd ?? src['15m_bd'] ?? src['5m_bd'] ?? src.band_down ?? src.lower_band ?? undefined,
        bu: src.bu ?? src['15m_bu'] ?? src['5m_bu'] ?? src.band_up ?? src.upper_band ?? undefined,
      };
    };

    const bdbu15m: Record<string, number | undefined> = {};

    const sources15m = [
      krakenInd?.['15m'],
      base?.indicators?.['15m'],
      rawData.strategyStatus?.indicators?.['15m'],
    ];

    for (const src of sources15m) {
      if (!src) continue;
      const { bd, bu } = extractBdBu(src);
      if (bd !== undefined && bdbu15m.bd === undefined) bdbu15m.bd = bd;
      if (bu !== undefined && bdbu15m.bu === undefined) bdbu15m.bu = bu;
      if (bdbu15m.bd !== undefined && bdbu15m.bu !== undefined) break;
    }

    if (bdbu15m.bd === undefined || bdbu15m.bu === undefined) {
      const fallbackSources = [
        krakenInd?.['5m'],
        base?.indicators?.['5m'],
        data.strategyA,
      ];
      for (const src of fallbackSources) {
        if (!src) continue;
        const { bd, bu } = extractBdBu(src);
        if (bd !== undefined && bdbu15m.bd === undefined) bdbu15m.bd = bd;
        if (bu !== undefined && bdbu15m.bu === undefined) bdbu15m.bu = bu;
        if (bdbu15m.bd !== undefined && bdbu15m.bu !== undefined) break;
      }
    }

    const merged: any = base
      ? { ...base }
      : { inPosition: data.position?.in_position ?? false };

    merged.indicators = {
      ...merged.indicators,
      '15m': {
        ...(merged.indicators?.['15m'] ?? {}),
        ...(bdbu15m.bd !== undefined ? { bd: bdbu15m.bd } : {}),
        ...(bdbu15m.bu !== undefined ? { bu: bdbu15m.bu } : {}),
      },
      '5m': {
        ...(merged.indicators?.['5m'] ?? {}),
      },
    };

    return merged;
  }, [data.strategyStatus, data.indicators, data.strategyA, data.position?.in_position, data]);

  return (
    <PriceChart
      data={transformedData}
      onTradeHover={(trade: TradeEvent | null) => {}}
      onTimeframeChange={(timeframe: string) => onTimeframeChange?.(timeframe)}
      darkMode={true}
      v10Strategy={v10Strategy}
    />
  );
}
