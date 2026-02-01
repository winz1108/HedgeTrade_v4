import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react';
import { DashboardData, TradeEvent, Candle } from '../types/dashboard';
import { formatLocalTime, formatChartTime } from '../utils/time';
import { websocketService } from '../services/websocket';

interface PriceChartProps {
  data: DashboardData;
  onTradeHover: (trade: TradeEvent | null) => void;
}

type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

function aggregateCandlesToTimeframe(sourceCandles: Candle[], minutes: number): Candle[] {
  if (minutes === 1) {
    return sourceCandles;
  }

  const timeframeMs = minutes * 60000;
  const buckets = new Map<number, Candle[]>();

  for (const candle of sourceCandles) {
    const bucketKey = Math.floor(candle.timestamp / timeframeMs) * timeframeMs;

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }
    buckets.get(bucketKey)!.push(candle);
  }

  const aggregated: Candle[] = [];
  for (const [bucketKey, candlesInBucket] of buckets.entries()) {
    candlesInBucket.sort((a, b) => a.timestamp - b.timestamp);
    const aggregatedCandle = {
      timestamp: bucketKey,
      open: candlesInBucket[0].open,
      high: Math.max(...candlesInBucket.map(c => c.high)),
      low: Math.min(...candlesInBucket.map(c => c.low)),
      close: candlesInBucket[candlesInBucket.length - 1].close,
      volume: candlesInBucket.reduce((sum, c) => sum + c.volume, 0),
      isPrediction: candlesInBucket[0].isPrediction,
    };
    aggregated.push(aggregatedCandle);
  }

  return aggregated.sort((a, b) => a.timestamp - b.timestamp);
}

export const PriceChart = ({ data, onTradeHover }: PriceChartProps) => {
  const [hoveredTrade, setHoveredTrade] = useState<TradeEvent | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [resetScroll, setResetScroll] = useState(0);
  const [candleWidth, setCandleWidth] = useState(4);
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [volumeHeight, setVolumeHeight] = useState(60);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; trade: TradeEvent; hasPairedSell: boolean; pairedTrade?: TradeEvent } | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);
  const [crosshairPosition, setCrosshairPosition] = useState<{ x: number; y: number } | null>(null);
  const [showTradeMarkers, setShowTradeMarkers] = useState(true);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const isResizing = useRef(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);
  const touchStartX = useRef(0);
  const touchStartOffset = useRef(0);
  const isTouchScrolling = useRef(false);
  const touchStartDistance = useRef(0);
  const touchStartWidth = useRef(0);
  const isPinching = useRef(false);

  const minCandleWidth = 1;
  const maxCandleWidth = 30;
  const candleGap = 2;
  const pricePadding = 20;
  const minVolumeHeight = 80;
  const maxVolumeHeight = 300;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const baseHeight = isMaximized
    ? window.innerHeight - 120
    : isMobile
      ? Math.min(window.innerHeight * 0.6, 450)
      : 590;

  const macdChartHeight = Math.floor(baseHeight * 0.16);
  const rsiChartHeight = Math.floor(baseHeight * 0.16);
  const volumeChartHeight = volumeHeight;
  const fixedHeight = macdChartHeight + rsiChartHeight + 32;
  const priceChartHeight = Math.floor(baseHeight - fixedHeight - volumeChartHeight);
  const chartHeight = baseHeight;

  const candlesByTimeframe = useMemo(() => {
    const validHistory1m = Array.isArray(data.priceHistory1m) ? data.priceHistory1m : [];
    const validPredictions = Array.isArray(data.pricePredictions) ? data.pricePredictions : [];
    const base1m = [...validHistory1m, ...validPredictions];

    const result = {
      '1m': base1m,
      '5m': data.priceHistory5m ? [...data.priceHistory5m, ...validPredictions] : aggregateCandlesToTimeframe(base1m, 5),
      '15m': data.priceHistory15m ? [...data.priceHistory15m, ...validPredictions] : aggregateCandlesToTimeframe(base1m, 15),
      '30m': data.priceHistory30m ? [...data.priceHistory30m, ...validPredictions] : aggregateCandlesToTimeframe(base1m, 30),
      '1h': data.priceHistory1h ? [...data.priceHistory1h, ...validPredictions] : aggregateCandlesToTimeframe(base1m, 60),
      '4h': data.priceHistory4h ? [...data.priceHistory4h, ...validPredictions] : aggregateCandlesToTimeframe(base1m, 240),
      '1d': data.priceHistory1d ? [...data.priceHistory1d, ...validPredictions] : aggregateCandlesToTimeframe(base1m, 1440),
    };

    return result;
  }, [data.priceHistory1m, data.priceHistory5m, data.priceHistory15m, data.priceHistory30m, data.priceHistory1h, data.priceHistory4h, data.priceHistory1d, data.pricePredictions]);

  const selectedCandles = candlesByTimeframe[timeframe];

  const { minPrice, maxPrice, visibleCandles, visibleStartIndex, maxScroll } = useMemo(() => {
    if (selectedCandles.length === 0) {
      return { minPrice: 0, maxPrice: 100, visibleCandles: [], visibleStartIndex: 0, maxScroll: 0 };
    }

    const chartWidth = containerWidth || (isMobile ? window.innerWidth - 16 : 1200);
    const visibleCount = Math.floor(chartWidth / (candleWidth + candleGap));
    const startIndex = Math.max(0, selectedCandles.length - visibleCount - scrollOffset);
    const endIndex = Math.min(selectedCandles.length, startIndex + visibleCount);
    const visibleCandles = selectedCandles.slice(startIndex, endIndex);

    const prices = visibleCandles.flatMap(c => {
      const vals = [c.high, c.low];
      if (c.ema20) vals.push(c.ema20);
      if (c.ema50) vals.push(c.ema50);
      if (c.bb_upper) vals.push(c.bb_upper);
      if (c.bb_lower) vals.push(c.bb_lower);
      if (c.bbUpper) vals.push(c.bbUpper);
      if (c.bbMiddle) vals.push(c.bbMiddle);
      if (c.bbLower) vals.push(c.bbLower);
      return vals;
    });

    if (prices.length === 0) {
      return { minPrice: 0, maxPrice: 100, visibleCandles, visibleStartIndex: startIndex, maxScroll: Math.max(0, selectedCandles.length - visibleCount) };
    }

    const priceRange = Math.max(...prices) - Math.min(...prices);
    const minPrice = Math.min(...prices) - priceRange * 0.1;
    const maxPrice = Math.max(...prices) + priceRange * 0.1;
    const maxScroll = Math.max(0, selectedCandles.length - visibleCount);

    return { minPrice, maxPrice, visibleCandles, visibleStartIndex: startIndex, maxScroll };
  }, [selectedCandles, scrollOffset, candleWidth, resetScroll, timeframe, containerWidth]);

  const priceToY = (price: number) => {
    return ((maxPrice - price) / (maxPrice - minPrice)) * priceChartHeight;
  };

  const yToPrice = (y: number) => {
    return maxPrice - (y / priceChartHeight) * (maxPrice - minPrice);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const absDeltaX = Math.abs(e.deltaX);
    const absDeltaY = Math.abs(e.deltaY);

    // 좌우 스크롤이 더 크면 차트 이동
    if (absDeltaX > absDeltaY && e.deltaX !== 0) {
      const scrollSpeed = 1;
      const scrollDelta = e.deltaX * scrollSpeed;
      setScrollOffset(prev => Math.max(0, prev + scrollDelta));
    }
    // 상하 스크롤이 더 크면 확대/축소
    else if (e.deltaY !== 0) {
      const chartWidth = containerWidth || (isMobile ? window.innerWidth - 16 : 1200);
      const maxCandles = 500;
      const dynamicMinCandleWidth = Math.max(1, (chartWidth / maxCandles) - candleGap);

      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const newWidth = Math.max(dynamicMinCandleWidth, Math.min(maxCandleWidth, candleWidth * zoomFactor));

      if (newWidth !== candleWidth) {
        setCandleWidth(newWidth);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startOffset.current = scrollOffset;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      e.preventDefault();
      e.stopPropagation();
      const deltaX = e.clientX - startX.current;
      const candlesPerPixel = 0.1;
      const deltaCandles = Math.floor(deltaX * candlesPerPixel);
      const newOffset = Math.max(0, Math.min(maxScroll, startOffset.current + deltaCandles));
      if (newOffset !== scrollOffset) {
        setScrollOffset(newOffset);
      }
    } else if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCrosshairPosition({ x, y });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    isResizing.current = false;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    isResizing.current = false;
    setCrosshairPosition(null);
    setHoveredCandle(null);
    setHoveredCandleIndex(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartOffset.current = scrollOffset;
      isTouchScrolling.current = true;
      isPinching.current = false;
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchStartDistance.current = distance;
      touchStartWidth.current = candleWidth;
      touchStartX.current = (touch1.clientX + touch2.clientX) / 2;
      touchStartOffset.current = scrollOffset;
      isPinching.current = true;
      isTouchScrolling.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isTouchScrolling.current && !isPinching.current) {
      const currentX = e.touches[0].clientX;
      const deltaX = currentX - touchStartX.current;
      const candlesPerPixel = 0.1;
      const deltaCandles = Math.floor(deltaX * candlesPerPixel);
      const newOffset = Math.max(0, Math.min(maxScroll, touchStartOffset.current + deltaCandles));
      if (newOffset !== scrollOffset) {
        setScrollOffset(newOffset);
      }
    } else if (e.touches.length === 2 && isPinching.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const scale = currentDistance / touchStartDistance.current;
      const newWidth = Math.max(minCandleWidth, Math.min(maxCandleWidth, touchStartWidth.current * scale));

      if (newWidth !== candleWidth) {
        setCandleWidth(newWidth);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      isPinching.current = false;
    }
    if (e.touches.length === 0) {
      isTouchScrolling.current = false;
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    isResizing.current = true;
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = volumeHeight;
  };

  const handleResizeMouseMove = (e: React.MouseEvent) => {
    if (isResizing.current) {
      e.preventDefault();
      const deltaY = resizeStartY.current - e.clientY;
      const newHeight = Math.max(minVolumeHeight, Math.min(maxVolumeHeight, resizeStartHeight.current + deltaY));
      setVolumeHeight(newHeight);
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    handleMouseMove(e);
    handleResizeMouseMove(e);
  };

  const macdData = useMemo(() => {
    const macdValues = visibleCandles.map(c => c.macd).filter((v): v is number => v !== undefined);
    const signalValues = visibleCandles.map(c => c.signal).filter((v): v is number => v !== undefined);
    const histogramValues = visibleCandles.map(c => c.histogram).filter((v): v is number => v !== undefined);

    if (macdValues.length === 0) return { min: -1, max: 1 };

    const allValues = [...macdValues, ...signalValues, ...histogramValues];
    const absMax = Math.max(Math.abs(Math.min(...allValues)), Math.abs(Math.max(...allValues))) * 1.2;
    return {
      min: -absMax,
      max: absMax
    };
  }, [visibleCandles]);

  const rsiData = useMemo(() => {
    return { min: 0, max: 100 };
  }, []);

  const macdPadding = 12;
  const rsiPadding = 16;

  const macdToY = (value: number) => {
    const plotHeight = macdChartHeight - (macdPadding * 2);
    return macdPadding + ((macdData.max - value) / (macdData.max - macdData.min)) * plotHeight;
  };

  const rsiToY = (value: number) => {
    const plotHeight = rsiChartHeight - (rsiPadding * 2);
    return rsiPadding + ((rsiData.max - value) / (rsiData.max - rsiData.min)) * plotHeight;
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Set initial width
    setContainerWidth(container.offsetWidth);

    const preventNavigation = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Update width on resize
    const resizeObserver = new ResizeObserver(() => {
      setContainerWidth(container.offsetWidth);
    });

    resizeObserver.observe(container);
    container.addEventListener('wheel', preventNavigation, { passive: false });

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('wheel', preventNavigation);
    };
  }, []);

  const handleTradeClick = (trade: TradeEvent, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();

    if (trade.type === 'buy') {
      const pairedTrade = trade.pairId
        ? data.trades.find(t => t.pairId === trade.pairId && t.timestamp !== trade.timestamp)
        : null;

      const clientX = 'touches' in e ? e.touches[0]?.clientX || 0 : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY || 0 : e.clientY;

      setTooltipPosition({
        x: clientX,
        y: clientY,
        trade,
        hasPairedSell: pairedTrade?.type === 'sell',
        pairedTrade: pairedTrade || undefined
      });
      setHoveredTrade(trade);
      onTradeHover(trade);
    }
  };

  const handleTradeMouseEnter = (trade: TradeEvent, x: number, y: number) => {
    if (window.innerWidth >= 768) {
      setHoveredTrade(trade);
      onTradeHover(trade);

      if (trade.type === 'buy') {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          const pairedTrade = trade.pairId
            ? data.trades.find(t => t.pairId === trade.pairId && t.timestamp !== trade.timestamp)
            : null;

          setTooltipPosition({
            x: containerRect.left + x,
            y: containerRect.top + y + window.scrollY,
            trade,
            hasPairedSell: pairedTrade?.type === 'sell',
            pairedTrade: pairedTrade || undefined
          });
        }
      }
    }
  };

  const handleTradeMouseLeave = () => {
    if (window.innerWidth >= 768) {
      setHoveredTrade(null);
      onTradeHover(null);
      setTooltipPosition(null);
    }
  };

  const handleCloseTooltip = () => {
    setHoveredTrade(null);
    onTradeHover(null);
    setTooltipPosition(null);
  };

  const predictionStartIndex = visibleCandles.findIndex(c => c.isPrediction);

  const latestCandle = visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1] : null;
  const firstCandle = visibleCandles.length > 0 ? visibleCandles[0] : null;
  const priceChange = latestCandle && firstCandle ? latestCandle.close - firstCandle.open : 0;
  const priceChangePercent = latestCandle && firstCandle && firstCandle.open ? (priceChange / firstCandle.open) * 100 : 0;

  const renderTooltip = () => {
    if (!tooltipPosition) return null;

    const { x, y, trade, hasPairedSell, pairedTrade } = tooltipPosition;

    const isMobileView = window.innerWidth < 768;

    if (isMobileView) {
      return createPortal(
        <div
          className="fixed left-2 right-2 bottom-4 bg-white/90/90 backdrop-blur-md border-2 border-[#0ecb81] text-white text-xs rounded-lg p-4 shadow-2xl max-h-[70vh] overflow-y-auto"
          style={{
            zIndex: 999999,
          }}
          onClick={handleCloseTooltip}
        >
        {!hasPairedSell ? (
          <>
            <div className="font-bold mb-3 text-sm flex items-center gap-2 text-[#3b82f6]">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              BUY Signal at ${trade.price.toFixed(2)}
            </div>

            {(trade.prediction || (data.holding.tpPrice && data.holding.slPrice)) ? (
              <>
                <div className="mb-3">
                  <div className="text-slate-200 text-[10px] mb-2 font-semibold">익절 확률 (Take Profit Probability)</div>
                  <div className="space-y-1.5 bg-slate-800/50 p-2 rounded">
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">매수시 익절확률</span>
                      <span className="text-[#0ecb81] font-semibold">
                        {data.holding.initialTakeProfitProb
                          ? (data.holding.initialTakeProfitProb * 100).toFixed(1)
                          : trade.prediction
                            ? (trade.prediction.takeProfitProb * 100).toFixed(1)
                            : 'N/A'}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">현재 익절확률</span>
                      <span className="text-[#0ecb81] font-semibold">
                        {data.currentPrediction?.v5MoeTakeProfitProb
                          ? (data.currentPrediction.v5MoeTakeProfitProb * 100).toFixed(1)
                          : data.holding.v5MoeTakeProfitProb
                            ? (data.holding.v5MoeTakeProfitProb * 100).toFixed(1)
                            : trade.prediction
                              ? (trade.prediction.takeProfitProb * 100).toFixed(1)
                              : 'N/A'}%
                      </span>
                    </div>
                    {data.lastPredictionUpdateTime && (
                      <div className="flex justify-between gap-6">
                        <span className="text-stone-200">익절확률 업데이트</span>
                        <span className="text-slate-300 text-[10px]">
                          {formatLocalTime(data.lastPredictionUpdateTime)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">예상 익절가</span>
                      <span className="text-white font-semibold">
                        ${(data.holding.tpPrice || trade.prediction?.expectedTakeProfitPrice || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">예상 손절가</span>
                      <span className="text-white font-semibold">
                        ${(data.holding.slPrice || trade.prediction?.expectedStopLossPrice || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-slate-200 text-[10px] mb-2 font-semibold">현재 결과 (Current)</div>
                  <div className="space-y-1.5 bg-slate-800/50 p-2 rounded">
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">현재가</span>
                      <span className="text-white font-semibold">${data.currentPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">수익률</span>
                      <span className={`font-semibold ${((data.currentPrice - trade.price) / trade.price * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                        {((data.currentPrice - trade.price) / trade.price * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">경과 시간</span>
                      <span className="text-slate-300 text-[10px]">
                        {Math.floor((data.currentTime - trade.timestamp) / 60000)}분
                      </span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">마지막 업데이트</span>
                      <span className="text-slate-300 text-[10px]">
                        {formatLocalTime(data.currentTime)}
                      </span>
                    </div>
                    {(() => {
                      const tpPrice = data.holding.tpPrice || trade.prediction?.expectedTakeProfitPrice || 0;
                      const slPrice = data.holding.slPrice || trade.prediction?.expectedStopLossPrice || 0;

                      if (data.currentPrice >= tpPrice) {
                        return (
                          <div className="text-[#0ecb81] text-center py-1 bg-[#0ecb81]/10 rounded mt-2 font-semibold">
                            ✓ 익절 달성
                          </div>
                        );
                      } else if (data.currentPrice <= slPrice) {
                        return (
                          <div className="text-[#f6465d] text-center py-1 bg-[#f6465d]/10 rounded mt-2 font-semibold">
                            ✗ 손절 발생
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-stone-600 text-center py-1 bg-slate-700/30 rounded mt-2 text-[10px]">
                            진행 중
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="space-y-1.5 bg-slate-800/50 p-2 rounded">
                  <div className="flex justify-between gap-6">
                    <span className="text-stone-600">현재가</span>
                    <span className="text-white font-semibold">${data.currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-stone-200">현재 수익률</span>
                    <span className={`font-semibold ${((data.currentPrice - (data.holding.buyPrice || trade.price)) / (data.holding.buyPrice || trade.price) * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                      {((data.currentPrice - (data.holding.buyPrice || trade.price)) / (data.holding.buyPrice || trade.price) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-stone-600">보유 시간</span>
                    <span className="text-slate-300 text-[10px]">
                      {Math.floor((data.currentTime - trade.timestamp) / 60000)}분
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : pairedTrade ? (
          <>
            <div className="font-bold mb-3 text-sm flex items-center gap-2 text-[#3b82f6]">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              거래 완료
            </div>

            <div className="space-y-2">
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-200">매수가</span>
                <span className="text-white font-semibold">${trade.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">매도가</span>
                <span className="text-white font-semibold">${pairedTrade!.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">수익률</span>
                <span className={`font-bold ${((pairedTrade!.price - trade.price) / trade.price * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {((pairedTrade!.price - trade.price) / trade.price * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">보유 시간</span>
                <span className="text-slate-300 text-[10px]">
                  {Math.floor((pairedTrade!.timestamp - trade.timestamp) / 60000)}분
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="font-bold mb-3 text-sm flex items-center gap-2 text-[#3b82f6]">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              보유 중
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-200">매수가</span>
                <span className="text-white font-semibold">${trade.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">현재가</span>
                <span className="text-white font-semibold">${data.currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">현재 수익률</span>
                <span className={`font-bold ${((data.currentPrice - trade.price) / trade.price * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {((data.currentPrice - trade.price) / trade.price * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">보유 시간</span>
                <span className="text-slate-300 text-[10px]">
                  {Math.floor((data.currentTime - trade.timestamp) / 60000)}분
                </span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">마지막 업데이트</span>
                <span className="text-slate-300 text-[10px]">
                  {new Date(data.currentTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>

            {(trade.prediction || (data.holding.tpPrice && data.holding.slPrice)) && (
              <div>
                <div className="text-slate-500 text-[10px] mb-2 font-semibold">익절 확률</div>
                <div className="space-y-1.5 bg-slate-800/50 p-2 rounded text-[10px]">
                  <div className="flex justify-between gap-4">
                    <span className="text-stone-200">매수시</span>
                    <span className="text-[#0ecb81]">
                      {data.holding.initialTakeProfitProb
                        ? (data.holding.initialTakeProfitProb * 100).toFixed(1)
                        : trade.prediction
                          ? (trade.prediction.takeProfitProb * 100).toFixed(1)
                          : 'N/A'}%
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-stone-200">현재</span>
                    <span className="text-[#0ecb81]">
                      {data.holding.isHolding && data.holding.v5MoeTakeProfitProb !== undefined
                        ? (data.holding.v5MoeTakeProfitProb * 100).toFixed(1)
                        : data.currentPrediction?.v5MoeTakeProfitProb !== undefined
                          ? (data.currentPrediction.v5MoeTakeProfitProb * 100).toFixed(1)
                          : trade.prediction?.takeProfitProb !== undefined
                            ? (trade.prediction.takeProfitProb * 100).toFixed(1)
                            : 'N/A'}%
                    </span>
                  </div>
                  {data.lastPredictionUpdateTime && (
                    <div className="flex justify-between gap-4">
                      <span className="text-stone-600">업데이트</span>
                      <span className="text-slate-300 text-[9px]">
                        {new Date(data.lastPredictionUpdateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <span className="text-stone-200">익절가</span>
                    <span className="text-white">
                      ${(data.holding.tpPrice || trade.prediction?.expectedTakeProfitPrice || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-stone-200">손절가</span>
                    <span className="text-white">
                      ${(data.holding.slPrice || trade.prediction?.expectedStopLossPrice || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </div>,
        document.body
      );
    }

    const tooltipWidth = 300;
    const tooltipMaxHeight = 600;
    const margin = 20;

    let leftPos: number;
    let rightPos: number | undefined;

    if (x < window.innerWidth / 2) {
      leftPos = Math.min(x + 40, window.innerWidth - tooltipWidth - margin);
      rightPos = undefined;
    } else {
      leftPos = Math.max(margin, x - tooltipWidth - 40);
      rightPos = undefined;
    }

    if (leftPos < margin) {
      leftPos = margin;
    }
    if (leftPos + tooltipWidth > window.innerWidth - margin) {
      leftPos = window.innerWidth - tooltipWidth - margin;
    }

    let topPos = Math.max(margin, y - 10);
    if (topPos + tooltipMaxHeight > window.innerHeight - margin) {
      topPos = window.innerHeight - tooltipMaxHeight - margin;
    }

    return createPortal(
      <div
        className="fixed bg-slate-900/95 backdrop-blur-md border-2 border-[#0ecb81] text-white text-xs rounded-lg p-4 shadow-2xl pointer-events-none max-h-[600px] overflow-y-auto"
        style={{
          left: `${leftPos}px`,
          top: `${topPos}px`,
          minWidth: `${tooltipWidth}px`,
          maxWidth: `${Math.min(tooltipWidth, window.innerWidth - 2 * margin)}px`,
          zIndex: 999999,
        }}
      >
        {!hasPairedSell ? (
          <>
            <div className="font-bold mb-3 text-sm flex items-center gap-2 text-[#3b82f6]">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              BUY Signal at ${trade.price.toFixed(2)}
            </div>

            {(trade.prediction || (data.holding.tpPrice && data.holding.slPrice)) ? (
              <>
                <div className="mb-3">
                  <div className="text-slate-200 text-[10px] mb-2 font-semibold">익절 확률 (Take Profit Probability)</div>
                  <div className="space-y-1.5 bg-slate-800/50 p-2 rounded">
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">매수시 익절확률</span>
                      <span className="text-[#0ecb81] font-semibold">
                        {data.holding.initialTakeProfitProb
                          ? (data.holding.initialTakeProfitProb * 100).toFixed(1)
                          : trade.prediction
                            ? (trade.prediction.takeProfitProb * 100).toFixed(1)
                            : 'N/A'}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">현재 익절확률</span>
                      <span className="text-[#0ecb81] font-semibold">
                        {data.currentPrediction?.v5MoeTakeProfitProb
                          ? (data.currentPrediction.v5MoeTakeProfitProb * 100).toFixed(1)
                          : data.holding.v5MoeTakeProfitProb
                            ? (data.holding.v5MoeTakeProfitProb * 100).toFixed(1)
                            : trade.prediction
                              ? (trade.prediction.takeProfitProb * 100).toFixed(1)
                              : 'N/A'}%
                      </span>
                    </div>
                    {data.lastPredictionUpdateTime && (
                      <div className="flex justify-between gap-6">
                        <span className="text-stone-200">익절확률 업데이트</span>
                        <span className="text-slate-300 text-[10px]">
                          {formatLocalTime(data.lastPredictionUpdateTime)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">예상 익절가</span>
                      <span className="text-white font-semibold">
                        ${(data.holding.tpPrice || trade.prediction?.expectedTakeProfitPrice || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">예상 손절가</span>
                      <span className="text-white font-semibold">
                        ${(data.holding.slPrice || trade.prediction?.expectedStopLossPrice || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-slate-200 text-[10px] mb-2 font-semibold">현재 결과 (Current)</div>
                  <div className="space-y-1.5 bg-slate-800/50 p-2 rounded">
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">현재가</span>
                      <span className="text-white font-semibold">${data.currentPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">수익률</span>
                      <span className={`font-semibold ${((data.currentPrice - trade.price) / trade.price * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                        {((data.currentPrice - trade.price) / trade.price * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">경과 시간</span>
                      <span className="text-slate-300 text-[10px]">
                        {Math.floor((data.currentTime - trade.timestamp) / 60000)}분
                      </span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-200">마지막 업데이트</span>
                      <span className="text-slate-300 text-[10px]">
                        {formatLocalTime(data.currentTime)}
                      </span>
                    </div>
                    {(() => {
                      const tpPrice = data.holding.tpPrice || trade.prediction?.expectedTakeProfitPrice || 0;
                      const slPrice = data.holding.slPrice || trade.prediction?.expectedStopLossPrice || 0;

                      if (data.currentPrice >= tpPrice) {
                        return (
                          <div className="text-[#0ecb81] text-center py-1 bg-[#0ecb81]/10 rounded mt-2 font-semibold">
                            ✓ 익절 달성
                          </div>
                        );
                      } else if (data.currentPrice <= slPrice) {
                        return (
                          <div className="text-[#f6465d] text-center py-1 bg-[#f6465d]/10 rounded mt-2 font-semibold">
                            ✗ 손절 발생
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-stone-600 text-center py-1 bg-slate-700/30 rounded mt-2 text-[10px]">
                            진행 중
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="space-y-1.5 bg-slate-800/50 p-2 rounded">
                  <div className="flex justify-between gap-6">
                    <span className="text-stone-600">현재가</span>
                    <span className="text-white font-semibold">${data.currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-stone-200">현재 수익률</span>
                    <span className={`font-semibold ${((data.currentPrice - (data.holding.buyPrice || trade.price)) / (data.holding.buyPrice || trade.price) * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                      {((data.currentPrice - (data.holding.buyPrice || trade.price)) / (data.holding.buyPrice || trade.price) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-stone-600">보유 시간</span>
                    <span className="text-slate-300 text-[10px]">
                      {Math.floor((data.currentTime - trade.timestamp) / 60000)}분
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : pairedTrade ? (
          <>
            <div className="font-bold mb-3 text-sm flex items-center gap-2 text-[#3b82f6]">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              거래 완료
            </div>

            <div className="space-y-2">
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-200">매수가</span>
                <span className="text-white font-semibold">${trade.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">매도가</span>
                <span className="text-white font-semibold">${pairedTrade!.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">수익률</span>
                <span className={`font-bold ${((pairedTrade!.price - trade.price) / trade.price * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {((pairedTrade!.price - trade.price) / trade.price * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">보유 시간</span>
                <span className="text-slate-300 text-[10px]">
                  {Math.floor((pairedTrade!.timestamp - trade.timestamp) / 60000)}분
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="font-bold mb-3 text-sm flex items-center gap-2 text-[#3b82f6]">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              보유 중
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-200">매수가</span>
                <span className="text-white font-semibold">${trade.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">현재가</span>
                <span className="text-white font-semibold">${data.currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">현재 수익률</span>
                <span className={`font-bold ${((data.currentPrice - trade.price) / trade.price * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {((data.currentPrice - trade.price) / trade.price * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">보유 시간</span>
                <span className="text-slate-300 text-[10px]">
                  {Math.floor((data.currentTime - trade.timestamp) / 60000)}분
                </span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-stone-600">마지막 업데이트</span>
                <span className="text-slate-300 text-[10px]">
                  {new Date(data.currentTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>

            {(trade.prediction || (data.holding.tpPrice && data.holding.slPrice)) && (
              <div>
                <div className="text-slate-500 text-[10px] mb-2 font-semibold">익절 확률</div>
                <div className="space-y-1.5 bg-slate-800/50 p-2 rounded text-[10px]">
                  <div className="flex justify-between gap-4">
                    <span className="text-stone-200">매수시</span>
                    <span className="text-[#0ecb81]">
                      {data.holding.initialTakeProfitProb
                        ? (data.holding.initialTakeProfitProb * 100).toFixed(1)
                        : trade.prediction
                          ? (trade.prediction.takeProfitProb * 100).toFixed(1)
                          : 'N/A'}%
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-stone-200">현재</span>
                    <span className="text-[#0ecb81]">
                      {data.holding.isHolding && data.holding.v5MoeTakeProfitProb !== undefined
                        ? (data.holding.v5MoeTakeProfitProb * 100).toFixed(1)
                        : data.currentPrediction?.v5MoeTakeProfitProb !== undefined
                          ? (data.currentPrediction.v5MoeTakeProfitProb * 100).toFixed(1)
                          : trade.prediction?.takeProfitProb !== undefined
                            ? (trade.prediction.takeProfitProb * 100).toFixed(1)
                            : 'N/A'}%
                    </span>
                  </div>
                  {data.lastPredictionUpdateTime && (
                    <div className="flex justify-between gap-4">
                      <span className="text-stone-600">업데이트</span>
                      <span className="text-slate-300 text-[9px]">
                        {new Date(data.lastPredictionUpdateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <span className="text-stone-200">익절가</span>
                    <span className="text-white">
                      ${(data.holding.tpPrice || trade.prediction?.expectedTakeProfitPrice || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-stone-200">손절가</span>
                    <span className="text-white">
                      ${(data.holding.slPrice || trade.prediction?.expectedStopLossPrice || 0).toFixed(2)}
                    </span>
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

  const getTimeframeMinutes = (tf: Timeframe): number => {
    switch (tf) {
      case '1m': return 1;
      case '5m': return 5;
      case '15m': return 15;
      case '30m': return 30;
      case '1h': return 60;
      case '4h': return 240;
      case '1d': return 1440;
    }
  };

  const chartContent = (
    <div className={`bg-white/60 rounded-xl shadow-lg border border-stone-200 w-full overflow-hidden ${isMaximized ? 'fixed inset-0 z-50 h-screen rounded-none' : ''}`}>
      <div className="bg-white/80 px-2 sm:px-4 py-2 flex items-center justify-between border-b border-stone-200 flex-wrap gap-2">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-stone-800">BTC/USDC</h2>
            {latestCandle && (
              <>
                <div className="text-base sm:text-lg font-bold text-stone-900">
                  ${latestCandle.close.toFixed(2)}
                </div>
                <div className={`text-xs font-semibold px-1.5 py-0.5 rounded ${priceChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="hidden sm:flex items-center gap-2 text-[10px] bg-stone-100/70 px-2 py-1 rounded">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-amber-600 rounded"></div>
              <span className="text-stone-600">EMA20</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-cyan-600 rounded"></div>
              <span className="text-stone-600">EMA50</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-violet-600 border-t border-dashed border-violet-600"></div>
              <span className="text-stone-600">BB</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-stone-200/60 rounded p-0.5 overflow-x-auto">
            {(['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const).map((tf) => {
              const hasData = candlesByTimeframe[tf] && candlesByTimeframe[tf].length > 0;
              const isLoading = !hasData && tf !== timeframe;

              return (
                <button
                  key={tf}
                  onClick={() => {
                    setTimeframe(tf);
                    setScrollOffset(0);
                    setResetScroll(prev => prev + 1);
                    if (!hasData) {
                      websocketService.requestTimeframeData(tf);
                    }
                  }}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all flex-shrink-0 ${
                    timeframe === tf
                      ? 'bg-stone-700 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-300/60'
                  }`}
                >
                  {tf}
                  {isLoading && <span className="ml-1 text-[8px] opacity-50">•••</span>}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleZoomOut}
            className="p-1 bg-stone-200/60 hover:bg-stone-300/70 rounded transition-colors"
            title="Zoom Out (Ctrl + Scroll)"
          >
            <ZoomOut className="w-3 h-3 text-stone-600" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 bg-stone-200/60 hover:bg-stone-300/70 rounded transition-colors"
            title="Zoom In (Ctrl + Scroll)"
          >
            <ZoomIn className="w-3 h-3 text-stone-600" />
          </button>
          <button
            onClick={() => setShowTradeMarkers(!showTradeMarkers)}
            className={`p-1 rounded transition-colors ${
              showTradeMarkers
                ? 'bg-[#3b82f6] hover:bg-[#2563eb]'
                : 'bg-stone-200/60 hover:bg-stone-300/70'
            }`}
            title={showTradeMarkers ? "Hide B/S Markers" : "Show B/S Markers"}
          >
            {showTradeMarkers ? (
              <Eye className="w-3 h-3 text-white" />
            ) : (
              <EyeOff className="w-3 h-3 text-stone-600" />
            )}
          </button>
          <button
            onClick={() => {
              setIsMaximized(!isMaximized);
              setScrollOffset(0);
              setResetScroll(prev => prev + 1);
            }}
            className="p-1 bg-stone-200/60 hover:bg-stone-300/70 rounded transition-colors"
            title={isMaximized ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isMaximized ? (
              <Minimize2 className="w-3 h-3 text-stone-600" />
            ) : (
              <Maximize2 className="w-3 h-3 text-stone-600" />
            )}
          </button>
        </div>
        </div>
      </div>

      <div className="flex bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50 overflow-visible" style={{ height: `${chartHeight}px` }}>
      <div
        ref={containerRef}
        className="relative select-none flex-shrink-0 flex-1"
        style={{
          overflow: 'visible',
          touchAction: 'pan-x pan-y',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >

        <div className="absolute inset-0 overflow-visible">
          {/* OHLC Display */}
          {hoveredCandle && (
            <div className="absolute left-3 top-3 z-30 flex flex-col gap-1.5 text-xs bg-white/98 px-3 py-2 rounded-lg border border-stone-200 shadow">
              <div className="flex items-center gap-3">
                <span className="text-stone-700 font-mono font-medium">{formatChartTime(hoveredCandle.timestamp)}</span>
                <span className="text-stone-600 font-medium">O <span className="text-stone-900 font-bold">{hoveredCandle.open.toFixed(2)}</span></span>
                <span className="text-stone-600 font-medium">H <span className="text-emerald-600 font-bold">{hoveredCandle.high.toFixed(2)}</span></span>
                <span className="text-stone-600 font-medium">L <span className="text-rose-600 font-bold">{hoveredCandle.low.toFixed(2)}</span></span>
                <span className="text-stone-600 font-medium">C <span className="text-stone-900 font-bold">{hoveredCandle.close.toFixed(2)}</span></span>
                {hoveredCandle.isComplete === false && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-bold border border-amber-400/40 animate-pulse shadow-lg">
                    진행 중
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                {hoveredCandle.ema20 && (
                  <span className="text-stone-600 font-medium">EMA20 <span className="text-amber-600 font-bold">{hoveredCandle.ema20.toFixed(2)}</span></span>
                )}
                {hoveredCandle.ema50 && (
                  <span className="text-stone-600 font-medium">EMA50 <span className="text-cyan-600 font-bold">{hoveredCandle.ema50.toFixed(2)}</span></span>
                )}
                {(hoveredCandle.bbUpper || hoveredCandle.bb_upper) && (
                  <>
                    <span className="text-stone-600">|</span>
                    <span className="text-stone-600 font-medium">BB <span className="text-violet-600 font-bold">{(hoveredCandle.bbUpper ?? hoveredCandle.bb_upper)?.toFixed(2)}</span></span>
                    <span className="text-stone-600 font-medium">/ <span className="text-violet-600 font-bold">{hoveredCandle.bbMiddle?.toFixed(2) ?? '-'}</span></span>
                    <span className="text-stone-600 font-medium">/ <span className="text-violet-600 font-bold">{(hoveredCandle.bbLower ?? hoveredCandle.bb_lower)?.toFixed(2)}</span></span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Grid lines - zIndex 1 (bottom layer) */}
          <svg className="absolute top-0 left-0 w-full" height={priceChartHeight} style={{ pointerEvents: 'none', zIndex: 1 }}>
            {(() => {
              return Array.from({ length: 6 }).map((_, i) => {
                const price = minPrice + ((maxPrice - minPrice) / 5) * i;
                const y = priceToY(price);
                return (
                  <line
                    key={i}
                    x1="0"
                    y1={y}
                    x2="100%"
                    y2={y}
                    stroke="rgba(120, 113, 108, 0.08)"
                    strokeWidth="1"
                  />
                );
              });
            })()}
          </svg>

          {/* Indicators (EMA, BB) - zIndex 2 (middle layer) */}
          <svg className="absolute top-0 left-0 w-full" height={priceChartHeight} style={{ pointerEvents: 'none', zIndex: 2 }}>
            <defs>
              <linearGradient id="predictionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(252, 213, 53, 0.15)" />
                <stop offset="100%" stopColor="rgba(252, 213, 53, 0.05)" />
              </linearGradient>
            </defs>

            {predictionStartIndex > 0 && (
              <rect
                x={`${(predictionStartIndex / visibleCandles.length) * 100}%`}
                y="0"
                width={`${((visibleCandles.length - predictionStartIndex) / visibleCandles.length) * 100}%`}
                height="100%"
                fill="url(#predictionGradient)"
              />
            )}

            {(() => {
              const ema20Points: string[] = [];
              const ema50Points: string[] = [];
              const bbUpperPoints: string[] = [];
              const bbMiddlePoints: string[] = [];
              const bbLowerPoints: string[] = [];

              visibleCandles.forEach((candle, idx) => {
                const x = idx * (candleWidth + candleGap) + candleWidth / 2;

                if (candle.ema20 !== undefined) {
                  const y = priceToY(candle.ema20);
                  ema20Points.push(`${x},${y}`);
                }

                if (candle.ema50 !== undefined) {
                  const y = priceToY(candle.ema50);
                  ema50Points.push(`${x},${y}`);
                }

                const bbUpper = candle.bbUpper ?? candle.bb_upper;
                const bbMiddle = candle.bbMiddle;
                const bbLower = candle.bbLower ?? candle.bb_lower;

                if (bbUpper !== undefined) {
                  const y = priceToY(bbUpper);
                  bbUpperPoints.push(`${x},${y}`);
                }

                if (bbMiddle !== undefined) {
                  const y = priceToY(bbMiddle);
                  bbMiddlePoints.push(`${x},${y}`);
                }

                if (bbLower !== undefined) {
                  const y = priceToY(bbLower);
                  bbLowerPoints.push(`${x},${y}`);
                }
              });

              return (
                <>
                  {bbUpperPoints.length > 1 && (
                    <>
                      <polyline
                        points={bbUpperPoints.join(' ')}
                        fill="none"
                        stroke="rgba(120, 120, 120, 0.8)"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                      {bbMiddlePoints.length > 1 && (
                        <polyline
                          points={bbMiddlePoints.join(' ')}
                          fill="none"
                          stroke="rgba(140, 140, 140, 0.6)"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                        />
                      )}
                      <polyline
                        points={bbLowerPoints.join(' ')}
                        fill="none"
                        stroke="rgba(120, 120, 120, 0.8)"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                    </>
                  )}

                  {ema20Points.length > 1 && (
                    <polyline
                      points={ema20Points.join(' ')}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                      opacity="0.9"
                    />
                  )}

                  {ema50Points.length > 1 && (
                    <polyline
                      points={ema50Points.join(' ')}
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="1.5"
                      opacity="0.9"
                    />
                  )}

                  {/* BB Touch Markers */}
                  {visibleCandles.map((candle, idx) => {
                    const bbUpper = candle.bbUpper ?? candle.bb_upper;
                    const bbLower = candle.bbLower ?? candle.bb_lower;

                    const touchedUpper = bbUpper !== undefined && candle.high >= bbUpper;
                    const touchedLower = bbLower !== undefined && candle.low <= bbLower;

                    if (!touchedUpper && !touchedLower) return null;

                    const x = idx * (candleWidth + candleGap) + candleWidth / 2;

                    return (
                      <g key={`bb-touch-${idx}`}>
                        {touchedUpper && (
                          <circle
                            cx={x}
                            cy={priceToY(candle.high)}
                            r="3"
                            fill="#ef4444"
                            opacity="0.8"
                            stroke="#dc2626"
                            strokeWidth="1"
                          />
                        )}
                        {touchedLower && (
                          <circle
                            cx={x}
                            cy={priceToY(candle.low)}
                            r="3"
                            fill="#10b981"
                            opacity="0.8"
                            stroke="#059669"
                            strokeWidth="1"
                          />
                        )}
                      </g>
                    );
                  })}
                </>
              );
            })()}

            {/* Crosshair */}
            {crosshairPosition && hoveredCandleIndex !== null && (
              <>
                {/* Vertical line */}
                <line
                  x1={crosshairPosition.x}
                  y1="0"
                  x2={crosshairPosition.x}
                  y2={priceChartHeight}
                  stroke="rgba(251, 191, 36, 0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  style={{ pointerEvents: 'none' }}
                  filter="drop-shadow(0 0 3px rgba(251, 191, 36, 0.3))"
                />
                {/* Horizontal line */}
                <line
                  x1="0"
                  y1={crosshairPosition.y}
                  x2="100%"
                  y2={crosshairPosition.y}
                  stroke="rgba(251, 191, 36, 0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  style={{ pointerEvents: 'none' }}
                  filter="drop-shadow(0 0 3px rgba(251, 191, 36, 0.3))"
                />
              </>
            )}

          </svg>

          <div
            className="absolute top-0 left-0 flex cursor-crosshair overflow-visible"
            style={{
              height: `${chartHeight}px`,
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: 3,
              pointerEvents: 'auto'
            }}
            onMouseDown={handleMouseDown}
          >
            {visibleCandles.map((candle, idx) => {
              const isGreen = candle.close >= candle.open;
              const highY = priceToY(candle.high);
              const lowY = priceToY(candle.low);
              const openY = priceToY(candle.open);
              const closeY = priceToY(candle.close);
              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.abs(closeY - openY);
              const wickHeight = lowY - highY;
              const isHovered = hoveredCandleIndex === idx;

              return (
                <div
                  key={idx}
                  className="relative flex-shrink-0"
                  style={{
                    width: `${candleWidth}px`,
                    marginRight: `${candleGap}px`,
                  }}
                  onMouseEnter={() => {
                    if (!isDragging.current) {
                      setHoveredCandle(candle);
                      setHoveredCandleIndex(idx);
                    }
                  }}
                  onMouseLeave={() => {
                    if (!isDragging.current) {
                      setHoveredCandle(null);
                      setHoveredCandleIndex(null);
                    }
                  }}
                >
                  <div
                    className={isGreen ? 'bg-emerald-400' : 'bg-rose-400'}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: `${highY}px`,
                      height: `${wickHeight}px`,
                      width: '1px',
                      filter: isHovered ? 'drop-shadow(0 0 2px currentColor)' : 'none',
                    }}
                  />
                  <div
                    className={`${
                      isGreen
                        ? 'bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-300'
                        : 'bg-gradient-to-b from-rose-400 to-rose-500 border-rose-300'
                    } ${candle.isPrediction ? 'opacity-40 border-dashed' : ''} ${
                      isHovered ? 'ring-2 ring-amber-400/50 shadow-lg' : ''
                    }`}
                    style={{
                      position: 'absolute',
                      left: '0',
                      top: `${bodyTop}px`,
                      height: `${Math.max(bodyHeight, 1)}px`,
                      width: '100%',
                      borderWidth: '0',
                      filter: isHovered ? 'brightness(1.2)' : 'none',
                    }}
                  />
                </div>
              );
            })}

            {showTradeMarkers && (() => {
              if (visibleCandles.length === 0) return null;

              const highestCandle = visibleCandles.reduce((max, candle, idx) =>
                candle.high > visibleCandles[max].high ? idx : max, 0
              );
              const lowestCandle = visibleCandles.reduce((min, candle, idx) =>
                candle.low < visibleCandles[min].low ? idx : min, 0
              );

              const highPrice = visibleCandles[highestCandle].high;
              const lowPrice = visibleCandles[lowestCandle].low;
              const highY = priceToY(highPrice);
              const lowY = priceToY(lowPrice);
              const highX = highestCandle * (candleWidth + candleGap);
              const lowX = lowestCandle * (candleWidth + candleGap);
              const lineLength = 24;

              return (
                <>
                  <div
                    className="absolute h-0.5 bg-black"
                    style={{
                      left: `${highX - lineLength}px`,
                      top: `${highY}px`,
                      width: `${lineLength}px`,
                      pointerEvents: 'none',
                      zIndex: 9999
                    }}
                  />
                  <div
                    className="absolute text-[9px] text-black font-semibold whitespace-nowrap text-right px-1 py-0.5 bg-white rounded"
                    style={{
                      right: `calc(100% - ${highX - lineLength}px + 2px)`,
                      top: `${highY - 8}px`,
                      pointerEvents: 'none',
                      zIndex: 9999
                    }}
                  >
                    {highPrice.toFixed(2)}
                  </div>

                  <div
                    className="absolute h-0.5 bg-black"
                    style={{
                      left: `${lowX - lineLength}px`,
                      top: `${lowY}px`,
                      width: `${lineLength}px`,
                      pointerEvents: 'none',
                      zIndex: 9999
                    }}
                  />
                  <div
                    className="absolute text-[9px] text-black font-semibold whitespace-nowrap text-right px-1 py-0.5 bg-white rounded"
                    style={{
                      right: `calc(100% - ${lowX - lineLength}px + 2px)`,
                      top: `${lowY - 8}px`,
                      pointerEvents: 'none',
                      zIndex: 9999
                    }}
                  >
                    {lowPrice.toFixed(2)}
                  </div>
                </>
              );
            })()}
          </div>

          <div
            className="absolute top-0 left-0"
            style={{ height: `${priceChartHeight}px`, width: `${visibleCandles.length * (candleWidth + candleGap)}px`, overflow: 'visible', cursor: isDragging.current ? 'grabbing' : 'default', pointerEvents: 'none' }}
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
                buyCandleIndexInAll = selectedCandles.findIndex(c => Math.abs(c.timestamp - buyTrade.timestamp) < 60000);
                sellCandleIndexInAll = selectedCandles.findIndex(c => Math.abs(c.timestamp - sellTrade.timestamp) < 60000);
              } else {
                buyCandleIndexInAll = selectedCandles.findIndex(c => {
                  const candlePeriod = Math.floor(c.timestamp / timeframeMs) * timeframeMs;
                  const tradePeriod = Math.floor(buyTrade.timestamp / timeframeMs) * timeframeMs;
                  return candlePeriod === tradePeriod;
                });

                sellCandleIndexInAll = selectedCandles.findIndex(c => {
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

            {data.holding.isHolding && data.holding.buyPrice && (
              <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: '100%', height: `${priceChartHeight}px`, zIndex: 15 }}>
                <line
                  x1="0"
                  y1={priceToY(data.holding.buyPrice)}
                  x2="100%"
                  y2={priceToY(data.holding.buyPrice)}
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  opacity="0.75"
                  filter="drop-shadow(0 0 3px rgba(59, 130, 246, 0.5))"
                />
                {data.holding.tpPrice && (
                  <line
                    x1="0"
                    y1={priceToY(data.holding.tpPrice)}
                    x2="100%"
                    y2={priceToY(data.holding.tpPrice)}
                    stroke="#0ecb81"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    opacity="0.75"
                    filter="drop-shadow(0 0 3px rgba(14, 203, 129, 0.5))"
                  />
                )}
                {data.holding.slPrice && (
                  <line
                    x1="0"
                    y1={priceToY(data.holding.slPrice)}
                    x2="100%"
                    y2={priceToY(data.holding.slPrice)}
                    stroke="#f6465d"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    opacity="0.75"
                    filter="drop-shadow(0 0 3px rgba(246, 70, 93, 0.5))"
                  />
                )}
              </svg>
            )}


            <div className="absolute top-0 left-0 pointer-events-none" style={{ height: `${priceChartHeight}px`, width: `${visibleCandles.length * (candleWidth + candleGap)}px`, overflow: 'visible', zIndex: 5 }}>
            {(() => {
              const allTrades: Array<TradeEvent & { isPaired: boolean }> = [];

              data.trades.forEach(trade => {
                const pairedTrade = trade.pairId
                  ? data.trades.find(t => t.pairId === trade.pairId && t.timestamp !== trade.timestamp)
                  : null;
                allTrades.push({
                  ...trade,
                  isPaired: !!pairedTrade
                });
              });

              if (data.holding.buyPrice && data.holding.buyTime) {
                const existsInTrades = allTrades.some(
                  t => t.type === 'buy' && Math.abs(t.timestamp - data.holding.buyTime!) < 5000
                );

                if (!existsInTrades) {
                  allTrades.push({
                    timestamp: data.holding.buyTime,
                    type: 'buy',
                    price: data.holding.buyPrice,
                    isPaired: false
                  });
                }
              }

              const timeframeMinutes = getTimeframeMinutes(timeframe);
              const timeframeMs = timeframeMinutes * 60000;
              const visibleTimeRangeStart = visibleCandles.length > 0 ? visibleCandles[0].timestamp : 0;
              const visibleTimeRangeEnd = visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1].timestamp + timeframeMs : 0;

              const lastSellTrade = [...allTrades].reverse().find(t => t.type === 'sell');
              const lastSellTimestamp = lastSellTrade ? lastSellTrade.timestamp : 0;

              const unpairedBuyTradesAfterLastSell = allTrades.filter(
                t => t.type === 'buy' && !t.isPaired && t.timestamp > lastSellTimestamp
              );

              const lastUnpairedBuyTimestamp = unpairedBuyTradesAfterLastSell.length > 0
                ? Math.max(...unpairedBuyTradesAfterLastSell.map(t => t.timestamp))
                : null;

              return allTrades.map((trade, idx) => {
                if (!showTradeMarkers) return null;
                if (visibleCandles.length === 0) return null;

                const isTradeInVisibleRange = trade.timestamp >= visibleTimeRangeStart && trade.timestamp <= visibleTimeRangeEnd;

                if (!isTradeInVisibleRange && trade.type === 'buy') {
                  const pairedSellTrade = trade.isPaired
                    ? data.trades.find(t => t.pairId === trade.pairId && t.type === 'sell')
                    : null;

                  const isSellInRange = pairedSellTrade && pairedSellTrade.timestamp >= visibleTimeRangeStart && pairedSellTrade.timestamp <= visibleTimeRangeEnd;

                  if (!isSellInRange) {
                    return null;
                  }
                }

                if (!isTradeInVisibleRange && trade.type === 'sell') {
                  return null;
                }

                let candleIndex = -1;

                if (timeframeMinutes === 1) {
                  candleIndex = visibleCandles.findIndex(c => Math.abs(c.timestamp - trade.timestamp) < 60000);
                } else {
                  const tradePeriod = Math.floor(trade.timestamp / timeframeMs) * timeframeMs;

                  candleIndex = visibleCandles.findIndex(c => {
                    const candlePeriod = Math.floor(c.timestamp / timeframeMs) * timeframeMs;
                    return candlePeriod === tradePeriod;
                  });

                  if (candleIndex === -1) {
                    candleIndex = visibleCandles.findIndex(c => {
                      const candlePeriod = Math.floor(c.timestamp / timeframeMs) * timeframeMs;
                      return trade.timestamp >= candlePeriod && trade.timestamp < candlePeriod + timeframeMs;
                    });
                  }

                  if (candleIndex === -1) {
                    const closestCandle = visibleCandles.reduce((closest, candle, idx) => {
                      const timeDiff = Math.abs(candle.timestamp - trade.timestamp);
                      if (timeDiff < closest.diff && timeDiff < timeframeMs * 1.5) {
                        return { idx, diff: timeDiff };
                      }
                      return closest;
                    }, { idx: -1, diff: Infinity });

                    if (closestCandle.idx !== -1) {
                      candleIndex = closestCandle.idx;
                    }
                  }
                }

                if (candleIndex === -1) {
                  return null;
                }

                const x = candleIndex * (candleWidth + candleGap) + candleWidth / 2;
                const rawY = priceToY(trade.price);
                const y = rawY;
                const isHovered = hoveredTrade?.timestamp === trade.timestamp;

                return (
                  <div
                    key={`${trade.timestamp}-${idx}`}
                    className="absolute pointer-events-auto cursor-pointer"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: isHovered ? 9999 : 50
                    }}
                    onMouseEnter={() => handleTradeMouseEnter(trade, x, y)}
                    onMouseLeave={handleTradeMouseLeave}
                    onClick={(e) => handleTradeClick(trade, e)}
                    onTouchStart={(e) => handleTradeClick(trade, e)}
                  >
                    {trade.type === 'buy' ? (
                      <div className="relative flex items-center justify-center">
                        {!trade.isPaired && lastUnpairedBuyTimestamp === trade.timestamp && (
                          <>
                            <div className="absolute w-12 h-12 bg-[#3b82f6] rounded-full opacity-10 animate-pulse" />
                            <div className="absolute w-10 h-10 bg-[#3b82f6] rounded-full opacity-15 animate-ping" style={{ animationDuration: '2s' }} />
                          </>
                        )}
                        <div className={`absolute w-8 h-8 bg-[#3b82f6] rounded-full opacity-20 ${isHovered ? 'animate-ping' : ''}`} />
                        <div className={`w-6 h-6 bg-[#3b82f6] rounded-full border-2 transition-all ${
                          trade.isPaired
                            ? 'border-white shadow-lg'
                            : 'border-[#60a5fa] shadow-[0_0_15px_rgba(59,130,246,0.6)] shadow-lg'
                        } ${isHovered ? 'scale-125' : ''}`}>
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">B</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative flex items-center justify-center">
                        <div className={`absolute w-8 h-8 bg-[#f59e0b] rounded-full opacity-20 ${isHovered ? 'animate-ping' : ''}`} />
                        <div className={`w-6 h-6 bg-[#f59e0b] rounded-full border-2 border-white shadow-lg transition-all ${isHovered ? 'scale-125 shadow-[#f59e0b]/50' : ''}`}>
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">S</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
            </div>
          </div>

          <div
            className="absolute left-0 w-full border-t border-slate-700/20 cursor-ns-resize hover:border-slate-500/40 transition-colors"
            style={{ top: `${priceChartHeight}px`, zIndex: 30 }}
            onMouseDown={handleResizeMouseDown}
          >
            <div className="absolute inset-x-0 -top-1 h-2" />
          </div>

          <div
            className="absolute left-0"
            style={{
              top: `${priceChartHeight + 8}px`,
              height: '20px',
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: 50
            }}
          >
            <div className="absolute left-0 flex pointer-events-none" style={{ width: '100%', height: '100%' }}>
              {visibleCandles.map((candle, idx) => {
                const showLabel = idx % Math.max(1, Math.floor(50 / candleWidth)) === 0 || idx === hoveredCandleIndex;
                const isHovered = idx === hoveredCandleIndex;

                if (!showLabel || idx === 0) return null;

                const date = new Date(candle.timestamp);
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');

                const timeLabel = timeframe === '1d'
                  ? `${month}-${day}`
                  : `${hours}:${minutes}`;

                const hoverLabel = timeframe === '1d'
                  ? `${month}-${day}`
                  : timeframe === '4h'
                  ? `${month}-${day} ${hours}:${minutes}`
                  : `${hours}:${minutes}`;

                return (
                  <div
                    key={idx}
                    className="absolute text-[10px] font-mono whitespace-nowrap"
                    style={{
                      left: `${idx * (candleWidth + candleGap) + candleWidth / 2}px`,
                      top: '2px',
                      transform: 'translateX(-50%)',
                      zIndex: isHovered ? 100 : 1
                    }}
                  >
                    {isHovered ? (
                      <div className="px-1.5 py-0.5 rounded text-stone-900 text-[11px] font-bold bg-white/95 border border-stone-300 shadow-md pointer-events-auto">
                        {hoverLabel}
                      </div>
                    ) : (
                      <span className="text-stone-700">{timeLabel}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Volume Chart Background */}
          <div
            className="absolute left-0 rounded pointer-events-none"
            style={{
              top: `${priceChartHeight + 28}px`,
              height: `${volumeChartHeight}px`,
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: -1,
              backgroundColor: 'rgba(243, 244, 246, 0.25)',
            }}
          />

          {/* Separator Line Above Volume */}
          <div
            className="absolute left-0 pointer-events-none"
            style={{
              top: `${priceChartHeight + 26}px`,
              height: '2px',
              width: '100%',
              backgroundColor: 'rgba(156, 163, 175, 0.3)',
            }}
          />

          {/* Volume Bars */}
          <div
            className="absolute left-0"
            style={{
              top: `${priceChartHeight + 28}px`,
              height: `${volumeChartHeight}px`,
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: 1
            }}
          >
            <div className="absolute left-0 flex pointer-events-none overflow-hidden" style={{ top: 0, height: '100%', width: '100%' }}>
              {visibleCandles.map((candle, idx) => {
                const volumes = visibleCandles.map(c => c.volume || 0);
                const maxVolume = Math.max(...volumes, 0.001);
                const topPadding = Math.max(5, volumeChartHeight * 0.15);
                const candleVolume = candle.volume || 0;
                const barHeight = (candleVolume / maxVolume) * (volumeChartHeight - topPadding - 10);
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
                      className={`${
                        isGreen ? 'bg-gradient-to-t from-emerald-500/60 to-emerald-400/40' : 'bg-gradient-to-t from-rose-500/60 to-rose-400/40'
                      } ${candle.isPrediction ? 'opacity-20' : 'opacity-80'}`}
                      style={{
                        height: `${barHeight}px`,
                        width: '100%',
                        boxShadow: isGreen ? '0 0 8px rgba(52, 211, 153, 0.3)' : '0 0 8px rgba(251, 113, 133, 0.3)',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {hoveredCandleIndex !== null && (
              <div className="absolute left-2 top-2 text-xs bg-white/90 px-1.5 py-0.5 rounded flex items-center gap-2 pointer-events-none">
                <span className="text-stone-600 font-medium">Volume</span>
                {visibleCandles[hoveredCandleIndex] && (
                  <span className="text-stone-900 font-semibold">
                    {visibleCandles[hoveredCandleIndex].volume.toLocaleString(undefined, { maximumFractionDigits: 2 })} BTC
                  </span>
                )}
              </div>
            )}
          </div>

          {/* MACD Chart Background */}
          <div
            className="absolute left-0 rounded pointer-events-none"
            style={{
              top: `${priceChartHeight + volumeChartHeight + 36}px`,
              height: `${macdChartHeight}px`,
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: -1,
              backgroundColor: 'rgba(239, 246, 255, 0.25)',
            }}
          />

          {/* Separator Line Above MACD */}
          <div
            className="absolute left-0 pointer-events-none"
            style={{
              top: `${priceChartHeight + volumeChartHeight + 34}px`,
              height: '2px',
              width: '100%',
              backgroundColor: 'rgba(156, 163, 175, 0.3)',
            }}
          />

          <div
            className="absolute left-0"
            style={{
              top: `${priceChartHeight + volumeChartHeight + 36}px`,
              height: `${macdChartHeight}px`,
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: 1,
            }}
          >
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {(() => {
                const svgWidth = containerWidth || 1200;
                return [macdData.max, macdData.max / 2, 0, macdData.min / 2, macdData.min].map((value, i) => {
                  const y = macdToY(value);
                  const isZero = value === 0;
                  return (
                    <line
                      key={i}
                      x1="0"
                      y1={y}
                      x2="100%"
                      y2={y}
                      stroke={isZero ? 'rgba(251, 191, 36, 0.2)' : 'rgba(71, 85, 105, 0.08)'}
                      strokeWidth={isZero ? '1.5' : '1'}
                    />
                  );
                });
              })()}

              {visibleCandles.map((candle, idx) => {
                if (candle.histogram === undefined) return null;
                const x = idx * (candleWidth + candleGap) + candleWidth / 2;
                const zeroY = macdToY(0);
                const histY = macdToY(candle.histogram);
                const height = Math.abs(zeroY - histY);
                const isPositive = candle.histogram >= 0;

                return (
                  <rect
                    key={idx}
                    x={x - candleWidth / 2}
                    y={isPositive ? histY : zeroY}
                    width={candleWidth}
                    height={height}
                    fill={isPositive ? 'rgba(45, 212, 191, 0.6)' : 'rgba(251, 146, 60, 0.6)'}
                  />
                );
              })}

              {(() => {
                const macdPoints: string[] = [];
                const signalPoints: string[] = [];

                visibleCandles.forEach((candle, idx) => {
                  const x = idx * (candleWidth + candleGap) + candleWidth / 2;

                  if (candle.macd !== undefined) {
                    const y = macdToY(candle.macd);
                    macdPoints.push(`${x},${y}`);
                  }

                  if (candle.signal !== undefined) {
                    const y = macdToY(candle.signal);
                    signalPoints.push(`${x},${y}`);
                  }
                });

                return (
                  <>
                    {macdPoints.length > 1 && (
                      <polyline
                        points={macdPoints.join(' ')}
                        fill="none"
                        stroke="#2dd4bf"
                        strokeWidth="1.5"
                        opacity="0.95"
                      />
                    )}
                    {signalPoints.length > 1 && (
                      <polyline
                        points={signalPoints.join(' ')}
                        fill="none"
                        stroke="#fb923c"
                        strokeWidth="1.5"
                        opacity="0.95"
                      />
                    )}
                  </>
                );
              })()}
            </svg>
            {hoveredCandleIndex !== null && (
              <div className="absolute left-2 top-2 text-xs bg-white/90 px-1.5 py-0.5 rounded flex items-center gap-2 pointer-events-none">
                <span className="text-stone-600 font-medium">MACD</span>
                {visibleCandles[hoveredCandleIndex] && (
                  <>
                    {visibleCandles[hoveredCandleIndex].macd !== undefined && (
                      <span className="text-blue-600 font-semibold">
                        {visibleCandles[hoveredCandleIndex].macd!.toFixed(2)}
                      </span>
                    )}
                    {visibleCandles[hoveredCandleIndex].signal !== undefined && (
                      <>
                        <span className="text-stone-600">|</span>
                        <span className="text-stone-600 text-[10px]">Signal</span>
                        <span className="text-orange-600 font-semibold">
                          {visibleCandles[hoveredCandleIndex].signal!.toFixed(2)}
                        </span>
                      </>
                    )}
                    {visibleCandles[hoveredCandleIndex].histogram !== undefined && (
                      <>
                        <span className="text-stone-600">|</span>
                        <span className="text-stone-600 text-[10px]">Hist</span>
                        <span className={`font-semibold ${visibleCandles[hoveredCandleIndex].histogram! >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {visibleCandles[hoveredCandleIndex].histogram!.toFixed(2)}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* RSI Chart Background */}
          <div
            className="absolute left-0 rounded pointer-events-none"
            style={{
              top: `${priceChartHeight + volumeChartHeight + macdChartHeight + 44}px`,
              height: `${rsiChartHeight}px`,
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: -1,
              backgroundColor: 'rgba(254, 243, 242, 0.25)',
            }}
          />

          {/* Separator Line Above RSI */}
          <div
            className="absolute left-0 pointer-events-none"
            style={{
              top: `${priceChartHeight + volumeChartHeight + macdChartHeight + 42}px`,
              height: '2px',
              width: '100%',
              backgroundColor: 'rgba(156, 163, 175, 0.3)',
            }}
          />

          <div
            className="absolute left-0"
            style={{
              top: `${priceChartHeight + volumeChartHeight + macdChartHeight + 44}px`,
              height: `${rsiChartHeight}px`,
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: 1,
            }}
          >
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {(() => {
                const svgWidth = containerWidth || 1200;
                return [100, 70, 50, 30, 0].map((value) => {
                  const y = rsiToY(value);
                  const isThreshold = value === 30 || value === 70;
                  const isMid = value === 50;
                  return (
                    <line
                      key={value}
                      x1="0"
                      y1={y}
                      x2="100%"
                      y2={y}
                      stroke={isMid ? 'rgba(251, 191, 36, 0.2)' : isThreshold ? 'rgba(239, 68, 68, 0.15)' : 'rgba(71, 85, 105, 0.08)'}
                      strokeWidth={isMid ? '1.5' : isThreshold ? '1.5' : '1'}
                      strokeDasharray={isThreshold ? '5 3' : '0'}
                    />
                  );
                });
              })()}

              {(() => {
                const rsiPoints: string[] = [];

                visibleCandles.forEach((candle, idx) => {
                  if (candle.rsi === undefined) return;
                  const x = idx * (candleWidth + candleGap) + candleWidth / 2;
                  const y = rsiToY(candle.rsi);
                  rsiPoints.push(`${x},${y}`);
                });

                return (
                  <>
                    {rsiPoints.length > 1 && (
                      <polyline
                        points={rsiPoints.join(' ')}
                        fill="none"
                        stroke="#c084fc"
                        strokeWidth="1.5"
                        opacity="0.95"
                      />
                    )}
                  </>
                );
              })()}
            </svg>
            {hoveredCandleIndex !== null && (
              <div className="absolute left-2 top-2 text-xs bg-white/90 px-1.5 py-0.5 rounded flex items-center gap-2 pointer-events-none">
                <span className="text-stone-600 font-medium">RSI</span>
                {visibleCandles[hoveredCandleIndex] && visibleCandles[hoveredCandleIndex].rsi !== undefined && (
                  <span className={`font-semibold ${
                    visibleCandles[hoveredCandleIndex].rsi! >= 70 ? 'text-rose-600' :
                    visibleCandles[hoveredCandleIndex].rsi! <= 30 ? 'text-emerald-600' :
                    'text-purple-600'
                  }`}>
                    {visibleCandles[hoveredCandleIndex].rsi!.toFixed(1)}
                  </span>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Y-Axis */}
      <div className="w-16 bg-white/80 relative border-l border-stone-200" style={{ height: `${chartHeight}px`, zIndex: 10 }}>
        <div className="relative" style={{ height: `${priceChartHeight}px` }}>
          {Array.from({ length: 6 }).map((_, i) => {
            if (i === 0 || i === 5) return null;
            const price = minPrice + ((maxPrice - minPrice) / 5) * i;
            const y = priceToY(price);
            return (
              <div
                key={i}
                className="absolute right-0 w-full text-left pl-2 text-stone-700 text-[11px]"
                style={{ top: `${y - 6}px` }}
              >
                {price.toFixed(2)}
              </div>
            );
          })}

          {/* Current Price Box */}
          {latestCandle && (
            <div
              className={`absolute left-0 right-0 flex items-center justify-center`}
              style={{ top: `${priceToY(latestCandle.close) - 10}px` }}
            >
              <div
                className={`px-1.5 py-0.5 rounded text-white text-[11px] font-bold ${
                  latestCandle.close >= latestCandle.open
                    ? 'bg-[#0ecb81]'
                    : 'bg-[#f6465d]'
                }`}
              >
                {latestCandle.close.toFixed(2)}
              </div>
            </div>
          )}

          {/* Hovered Price Box */}
          {crosshairPosition && (
            <div
              className="absolute left-0 right-0 flex items-center justify-center z-50"
              style={{ top: `${crosshairPosition.y - 10}px` }}
            >
              <div className="px-1.5 py-0.5 rounded text-stone-900 text-[11px] font-bold bg-white/95 border border-stone-300 shadow-md">
                {yToPrice(crosshairPosition.y).toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Volume Y-Axis */}
        <div className="absolute" style={{ top: `${priceChartHeight + 28}px`, height: `${volumeChartHeight}px`, width: '100%' }}>
          {(() => {
            const maxVolume = Math.max(...visibleCandles.map(c => c.volume));
            const steps = 4;
            return Array.from({ length: steps }).map((_, i) => {
              const volume = (maxVolume / (steps - 1)) * (steps - 1 - i);
              const percentage = i / (steps - 1);
              const topPadding = Math.max(5, volumeChartHeight * 0.15);
              const y = topPadding + (volumeChartHeight - topPadding - 10) * percentage;
              return (
                <div
                  key={i}
                  className="absolute right-0 w-full text-left pl-2 text-stone-700 text-[10px]"
                  style={{ top: `${y - 6}px` }}
                >
                  {volume >= 1000 ? `${(volume / 1000).toFixed(1)}K` : volume.toFixed(0)}
                </div>
              );
            });
          })()}
        </div>

        {/* MACD Y-Axis */}
        <div className="absolute" style={{ top: `${priceChartHeight + volumeChartHeight + 36}px`, height: `${macdChartHeight}px`, width: '100%' }}>
          {[macdData.max, 0, macdData.min].map((value, i) => {
            const y = macdToY(value);
            const displayValue = value === 0 ? 0 : Math.floor(value / 100) * 100;
            return (
              <div
                key={i}
                className="absolute right-0 w-full text-left pl-2 text-stone-700 text-[10px]"
                style={{ top: `${Math.max(0, Math.min(macdChartHeight - 12, y - 6))}px` }}
              >
                {displayValue}
              </div>
            );
          })}
        </div>

        {/* RSI Y-Axis */}
        <div className="absolute" style={{ top: `${priceChartHeight + volumeChartHeight + macdChartHeight + 44}px`, height: `${rsiChartHeight}px`, width: '100%' }}>
          {[70, 30].map((value) => {
            const y = rsiToY(value);
            return (
              <div
                key={value}
                className="absolute right-0 w-full text-left pl-2 text-stone-700 text-[10px]"
                style={{ top: `${y - 6}px` }}
              >
                {value}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );

  if (selectedCandles.length === 0) {
    return (
      <div className="w-full rounded-lg bg-white/60 border border-stone-200 p-8 flex items-center justify-center">
        <div className="text-stone-600 text-sm">차트 데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <>
      {renderTooltip()}
      {isMaximized ? createPortal(
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-stone-100 via-amber-50/30 to-stone-100 overflow-auto">
          {chartContent}
        </div>,
        document.body
      ) : chartContent}
    </>
  );
};
