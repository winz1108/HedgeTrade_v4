import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { DashboardData, TradeEvent, Candle } from '../types/dashboard';

interface PriceChartProps {
  data: DashboardData;
  onTradeHover: (trade: TradeEvent | null) => void;
}

type Timeframe = '1m' | '5m' | '15m' | '1h';

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
  const [candleWidth, setCandleWidth] = useState(10);
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [volumeHeight, setVolumeHeight] = useState(60);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; trade: TradeEvent; hasPairedSell: boolean; pairedTrade?: TradeEvent } | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);
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

  const minCandleWidth = 4;
  const maxCandleWidth = 30;
  const candleGap = 2;
  const minVolumeHeight = 80;
  const maxVolumeHeight = 300;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const baseHeight = isMaximized
    ? window.innerHeight - 120
    : isMobile
      ? Math.min(window.innerHeight * 0.6, 450)
      : 520;

  const priceChartHeight = Math.floor(baseHeight * 0.58);
  const macdChartHeight = Math.floor(baseHeight * 0.18);
  const rsiChartHeight = Math.floor(baseHeight * 0.16);
  const volumeChartHeight = volumeHeight;
  const chartHeight = priceChartHeight + macdChartHeight + rsiChartHeight + volumeChartHeight + 32;

  const candlesByTimeframe = useMemo(() => {
    const base1m = [...data.priceHistory1m, ...data.pricePredictions];

    return {
      '1m': base1m,
      '5m': data.priceHistory5m ? [...data.priceHistory5m, ...data.pricePredictions] : aggregateCandlesToTimeframe(base1m, 5),
      '15m': data.priceHistory15m ? [...data.priceHistory15m, ...data.pricePredictions] : aggregateCandlesToTimeframe(base1m, 15),
      '1h': data.priceHistory1h ? [...data.priceHistory1h, ...data.pricePredictions] : aggregateCandlesToTimeframe(base1m, 60),
    };
  }, [data.priceHistory1m, data.priceHistory5m, data.priceHistory15m, data.priceHistory1h, data.pricePredictions]);

  const selectedCandles = candlesByTimeframe[timeframe];

  const { minPrice, maxPrice, visibleCandles, visibleStartIndex, maxScroll } = useMemo(() => {
    console.log('🎯 PriceChart useMemo triggered');
    console.log('📊 selectedCandles.length:', selectedCandles.length);

    if (selectedCandles.length === 0) {
      console.log('⚠️ No candles available!');
      return { minPrice: 0, maxPrice: 100, visibleCandles: [], visibleStartIndex: 0, maxScroll: 0 };
    }

    console.log('📊 First candle:', selectedCandles[0]);
    console.log('📊 Last candle:', selectedCandles[selectedCandles.length - 1]);

    const chartWidth = containerRef.current?.offsetWidth || (isMobile ? window.innerWidth - 16 : 1200);
    const visibleCount = Math.floor(chartWidth / (candleWidth + candleGap));
    const startIndex = Math.max(0, selectedCandles.length - visibleCount - scrollOffset);
    const endIndex = Math.min(selectedCandles.length, startIndex + visibleCount);
    const visibleCandles = selectedCandles.slice(startIndex, endIndex);

    console.log('👀 Visible candles count:', visibleCandles.length);
    console.log('👀 startIndex:', startIndex, 'endIndex:', endIndex);

    const prices = visibleCandles.flatMap(c => {
      const vals = [c.high, c.low];
      if (c.ema20) vals.push(c.ema20);
      if (c.ema50) vals.push(c.ema50);
      if (c.bb_upper) vals.push(c.bb_upper);
      if (c.bb_lower) vals.push(c.bb_lower);
      return vals;
    });

    const priceRange = Math.max(...prices) - Math.min(...prices);
    const minPrice = Math.min(...prices) - priceRange * 0.1;
    const maxPrice = Math.max(...prices) + priceRange * 0.1;
    const maxScroll = Math.max(0, selectedCandles.length - visibleCount);

    console.log('💰 Price range:', { minPrice, maxPrice });

    return { minPrice, maxPrice, visibleCandles, visibleStartIndex: startIndex, maxScroll };
  }, [selectedCandles, scrollOffset, candleWidth]);

  const priceToY = (price: number) => {
    return ((maxPrice - price) / (maxPrice - minPrice)) * priceChartHeight;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.deltaY !== 0) {
      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const newWidth = Math.max(minCandleWidth, Math.min(maxCandleWidth, candleWidth * zoomFactor));

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
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    isResizing.current = false;
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

    const preventNavigation = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    container.addEventListener('wheel', preventNavigation, { passive: false });

    return () => {
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
  const priceChangePercent = latestCandle && firstCandle ? (priceChange / firstCandle.open) * 100 : 0;

  const renderTooltip = () => {
    if (!tooltipPosition) return null;

    const { x, y, trade, hasPairedSell, pairedTrade } = tooltipPosition;

    const isMobileView = window.innerWidth < 768;

    if (isMobileView) {
      return createPortal(
        <div
          className="fixed left-2 right-2 bottom-4 bg-[#1e2329] border-2 border-[#0ecb81] text-white text-xs rounded-lg p-4 shadow-2xl max-h-[70vh] overflow-y-auto"
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

            {trade.prediction ? (
              <>
                <div className="mb-3">
                  <div className="text-slate-500 text-[10px] mb-2 font-semibold">익절 확률 (Take Profit Probability)</div>
                  <div className="space-y-1.5 bg-slate-800/50 p-2 rounded">
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-400">매수시 익절확률</span>
                      <span className="text-[#0ecb81] font-semibold">{data.holding.initialTakeProfitProb ? (data.holding.initialTakeProfitProb * 100).toFixed(1) : (trade.prediction.takeProfitProb * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-400">현재 익절확률</span>
                      <span className="text-[#0ecb81] font-semibold">
                        {data.currentPrediction?.takeProfitProb
                          ? (data.currentPrediction.takeProfitProb * 100).toFixed(1)
                          : data.holding.currentTakeProfitProb
                            ? (data.holding.currentTakeProfitProb * 100).toFixed(1)
                            : (trade.prediction.takeProfitProb * 100).toFixed(1)}%
                      </span>
                    </div>
                    {data.lastPredictionUpdateTime && (
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-400">익절확률 업데이트</span>
                        <span className="text-slate-300 text-[10px]">
                          {new Date(data.lastPredictionUpdateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-400">예상 익절가</span>
                      <span className="text-white font-semibold">${trade.prediction.expectedTakeProfitPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-400">예상 손절가</span>
                      <span className="text-white font-semibold">${trade.prediction.expectedStopLossPrice.toFixed(2)}</span>
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
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-400">마지막 업데이트</span>
                      <span className="text-slate-300 text-[10px]">
                        {new Date(data.currentTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    {data.currentPrice >= trade.prediction.expectedTakeProfitPrice ? (
                      <div className="text-[#0ecb81] text-center py-1 bg-[#0ecb81]/10 rounded mt-2 font-semibold">
                        ✓ 익절 달성
                      </div>
                    ) : data.currentPrice <= trade.prediction.expectedStopLossPrice ? (
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
              <div>
                <div className="space-y-1.5 bg-slate-800/50 p-2 rounded">
                  <div className="flex justify-between gap-6">
                    <span className="text-slate-400">현재가</span>
                    <span className="text-white font-semibold">${data.currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-slate-400">현재 수익률</span>
                    <span className={`font-semibold ${((data.currentPrice - trade.price) / trade.price * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                      {((data.currentPrice - trade.price) / trade.price * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-slate-400">보유 시간</span>
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
          </>
        ) : (
          <>
            <div className="font-bold mb-3 text-sm flex items-center gap-2 text-[#3b82f6]">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              보유 중
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">매수가</span>
                <span className="text-white font-semibold">${trade.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">현재가</span>
                <span className="text-white font-semibold">${data.currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">현재 수익률</span>
                <span className={`font-bold ${((data.currentPrice - trade.price) / trade.price * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {((data.currentPrice - trade.price) / trade.price * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">보유 시간</span>
                <span className="text-slate-300 text-[10px]">
                  {Math.floor((data.currentTime - trade.timestamp) / 60000)}분
                </span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">마지막 업데이트</span>
                <span className="text-slate-300 text-[10px]">
                  {new Date(data.currentTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>

            {trade.prediction && (
              <div>
                <div className="text-slate-500 text-[10px] mb-2 font-semibold">익절 확률</div>
                <div className="space-y-1.5 bg-slate-800/50 p-2 rounded text-[10px]">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">매수시</span>
                    <span className="text-[#0ecb81]">{data.holding.initialTakeProfitProb ? (data.holding.initialTakeProfitProb * 100).toFixed(1) : (trade.prediction.takeProfitProb * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">현재</span>
                    <span className="text-[#0ecb81]">
                      {data.currentPrediction && data.currentPrediction.takeProfitProb !== undefined
                        ? (data.currentPrediction.takeProfitProb * 100).toFixed(1)
                        : data.holding.currentTakeProfitProb
                          ? (data.holding.currentTakeProfitProb * 100).toFixed(1)
                          : (trade.prediction.takeProfitProb * 100).toFixed(1)}%
                    </span>
                  </div>
                  {data.lastPredictionUpdateTime && (
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">업데이트</span>
                      <span className="text-slate-300 text-[9px]">
                        {new Date(data.lastPredictionUpdateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  )}
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
        className="fixed bg-[#1e2329] border-2 border-[#0ecb81] text-white text-xs rounded-lg p-4 shadow-2xl pointer-events-none max-h-[600px] overflow-y-auto"
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

            {trade.prediction ? (
              <>
                <div className="mb-3">
                  <div className="text-slate-500 text-[10px] mb-2 font-semibold">익절 확률 (Take Profit Probability)</div>
                  <div className="space-y-1.5 bg-slate-800/50 p-2 rounded">
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-400">매수시 익절확률</span>
                      <span className="text-[#0ecb81] font-semibold">{data.holding.initialTakeProfitProb ? (data.holding.initialTakeProfitProb * 100).toFixed(1) : (trade.prediction.takeProfitProb * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-400">현재 익절확률</span>
                      <span className="text-[#0ecb81] font-semibold">
                        {data.currentPrediction?.takeProfitProb
                          ? (data.currentPrediction.takeProfitProb * 100).toFixed(1)
                          : data.holding.currentTakeProfitProb
                            ? (data.holding.currentTakeProfitProb * 100).toFixed(1)
                            : (trade.prediction.takeProfitProb * 100).toFixed(1)}%
                      </span>
                    </div>
                    {data.lastPredictionUpdateTime && (
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-400">익절확률 업데이트</span>
                        <span className="text-slate-300 text-[10px]">
                          {new Date(data.lastPredictionUpdateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-400">예상 익절가</span>
                      <span className="text-white font-semibold">${trade.prediction.expectedTakeProfitPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-400">예상 손절가</span>
                      <span className="text-white font-semibold">${trade.prediction.expectedStopLossPrice.toFixed(2)}</span>
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
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-400">마지막 업데이트</span>
                      <span className="text-slate-300 text-[10px]">
                        {new Date(data.currentTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    {data.currentPrice >= trade.prediction.expectedTakeProfitPrice ? (
                      <div className="text-[#0ecb81] text-center py-1 bg-[#0ecb81]/10 rounded mt-2 font-semibold">
                        ✓ 익절 달성
                      </div>
                    ) : data.currentPrice <= trade.prediction.expectedStopLossPrice ? (
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
              <div>
                <div className="space-y-1.5 bg-slate-800/50 p-2 rounded">
                  <div className="flex justify-between gap-6">
                    <span className="text-slate-400">현재가</span>
                    <span className="text-white font-semibold">${data.currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-slate-400">현재 수익률</span>
                    <span className={`font-semibold ${((data.currentPrice - trade.price) / trade.price * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                      {((data.currentPrice - trade.price) / trade.price * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-slate-400">보유 시간</span>
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
          </>
        ) : (
          <>
            <div className="font-bold mb-3 text-sm flex items-center gap-2 text-[#3b82f6]">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              보유 중
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">매수가</span>
                <span className="text-white font-semibold">${trade.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">현재가</span>
                <span className="text-white font-semibold">${data.currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">현재 수익률</span>
                <span className={`font-bold ${((data.currentPrice - trade.price) / trade.price * 100) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {((data.currentPrice - trade.price) / trade.price * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">보유 시간</span>
                <span className="text-slate-300 text-[10px]">
                  {Math.floor((data.currentTime - trade.timestamp) / 60000)}분
                </span>
              </div>
              <div className="flex justify-between gap-6 bg-slate-800/50 p-2 rounded">
                <span className="text-slate-400">마지막 업데이트</span>
                <span className="text-slate-300 text-[10px]">
                  {new Date(data.currentTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>

            {trade.prediction && (
              <div>
                <div className="text-slate-500 text-[10px] mb-2 font-semibold">익절 확률</div>
                <div className="space-y-1.5 bg-slate-800/50 p-2 rounded text-[10px]">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">매수시</span>
                    <span className="text-[#0ecb81]">{data.holding.initialTakeProfitProb ? (data.holding.initialTakeProfitProb * 100).toFixed(1) : (trade.prediction.takeProfitProb * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">현재</span>
                    <span className="text-[#0ecb81]">
                      {data.currentPrediction && data.currentPrediction.takeProfitProb !== undefined
                        ? (data.currentPrediction.takeProfitProb * 100).toFixed(1)
                        : data.holding.currentTakeProfitProb
                          ? (data.holding.currentTakeProfitProb * 100).toFixed(1)
                          : (trade.prediction.takeProfitProb * 100).toFixed(1)}%
                    </span>
                  </div>
                  {data.lastPredictionUpdateTime && (
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">업데이트</span>
                      <span className="text-slate-300 text-[9px]">
                        {new Date(data.lastPredictionUpdateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  )}
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
      case '1h': return 60;
    }
  };

  const chartContent = (
    <div className={`bg-[#161a1e] rounded-lg shadow-2xl border border-slate-800 w-full ${isMaximized ? 'h-screen' : ''}`}>
      <div className="bg-[#1e2329] px-2 sm:px-4 py-2 flex items-center justify-between border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white">BTC/USDC</h2>
            {latestCandle && (
              <>
                <div className="text-base sm:text-lg font-bold text-white">
                  ${latestCandle.close.toFixed(2)}
                </div>
                <div className={`text-xs font-semibold px-1.5 py-0.5 rounded ${priceChange >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="hidden sm:flex items-center gap-2 text-[10px] bg-[#2b3139]/50 px-2 py-1 rounded">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-orange-500 rounded"></div>
              <span className="text-slate-400">EMA20</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
              <span className="text-slate-400">EMA50</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-gray-500 border-t border-dashed border-gray-500"></div>
              <span className="text-slate-400">BB</span>
            </div>
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
      </div>

      <div
        ref={containerRef}
        className="relative bg-[#0b0e11] select-none flex-shrink-0 w-full"
        style={{
          height: `${chartHeight}px`,
          overflow: 'hidden',
          touchAction: 'pan-x pan-y',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}
        onWheel={handleWheel}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >

        <div className="absolute inset-0 overflow-hidden">
          {/* OHLC Display */}
          {hoveredCandle && (
            <div className="absolute left-3 top-3 z-10 flex items-center gap-3 text-xs bg-black/60 backdrop-blur-sm px-3 py-2 rounded border border-slate-700/50">
              <span className="text-slate-400">O <span className="text-white font-semibold">{hoveredCandle.open.toFixed(2)}</span></span>
              <span className="text-slate-400">H <span className="text-[#0ecb81] font-semibold">{hoveredCandle.high.toFixed(2)}</span></span>
              <span className="text-slate-400">L <span className="text-[#f6465d] font-semibold">{hoveredCandle.low.toFixed(2)}</span></span>
              <span className="text-slate-400">C <span className="text-white font-semibold">{hoveredCandle.close.toFixed(2)}</span></span>
            </div>
          )}
          <svg className="absolute top-0 left-0 w-full" height={priceChartHeight} style={{ pointerEvents: 'none', zIndex: 1 }}>
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

            {(() => {
              const ema20Points: string[] = [];
              const ema50Points: string[] = [];
              const bbUpperPoints: string[] = [];
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

                if (candle.bb_upper !== undefined) {
                  const y = priceToY(candle.bb_upper);
                  bbUpperPoints.push(`${x},${y}`);
                }

                if (candle.bb_lower !== undefined) {
                  const y = priceToY(candle.bb_lower);
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
                        stroke="rgba(100, 100, 100, 0.5)"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                      <polyline
                        points={bbLowerPoints.join(' ')}
                        fill="none"
                        stroke="rgba(100, 100, 100, 0.5)"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    </>
                  )}

                  {ema20Points.length > 1 && (
                    <polyline
                      points={ema20Points.join(' ')}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2"
                      opacity="0.8"
                    />
                  )}

                  {ema50Points.length > 1 && (
                    <polyline
                      points={ema50Points.join(' ')}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      opacity="0.8"
                    />
                  )}
                </>
              );
            })()}

          </svg>

          <div
            className="absolute top-0 left-0 flex cursor-crosshair overflow-visible"
            style={{
              height: `${chartHeight}px`,
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: 5,
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
                    className={isGreen ? 'bg-[#0ecb81]' : 'bg-[#f6465d]'}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: `${highY}px`,
                      height: `${wickHeight}px`,
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
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  opacity="0.6"
                />
              </svg>
            )}

            <div className="absolute top-0 left-0 pointer-events-none" style={{ height: `${priceChartHeight}px`, width: `${visibleCandles.length * (candleWidth + candleGap)}px`, overflow: 'visible', zIndex: 20 }}>
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

              return allTrades.map((trade, idx) => {
                const timeframeMinutes = getTimeframeMinutes(timeframe);
                const timeframeMs = timeframeMinutes * 60000;

                let candleIndex = -1;

                if (timeframeMinutes === 1) {
                  candleIndex = visibleCandles.findIndex(c => Math.abs(c.timestamp - trade.timestamp) < 60000);

                  // If not found in 1m, find the nearest candle
                  if (candleIndex === -1) {
                    let minDiff = Infinity;
                    visibleCandles.forEach((c, i) => {
                      const diff = Math.abs(c.timestamp - trade.timestamp);
                      if (diff < minDiff) {
                        minDiff = diff;
                        candleIndex = i;
                      }
                    });
                  }
                } else {
                  candleIndex = visibleCandles.findIndex(c => {
                    const candlePeriod = Math.floor(c.timestamp / timeframeMs) * timeframeMs;
                    const tradePeriod = Math.floor(trade.timestamp / timeframeMs) * timeframeMs;
                    return candlePeriod === tradePeriod;
                  });

                  // If not found, find the nearest candle in the same timeframe period
                  if (candleIndex === -1) {
                    let minDiff = Infinity;
                    visibleCandles.forEach((c, i) => {
                      const diff = Math.abs(c.timestamp - trade.timestamp);
                      if (diff < minDiff) {
                        minDiff = diff;
                        candleIndex = i;
                      }
                    });
                  }
                }

                if (candleIndex === -1 || visibleCandles.length === 0) return null;

                const x = candleIndex * (candleWidth + candleGap) + candleWidth / 2;
                const y = priceToY(trade.price);
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
                        {!trade.isPaired && (
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
            className="absolute left-0 w-full border-t-2 border-slate-600 cursor-ns-resize hover:border-slate-400 transition-colors"
            style={{ top: `${priceChartHeight}px`, zIndex: 30 }}
            onMouseDown={handleResizeMouseDown}
          >
            <div className="absolute inset-x-0 -top-1 h-2" />
          </div>

          <div
            className="absolute left-0 bg-slate-800/40 rounded-lg border border-slate-700/30"
            style={{
              top: `${priceChartHeight + 8}px`,
              height: `${volumeChartHeight}px`,
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: 1
            }}
          >
            <div className="absolute left-0 flex px-2 py-1 pointer-events-none overflow-hidden" style={{ top: 0, height: '100%', width: '100%' }}>
              {visibleCandles.map((candle, idx) => {
                const maxVolume = Math.max(...visibleCandles.map(c => c.volume));
                const topPadding = Math.max(5, volumeChartHeight * 0.15);
                const barHeight = (candle.volume / maxVolume) * (volumeChartHeight - topPadding - 10);
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

            <div className="absolute left-2 top-2 text-xs bg-slate-900/80 px-2 py-1 rounded flex items-center gap-2 pointer-events-none">
              <span className="text-slate-400 font-medium">Volume</span>
              {hoveredCandleIndex !== null && visibleCandles[hoveredCandleIndex] && (
                <span className="text-slate-300 font-semibold">
                  {visibleCandles[hoveredCandleIndex].volume.toLocaleString(undefined, { maximumFractionDigits: 2 })} BTC
                </span>
              )}
            </div>
          </div>

          <div
            className="absolute left-0 bg-slate-800/40 rounded-lg border border-slate-700/30"
            style={{
              top: `${priceChartHeight + volumeChartHeight + 16}px`,
              height: `${macdChartHeight}px`,
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: 1
            }}
          >
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {[macdData.max, macdData.max / 2, 0, macdData.min / 2, macdData.min].map((value, i) => {
                const y = macdToY(value);
                const isZero = value === 0;
                return (
                  <g key={i}>
                    <line
                      x1="0"
                      y1={y}
                      x2="100%"
                      y2={y}
                      stroke={isZero ? 'rgba(255, 255, 255, 0.3)' : 'rgba(43, 49, 57, 0.5)'}
                      strokeWidth="1"
                    />
                    <text
                      x="10"
                      y={Math.max(12, Math.min(macdChartHeight - 4, y + 3))}
                      fill="#848e9c"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {value.toFixed(2)}
                    </text>
                  </g>
                );
              })}

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
                    fill={isPositive ? 'rgba(14, 203, 129, 0.5)' : 'rgba(246, 70, 93, 0.5)'}
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
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        opacity="0.9"
                      />
                    )}
                    {signalPoints.length > 1 && (
                      <polyline
                        points={signalPoints.join(' ')}
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="1.5"
                        opacity="0.9"
                      />
                    )}
                  </>
                );
              })()}
            </svg>
            <div className="absolute left-2 top-2 text-xs bg-slate-900/80 px-2 py-1 rounded flex items-center gap-2 pointer-events-none">
              <span className="text-slate-400 font-medium">MACD</span>
              {hoveredCandleIndex !== null && visibleCandles[hoveredCandleIndex] && (
                <>
                  {visibleCandles[hoveredCandleIndex].macd !== undefined && (
                    <span className="text-blue-400 font-semibold">
                      {visibleCandles[hoveredCandleIndex].macd!.toFixed(2)}
                    </span>
                  )}
                  {visibleCandles[hoveredCandleIndex].signal !== undefined && (
                    <>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-500 text-[10px]">Signal</span>
                      <span className="text-orange-400 font-semibold">
                        {visibleCandles[hoveredCandleIndex].signal!.toFixed(2)}
                      </span>
                    </>
                  )}
                  {visibleCandles[hoveredCandleIndex].histogram !== undefined && (
                    <>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-500 text-[10px]">Hist</span>
                      <span className={`font-semibold ${visibleCandles[hoveredCandleIndex].histogram! >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {visibleCandles[hoveredCandleIndex].histogram!.toFixed(2)}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div
            className="absolute left-0 bg-slate-800/40 rounded-lg border border-slate-700/30"
            style={{
              top: `${priceChartHeight + volumeChartHeight + macdChartHeight + 24}px`,
              height: `${rsiChartHeight}px`,
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: 1
            }}
          >
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {[100, 70, 50, 30, 0].map((value) => {
                const y = rsiToY(value);
                const isThreshold = value === 30 || value === 70;
                const isMid = value === 50;
                return (
                  <g key={value}>
                    <line
                      x1="0"
                      y1={y}
                      x2="100%"
                      y2={y}
                      stroke={isMid ? 'rgba(255, 255, 255, 0.4)' : isThreshold ? 'rgba(255, 255, 255, 0.15)' : 'rgba(43, 49, 57, 0.5)'}
                      strokeWidth={isMid ? '1.5' : '1'}
                      strokeDasharray={isThreshold ? '4 2' : '0'}
                    />
                    <text
                      x="10"
                      y={value === 0 ? y - 2 : value === 100 ? y + 10 : y + 3}
                      fill="#848e9c"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

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
                        stroke="#a855f7"
                        strokeWidth="2"
                        opacity="0.9"
                      />
                    )}
                  </>
                );
              })()}
            </svg>
            <div className="absolute left-2 top-2 text-xs bg-slate-900/80 px-2 py-1 rounded flex items-center gap-2 pointer-events-none">
              <span className="text-slate-400 font-medium">RSI</span>
              {hoveredCandleIndex !== null && visibleCandles[hoveredCandleIndex] && visibleCandles[hoveredCandleIndex].rsi !== undefined && (
                <span className={`font-semibold ${
                  visibleCandles[hoveredCandleIndex].rsi! >= 70 ? 'text-rose-400' :
                  visibleCandles[hoveredCandleIndex].rsi! <= 30 ? 'text-emerald-400' :
                  'text-purple-400'
                }`}>
                  {visibleCandles[hoveredCandleIndex].rsi!.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          <div
            className="absolute left-0 bg-slate-800/40 rounded-lg border border-slate-700/30"
            style={{
              top: `${priceChartHeight + volumeChartHeight + macdChartHeight + rsiChartHeight + 32}px`,
              height: '24px',
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: 1
            }}
          >
            <div className="absolute left-0 flex pointer-events-none" style={{ width: '100%', height: '100%' }}>
              {visibleCandles.map((candle, idx) => {
                const showLabel = idx % Math.max(1, Math.floor(20 / candleWidth)) === 0 || idx === hoveredCandleIndex;
                const isHovered = idx === hoveredCandleIndex;

                if (!showLabel) return null;

                const date = new Date(candle.timestamp);
                const timeLabel = date.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                });

                return (
                  <div
                    key={idx}
                    className="absolute text-[10px] font-mono whitespace-nowrap"
                    style={{
                      left: `${idx * (candleWidth + candleGap)}px`,
                      top: '4px',
                      color: isHovered ? '#ffffff' : '#848e9c',
                      fontWeight: isHovered ? 'bold' : 'normal',
                      backgroundColor: isHovered ? 'rgba(14, 203, 129, 0.2)' : 'transparent',
                      padding: isHovered ? '2px 4px' : '0',
                      borderRadius: isHovered ? '2px' : '0',
                    }}
                  >
                    {timeLabel}
                  </div>
                );
              })}
            </div>
          </div>

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
