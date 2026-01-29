import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { DashboardData, TradeEvent, Candle } from '../types/dashboard';

interface PriceChartProps {
  data: DashboardData;
  onTradeHover: (trade: TradeEvent | null) => void;
}

export const PriceChart = ({ data, onTradeHover }: PriceChartProps) => {
  const [hoveredTrade, setHoveredTrade] = useState<TradeEvent | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [candleWidth, setCandleWidth] = useState(10);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h'>('1m');
  const [volumeHeight, setVolumeHeight] = useState(60);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; trade: TradeEvent; hasPairedSell: boolean; pairedTrade?: TradeEvent } | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const isResizing = useRef(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  const minCandleWidth = 4;
  const maxCandleWidth = 30;
  const candleGap = 2;
  const minVolumeHeight = 80;
  const maxVolumeHeight = 300;
  const chartHeight = isMaximized ? window.innerHeight - 120 : 400;
  const priceChartHeight = chartHeight - volumeHeight;
  const volumeChartHeight = volumeHeight;

  const candles1m = useMemo(() => {
    const result = [...data.priceHistory, ...data.pricePredictions];
    console.log('=== 1m Candles Debug ===');
    console.log('priceHistory length:', data.priceHistory.length);
    console.log('pricePredictions length:', data.pricePredictions.length);
    console.log('First 3 history:', data.priceHistory.slice(0, 3));
    console.log('First 3 predictions:', data.pricePredictions.slice(0, 3));
    console.log('Total 1m candles:', result.length);
    console.log('First 3 combined:', result.slice(0, 3));
    console.log('Last 3 combined:', result.slice(-3));
    return result;
  }, [data.priceHistory, data.pricePredictions]);

  const candles5m = useMemo(() => {
    const timeframeMs = 5 * 60000;
    const grouped = new Map<number, Candle[]>();

    candles1m.forEach(candle => {
      const periodStart = Math.floor(candle.timestamp / timeframeMs) * timeframeMs;
      if (!grouped.has(periodStart)) {
        grouped.set(periodStart, []);
      }
      grouped.get(periodStart)!.push(candle);
    });

    const result: Candle[] = [];
    Array.from(grouped.entries()).forEach(([periodStart, periodCandles]) => {
      periodCandles.sort((a, b) => a.timestamp - b.timestamp);
      result.push({
        timestamp: periodStart,
        open: periodCandles[0].open,
        high: Math.max(...periodCandles.map(c => c.high)),
        low: Math.min(...periodCandles.map(c => c.low)),
        close: periodCandles[periodCandles.length - 1].close,
        volume: periodCandles.reduce((sum, c) => sum + c.volume, 0),
        isPrediction: periodCandles[0].isPrediction,
      });
    });

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }, [candles1m]);

  const candles15m = useMemo(() => {
    const timeframeMs = 15 * 60000;
    const grouped = new Map<number, Candle[]>();

    candles1m.forEach(candle => {
      const periodStart = Math.floor(candle.timestamp / timeframeMs) * timeframeMs;
      if (!grouped.has(periodStart)) {
        grouped.set(periodStart, []);
      }
      grouped.get(periodStart)!.push(candle);
    });

    const result: Candle[] = [];
    Array.from(grouped.entries()).forEach(([periodStart, periodCandles]) => {
      periodCandles.sort((a, b) => a.timestamp - b.timestamp);
      result.push({
        timestamp: periodStart,
        open: periodCandles[0].open,
        high: Math.max(...periodCandles.map(c => c.high)),
        low: Math.min(...periodCandles.map(c => c.low)),
        close: periodCandles[periodCandles.length - 1].close,
        volume: periodCandles.reduce((sum, c) => sum + c.volume, 0),
        isPrediction: periodCandles[0].isPrediction,
      });
    });

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }, [candles1m]);

  const candles1h = useMemo(() => {
    const timeframeMs = 60 * 60000;
    const grouped = new Map<number, Candle[]>();

    candles1m.forEach(candle => {
      const periodStart = Math.floor(candle.timestamp / timeframeMs) * timeframeMs;
      if (!grouped.has(periodStart)) {
        grouped.set(periodStart, []);
      }
      grouped.get(periodStart)!.push(candle);
    });

    const result: Candle[] = [];
    Array.from(grouped.entries()).forEach(([periodStart, periodCandles]) => {
      periodCandles.sort((a, b) => a.timestamp - b.timestamp);
      result.push({
        timestamp: periodStart,
        open: periodCandles[0].open,
        high: Math.max(...periodCandles.map(c => c.high)),
        low: Math.min(...periodCandles.map(c => c.low)),
        close: periodCandles[periodCandles.length - 1].close,
        volume: periodCandles.reduce((sum, c) => sum + c.volume, 0),
        isPrediction: periodCandles[0].isPrediction,
      });
    });

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }, [candles1m]);

  const getTimeframeMinutes = (tf: '1m' | '5m' | '15m' | '1h'): number => {
    switch (tf) {
      case '1m': return 1;
      case '5m': return 5;
      case '15m': return 15;
      case '1h': return 60;
    }
  };

  const { minPrice, maxPrice, visibleCandles, allCandles, visibleStartIndex, maxScroll } = useMemo(() => {
    let allCandles: Candle[];
    switch (timeframe) {
      case '1m':
        allCandles = candles1m;
        console.log('Using 1m candles, length:', allCandles.length);
        break;
      case '5m':
        allCandles = candles5m;
        console.log('Using 5m candles, length:', allCandles.length);
        break;
      case '15m':
        allCandles = candles15m;
        console.log('Using 15m candles, length:', allCandles.length);
        break;
      case '1h':
        allCandles = candles1h;
        console.log('Using 1h candles, length:', allCandles.length);
        break;
    }

    if (allCandles.length === 0) {
      return { minPrice: 0, maxPrice: 100, visibleCandles: [], allCandles: [], visibleStartIndex: 0, maxScroll: 0 };
    }

    const chartWidth = containerRef.current?.offsetWidth || 1200;
    const visibleCount = Math.floor(chartWidth / (candleWidth + candleGap));
    const startIndex = Math.max(0, allCandles.length - visibleCount - scrollOffset);
    const endIndex = Math.min(allCandles.length, startIndex + visibleCount);
    const visibleCandles = allCandles.slice(startIndex, endIndex);

    const prices = visibleCandles.flatMap(c => [c.high, c.low]);
    if (data.holding.tpPrice) prices.push(data.holding.tpPrice);
    if (data.holding.slPrice) prices.push(data.holding.slPrice);

    const minPrice = Math.min(...prices) * 0.999;
    const maxPrice = Math.max(...prices) * 1.001;
    const maxScroll = Math.max(0, allCandles.length - visibleCount);

    return { minPrice, maxPrice, visibleCandles, allCandles, visibleStartIndex: startIndex, maxScroll };
  }, [candles1m, candles5m, candles15m, candles1h, scrollOffset, candleWidth, timeframe, data.holding]);

  const priceToY = (price: number) => {
    return ((maxPrice - price) / (maxPrice - minPrice)) * priceChartHeight;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? -1 : 1;
      setCandleWidth(prev => Math.max(minCandleWidth, Math.min(maxCandleWidth, prev + delta)));
    } else {
      const scrollSpeed = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const delta = Math.sign(scrollSpeed) * 5;
      setScrollOffset(prev => Math.max(0, Math.min(maxScroll, prev + delta)));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startOffset.current = scrollOffset;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const deltaX = e.clientX - startX.current;
    const candlesPerPixel = 0.3;
    const deltaCandles = Math.floor(deltaX * candlesPerPixel);
    const newOffset = Math.max(0, Math.min(maxScroll, startOffset.current + deltaCandles));
    if (newOffset !== scrollOffset) {
      setScrollOffset(newOffset);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    isResizing.current = false;
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    isResizing.current = true;
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = volumeHeight;
  };

  const handleResizeMouseMove = (e: React.MouseEvent) => {
    if (!isResizing.current) return;
    e.preventDefault();
    const deltaY = resizeStartY.current - e.clientY;
    const newHeight = Math.max(minVolumeHeight, Math.min(maxVolumeHeight, resizeStartHeight.current + deltaY));
    setVolumeHeight(newHeight);
  };

  const handleZoomIn = () => {
    setCandleWidth(prev => Math.min(maxCandleWidth, prev + 2));
  };

  const handleZoomOut = () => {
    setCandleWidth(prev => Math.max(minCandleWidth, prev - 2));
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMaximized]);

  const handleTradeMouseEnter = (trade: TradeEvent, x: number, y: number) => {
    setHoveredTrade(trade);
    onTradeHover(trade);

    if (trade.type === 'buy' && trade.prediction) {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const pairedTrade = trade.pairId
          ? data.trades.find(t => t.pairId === trade.pairId && t.timestamp !== trade.timestamp)
          : null;

        setTooltipPosition({
          x: containerRect.left + x,
          y: containerRect.top + y,
          trade,
          hasPairedSell: pairedTrade?.type === 'sell',
          pairedTrade: pairedTrade || undefined
        });
      }
    }
  };

  const handleTradeMouseLeave = () => {
    setHoveredTrade(null);
    onTradeHover(null);
    setTooltipPosition(null);
  };

  const predictionStartIndex = visibleCandles.findIndex(c => c.isPrediction);

  const latestCandle = visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1] : null;
  const firstCandle = visibleCandles.length > 0 ? visibleCandles[0] : null;
  const priceChange = latestCandle && firstCandle ? latestCandle.close - firstCandle.open : 0;
  const priceChangePercent = latestCandle && firstCandle ? (priceChange / firstCandle.open) * 100 : 0;

  const renderTooltip = () => {
    if (!tooltipPosition) return null;

    const { x, y, trade, hasPairedSell, pairedTrade } = tooltipPosition;
    const tooltipLeft = x < window.innerWidth / 2;

    return createPortal(
      <div
        className="fixed bg-[#1e2329] border-2 border-[#0ecb81] text-white text-xs rounded-lg p-4 whitespace-nowrap shadow-2xl pointer-events-none min-w-[280px]"
        style={{
          left: tooltipLeft ? `${x + 40}px` : 'auto',
          right: tooltipLeft ? 'auto' : `${window.innerWidth - x + 40}px`,
          top: `${Math.max(10, y - 10)}px`,
          zIndex: 999999,
        }}
      >
        {!hasPairedSell ? (
          <>
            <div className="font-bold mb-3 text-sm flex items-center gap-2 text-[#0ecb81]">
              <div className="w-2 h-2 rounded-full bg-[#0ecb81]" />
              BUY Signal at ${trade.price.toFixed(2)}
            </div>

            <div className="mb-3">
              <div className="text-slate-500 text-[10px] mb-2 font-semibold">당시 예측 (Prediction)</div>
              <div className="space-y-1.5 bg-slate-800/50 p-2 rounded">
                <div className="flex justify-between gap-6">
                  <span className="text-slate-400">익절 확률</span>
                  <span className="text-[#0ecb81] font-semibold">{(trade.prediction!.takeProfitProb * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-400">손절 확률</span>
                  <span className="text-[#f6465d] font-semibold">{(trade.prediction!.stopLossProb * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-400">예상 익절가</span>
                  <span className="text-white font-semibold">${trade.prediction!.expectedTakeProfitPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-400">예상 손절가</span>
                  <span className="text-white font-semibold">${trade.prediction!.expectedStopLossPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-400">예상 익절 시점</span>
                  <span className="text-slate-300 text-[10px]">{new Date(trade.prediction!.expectedTakeProfitTime).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-400">예상 손절 시점</span>
                  <span className="text-slate-300 text-[10px]">{new Date(trade.prediction!.expectedStopLossTime).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-slate-500 text-[10px] mb-2 font-semibold">현재 결과 (Current)</div>
              <div className="space-y-1.5 bg-slate-800/50 p-2 rounded">
                <div className="flex justify-between gap-6">
                  <span className="text-slate-400">현재가</span>
                  <span className="text-white font-semibold">${data.currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-400">수익률</span>
                  <span className={`font-semibold ${((data.currentPrice - trade.price) / trade.price * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {((data.currentPrice - trade.price) / trade.price * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-400">경과 시간</span>
                  <span className="text-slate-300 text-[10px]">
                    {Math.floor((data.currentTime - trade.timestamp) / 60000)}분
                  </span>
                </div>
                {data.currentPrice >= trade.prediction!.expectedTakeProfitPrice ? (
                  <div className="text-[#0ecb81] text-center py-1 bg-[#0ecb81]/10 rounded mt-2 font-semibold">
                    ✓ 익절 달성
                  </div>
                ) : data.currentPrice <= trade.prediction!.expectedStopLossPrice ? (
                  <div className="text-[#f6465d] text-center py-1 bg-[#f6465d]/10 rounded mt-2 font-semibold">
                    ✗ 손절 발생
                  </div>
                ) : (
                  <div className="text-slate-400 text-center py-1 bg-slate-700/30 rounded mt-2 text-[10px]">
                    진행 중
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="font-bold mb-3 text-sm flex items-center gap-2 text-[#0ecb81]">
              <div className="w-2 h-2 rounded-full bg-[#0ecb81]" />
              거래 완료
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">매수가</span>
                <span className="text-white font-semibold">${trade.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">매도가</span>
                <span className="text-white font-semibold">${pairedTrade!.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">수익률</span>
                <span className={`font-bold ${((pairedTrade!.price - trade.price) / trade.price * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {((pairedTrade!.price - trade.price) / trade.price * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">보유 시간</span>
                <span className="text-slate-300 text-[10px]">
                  {Math.floor((pairedTrade!.timestamp - trade.timestamp) / 60000)}분
                </span>
              </div>
            </div>

            {trade.prediction && (
              <div>
                <div className="text-slate-500 text-[10px] mb-2 font-semibold">당시 예측</div>
                <div className="space-y-1.5 bg-slate-800/50 p-2 rounded text-[10px]">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">익절 확률</span>
                    <span className="text-[#0ecb81]">{(trade.prediction.takeProfitProb * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">손절 확률</span>
                    <span className="text-[#f6465d]">{(trade.prediction.stopLossProb * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>,
      document.body
    );
  };

  const chartContent = (
    <div className={`bg-[#161a1e] rounded-lg shadow-2xl overflow-hidden border border-slate-800 ${isMaximized ? 'h-screen' : ''}`}>
      <div className="bg-[#1e2329] px-4 py-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">BTC/USDT</h2>
            {latestCandle && (
              <>
                <div className="text-lg font-bold text-white">
                  ${latestCandle.close.toFixed(2)}
                </div>
                <div className={`text-xs font-semibold px-1.5 py-0.5 rounded ${priceChange >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
                </div>
              </>
            )}
          </div>
          {hoveredCandle && (
            <div className="flex items-center gap-2 text-[10px] bg-[#2b3139] px-2 py-1 rounded">
              <span className="text-slate-400">O <span className="text-white font-medium">{hoveredCandle.open.toFixed(2)}</span></span>
              <span className="text-slate-400">H <span className="text-[#0ecb81] font-medium">{hoveredCandle.high.toFixed(2)}</span></span>
              <span className="text-slate-400">L <span className="text-[#f6465d] font-medium">{hoveredCandle.low.toFixed(2)}</span></span>
              <span className="text-slate-400">C <span className="text-white font-medium">{hoveredCandle.close.toFixed(2)}</span></span>
              <span className="text-slate-400">Vol <span className="text-slate-300 font-medium">{hoveredCandle.volume.toFixed(1)}</span></span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-[#2b3139] rounded p-0.5">
            {(['1m', '5m', '15m', '1h'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                  timeframe === tf
                    ? 'bg-slate-600 text-white shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button
            onClick={handleZoomOut}
            className="p-1 bg-[#2b3139] hover:bg-[#3e444d] rounded transition-colors"
            title="Zoom Out (Ctrl + Scroll)"
          >
            <ZoomOut className="w-3 h-3 text-slate-400" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 bg-[#2b3139] hover:bg-[#3e444d] rounded transition-colors"
            title="Zoom In (Ctrl + Scroll)"
          >
            <ZoomIn className="w-3 h-3 text-slate-400" />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 bg-[#2b3139] hover:bg-[#3e444d] rounded transition-colors"
            title={isMaximized ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isMaximized ? (
              <Minimize2 className="w-3 h-3 text-slate-400" />
            ) : (
              <Maximize2 className="w-3 h-3 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative bg-[#0b0e11] select-none flex-shrink-0"
        style={{ height: `${chartHeight}px`, overflow: 'visible' }}
        onWheel={handleWheel}
        onMouseMove={handleResizeMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >

        <div className="absolute inset-0" style={{ overflow: 'visible' }}>
          <svg className="absolute top-0 left-0 w-full" height={priceChartHeight} style={{ pointerEvents: 'none' }}>
            <defs>
              <linearGradient id="predictionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(252, 213, 53, 0.15)" />
                <stop offset="100%" stopColor="rgba(252, 213, 53, 0.05)" />
              </linearGradient>
            </defs>

            {Array.from({ length: 6 }).map((_, i) => {
              const price = minPrice + ((maxPrice - minPrice) / 5) * i;
              const y = priceToY(price);
              return (
                <g key={i}>
                  <line
                    x1="0"
                    y1={y}
                    x2="100%"
                    y2={y}
                    stroke="rgba(43, 49, 57, 0.5)"
                    strokeWidth="1"
                  />
                  <text
                    x="10"
                    y={y - 4}
                    fill="#848e9c"
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    {price.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {predictionStartIndex > 0 && (
              <rect
                x={`${(predictionStartIndex / visibleCandles.length) * 100}%`}
                y="0"
                width={`${((visibleCandles.length - predictionStartIndex) / visibleCandles.length) * 100}%`}
                height="100%"
                fill="url(#predictionGradient)"
              />
            )}

          </svg>

          <div className="absolute top-0 left-0 flex" style={{ height: `${priceChartHeight}px` }}>
            {visibleCandles.map((candle, idx) => {
              const isGreen = candle.close >= candle.open;
              const highY = priceToY(candle.high);
              const lowY = priceToY(candle.low);
              const openY = priceToY(candle.open);
              const closeY = priceToY(candle.close);
              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.abs(closeY - openY);
              const isHovered = hoveredCandle === candle;

              return (
                <div
                  key={idx}
                  className="relative flex-shrink-0"
                  style={{
                    width: `${candleWidth}px`,
                    marginRight: `${candleGap}px`,
                  }}
                  onMouseEnter={() => setHoveredCandle(candle)}
                  onMouseLeave={() => setHoveredCandle(null)}
                >
                  <div
                    className={isGreen ? 'bg-[#0ecb81]' : 'bg-[#f6465d]'}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: `${highY}px`,
                      height: `${lowY - highY}px`,
                      width: '1px',
                    }}
                  />
                  <div
                    className={`${
                      isGreen
                        ? 'bg-[#0ecb81] border-[#0ecb81]'
                        : 'bg-[#f6465d] border-[#f6465d]'
                    } ${candle.isPrediction ? 'opacity-40 border-dashed' : ''} ${
                      isHovered ? 'ring-2 ring-white/30' : ''
                    }`}
                    style={{
                      position: 'absolute',
                      left: '0',
                      top: `${bodyTop}px`,
                      height: `${Math.max(bodyHeight, 1)}px`,
                      width: '100%',
                      borderWidth: isGreen ? '0' : '1px',
                      backgroundColor: isGreen ? '#0ecb81' : '#0b0e11',
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div
            className="absolute top-0 left-0 cursor-move"
            style={{ height: `${priceChartHeight}px`, width: '100%', overflow: 'visible' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {hoveredTrade && hoveredTrade.pairId && (() => {
              const pairedTrade = data.trades.find(
                t => t.pairId === hoveredTrade.pairId && t.timestamp !== hoveredTrade.timestamp
              );

              if (!pairedTrade) return null;

              const buyTrade = hoveredTrade.type === 'buy' ? hoveredTrade : pairedTrade;
              const sellTrade = hoveredTrade.type === 'sell' ? hoveredTrade : pairedTrade;

              if (sellTrade.type !== 'sell' || buyTrade.type !== 'buy') return null;

              const timeframeMinutes = getTimeframeMinutes(timeframe);
              const timeframeMs = timeframeMinutes * 60000;

              let buyCandleIndexInAll = -1;
              let sellCandleIndexInAll = -1;

              if (timeframeMinutes === 1) {
                buyCandleIndexInAll = allCandles.findIndex(c => Math.abs(c.timestamp - buyTrade.timestamp) < 60000);
                sellCandleIndexInAll = allCandles.findIndex(c => Math.abs(c.timestamp - sellTrade.timestamp) < 60000);
              } else {
                buyCandleIndexInAll = allCandles.findIndex(c => {
                  const candlePeriod = Math.floor(c.timestamp / timeframeMs) * timeframeMs;
                  const tradePeriod = Math.floor(buyTrade.timestamp / timeframeMs) * timeframeMs;
                  return candlePeriod === tradePeriod;
                });

                sellCandleIndexInAll = allCandles.findIndex(c => {
                  const candlePeriod = Math.floor(c.timestamp / timeframeMs) * timeframeMs;
                  const tradePeriod = Math.floor(sellTrade.timestamp / timeframeMs) * timeframeMs;
                  return candlePeriod === tradePeriod;
                });
              }

              if (buyCandleIndexInAll === -1 || sellCandleIndexInAll === -1) return null;

              const buyCandleIndex = buyCandleIndexInAll - visibleStartIndex;
              const sellCandleIndex = sellCandleIndexInAll - visibleStartIndex;

              const x1 = buyCandleIndex * (candleWidth + candleGap) + candleWidth / 2;
              const y1 = priceToY(buyTrade.price);
              const x2 = sellCandleIndex * (candleWidth + candleGap) + candleWidth / 2;
              const y2 = priceToY(sellTrade.price);

              const profit = ((sellTrade.price - buyTrade.price) / buyTrade.price) * 100;
              const lineColor = profit >= 0 ? '#0ecb81' : '#f6465d';

              return (
                <svg
                  key="hover-trade-line"
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{
                    width: '100%',
                    height: `${priceChartHeight}px`,
                    zIndex: 10
                  }}
                >
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={lineColor}
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    opacity="0.9"
                  />
                </svg>
              );
            })()}

            <div className="absolute top-0 left-0 pointer-events-none" style={{ height: `${priceChartHeight}px`, overflow: 'visible', zIndex: 20 }}>
            {data.trades.map((trade, idx) => {
              const timeframeMinutes = getTimeframeMinutes(timeframe);
              const timeframeMs = timeframeMinutes * 60000;

              let candleIndex = -1;

              if (timeframeMinutes === 1) {
                candleIndex = visibleCandles.findIndex(c => Math.abs(c.timestamp - trade.timestamp) < 60000);
              } else {
                candleIndex = visibleCandles.findIndex(c => {
                  const candlePeriod = Math.floor(c.timestamp / timeframeMs) * timeframeMs;
                  const tradePeriod = Math.floor(trade.timestamp / timeframeMs) * timeframeMs;
                  return candlePeriod === tradePeriod;
                });
              }

              if (candleIndex === -1) return null;

              const x = candleIndex * (candleWidth + candleGap) + candleWidth / 2;
              const y = priceToY(trade.price);
              const isHovered = hoveredTrade === trade;

              const pairedTrade = trade.pairId
                ? data.trades.find(t => t.pairId === trade.pairId && t.timestamp !== trade.timestamp)
                : null;

              return (
                <div
                  key={idx}
                  className="absolute pointer-events-auto cursor-pointer"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isHovered ? 9999 : 50
                  }}
                  onMouseEnter={() => handleTradeMouseEnter(trade, x, y)}
                  onMouseLeave={handleTradeMouseLeave}
                >
                  {trade.type === 'buy' ? (
                    <div className="relative flex items-center justify-center">
                      <div className={`absolute w-8 h-8 bg-[#0ecb81] rounded-full opacity-20 ${isHovered ? 'animate-ping' : ''}`} />
                      <div className={`w-6 h-6 bg-[#0ecb81] rounded-full border-2 border-white shadow-lg transition-all ${isHovered ? 'scale-125 shadow-[#0ecb81]/50' : ''}`}>
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">B</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex items-center justify-center">
                      <div className={`absolute w-8 h-8 bg-[#f6465d] rounded-full opacity-20 ${isHovered ? 'animate-ping' : ''}`} />
                      <div className={`w-6 h-6 bg-[#f6465d] rounded-full border-2 border-white shadow-lg transition-all ${isHovered ? 'scale-125 shadow-[#f6465d]/50' : ''}`}>
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">S</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>

          <div
            className="absolute left-0 w-full border-t-2 border-slate-600 cursor-ns-resize hover:border-slate-400 transition-colors"
            style={{ top: `${priceChartHeight}px`, zIndex: 30 }}
            onMouseDown={handleResizeMouseDown}
          >
            <div className="absolute inset-x-0 -top-1 h-2" />
          </div>

          <div className="absolute left-0 flex" style={{ top: `${priceChartHeight}px`, height: `${volumeChartHeight}px`, zIndex: 1 }}>
            {visibleCandles.map((candle, idx) => {
              const maxVolume = Math.max(...visibleCandles.map(c => c.volume));
              const topPadding = Math.max(5, volumeChartHeight * 0.1);
              const barHeight = (candle.volume / maxVolume) * (volumeChartHeight - topPadding);
              const isGreen = candle.close >= candle.open;

              return (
                <div
                  key={idx}
                  className="relative flex-shrink-0 flex items-end"
                  style={{
                    width: `${candleWidth}px`,
                    marginRight: `${candleGap}px`,
                    height: '100%',
                  }}
                >
                  <div
                    className={`transition-opacity ${
                      isGreen ? 'bg-[#0ecb81]/50' : 'bg-[#f6465d]/50'
                    } ${candle.isPrediction ? 'opacity-20' : 'opacity-60'}`}
                    style={{
                      height: `${barHeight}px`,
                      width: '100%',
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div
            className="absolute left-2 bottom-2 text-xs text-slate-500 font-medium bg-[#1e2329]/80 px-2 py-1 rounded"
            style={{ top: `${priceChartHeight + 5}px` }}
          >
            Volume
          </div>
        </div>
      </div>

      <div className="bg-[#1e2329] px-4 py-1.5 flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <span>Scroll: Time</span>
          <span className="text-slate-600">|</span>
          <span>Ctrl + Scroll: Zoom</span>
          <span className="text-slate-600">|</span>
          <span>Drag: Pan</span>
        </div>
        <div>
          {visibleCandles.length > 0 && (
            <>
              {new Date(visibleCandles[0].timestamp).toLocaleTimeString()} — {new Date(visibleCandles[visibleCandles.length - 1].timestamp).toLocaleTimeString()}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {renderTooltip()}
      {isMaximized ? createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-auto">
          {chartContent}
        </div>,
        document.body
      ) : chartContent}
    </>
  );
};
