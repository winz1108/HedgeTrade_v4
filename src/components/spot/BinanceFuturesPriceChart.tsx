import { useMemo } from 'react';
import { PriceChart } from '../PriceChart';
import { DashboardData, TradeEvent, BFDashboardData, BosLevel } from '../../types/dashboard';
import type { ZBZones, ZBStatus } from '../../types/zoneBounce';

interface Props {
  data: BFDashboardData;
  onTimeframeChange?: (timeframe: string) => void;
  zbZones?: ZBZones | null;
  zbStatus?: ZBStatus | null;
}

export function BinanceFuturesPriceChart({ data, onTimeframeChange, zbZones, zbStatus }: Props) {
  const transformedData = useMemo((): DashboardData | null => {
    const toMs = (v: number): number => {
      if (!v) return 0;
      return v < 1e12 ? v * 1000 : v;
    };

    const getCandles = (timeframe: string): any[] => {
      const candles: any[] = data.priceHistories?.[timeframe] || [];

      return candles.map(c => {
        const raw = c.open_time_ms ?? c.timestamp ?? c.time ?? 0;
        const ind = c.indicators || {};
        return {
          ...c,
          timestamp: toMs(raw),
          swing_high: c.swing_high ?? ind.swing_high ?? false,
          swing_low: c.swing_low ?? ind.swing_low ?? false,
          ema_short: c.ema_short ?? ind.ema_short,
          ema_long: c.ema_long ?? ind.ema_long,
          ema200: c.ema200 ?? ind.ema200,
          bb_upper: c.bb_upper ?? ind.bb_upper,
          bb_mid: c.bb_mid ?? ind.bb_mid,
          bb_lower: c.bb_lower ?? ind.bb_lower,
          adx: c.adx ?? ind.adx,
          rsi: c.rsi ?? ind.rsi,
          macd: c.macd ?? ind.macd ?? ind.macd_line,
          signal: c.signal ?? ind.signal ?? ind.macd_signal,
          histogram: c.histogram ?? ind.histogram ?? ind.macd_hist,
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

    const posExit = (data.position as any)?.exitConditions;
    const posExitPrices = (data.position as any)?.exitPrices;
    if (posExit || posExitPrices) {
      merged.exitPrices = {
        ...merged.exitPrices,
        slPrice: posExitPrices?.sl_price || posExit?.SL?.price || merged.exitPrices?.slPrice,
        trailTriggerPrice: posExitPrices?.trail_trigger_price || posExit?.TRAIL?.trigger_price,
        trailExitPrice: posExitPrices?.trail_exit_price || posExit?.TRAIL?.trail_exit_price,
      };
      merged.exitConditions = {
        ...merged.exitConditions,
        SL: { ...merged.exitConditions?.SL, ...posExit?.SL },
        TRAIL: { ...merged.exitConditions?.TRAIL, ...posExit?.TRAIL },
        TIME: { ...merged.exitConditions?.TIME, ...posExit?.TIME },
      };
    }

    return merged;
  }, [data.strategyStatus, data.strategy?.indicators, data.position]);

  const swingMl = (data as any).swing_ml;
  const bosLevels: BosLevel[] | null = swingMl?.bos?.levels_15m ?? (data as any).bos_levels ?? (data as any).bosLevels ?? null;

  if (!bosLevels && swingMl) {
    console.log('[BOS Debug] swing_ml exists but no levels_15m. swing_ml.bos:', swingMl?.bos);
  }
  if (bosLevels) {
    console.log('[BOS Debug] Binance bosLevels count:', bosLevels.length, 'sample:', bosLevels[0]);
  }

  return (
    <PriceChart
      data={transformedData}
      onTradeHover={(_trade: TradeEvent | null) => {}}
      onTimeframeChange={(timeframe: string) => onTimeframeChange?.(timeframe)}
      darkMode={false}
      v10Strategy={v10Strategy}
      zbZones={zbZones}
      zbStatus={zbStatus}
      zoneData={data.zoneData}
      predHistory={swingMl?.pred_history ?? null}
      bosLevels={bosLevels}
    />
  );
}
