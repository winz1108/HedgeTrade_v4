import { useMemo } from 'react';
import { ProbabilityHistory } from '../types/dashboard';

interface ProbabilityChartProps {
  probabilityHistory: ProbabilityHistory[];
  currentTime: number;
}

export const ProbabilityChart = ({ probabilityHistory, currentTime }: ProbabilityChartProps) => {
  const chartWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const chartHeight = 120;
  const padding = { top: 10, right: 50, bottom: 20, left: 50 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const { xScale, yTicks, probData } = useMemo(() => {
    if (!probabilityHistory || probabilityHistory.length === 0) {
      return { xScale: () => 0, yTicks: [0, 0.25, 0.5, 0.75, 1], probData: [] };
    }

    const validData = probabilityHistory.filter(p =>
      p && typeof p.timestamp === 'number' &&
      typeof p.takeProfitProb === 'number' &&
      typeof p.stopLossProb === 'number'
    );

    if (validData.length === 0) {
      return { xScale: () => 0, yTicks: [0, 0.25, 0.5, 0.75, 1], probData: [] };
    }

    const minTime = Math.min(...validData.map(p => p.timestamp));
    const maxTime = Math.max(...validData.map(p => p.timestamp), currentTime);
    const timeRange = maxTime - minTime || 1;

    const xScale = (timestamp: number) => {
      return padding.left + ((timestamp - minTime) / timeRange) * plotWidth;
    };

    const yScale = (prob: number) => {
      return chartHeight - padding.bottom - (prob * plotHeight);
    };

    const probData = validData.map(p => ({
      x: xScale(p.timestamp),
      yTakeProfit: yScale(p.takeProfitProb),
      yStopLoss: yScale(p.stopLossProb),
      timestamp: p.timestamp,
      takeProfitProb: p.takeProfitProb,
      stopLossProb: p.stopLossProb,
    }));

    const yTicks = [0, 0.25, 0.5, 0.75, 1];

    return { xScale, yTicks, probData };
  }, [probabilityHistory, currentTime, plotWidth, plotHeight, chartHeight, padding.left, padding.bottom]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  const createPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';

    const path = points.map((p, i) => {
      return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
    }).join(' ');

    return path;
  };

  const takeProfitPath = createPath(probData.map(p => ({ x: p.x, y: p.yTakeProfit })));
  const stopLossPath = createPath(probData.map(p => ({ x: p.x, y: p.yStopLoss })));

  return (
    <div className="w-full bg-gray-900 border-t border-gray-700">
      <div className="px-4 py-2 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300">익절확률 예측 (1분봉)</h3>
      </div>

      <svg width={chartWidth} height={chartHeight} className="bg-gray-900">
        <defs>
          <linearGradient id="takeProfitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="stopLossGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = chartHeight - padding.bottom - (tick * plotHeight);
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="#374151"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text
                x={padding.left - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-xs fill-gray-400"
              >
                {formatPercent(tick)}
              </text>
            </g>
          );
        })}

        {probData.length > 0 && (
          <>
            <path
              d={`${takeProfitPath} L ${probData[probData.length - 1].x} ${chartHeight - padding.bottom} L ${probData[0].x} ${chartHeight - padding.bottom} Z`}
              fill="url(#takeProfitGradient)"
            />

            <path
              d={takeProfitPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
            />

            <path
              d={`${stopLossPath} L ${probData[probData.length - 1].x} ${chartHeight - padding.bottom} L ${probData[0].x} ${chartHeight - padding.bottom} Z`}
              fill="url(#stopLossGradient)"
            />

            <path
              d={stopLossPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            />

            {probData.map((point, i) => (
              <g key={i}>
                <circle
                  cx={point.x}
                  cy={point.yTakeProfit}
                  r="3"
                  fill="#10b981"
                  className="hover:r-4 transition-all cursor-pointer"
                >
                  <title>{`${formatTime(point.timestamp)}\n익절: ${formatPercent(point.takeProfitProb)}`}</title>
                </circle>
                <circle
                  cx={point.x}
                  cy={point.yStopLoss}
                  r="3"
                  fill="#ef4444"
                  className="hover:r-4 transition-all cursor-pointer"
                >
                  <title>{`${formatTime(point.timestamp)}\n손절: ${formatPercent(point.stopLossProb)}`}</title>
                </circle>
              </g>
            ))}
          </>
        )}

        {probData.length > 0 && (
          <>
            <text
              x={probData[probData.length - 1].x + 10}
              y={probData[probData.length - 1].yTakeProfit}
              className="text-xs fill-green-400 font-medium"
              dominantBaseline="middle"
            >
              익절 {formatPercent(probData[probData.length - 1].takeProfitProb)}
            </text>
            <text
              x={probData[probData.length - 1].x + 10}
              y={probData[probData.length - 1].yStopLoss}
              className="text-xs fill-red-400 font-medium"
              dominantBaseline="middle"
            >
              손절 {formatPercent(probData[probData.length - 1].stopLossProb)}
            </text>
          </>
        )}
      </svg>

      <div className="px-4 py-2 flex items-center gap-4 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs text-gray-400">익절확률</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-gray-400">손절확률</span>
        </div>
        {probData.length > 0 && (
          <span className="text-xs text-gray-500 ml-auto">
            최근 업데이트: {formatTime(probData[probData.length - 1].timestamp)}
          </span>
        )}
      </div>
    </div>
  );
};
