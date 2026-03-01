import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Eye, EyeOff, ChevronsRight } from 'lucide-react';
import { DashboardData, TradeEvent, Candle } from '../types/dashboard';
import { formatLocalTime, formatChartTime } from '../utils/time';
import { websocketService } from '../services/websocket';

interface PriceChartProps {
  data: DashboardData;
  onTradeHover: (trade: TradeEvent | null) => void;
  onTimeframeChange?: (timeframe: string) => void;
  darkMode?: boolean;
}

type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

function deduplicateCandles(candles: Candle[]): Candle[] {
  const candleMap = new Map<number, Candle>();

  for (const candle of candles) {
    const existing = candleMap.get(candle.timestamp);

    if (!existing) {
      candleMap.set(candle.timestamp, candle);
    } else {
      if (candle.isComplete === false) {
        candleMap.set(candle.timestamp, candle);
      }
    }
  }

  return Array.from(candleMap.values()).sort((a, b) => a.timestamp - b.timestamp);
}

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

export const PriceChart = ({ data: rawData, onTradeHover, onTimeframeChange, darkMode = false }: PriceChartProps) => {
  // 거래 데이터는 이미 상위 컴포넌트에서 필터링됨 (KrakenPriceChart 등)
  const data = useMemo(() => {
    return rawData;
  }, [rawData]);

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

  const colors = darkMode ? {
    chartBg: 'bg-slate-800/95',
    chartBorder: 'border-slate-700',
    headerBg: 'bg-slate-800/90',
    headerBorder: 'border-slate-700',
    buttonBg: 'bg-slate-700/60',
    buttonHover: 'hover:bg-slate-600/70',
    buttonActive: 'bg-blue-600/90',
    buttonActiveHover: 'hover:bg-blue-500',
    textPrimary: 'text-white',
    textSecondary: 'text-slate-300',
    tooltipBg: 'bg-slate-800/95',
    tooltipBorder: 'border-slate-600',
    panelBg: 'bg-slate-700/30',
    panelBorder: 'border-slate-600',
    emaShort: '#22d3ee',
    emaLong: '#fb923c',
    bb: '#a78bfa',
  } : {
    chartBg: 'bg-white/60',
    chartBorder: 'border-stone-200',
    headerBg: 'bg-white/80',
    headerBorder: 'border-stone-200',
    buttonBg: 'bg-stone-200/60',
    buttonHover: 'hover:bg-stone-300/70',
    buttonActive: 'bg-blue-500/90',
    buttonActiveHover: 'hover:bg-blue-600',
    textPrimary: 'text-slate-800',
    textSecondary: 'text-slate-600',
    tooltipBg: 'bg-white/95',
    tooltipBorder: 'border-slate-300',
    panelBg: 'bg-white/80',
    panelBorder: 'border-slate-200',
    emaShort: '#3b82f6',
    emaLong: '#f59e0b',
    bb: '#8b5cf6',
  };
  const minVolumeHeight = 80;
  const maxVolumeHeight = 300;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const baseHeight = isMaximized
    ? window.innerHeight - 120
    : isMobile
      ? Math.min(window.innerHeight * 0.6, 450)
      : 590;

  const macdChartHeight = Math.floor(baseHeight * 0.16);
  const adxChartHeight = Math.floor(baseHeight * 0.16);
  const volumeChartHeight = volumeHeight;
  const fixedHeight = macdChartHeight + adxChartHeight + 32;
  const priceChartHeight = Math.floor(baseHeight - fixedHeight - volumeChartHeight);
  const chartHeight = baseHeight;

  const candlesByTimeframe = useMemo(() => {
    const validHistory1m = Array.isArray(data.priceHistory1m) ? data.priceHistory1m : [];
    const validPredictions = Array.isArray(data.pricePredictions) ? data.pricePredictions : [];
    const base1m = deduplicateCandles([...validHistory1m, ...validPredictions]);

    const result = {
      '1m': base1m,
      '5m': data.priceHistory5m ? deduplicateCandles([...data.priceHistory5m]) : aggregateCandlesToTimeframe(base1m, 5),
      '15m': data.priceHistory15m ? deduplicateCandles([...data.priceHistory15m]) : aggregateCandlesToTimeframe(base1m, 15),
      '30m': data.priceHistory30m ? deduplicateCandles([...data.priceHistory30m]) : aggregateCandlesToTimeframe(base1m, 30),
      '1h': data.priceHistory1h ? deduplicateCandles([...data.priceHistory1h]) : aggregateCandlesToTimeframe(base1m, 60),
      '4h': data.priceHistory4h ? deduplicateCandles([...data.priceHistory4h]) : aggregateCandlesToTimeframe(base1m, 240),
      '1d': data.priceHistory1d ? deduplicateCandles([...data.priceHistory1d]) : aggregateCandlesToTimeframe(base1m, 1440),
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
      // 백엔드 필드명: ema_short, ema_long
      if (c.ema_short) vals.push(c.ema_short);
      if (c.ema_long) vals.push(c.ema_long);
      if (c.ema3) vals.push(c.ema3);
      if (c.ema8) vals.push(c.ema8);
      // BB 필드명: bb_upper, bb_mid, bb_lower
      if (c.bb_upper) vals.push(c.bb_upper);
      if (c.bb_mid) vals.push(c.bb_mid);
      if (c.bb_lower) vals.push(c.bb_lower);
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
    // 백엔드 실제 필드명: macd, signal, histogram (API_SPEC.md 기준)
    // 레거시 필드명도 폴백으로 지원: macd_line, macd_signal, macd_hist
    const macdValues = visibleCandles.map(c => c.macd ?? c.macd_line).filter((v): v is number => v !== undefined);
    const signalValues = visibleCandles.map(c => c.signal ?? c.macd_signal).filter((v): v is number => v !== undefined);
    const histogramValues = visibleCandles.map(c => c.histogram ?? c.macd_hist).filter((v): v is number => v !== undefined);

    if (macdValues.length === 0) return { min: -1, max: 1 };

    const allValues = [...macdValues, ...signalValues, ...histogramValues];
    const absMax = Math.max(Math.abs(Math.min(...allValues)), Math.abs(Math.max(...allValues))) * 1.2;
    return {
      min: -absMax,
      max: absMax
    };
  }, [visibleCandles]);

  const adxData = useMemo(() => {
    return { min: 0, max: 100 };
  }, []);

  const macdPadding = 12;
  const adxPadding = 16;

  const macdToY = (value: number) => {
    const plotHeight = macdChartHeight - (macdPadding * 2);
    return macdPadding + ((macdData.max - value) / (macdData.max - macdData.min)) * plotHeight;
  };

  const adxToY = (value: number) => {
    const plotHeight = adxChartHeight - (adxPadding * 2);
    return adxPadding + ((adxData.max - value) / (adxData.max - adxData.min)) * plotHeight;
  };

  const handleZoomIn = () => {
    setCandleWidth(prev => Math.min(maxCandleWidth, prev + 2));
  };

  const handleZoomOut = () => {
    setCandleWidth(prev => Math.max(minCandleWidth, prev - 2));
  };

  const handleResetScroll = () => {
    setScrollOffset(0);
    setResetScroll(prev => prev + 1);
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
    if (scrollOffset > 0 && scrollOffset < 5) {
      setScrollOffset(0);
    }
  }, [scrollOffset]);

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

    const isShort = trade.side === 'SHORT';
    const entryLabel = isShort ? 'SHORT 진입가' : 'LONG 진입가';
    const exitLabel = isShort ? 'SHORT 청산가' : 'LONG 청산가';
    const directionColor = isShort ? 'text-orange-500' : 'text-cyan-500';
    const directionDot = isShort ? 'bg-orange-500' : 'bg-cyan-500';
    const signalLabel = isShort ? `SHORT 진입 @ $${typeof trade.price === 'number' ? trade.price.toFixed(2) : '-'}` : `LONG 진입 @ $${typeof trade.price === 'number' ? trade.price.toFixed(2) : '-'}`;

    const calcProfit = (entryPrice: number, exitPrice: number, side?: 'LONG' | 'SHORT') => {
      if (!entryPrice || !exitPrice) return 0;
      if (side === 'SHORT') return (entryPrice - exitPrice) / entryPrice * 100;
      return (exitPrice - entryPrice) / entryPrice * 100;
    };

    const calcCurrentProfit = (entryPrice: number, currentPrice: number, side?: 'LONG' | 'SHORT') => {
      if (!entryPrice || !currentPrice) return 0;
      if (side === 'SHORT') return (entryPrice - currentPrice) / entryPrice * 100;
      return (currentPrice - entryPrice) / entryPrice * 100;
    };

    const renderTooltipContent = () => (
      <>
        {!hasPairedSell ? (
          <>
            <div className={`font-bold mb-3 text-sm flex items-center gap-2 ${directionColor}`}>
              <div className={`w-2 h-2 rounded-full ${directionDot}`} />
              {signalLabel}
            </div>
            <div className={`space-y-1.5 ${colors.panelBg} border ${colors.panelBorder} p-2 rounded`}>
              <div className="flex justify-between gap-6">
                <span className={colors.textSecondary}>현재가</span>
                <span className={`${colors.textPrimary} font-semibold`}>${typeof data.currentPrice === 'number' ? data.currentPrice.toFixed(2) : '-'}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className={colors.textSecondary}>현재 수익률</span>
                {(() => {
                  const ep = data.holding.buyPrice || trade.price;
                  const pct = calcCurrentProfit(ep, data.currentPrice, trade.side);
                  return <span className={`font-semibold ${pct >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>;
                })()}
              </div>
              <div className="flex justify-between gap-6">
                <span className={colors.textSecondary}>보유 시간</span>
                <span className={`${colors.textSecondary} text-[10px]`}>{Math.floor((data.currentTime - trade.timestamp) / 60000)}분</span>
              </div>
            </div>
          </>
        ) : pairedTrade ? (
          <>
            <div className={`font-bold mb-3 text-sm flex items-center gap-2 ${directionColor}`}>
              <div className={`w-2 h-2 rounded-full ${directionDot}`} />
              거래 완료 {isShort ? '(SHORT)' : '(LONG)'}
            </div>
            <div className="space-y-2">
              <div className={`flex justify-between gap-6 ${colors.panelBg} border ${colors.panelBorder} p-2 rounded`}>
                <span className={colors.textSecondary}>{entryLabel}</span>
                <span className={`${colors.textPrimary} font-semibold`}>${typeof trade.price === 'number' ? trade.price.toFixed(2) : '-'}</span>
              </div>
              <div className={`flex justify-between gap-6 ${colors.panelBg} border ${colors.panelBorder} p-2 rounded`}>
                <span className={colors.textSecondary}>{exitLabel}</span>
                <span className={`${colors.textPrimary} font-semibold`}>${typeof pairedTrade.price === 'number' ? pairedTrade.price.toFixed(2) : '-'}</span>
              </div>
              <div className={`flex justify-between gap-6 ${colors.panelBg} border ${colors.panelBorder} p-2 rounded`}>
                <span className={colors.textSecondary}>수익률</span>
                {(() => {
                  const pct = typeof pairedTrade.profit === 'number' ? pairedTrade.profit : calcProfit(trade.price, pairedTrade.price, trade.side);
                  return <span className={`font-bold ${pct >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>;
                })()}
              </div>
              {pairedTrade.exitReason && (
                <div className={`flex justify-between gap-6 ${colors.panelBg} border ${colors.panelBorder} p-2 rounded`}>
                  <span className={colors.textSecondary}>청산 이유</span>
                  <span className={`${colors.textPrimary} font-semibold`}>{pairedTrade.exitReason}</span>
                </div>
              )}
              <div className={`flex justify-between gap-6 ${colors.panelBg} border ${colors.panelBorder} p-2 rounded`}>
                <span className={colors.textSecondary}>보유 시간</span>
                <span className={`${colors.textSecondary} text-[10px]`}>{Math.floor((pairedTrade.timestamp - trade.timestamp) / 60000)}분</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={`font-bold mb-3 text-sm flex items-center gap-2 ${directionColor}`}>
              <div className={`w-2 h-2 rounded-full ${directionDot}`} />
              보유 중 {isShort ? '(SHORT)' : '(LONG)'}
            </div>
            <div className="space-y-2 mb-3">
              <div className={`flex justify-between gap-6 ${colors.panelBg} border ${colors.panelBorder} p-2 rounded`}>
                <span className={colors.textSecondary}>{entryLabel}</span>
                <span className={`${colors.textPrimary} font-semibold`}>${typeof trade.price === 'number' ? trade.price.toFixed(2) : '-'}</span>
              </div>
              <div className={`flex justify-between gap-6 ${colors.panelBg} border ${colors.panelBorder} p-2 rounded`}>
                <span className={colors.textSecondary}>현재가</span>
                <span className={`${colors.textPrimary} font-semibold`}>${typeof data.currentPrice === 'number' ? data.currentPrice.toFixed(2) : '-'}</span>
              </div>
              <div className={`flex justify-between gap-6 ${colors.panelBg} border ${colors.panelBorder} p-2 rounded`}>
                <span className={colors.textSecondary}>현재 수익률</span>
                {(() => {
                  const pct = calcCurrentProfit(trade.price, data.currentPrice, trade.side);
                  return <span className={`font-bold ${pct >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>;
                })()}
              </div>
              <div className={`flex justify-between gap-6 ${colors.panelBg} border ${colors.panelBorder} p-2 rounded`}>
                <span className={colors.textSecondary}>보유 시간</span>
                <span className={`${colors.textSecondary} text-[10px]`}>{Math.floor((data.currentTime - trade.timestamp) / 60000)}분</span>
              </div>
              <div className={`flex justify-between gap-6 ${colors.panelBg} border ${colors.panelBorder} p-2 rounded`}>
                <span className={colors.textSecondary}>마지막 업데이트</span>
                <span className={`${colors.textSecondary} text-[10px]`}>{new Date(data.currentTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>
          </>
        )}
      </>
    );

    if (isMobileView) {
      return createPortal(
        <div
          className={`fixed left-2 right-2 bottom-4 ${colors.tooltipBg} backdrop-blur-md border-2 ${colors.tooltipBorder} ${colors.textPrimary} text-xs rounded-lg p-4 shadow-2xl max-h-[70vh] overflow-y-auto`}
          style={{ zIndex: 999999 }}
          onClick={handleCloseTooltip}
        >
          {renderTooltipContent()}
        </div>,
        document.body
      );
    }

    const tooltipWidth = 300;
    const tooltipMaxHeight = 600;
    const margin = 20;

    let leftPos: number;

    if (x < window.innerWidth / 2) {
      leftPos = Math.min(x + 40, window.innerWidth - tooltipWidth - margin);
    } else {
      leftPos = Math.max(margin, x - tooltipWidth - 40);
    }

    if (leftPos < margin) leftPos = margin;
    if (leftPos + tooltipWidth > window.innerWidth - margin) {
      leftPos = window.innerWidth - tooltipWidth - margin;
    }

    let topPos = Math.max(margin, y - 10);
    if (topPos + tooltipMaxHeight > window.innerHeight - margin) {
      topPos = window.innerHeight - tooltipMaxHeight - margin;
    }

    return createPortal(
      <div
        className={`fixed ${colors.tooltipBg} backdrop-blur-md border-2 ${colors.tooltipBorder} ${colors.textPrimary} text-xs rounded-lg p-4 shadow-2xl pointer-events-none max-h-[600px] overflow-y-auto`}
        style={{
          left: `${leftPos}px`,
          top: `${topPos}px`,
          minWidth: `${tooltipWidth}px`,
          maxWidth: `${Math.min(tooltipWidth, window.innerWidth - 2 * margin)}px`,
          zIndex: 999999,
        }}
      >
        {renderTooltipContent()}
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
    <div className={`${colors.chartBg} rounded-xl shadow-lg border ${colors.chartBorder} w-full overflow-hidden ${isMaximized ? 'fixed inset-0 z-50 h-screen rounded-none' : ''}`}>
      <div className={`${colors.headerBg} px-2 sm:px-4 py-2 flex items-center justify-between border-b ${colors.headerBorder} flex-wrap gap-2`}>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className={`text-sm sm:text-base font-bold ${colors.textPrimary}`}>BTC/USDC</h2>
            {latestCandle && (
              <>
                <div className={`text-base sm:text-lg font-bold ${colors.textPrimary}`}>
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
          <div className={`hidden sm:flex items-center gap-2 text-[10px] ${colors.panelBg} px-2 py-1 rounded`}>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 rounded" style={{ backgroundColor: colors.emaShort }}></div>
              <span className={colors.textSecondary}>{(timeframe === '1h' || timeframe === '15m') ? 'EMA 3' : 'EMA 5'}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 rounded" style={{ backgroundColor: colors.emaLong }}></div>
              <span className={colors.textSecondary}>{(timeframe === '1h' || timeframe === '15m') ? 'EMA 8' : 'EMA 13'}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 border-t border-dashed" style={{ borderColor: colors.bb }}></div>
              <span className={colors.textSecondary}>BB</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
          <div className={`flex items-center gap-0.5 ${colors.buttonBg} rounded p-0.5 overflow-x-auto`}>
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
                    if (onTimeframeChange) {
                      onTimeframeChange(tf);
                    }
                    if (!hasData) {
                      websocketService.requestTimeframeData(tf);
                    }
                  }}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all flex-shrink-0 ${
                    timeframe === tf
                      ? `${colors.buttonActive} text-white shadow-sm`
                      : `${colors.textSecondary} ${darkMode ? 'hover:text-slate-200 hover:bg-slate-600/60' : 'hover:text-stone-900 hover:bg-stone-300/60'}`
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
            <ZoomOut className="w-3 h-3 ${colors.textSecondary}" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 bg-stone-200/60 hover:bg-stone-300/70 rounded transition-colors"
            title="Zoom In (Ctrl + Scroll)"
          >
            <ZoomIn className="w-3 h-3 ${colors.textSecondary}" />
          </button>
          {scrollOffset > 0 && (
            <button
              onClick={handleResetScroll}
              className="p-1 bg-blue-500/90 hover:bg-blue-600 rounded transition-colors"
              title="Go to Latest"
            >
              <ChevronsRight className="w-3 h-3 text-white" />
            </button>
          )}
          <button
            onClick={() => setShowTradeMarkers(!showTradeMarkers)}
            className={`p-1 rounded transition-colors ${
              showTradeMarkers
                ? 'bg-[#4169E1] hover:bg-[#365abf]'
                : 'bg-stone-200/60 hover:bg-stone-300/70'
            }`}
            title={showTradeMarkers ? "Hide B/S Markers" : "Show B/S Markers"}
          >
            {showTradeMarkers ? (
              <Eye className="w-3 h-3 text-white" />
            ) : (
              <EyeOff className="w-3 h-3 ${colors.textSecondary}" />
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
              <Minimize2 className="w-3 h-3 ${colors.textSecondary}" />
            ) : (
              <Maximize2 className="w-3 h-3 ${colors.textSecondary}" />
            )}
          </button>
        </div>
        </div>
      </div>

      <div className={`flex ${darkMode ? 'bg-gradient-to-br from-slate-800 via-slate-800/90 to-slate-800' : 'bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50'} overflow-visible`} style={{ height: `${chartHeight}px` }}>
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
            <div className={`absolute left-3 top-3 z-30 flex flex-col gap-1.5 text-xs ${colors.tooltipBg} px-3 py-2 rounded-lg border ${colors.tooltipBorder} shadow-lg`}>
              <div className="flex items-center gap-3">
                <span className={`${colors.textSecondary} font-mono font-medium`}>{formatChartTime(hoveredCandle.timestamp)}</span>
                <span className={`${colors.textSecondary} font-medium`}>O <span className={`${colors.textPrimary} font-bold`}>{hoveredCandle.open.toFixed(2)}</span></span>
                <span className={`${colors.textSecondary} font-medium`}>H <span className="text-emerald-400 font-bold">{hoveredCandle.high.toFixed(2)}</span></span>
                <span className={`${colors.textSecondary} font-medium`}>L <span className="text-rose-400 font-bold">{hoveredCandle.low.toFixed(2)}</span></span>
                <span className={`${colors.textSecondary} font-medium`}>C <span className={`${colors.textPrimary} font-bold`}>{hoveredCandle.close.toFixed(2)}</span></span>
                {hoveredCandle.isComplete === false && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-bold border border-blue-400/40 animate-pulse shadow-lg">
                    진행 중
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                {hoveredCandle.ema_short && (
                  <span className={`${colors.textSecondary} font-medium`}>EMA Short <span className={darkMode ? 'text-blue-400' : 'text-blue-600'} font-bold>{hoveredCandle.ema_short.toFixed(2)}</span></span>
                )}
                {hoveredCandle.ema_long && (
                  <span className={`${colors.textSecondary} font-medium`}>EMA Long <span className={darkMode ? 'text-yellow-400' : 'text-yellow-600'} font-bold>{hoveredCandle.ema_long.toFixed(2)}</span></span>
                )}
                {hoveredCandle.bb_upper && (
                  <>
                    <span className={colors.textSecondary}>|</span>
                    <span className={`${colors.textSecondary} font-medium`}>BB <span className="text-violet-600 font-bold">{hoveredCandle.bb_upper.toFixed(2)}</span></span>
                    <span className={`${colors.textSecondary} font-medium`}>/ <span className="text-violet-600 font-bold">{hoveredCandle.bb_mid?.toFixed(2) ?? '-'}</span></span>
                    <span className={`${colors.textSecondary} font-medium`}>/ <span className="text-violet-600 font-bold">{hoveredCandle.bb_lower?.toFixed(2)}</span></span>
                  </>
                )}
                {hoveredCandle.adx && (
                  <>
                    <span className={colors.textSecondary}>|</span>
                    <span className={`${colors.textSecondary} font-medium`}>ADX <span className="text-emerald-600 font-bold">{hoveredCandle.adx.toFixed(1)}</span></span>
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
              const emaShortPoints: string[] = [];
              const emaLongPoints: string[] = [];
              const bbUpperPoints: string[] = [];
              const bbMiddlePoints: string[] = [];
              const bbLowerPoints: string[] = [];

              visibleCandles.forEach((candle, idx) => {
                const x = idx * (candleWidth + candleGap) + candleWidth / 2;

                // 백엔드 필드명 직접 사용: ema_short, ema_long
                if (candle.ema_short !== undefined) {
                  const y = priceToY(candle.ema_short);
                  emaShortPoints.push(`${x},${y}`);
                }

                if (candle.ema_long !== undefined) {
                  const y = priceToY(candle.ema_long);
                  emaLongPoints.push(`${x},${y}`);
                }

                // 백엔드 필드명: bb_upper, bb_mid, bb_lower
                if (candle.bb_upper !== undefined) {
                  const y = priceToY(candle.bb_upper);
                  bbUpperPoints.push(`${x},${y}`);
                }

                if (candle.bb_mid !== undefined) {
                  const y = priceToY(candle.bb_mid);
                  bbMiddlePoints.push(`${x},${y}`);
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

                  {emaShortPoints.length > 1 && (
                    <polyline
                      points={emaShortPoints.join(' ')}
                      fill="none"
                      stroke={colors.emaShort}
                      strokeWidth="1.5"
                      opacity="0.9"
                    />
                  )}

                  {emaLongPoints.length > 1 && (
                    <polyline
                      points={emaLongPoints.join(' ')}
                      fill="none"
                      stroke={colors.emaLong}
                      strokeWidth="1.5"
                      opacity="0.9"
                    />
                  )}

                  {/* BB Touch Markers - Most Recent Only */}
                  {(() => {
                    let lastUpperTouch: { idx: number; candle: any } | null = null;
                    let lastLowerTouch: { idx: number; candle: any } | null = null;

                    for (let idx = visibleCandles.length - 1; idx >= 0; idx--) {
                      const candle = visibleCandles[idx];

                      if (!lastUpperTouch && candle.bb_upper !== undefined && candle.high >= candle.bb_upper) {
                        lastUpperTouch = { idx, candle };
                      }
                      if (!lastLowerTouch && candle.bb_lower !== undefined && candle.low <= candle.bb_lower) {
                        lastLowerTouch = { idx, candle };
                      }

                      if (lastUpperTouch && lastLowerTouch) break;
                    }

                    const arrowSize = 4;
                    const arrowOffset = 8;

                    return (
                      <>
                        {lastUpperTouch && (
                          <g transform={`translate(${lastUpperTouch.idx * (candleWidth + candleGap) + candleWidth / 2}, ${Math.max(0, priceToY(lastUpperTouch.candle.high) - arrowOffset)})`}>
                            <path
                              d={`M 0 0 L ${arrowSize} ${-arrowSize} L 0 ${-arrowSize * 0.7} L ${-arrowSize} ${-arrowSize} Z`}
                              fill="#ffffff"
                              stroke="#ffffff"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity="0.8"
                            />
                          </g>
                        )}
                        {lastLowerTouch && (
                          <g transform={`translate(${lastLowerTouch.idx * (candleWidth + candleGap) + candleWidth / 2}, ${Math.min(priceChartHeight, priceToY(lastLowerTouch.candle.low) + arrowOffset)})`}>
                            <path
                              d={`M 0 0 L ${arrowSize} ${arrowSize} L 0 ${arrowSize * 0.7} L ${-arrowSize} ${arrowSize} Z`}
                              fill="#ffffff"
                              stroke="#ffffff"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity="0.8"
                            />
                          </g>
                        )}
                      </>
                    );
                  })()}
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
                      isHovered ? 'ring-2 ring-blue-400/50 shadow-lg' : ''
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
                    className="absolute h-0.5 bg-white"
                    style={{
                      left: `${highX - lineLength}px`,
                      top: `${highY}px`,
                      width: `${lineLength}px`,
                      pointerEvents: 'none',
                      zIndex: 9999
                    }}
                  />
                  <div
                    className="absolute text-[9px] text-white font-semibold whitespace-nowrap text-right px-1 py-0.5 bg-slate-800 rounded border border-slate-600"
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
                    className="absolute h-0.5 bg-white"
                    style={{
                      left: `${lowX - lineLength}px`,
                      top: `${lowY}px`,
                      width: `${lineLength}px`,
                      pointerEvents: 'none',
                      zIndex: 9999
                    }}
                  />
                  <div
                    className="absolute text-[9px] text-white font-semibold whitespace-nowrap text-right px-1 py-0.5 bg-slate-800 rounded border border-slate-600"
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

              // 포지션 방향 확인: LONG=시안, SHORT=주황
              const isLong = buyTrade.side === 'LONG' || !buyTrade.side;
              const positionColor = isLong ? '#06b6d4' : '#f97316';

              // 익절/손절 확인
              const profit = sellTrade.profit !== undefined
                ? sellTrade.profit
                : ((sellTrade.price - buyTrade.price) / buyTrade.price) * 100;
              const isProfit = profit >= 0;

              // Hover 시에는 포지션 색상 사용
              const lineColor = positionColor;

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

            {/* 모든 페어링된 거래 연결선 */}
            {showTradeMarkers && (
              <svg
                className="absolute top-0 left-0 pointer-events-none"
                style={{ width: '100%', height: `${priceChartHeight}px`, zIndex: 12 }}
              >
                {(() => {
                const timeframeMinutes = getTimeframeMinutes(timeframe);
                const timeframeMs = timeframeMinutes * 60000;

                const pairedGroups: Array<{ buy: TradeEvent; sell: TradeEvent }> = [];
                const processedPairs = new Set<string>();

                data.trades.forEach(trade => {
                  if (!trade.pairId || processedPairs.has(trade.pairId)) return;

                  const pairedTrade = data.trades.find(
                    t => t.pairId === trade.pairId && t.timestamp !== trade.timestamp
                  );

                  if (!pairedTrade) return;

                  const buyTrade = trade.type === 'buy' ? trade : pairedTrade;
                  const sellTrade = trade.type === 'sell' ? trade : pairedTrade;

                  if (buyTrade.type === 'buy' && sellTrade.type === 'sell') {
                    pairedGroups.push({ buy: buyTrade, sell: sellTrade });
                    processedPairs.add(trade.pairId);
                  }
                });

                return pairedGroups.map((pair, index) => {
                  const { buy, sell } = pair;

                  // 캔들 인덱스 찾기
                  let buyCandleIndexInAll = -1;
                  let sellCandleIndexInAll = -1;

                  if (timeframeMinutes === 1) {
                    buyCandleIndexInAll = selectedCandles.findIndex(c => Math.abs(c.timestamp - buy.timestamp) < 60000);
                    sellCandleIndexInAll = selectedCandles.findIndex(c => Math.abs(c.timestamp - sell.timestamp) < 60000);
                  } else {
                    buyCandleIndexInAll = selectedCandles.findIndex(c => {
                      const candlePeriod = Math.floor(c.timestamp / timeframeMs) * timeframeMs;
                      const tradePeriod = Math.floor(buy.timestamp / timeframeMs) * timeframeMs;
                      return candlePeriod === tradePeriod;
                    });

                    sellCandleIndexInAll = selectedCandles.findIndex(c => {
                      const candlePeriod = Math.floor(c.timestamp / timeframeMs) * timeframeMs;
                      const tradePeriod = Math.floor(sell.timestamp / timeframeMs) * timeframeMs;
                      return candlePeriod === tradePeriod;
                    });
                  }

                  if (buyCandleIndexInAll === -1 || sellCandleIndexInAll === -1) return null;

                  const buyCandleIndex = buyCandleIndexInAll - visibleStartIndex;
                  const sellCandleIndex = sellCandleIndexInAll - visibleStartIndex;

                  // 화면 밖인 경우 스킵
                  if (buyCandleIndex < 0 && sellCandleIndex < 0) return null;
                  if (buyCandleIndex >= visibleCandles.length && sellCandleIndex >= visibleCandles.length) return null;

                  const x1 = buyCandleIndex * (candleWidth + candleGap) + candleWidth / 2;
                  const y1 = priceToY(buy.price);
                  const x2 = sellCandleIndex * (candleWidth + candleGap) + candleWidth / 2;
                  const y2 = priceToY(sell.price);

                  // 익절/손절에 따라 색상 결정: 익절=초록, 손절=빨강
                  const calcedProfit = typeof sell.profit === 'number'
                    ? sell.profit
                    : buy.side === 'SHORT'
                      ? (buy.price - sell.price) / buy.price * 100
                      : (sell.price - buy.price) / buy.price * 100;
                  const isProfit = calcedProfit >= 0;
                  const lineColor = isProfit ? '#10b981' : '#ef4444';

                  return (
                    <line
                      key={`pair-${index}-${pair.buy.timestamp}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={lineColor}
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.6"
                    />
                  );
                });
              })()}
              </svg>
            )}

            {data.holding.isHolding && data.holding.buyPrice && (() => {
              const isLong = data.holding.positionSide === 'LONG';
              const entryColor = isLong ? '#06b6d4' : '#f97316'; // cyan for LONG, orange for SHORT
              const entryColorRgba = isLong ? 'rgba(6, 182, 212, 0.5)' : 'rgba(249, 115, 22, 0.5)';
              const breakevenPrice = isLong
                ? data.holding.buyPrice * 1.001  // +0.1% for LONG
                : data.holding.buyPrice * 0.999; // -0.1% for SHORT

              return (
                <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: '100%', height: `${priceChartHeight}px`, zIndex: 4 }}>
                  {/* Entry price line */}
                  <line
                    x1="0"
                    y1={priceToY(data.holding.buyPrice)}
                    x2="100%"
                    y2={priceToY(data.holding.buyPrice)}
                    stroke={entryColor}
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    opacity="0.75"
                    filter={`drop-shadow(0 0 3px ${entryColorRgba})`}
                  />
                  {/* Breakeven line (0.1% fee coverage) */}
                  <line
                    x1="0"
                    y1={priceToY(breakevenPrice)}
                    x2="100%"
                    y2={priceToY(breakevenPrice)}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    opacity="0.6"
                    filter="drop-shadow(0 0 3px rgba(255, 255, 255, 0.4))"
                  />
                  {/* PP Reversal Price line */}
                  {data.holding.ppReversalPrice && (
                    <line
                      x1="0"
                      y1={priceToY(data.holding.ppReversalPrice)}
                      x2="100%"
                      y2={priceToY(data.holding.ppReversalPrice)}
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                      strokeDasharray="6 3"
                      opacity="0.7"
                      filter="drop-shadow(0 0 3px rgba(251, 191, 36, 0.5))"
                    />
                  )}
                </svg>
              );
            })()}


            <div className="absolute top-0 left-0 pointer-events-none" style={{ height: `${priceChartHeight}px`, width: `${visibleCandles.length * (candleWidth + candleGap)}px`, overflow: 'visible', zIndex: 5 }}>
            {(() => {
              // 백엔드 recentTrades만 신뢰 - 프론트엔드에서 임의로 거래 생성하지 않음
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
                            <div className={`absolute w-12 h-12 rounded-full opacity-10 animate-pulse ${trade.side === 'SHORT' ? 'bg-orange-400' : 'bg-cyan-500'}`} />
                            <div className={`absolute w-10 h-10 rounded-full opacity-15 animate-ping ${trade.side === 'SHORT' ? 'bg-orange-400' : 'bg-cyan-500'}`} style={{ animationDuration: '2s' }} />
                          </>
                        )}
                        <div className={`absolute w-8 h-8 rounded-full opacity-20 ${isHovered ? 'animate-ping' : ''} ${trade.side === 'SHORT' ? 'bg-orange-400' : 'bg-cyan-500'}`} />
                        <div className={`w-6 h-6 rounded-full transition-all shadow-lg ${isHovered ? 'scale-125' : ''} ${
                          trade.isPaired
                            ? trade.side === 'SHORT'
                              ? 'bg-orange-500 border-2 border-orange-300 shadow-[0_0_15px_rgba(251,146,60,0.6)]'
                              : 'bg-cyan-500 border-2 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                            : trade.side === 'SHORT'
                            ? 'bg-orange-500 shadow-[0_0_15px_rgba(251,146,60,0.6)]'
                            : 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                        }`}>
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{trade.side === 'SHORT' ? 'S' : 'L'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (() => {
                      // EXIT 마커: 흰색 배경에 익절=초록 글씨, 손절=빨강 글씨
                      const isProfit = typeof trade.profit === 'number' ? trade.profit >= 0 : true;
                      const textColor = isProfit ? 'text-emerald-500' : 'text-rose-500';
                      const glowColor = isProfit ? 'shadow-emerald-500/50' : 'shadow-rose-500/50';
                      return (
                        <div className="relative flex items-center justify-center">
                          <div className={`absolute w-8 h-8 bg-white rounded-full opacity-20 ${isHovered ? 'animate-ping' : ''}`} />
                          <div className={`w-6 h-6 bg-white rounded-full border-2 border-white shadow-lg transition-all ${isHovered ? `scale-125 ${glowColor}` : ''}`}>
                            <div className="w-full h-full flex items-center justify-center">
                              <span className={`${textColor} text-xs font-bold`}>X</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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
                      <div className={`px-1.5 py-0.5 rounded ${colors.textPrimary} text-[11px] font-bold ${darkMode ? 'bg-slate-800/95 border-slate-600' : 'bg-white/95 border-stone-300'} border shadow-md pointer-events-auto`}>
                        {hoverLabel}
                      </div>
                    ) : (
                      <span className={colors.textSecondary}>{timeLabel}</span>
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
              <div className={`absolute left-2 top-2 text-xs ${darkMode ? 'bg-slate-800/90' : 'bg-white/90'} px-1.5 py-0.5 rounded flex items-center gap-2 pointer-events-none`}>
                <span className={`${colors.textSecondary} font-medium`}>Volume</span>
                {visibleCandles[hoveredCandleIndex] && (
                  <span className={`${colors.textPrimary} font-semibold`}>
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
                const hist = candle.histogram ?? candle.macd_hist;
                if (hist === undefined) return null;
                const x = idx * (candleWidth + candleGap) + candleWidth / 2;
                const zeroY = macdToY(0);
                const histY = macdToY(hist);
                const height = Math.abs(zeroY - histY);
                const isPositive = hist >= 0;

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
                  const macdVal = candle.macd ?? candle.macd_line;
                  const signalVal = candle.signal ?? candle.macd_signal;

                  if (macdVal !== undefined) {
                    const y = macdToY(macdVal);
                    macdPoints.push(`${x},${y}`);
                  }

                  if (signalVal !== undefined) {
                    const y = macdToY(signalVal);
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
              <div className={`absolute left-2 top-2 text-xs ${darkMode ? 'bg-slate-800/90' : 'bg-white/90'} px-1.5 py-0.5 rounded flex items-center gap-2 pointer-events-none`}>
                <span className={`${colors.textSecondary} font-medium`}>MACD</span>
                {visibleCandles[hoveredCandleIndex] && (() => {
                  const candle = visibleCandles[hoveredCandleIndex];
                  const macdVal = candle.macd ?? candle.macd_line;
                  const signalVal = candle.signal ?? candle.macd_signal;
                  const histVal = candle.histogram ?? candle.macd_hist;
                  return (
                  <>
                    {macdVal !== undefined && (
                      <span className="text-blue-600 font-semibold">
                        {macdVal.toFixed(2)}
                      </span>
                    )}
                    {signalVal !== undefined && (
                      <>
                        <span className={colors.textSecondary}>|</span>
                        <span className="${colors.textSecondary} text-[10px]">Signal</span>
                        <span className="text-yellow-500 font-semibold">
                          {signalVal.toFixed(2)}
                        </span>
                      </>
                    )}
                    {histVal !== undefined && (
                      <>
                        <span className={colors.textSecondary}>|</span>
                        <span className="${colors.textSecondary} text-[10px]">Hist</span>
                        <span className={`font-semibold ${histVal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {histVal.toFixed(2)}
                        </span>
                      </>
                    )}
                  </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ADX Chart Background */}
          <div
            className="absolute left-0 rounded pointer-events-none"
            style={{
              top: `${priceChartHeight + volumeChartHeight + macdChartHeight + 44}px`,
              height: `${adxChartHeight}px`,
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
              height: `${adxChartHeight}px`,
              width: `${visibleCandles.length * (candleWidth + candleGap)}px`,
              zIndex: 1,
            }}
          >
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {(() => {
                const svgWidth = containerWidth || 1200;
                return [75, 50, 25].map((value) => {
                  const y = adxToY(value);
                  const isThreshold = value === 25;
                  const isMid = value === 50;
                  return (
                    <line
                      key={value}
                      x1="0"
                      y1={y}
                      x2="100%"
                      y2={y}
                      stroke={isThreshold ? 'rgba(239, 68, 68, 0.2)' : isMid ? 'rgba(251, 191, 36, 0.15)' : 'rgba(71, 85, 105, 0.1)'}
                      strokeWidth={isThreshold ? '1.5' : '1'}
                      strokeDasharray={isThreshold ? '4 2' : '0'}
                    />
                  );
                });
              })()}

              {(() => {
                const adxPoints: string[] = [];

                visibleCandles.forEach((candle, idx) => {
                  if (candle.adx === undefined) return;
                  const x = idx * (candleWidth + candleGap) + candleWidth / 2;
                  const y = adxToY(candle.adx);
                  adxPoints.push(`${x},${y}`);
                });

                return (
                  <>
                    {adxPoints.length > 1 && (
                      <polyline
                        points={adxPoints.join(' ')}
                        fill="none"
                        stroke={colors.bb}
                        strokeWidth="1.5"
                        opacity="0.95"
                      />
                    )}
                  </>
                );
              })()}
            </svg>
            {hoveredCandleIndex !== null && (
              <div className={`absolute left-2 top-2 text-xs ${darkMode ? 'bg-slate-800/90' : 'bg-white/90'} px-1.5 py-0.5 rounded flex items-center gap-2 pointer-events-none`}>
                <span className={`${colors.textSecondary} font-medium`}>ADX</span>
                {visibleCandles[hoveredCandleIndex] && visibleCandles[hoveredCandleIndex].adx !== undefined && (
                  <span className={`font-semibold ${
                    visibleCandles[hoveredCandleIndex].adx! >= 25 ? 'text-emerald-500' :
                    visibleCandles[hoveredCandleIndex].adx! >= 15 ? 'text-blue-400' :
                    'text-slate-400'
                  }`}>
                    {visibleCandles[hoveredCandleIndex].adx!.toFixed(1)}
                  </span>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Y-Axis */}
      <div className={`w-16 ${colors.headerBg} relative border-l ${colors.headerBorder}`} style={{ height: `${chartHeight}px`, zIndex: 10 }}>
        <div className="relative" style={{ height: `${priceChartHeight}px` }}>
          {Array.from({ length: 6 }).map((_, i) => {
            if (i === 0 || i === 5) return null;
            const price = minPrice + ((maxPrice - minPrice) / 5) * i;
            const y = priceToY(price);
            return (
              <div
                key={i}
                className={`absolute right-0 w-full text-left pl-2 ${colors.textPrimary} text-[11px]`}
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
              <div className={`px-1.5 py-0.5 rounded ${colors.textPrimary} text-[11px] font-bold ${darkMode ? 'bg-slate-800/95 border-slate-600' : 'bg-white/95 border-stone-300'} border shadow-md`}>
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
                  className={`absolute right-0 w-full text-left pl-2 ${colors.textPrimary} text-[10px]`}
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
                className={`absolute right-0 w-full text-left pl-2 ${colors.textPrimary} text-[10px]`}
                style={{ top: `${Math.max(0, Math.min(macdChartHeight - 12, y - 6))}px` }}
              >
                {displayValue}
              </div>
            );
          })}
        </div>

        {/* ADX Y-Axis */}
        <div className="absolute" style={{ top: `${priceChartHeight + volumeChartHeight + macdChartHeight + 44}px`, height: `${adxChartHeight}px`, width: '100%' }}>
          {[75, 50, 25].map((value) => {
            const y = adxToY(value);
            return (
              <div
                key={value}
                className={`absolute right-0 w-full text-left pl-2 ${colors.textPrimary} text-[10px]`}
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
      <div className={`w-full rounded-lg ${colors.chartBg} border ${colors.chartBorder} p-8 flex items-center justify-center`}>
        <div className={`${colors.textSecondary} text-sm`}>차트 데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <>
      {renderTooltip()}
      {isMaximized ? createPortal(
        <div className={`fixed inset-0 z-50 ${darkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-stone-100 via-amber-50/30 to-stone-100'} overflow-auto`}>
          {chartContent}
        </div>,
        document.body
      ) : chartContent}
    </>
  );
};
