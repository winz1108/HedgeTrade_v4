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

    // 포지션 상태와 거래 데이터 매칭 검증
    const allTrades = data.recentTrades || [];
    console.log('[KrakenPriceChart] 🔍 포지션 상태 vs 거래 데이터:', {
      position: {
        in_position: data.position.in_position,
        position_side: data.position.position_side,
        entry_price: data.position.entry_price,
      },
      recentTrades: allTrades.map(t => ({
        timestamp: new Date(t.timestamp).toLocaleTimeString('ko-KR'),
        type: t.type,
        side: (t as any).side,
        exchange: (t as any).exchange,
        price: t.price,
      })),
      inconsistency: data.position.in_position && allTrades.some(t =>
        t.type === 'buy' && (t as any).side === data.position.position_side
      ) ? '⚠️ 이미 포지션 보유 중인데 또 진입 신호 발견!' : null,
    });

    // 거래 데이터 필터링: kraken_futures만 표시
    const trades = allTrades.filter(trade => {
      // exchange 필드가 있으면 kraken_futures만 허용
      if (trade.exchange) {
        return trade.exchange === 'kraken_futures';
      }

      // exchange 필드가 없는 경우 (백엔드 업데이트 전)
      // buy 이벤트는 side 필드가 있어야 함
      if (trade.type === 'buy' && !trade.side) {
        console.warn('[KrakenPriceChart] ⚠️ buy 이벤트에 side 필드가 없어 무시됨:', trade);
        return false;
      }

      return true;
    });

    if (allTrades.length !== trades.length) {
      console.log('[KrakenPriceChart] 🔍 거래 필터링:', {
        total: allTrades.length,
        filtered: trades.length,
        removed: allTrades.length - trades.length,
        removedTrades: allTrades.filter(t => !trades.includes(t)).map(t => ({
          type: t.type,
          side: (t as any).side,
          exchange: t.exchange,
          timestamp: t.timestamp,
        })),
      });
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
      trades,
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

  return (
    <PriceChart
      data={transformedData}
      onTradeHover={(trade: TradeEvent | null) => {}}
      onTimeframeChange={(timeframe: string) => {}}
      darkMode={true}
    />
  );
}
