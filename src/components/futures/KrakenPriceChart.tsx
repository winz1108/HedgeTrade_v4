import { KrakenDashboardData } from '../../types/dashboard';
import { TrendingUp } from 'lucide-react';

interface Props {
  data: KrakenDashboardData;
}

export function KrakenPriceChart({ data }: Props) {
  const candles = data.priceHistory1m || [];
  const hasData = candles.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200 p-8 shadow-lg">
        <div className="text-center text-slate-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Loading chart data...</p>
        </div>
      </div>
    );
  }

  const prices = candles.map(c => c.close);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice;

  const chartHeight = 500;
  const chartWidth = 100;

  const getY = (price: number) => {
    return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  const entryPrice = data.strategyA.entry_price;
  const positionSide = data.position.position_side;
  const breakevenPct = 0.001;

  let breakevenPrice: number | null = null;
  let slPrice: number | null = null;
  let ppStopPrice: number | null = null;

  if (entryPrice && positionSide) {
    if (positionSide === 'LONG') {
      breakevenPrice = entryPrice * (1 + breakevenPct);
      slPrice = entryPrice * (1 - data.sellConditions.hard_sl.threshold / 100);
      if (data.sellConditions.pp.stop_level !== null) {
        ppStopPrice = entryPrice * (1 + data.sellConditions.pp.stop_level / 100);
      }
    } else {
      breakevenPrice = entryPrice * (1 - breakevenPct);
      slPrice = entryPrice * (1 + data.sellConditions.hard_sl.threshold / 100);
      if (data.sellConditions.pp.stop_level !== null) {
        ppStopPrice = entryPrice * (1 - data.sellConditions.pp.stop_level / 100);
      }
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Price Chart (1m)
        </h2>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-emerald-500"></div>
            <span className="text-slate-600">Break-even (+0.1%)</span>
          </div>
          {entryPrice && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span className="text-slate-600">Entry</span>
            </div>
          )}
          {slPrice && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-rose-500 opacity-70"></div>
              <span className="text-slate-600">SL -5%</span>
            </div>
          )}
          {ppStopPrice && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-yellow-500 opacity-70"></div>
              <span className="text-slate-600">PP Stop</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative" style={{ height: `${chartHeight}px` }}>
        <svg width="100%" height="100%" className="overflow-visible">
          <defs>
            <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {breakevenPrice && getY(breakevenPrice) >= 0 && getY(breakevenPrice) <= chartHeight && (
            <>
              <line
                x1="0%"
                y1={getY(breakevenPrice)}
                x2="100%"
                y2={getY(breakevenPrice)}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="5,5"
                opacity="0.6"
              />
              <text
                x="2%"
                y={getY(breakevenPrice) - 5}
                fill="#10b981"
                fontSize="11"
                fontWeight="600"
              >
                Break-even ${breakevenPrice.toFixed(2)}
              </text>
            </>
          )}

          {entryPrice && getY(entryPrice) >= 0 && getY(entryPrice) <= chartHeight && (
            <>
              <line
                x1="0%"
                y1={getY(entryPrice)}
                x2="100%"
                y2={getY(entryPrice)}
                stroke="#3b82f6"
                strokeWidth="2"
                opacity="0.8"
              />
              <text
                x="2%"
                y={getY(entryPrice) + 15}
                fill="#3b82f6"
                fontSize="11"
                fontWeight="700"
              >
                Entry ${entryPrice.toFixed(2)}
              </text>
            </>
          )}

          {slPrice && getY(slPrice) >= 0 && getY(slPrice) <= chartHeight && (
            <>
              <line
                x1="0%"
                y1={getY(slPrice)}
                x2="100%"
                y2={getY(slPrice)}
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="5,5"
                opacity="0.5"
              />
              <text
                x="2%"
                y={getY(slPrice) - 5}
                fill="#ef4444"
                fontSize="11"
                fontWeight="600"
              >
                SL ${slPrice.toFixed(2)}
              </text>
            </>
          )}

          {ppStopPrice && getY(ppStopPrice) >= 0 && getY(ppStopPrice) <= chartHeight && (
            <>
              <line
                x1="0%"
                y1={getY(ppStopPrice)}
                x2="100%"
                y2={getY(ppStopPrice)}
                stroke="#eab308"
                strokeWidth="1.5"
                strokeDasharray="5,5"
                opacity="0.6"
              />
              <text
                x="2%"
                y={getY(ppStopPrice) + 15}
                fill="#eab308"
                fontSize="11"
                fontWeight="600"
              >
                PP Stop ${ppStopPrice.toFixed(2)}
              </text>
            </>
          )}

          <polyline
            fill="url(#priceGradient)"
            stroke="none"
            points={`
              0,${chartHeight}
              ${candles.map((c, i) => `${(i / (candles.length - 1)) * chartWidth}%,${getY(c.close)}`).join(' ')}
              ${chartWidth}%,${chartHeight}
            `}
          />

          <polyline
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            points={candles.map((c, i) => `${(i / (candles.length - 1)) * chartWidth}%,${getY(c.close)}`).join(' ')}
          />

          {candles[candles.length - 1] && (
            <circle
              cx={`${chartWidth}%`}
              cy={getY(candles[candles.length - 1].close)}
              r="4"
              fill="rgb(59, 130, 246)"
              stroke="white"
              strokeWidth="2"
            />
          )}
        </svg>

        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200 shadow-md">
          <div className="text-xs text-slate-500">Current</div>
          <div className="text-xl font-bold text-blue-600">
            ${data.currentPrice.toFixed(2)}
          </div>
          {data.strategyA.current_pnl !== undefined && data.position.in_position && (
            <div className={`text-sm font-bold mt-1 ${
              data.strategyA.current_pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {data.strategyA.current_pnl >= 0 ? '+' : ''}
              {data.strategyA.current_pnl.toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-xs">
        <div>
          <div className="text-slate-500 mb-1">High</div>
          <div className="font-bold text-emerald-600">${maxPrice.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-slate-500 mb-1">Low</div>
          <div className="font-bold text-rose-600">${minPrice.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-slate-500 mb-1">Range</div>
          <div className="font-bold text-slate-700">${priceRange.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
