import { KrakenDashboardData } from '../../types/dashboard';
import { TrendingUp, TrendingDown, DollarSign, Activity, Clock, Target, Zap } from 'lucide-react';

interface Props {
  data: KrakenDashboardData;
  position: 'left' | 'right';
}

export function KrakenMetricsPanel({ data, position }: Props) {
  if (position === 'left') {
    const leverage = 1;
    const hasPosition = data.position?.in_position;
    const positionSide = data.position?.position_side;
    const entryPrice = data.strategyA?.entry_price;
    const currentPnl = data.strategyA?.current_pnl;

    let liquidationPrice: number | null = null;
    if (hasPosition && entryPrice) {
      if (positionSide === 'LONG') {
        liquidationPrice = entryPrice * (1 - 0.95 / leverage);
      } else if (positionSide === 'SHORT') {
        liquidationPrice = entryPrice * (1 + 0.95 / leverage);
      }
    }

    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-blue-200 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-blue-700 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Futures Balance
          </h2>
          <div className="px-2 py-1 bg-blue-500 rounded text-xs font-bold text-white">
            {leverage}x
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">Available</div>
            <div className="text-lg font-bold text-slate-800">
              ${data.balance.available.toFixed(2)}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Portfolio Value</div>
            <div className="text-lg font-bold text-slate-800">
              ${data.balance.portfolioValue.toFixed(2)}
            </div>
          </div>

          <div className="pt-3 border-t border-blue-200">
            <div className="text-xs text-slate-500 mb-1">Current Price</div>
            <div className="text-2xl font-bold text-blue-600">
              ${data.currentPrice.toFixed(2)}
            </div>
          </div>
        </div>

        {hasPosition && entryPrice && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <h3 className="text-xs font-bold text-blue-700 mb-2">Position</h3>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Side</span>
                <span className={`text-xs font-bold ${
                  positionSide === 'LONG' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {positionSide}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Leverage</span>
                <span className="text-xs font-bold text-blue-600">
                  {leverage}x
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Entry</span>
                <span className="text-xs font-mono">
                  ${entryPrice.toFixed(2)}
                </span>
              </div>

              {liquidationPrice && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-orange-600">Liquidation</span>
                  <span className="text-xs font-mono text-orange-600">
                    ${liquidationPrice.toFixed(2)}
                  </span>
                </div>
              )}

              {currentPnl !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">P&L</span>
                  <span className={`text-sm font-bold ${
                    currentPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {currentPnl >= 0 ? '+' : ''}
                    {currentPnl.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (position === 'right') {
    if (!data.position?.in_position) {
      return (
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-blue-200 p-4 shadow-lg">
          <h2 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            전략 A (수익극대화)
          </h2>

          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs font-semibold text-blue-700 mb-2">포지션 없음</div>
              <div className="text-xs text-blue-600">
                9개 진입 조건 충족 시 자동 진입
              </div>
            </div>

            <div className="pt-3 border-t border-blue-200">
              <h3 className="text-xs font-bold text-blue-700 mb-2">전략 설정</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Hard SL</span>
                  <span className="font-mono text-rose-600">-5.0%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">PP Trigger</span>
                  <span className="font-mono text-emerald-600">MFE ≥0.1%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">PP Keep</span>
                  <span className="font-mono text-emerald-600">90%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">소멸 임계</span>
                  <span className="font-mono text-orange-600">8/9</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Timeout</span>
                  <span className="font-mono text-blue-600">2880분 (48h)</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-blue-200">
              <h3 className="text-xs font-bold text-blue-700 mb-2">수수료</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Maker</span>
                  <span className="font-mono">0.02%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Taker</span>
                  <span className="font-mono">0.05%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">왕복</span>
                  <span className="font-mono font-bold text-blue-600">0.10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (data.strategyA && data.sellConditions) {
      const { strategyA, sellConditions } = data;
      const vanishPct = (sellConditions.vanish.current / sellConditions.vanish.threshold) * 100;
      const timeoutPct = (sellConditions.timeout.elapsed / strategyA.timeout_min) * 100;

      return (
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-blue-200 p-4 shadow-lg">
        <h2 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          전략 A 매도 조건
        </h2>

        <div className="space-y-3">
          <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-rose-700">Hard SL</span>
              <span className="text-xs font-mono text-rose-600">
                {sellConditions.hard_sl.threshold}%
              </span>
            </div>
            <div className="text-xs text-slate-600">
              현재: {strategyA.current_pnl?.toFixed(2)}%
            </div>
          </div>

          {sellConditions.pp.active && (
            <div className={`p-3 rounded-lg border ${
              sellConditions.pp.mfe && sellConditions.pp.mfe >= 0.1
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${
                  sellConditions.pp.mfe && sellConditions.pp.mfe >= 0.1
                    ? 'text-emerald-700'
                    : 'text-slate-700'
                }`}>
                  PP Stop
                </span>
                {sellConditions.pp.stop_level !== null && (
                  <span className="text-xs font-mono text-emerald-600">
                    {sellConditions.pp.stop_level.toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600">
                MFE: {sellConditions.pp.mfe?.toFixed(2)}%
                {sellConditions.pp['1h_slope'] !== undefined && (
                  <span className="ml-2">
                    1h slope: {sellConditions.pp['1h_slope'] > 0 ? '+' : ''}
                    {sellConditions.pp['1h_slope'].toFixed(4)}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className={`p-3 rounded-lg border ${
            sellConditions.vanish.met
              ? 'bg-rose-50 border-rose-200'
              : vanishPct >= 75
              ? 'bg-orange-50 border-orange-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${
                sellConditions.vanish.met
                  ? 'text-rose-700'
                  : vanishPct >= 75
                  ? 'text-orange-700'
                  : 'text-emerald-700'
              }`}>
                소멸
              </span>
              <span className="text-xs font-mono">
                {sellConditions.vanish.current}/{sellConditions.vanish.threshold}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  sellConditions.vanish.met
                    ? 'bg-rose-500'
                    : vanishPct >= 75
                    ? 'bg-orange-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(vanishPct, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className={`p-3 rounded-lg border ${
            sellConditions.timeout.met
              ? 'bg-rose-50 border-rose-200'
              : timeoutPct >= 85
              ? 'bg-orange-50 border-orange-200'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold flex items-center gap-1 ${
                sellConditions.timeout.met
                  ? 'text-rose-700'
                  : timeoutPct >= 85
                  ? 'text-orange-700'
                  : 'text-slate-700'
              }`}>
                <Clock className="w-3 h-3" />
                Timeout
              </span>
              <span className="text-xs font-mono">
                {sellConditions.timeout.elapsed.toFixed(0)}m / {data.strategyA.timeout_min}m
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  sellConditions.timeout.met
                    ? 'bg-rose-500'
                    : timeoutPct >= 85
                    ? 'bg-orange-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(timeoutPct, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {strategyA?.entry_conditions_live && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <h3 className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              진입 조건 (9개)
            </h3>

            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {Object.entries(strategyA.entry_conditions_live).map(([key, met]) => (
                <div
                  key={key}
                  className={`px-1.5 py-1 rounded text-center ${
                    met ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {met ? '✓' : '✗'} {key.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      );
    }
  }

  return null;
}
