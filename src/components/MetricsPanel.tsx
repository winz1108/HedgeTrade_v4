import { TrendingDown, DollarSign, Activity, History, Target, Check, X, TrendingUp, AlertCircle } from 'lucide-react';
import { DashboardData, BuyConditions } from '../types/dashboard';
import { formatLocalDateTime } from '../utils/time';

interface MetricsPanelProps {
  data: DashboardData;
  position: 'left' | 'right' | 'trades';
}

const MAIN_CONDITIONS: { key: keyof BuyConditions; label: string }[] = [
  { key: '1m_golden_cross', label: '1m Golden Cross' },
  { key: '30m_gap',         label: '30m Gap' },
  { key: '30m_adx',         label: '30m ADX' },
];

const MULTI_TF_CONDITIONS: { key: keyof BuyConditions; label: string }[] = [
  { key: '5m_above',  label: '5m' },
  { key: '1h_above',  label: '1h' },
];

const SLOPE_CONDITIONS: { key: keyof BuyConditions; label: string }[] = [
  { key: '30m_slope_up', label: '30m' },
  { key: '1h_slope_up',  label: '1h' },
];

const BBW_CONDITIONS: { key: keyof BuyConditions; label: string }[] = [
  { key: '5m_bbw',  label: '5m' },
  { key: '15m_bbw', label: '15m' },
];

const formatHoldingDuration = (entryTime: number, currentTime: number): string => {
  const diffMs = currentTime - entryTime;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${remainMinutes}m`;
  }
  return `${minutes}m`;
};

const getExitReasonLabel = (reason?: string): string => {
  if (!reason) return 'TP';
  if (reason === 'TP') return 'TP';
  if (reason === 'SL') return 'SL';
  if (reason.startsWith('15M_REVERSAL')) return '15m Rev';
  if (reason === 'DEAD_CROSS_1h') return '1h DC';
  if (reason.startsWith('SMART_SCORE')) return 'Smart';
  if (reason.startsWith('SMART_FLOOR')) return 'Smart';
  return reason.length > 8 ? reason.substring(0, 8) : reason;
};

const getExitReasonColor = (reason?: string): { bg: string; text: string; border: string } => {
  if (!reason) return { bg: 'bg-green-50/50', text: 'text-green-600', border: 'border-green-200' };
  if (reason === 'TP') return { bg: 'bg-green-50/50', text: 'text-green-600', border: 'border-green-200' };
  if (reason.startsWith('15M_REVERSAL')) return { bg: 'bg-cyan-50/50', text: 'text-cyan-600', border: 'border-cyan-200' };
  if (reason === 'DEAD_CROSS_1h') return { bg: 'bg-red-50/50', text: 'text-red-600', border: 'border-red-200' };
  if (reason.startsWith('SMART_')) return { bg: 'bg-blue-50/50', text: 'text-blue-600', border: 'border-blue-200' };
  return { bg: 'bg-red-50/50', text: 'text-red-600', border: 'border-red-200' };
};

export const MetricsPanel = ({ data, position }: MetricsPanelProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null) return '0.00%';
    if (typeof value !== 'number' || isNaN(value)) return '0.00%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (position === 'left') {
    const strategy = data.strategyStatus;

    const conditionsTotal = MAIN_CONDITIONS.length + MULTI_TF_CONDITIONS.length + SLOPE_CONDITIONS.length + BBW_CONDITIONS.length;
    const conditionsMet = strategy?.buyConditionsMet ?? 0;
    const completionPct = conditionsTotal > 0 ? (conditionsMet / conditionsTotal) * 100 : 0;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="bg-white border border-slate-200 rounded p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[10px] font-medium text-slate-600 uppercase">Portfolio</h3>
            <Activity className="w-3 h-3 text-slate-400" />
          </div>

          <div className="space-y-1.5">
            <div className="bg-slate-50 rounded p-1.5 border border-slate-200">
              <div className="text-[8px] font-medium text-slate-500 mb-0.5 uppercase">Total Asset</div>
              <div className="text-lg font-semibold text-slate-900 mb-1">
                {formatCurrency(data.currentAsset)}
              </div>
              <div className="space-y-0.5 pt-1 border-t border-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-medium text-slate-500">BTC</span>
                  <span className="text-[9px] font-semibold text-slate-700">
                    {formatCurrency(data.currentBTC || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-medium text-slate-500">USDC</span>
                  <span className="text-[9px] font-semibold text-slate-700">
                    {formatCurrency(data.currentCash || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {data.holding.isHolding && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg shadow-md p-2.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="bg-blue-500 rounded-full p-1">
                  <TrendingUp className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-bold text-blue-900">HOLDING</span>
              </div>
              {data.holding.buyTime && (
                <span className="text-[9px] text-blue-600 font-mono bg-blue-100 px-1.5 py-0.5 rounded">
                  {formatHoldingDuration(data.holding.buyTime, data.currentTime)}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] text-blue-700 font-medium">Entry Price</span>
                <span className="text-xs font-bold text-blue-900 font-mono">{formatCurrency(data.holding.buyPrice!)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] text-blue-700 font-medium">Unrealized P&L</span>
                <span className={`text-sm font-extrabold font-mono ${
                  (data.holding.currentProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {typeof data.holding.currentProfit === 'number'
                    ? `${data.holding.currentProfit >= 0 ? '+' : ''}${data.holding.currentProfit.toFixed(2)}%`
                    : '0.00%'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border-2 border-slate-300 rounded-lg shadow-sm p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className={`p-1 rounded ${completionPct === 100 ? 'bg-green-500' : 'bg-amber-500'}`}>
                <Target className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-bold text-slate-800">Entry Conditions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-600">{conditionsMet}/{conditionsTotal}</span>
              <div className={`w-2 h-2 rounded-full ${completionPct === 100 ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
            </div>
          </div>

          <div className="bg-slate-100 rounded h-1.5 mb-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                completionPct === 100 ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{ width: `${completionPct}%` }}
            />
          </div>

          {strategy ? (
            <div className="space-y-1.5">
              {MAIN_CONDITIONS.map(({ key, label }) => {
                const met = strategy.buyConditions[key];
                return (
                  <div key={key} className={`flex items-center justify-between p-1.5 rounded border ${
                    met
                      ? 'bg-green-50 border-green-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className={`text-[9px] font-semibold ${met ? 'text-green-700' : 'text-slate-500'}`}>
                      {label}
                    </span>
                    {met ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <X className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                );
              })}

              <div className="pt-1.5 border-t border-slate-200">
                <div className="text-[8px] font-bold text-slate-600 mb-1 uppercase tracking-wide">EMA Above Price</div>
                <div className="flex gap-1">
                  {MULTI_TF_CONDITIONS.map(({ key, label }) => {
                    const met = strategy.buyConditions[key];
                    return (
                      <div key={key} className={`flex-1 py-1 px-1.5 rounded text-center border ${
                        met
                          ? 'bg-green-100 border-green-400 text-green-700'
                          : 'bg-slate-100 border-slate-300 text-slate-500'
                      }`}>
                        <div className="text-[8px] font-bold">{label}</div>
                        <div className="mt-0.5">
                          {met ? (
                            <Check className="w-2.5 h-2.5 mx-auto text-green-600" />
                          ) : (
                            <X className="w-2.5 h-2.5 mx-auto text-slate-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-200">
                <div className="text-[8px] font-bold text-slate-600 mb-1 uppercase tracking-wide">Bollinger Band Width</div>
                <div className="flex gap-1">
                  {BBW_CONDITIONS.map(({ key, label }) => {
                    const met = strategy.buyConditions[key];
                    return (
                      <div key={key} className={`flex-1 py-1 px-1.5 rounded text-center border ${
                        met
                          ? 'bg-green-100 border-green-400 text-green-700'
                          : 'bg-slate-100 border-slate-300 text-slate-500'
                      }`}>
                        <div className="text-[8px] font-bold">{label}</div>
                        <div className="mt-0.5">
                          {met ? (
                            <Check className="w-2.5 h-2.5 mx-auto text-green-600" />
                          ) : (
                            <X className="w-2.5 h-2.5 mx-auto text-slate-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-200">
                <div className="text-[8px] font-bold text-slate-600 mb-1 uppercase tracking-wide">EMA Slope Up</div>
                <div className="flex gap-1">
                  {SLOPE_CONDITIONS.map(({ key, label }) => {
                    const met = strategy.buyConditions[key];
                    return (
                      <div key={key} className={`flex-1 py-1 px-1.5 rounded text-center border ${
                        met
                          ? 'bg-green-100 border-green-400 text-green-700'
                          : 'bg-slate-100 border-slate-300 text-slate-500'
                      }`}>
                        <div className="text-[8px] font-bold">{label}</div>
                        <div className="mt-0.5">
                          {met ? (
                            <Check className="w-2.5 h-2.5 mx-auto text-green-600" />
                          ) : (
                            <X className="w-2.5 h-2.5 mx-auto text-slate-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-slate-400 text-[9px]">
              Loading conditions...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (position === 'right') {
    const winRate = data.metrics.totalTrades > 0
      ? (data.metrics.takeProfitCount / data.metrics.totalTrades) * 100
      : 0;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="bg-white border-2 border-slate-300 rounded-lg shadow-sm p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className={`p-1 rounded ${data.strategyStatus?.sellConditions?.any_sell ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}>
                <AlertCircle className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-bold text-slate-800">Exit Conditions</span>
            </div>
            {data.strategyStatus?.sellConditions?.any_sell && (
              <span className="text-[9px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded uppercase">
                TRIGGERED
              </span>
            )}
          </div>

          {data.strategyStatus?.sellConditions ? (
            <div className="space-y-1.5">
              {data.strategyStatus.sellConditions.smart_trail && (
                <div className={`p-2 rounded-lg border-2 ${
                  data.strategyStatus.sellConditions.smart_trail.met
                    ? 'bg-red-50 border-red-400'
                    : data.strategyStatus.sellConditions.smart_trail.active
                    ? 'bg-orange-50 border-orange-400'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className={`w-3 h-3 ${
                        data.strategyStatus.sellConditions.smart_trail.met
                          ? 'text-red-600'
                          : data.strategyStatus.sellConditions.smart_trail.active
                          ? 'text-orange-600'
                          : 'text-slate-400'
                      }`} />
                      <span className={`text-[9px] font-bold uppercase ${
                        data.strategyStatus.sellConditions.smart_trail.met
                          ? 'text-red-700'
                          : data.strategyStatus.sellConditions.smart_trail.active
                          ? 'text-orange-700'
                          : 'text-slate-600'
                      }`}>15m EMA Reversal</span>
                    </div>
                    {data.strategyStatus.sellConditions.smart_trail.active && (
                      <span className="text-[8px] font-bold bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                    <div className="bg-white rounded border border-slate-200 p-1">
                      <div className="text-[7px] text-slate-500 font-medium mb-0.5">EMA3</div>
                      <div className="font-mono text-[9px] font-bold text-slate-800">
                        ${data.strategyStatus.sellConditions.smart_trail['15m_ema3'].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-white rounded border border-slate-200 p-1">
                      <div className="text-[7px] text-slate-500 font-medium mb-0.5">EMA8</div>
                      <div className="font-mono text-[9px] font-bold text-slate-800">
                        ${data.strategyStatus.sellConditions.smart_trail['15m_ema8'].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-1.5 rounded border mb-1.5 ${
                    data.strategyStatus.sellConditions.smart_trail['15m_above']
                      ? 'bg-white border-slate-200'
                      : 'bg-red-100 border-red-300'
                  }`}>
                    <span className="text-[8px] font-semibold text-slate-600 uppercase">Status</span>
                    <span className={`text-[8px] font-bold ${
                      data.strategyStatus.sellConditions.smart_trail['15m_above']
                        ? 'text-slate-700'
                        : 'text-red-700'
                    }`}>
                      {data.strategyStatus.sellConditions.smart_trail['15m_above'] ? 'Above EMA' : 'REVERSED'}
                    </span>
                  </div>

                  {data.strategyStatus.sellConditions.smart_trail.entry_price > 0 && (
                    <div className="bg-white rounded border border-slate-200 p-1.5 mb-1.5">
                      <div className="flex justify-between text-[8px] mb-0.5">
                        <span className="text-slate-500 font-medium">Entry</span>
                        <span className="font-mono font-bold text-slate-800">
                          ${data.strategyStatus.sellConditions.smart_trail.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-[8px]">
                        <span className="text-slate-500 font-medium">Peak</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-slate-800">
                            ${data.strategyStatus.sellConditions.smart_trail.peak_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[8px] font-bold bg-blue-100 text-blue-700 px-1 rounded">
                            +{((data.strategyStatus.sellConditions.smart_trail.peak_price / data.strategyStatus.sellConditions.smart_trail.entry_price - 1) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-[8px] text-slate-500 font-medium">
                      Regime: {{'U':'Uptrend','S':'Sideways','D':'Downtrend'}[data.strategyStatus.sellConditions.smart_trail.regime] || data.strategyStatus.sellConditions.smart_trail.regime}
                    </span>
                    <span className="text-[8px] font-mono font-bold text-slate-700">
                      Score: {data.strategyStatus.sellConditions.smart_trail.score}
                    </span>
                  </div>
                </div>
              )}

              <div className={`flex items-center justify-between p-1.5 rounded border ${
                data.strategyStatus.sellConditions.dead_cross.met
                  ? 'bg-red-50 border-red-300'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[9px] font-semibold ${
                  data.strategyStatus.sellConditions.dead_cross.met ? 'text-red-700' : 'text-slate-500'
                }`}>
                  1h Dead Cross
                </span>
                {data.strategyStatus.sellConditions.dead_cross.met ? (
                  <Check className="w-3 h-3 text-red-600" />
                ) : (
                  <X className="w-3 h-3 text-slate-400" />
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-slate-400 text-[9px]">
              Loading conditions...
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded p-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[10px] font-medium text-slate-600 uppercase">Performance</h3>
            <DollarSign className="w-3 h-3 text-slate-400" />
          </div>

          {data.metrics.portfolioReturnWithCommission !== undefined && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded p-2 mb-2 border border-slate-200">
              <div className="text-[8px] font-medium text-slate-500 mb-1 uppercase">Net Profit (with fees)</div>
              <div className={`text-2xl font-bold ${
                data.metrics.portfolioReturnWithCommission >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercent(data.metrics.portfolioReturnWithCommission)}
              </div>
              {data.metrics.totalPnl !== undefined && (
                <div className={`text-[9px] font-semibold ${
                  data.metrics.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {data.metrics.totalPnl >= 0 ? '+' : ''}{data.metrics.totalPnl.toFixed(2)} USDC
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5 mb-2 pb-2 border-b border-slate-200">
            <div className="flex items-baseline justify-between">
              <span className="text-[8px] font-medium text-slate-500">Portfolio Return</span>
              <span className={`text-[10px] font-bold ${
                data.metrics.portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercent(data.metrics.portfolioReturn)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[8px] font-medium text-slate-500">Market Return</span>
              <span className={`text-[10px] font-bold ${
                data.metrics.marketReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercent(data.metrics.marketReturn)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[8px] font-medium text-slate-500">Avg Trade</span>
              <span className={`text-[10px] font-bold ${
                data.metrics.avgTradeReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercent(data.metrics.avgTradeReturn)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-green-50 rounded p-1.5 border border-green-200">
              <div className="text-[7px] font-medium text-green-700 mb-0.5 uppercase">Wins</div>
              <div className="text-xl font-bold text-green-700">{data.metrics.takeProfitCount}</div>
            </div>
            <div className="bg-red-50 rounded p-1.5 border border-red-200">
              <div className="text-[7px] font-medium text-red-700 mb-0.5 uppercase">Losses</div>
              <div className="text-xl font-bold text-red-700">{data.metrics.stopLossCount}</div>
            </div>
          </div>

          {data.metrics.totalTrades !== undefined && (
            <div className="flex items-baseline justify-between mb-2 pb-2 border-b border-slate-200">
              <span className="text-[8px] font-medium text-slate-500">Total Trades</span>
              <span className="text-sm font-bold text-slate-700">{data.metrics.totalTrades}</span>
            </div>
          )}

          <div>
            <div className="text-[8px] font-medium text-slate-500 mb-1 uppercase">Win Rate</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${winRate}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700 min-w-[40px]">
                {winRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (position === 'trades') {
    const oneWeekAgo = data.currentTime - (7 * 24 * 60 * 60 * 1000);
    const recentTrades = [...data.trades]
      .filter(trade => trade.timestamp >= oneWeekAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 40);

    return (
      <div className="bg-white border border-slate-200 rounded p-2 mt-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <History className="w-3 h-3 text-slate-400" />
            <h3 className="text-[10px] font-medium text-slate-600 uppercase">Recent Trades</h3>
          </div>
          <span className="text-[8px] text-slate-500 font-semibold">Last 7 days</span>
        </div>

        <div className="space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100" style={{ maxHeight: '160px' }}>
          {recentTrades.length > 0 ? (
            recentTrades.map((trade, index) => (
              <div key={`${trade.timestamp}-${index}`}>
                {trade.type === 'buy' ? (
                  <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-blue-700 uppercase">BUY</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-mono font-bold text-slate-800">{formatCurrency(trade.price)}</span>
                        <span className="text-[7px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`${getExitReasonColor(trade.exitReason).bg} ${getExitReasonColor(trade.exitReason).border} border rounded p-1.5`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-bold ${getExitReasonColor(trade.exitReason).text} uppercase`}>SELL</span>
                        {trade.exitReason && (
                          <span className={`text-[7px] px-1 py-0.5 font-bold rounded ${
                            trade.profit !== undefined && trade.profit >= 0
                              ? 'bg-green-200 text-green-800'
                              : 'bg-red-200 text-red-800'
                          }`} title={trade.exitReason}>{getExitReasonLabel(trade.exitReason)}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono font-bold text-slate-800">{formatCurrency(trade.price)}</span>
                          {trade.profit !== undefined && (
                            <span className={`text-[9px] font-mono font-extrabold ${
                              trade.profit >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[7px] text-slate-500">{formatLocalDateTime(trade.timestamp)}</span>
                          {trade.pnl !== undefined && (
                            <span className={`text-[7px] font-mono font-bold ${
                              trade.pnl >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-16 text-slate-400 text-[9px]">
              No recent trades
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
