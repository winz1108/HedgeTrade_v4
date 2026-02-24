# 차트 인디케이터 필드명 업데이트

## 변경 사항

백엔드가 각 캔들에 **인디케이터를 직접 포함**하여 제공하므로, 프론트엔드에서 별도 계산이나 매핑 없이 **캔들 데이터를 직접 사용**하도록 수정했습니다.

## 백엔드 필드명 (레퍼런스 기준)

### 모든 타임프레임 (1m, 5m, 15m, 30m, 1h, 4h, 1d)

```typescript
{
  time: number,           // Unix seconds
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
  ema_short: number,      // 단기 EMA (1m/5m/30m: 5, 1h: 3, 1d: 5)
  ema_long: number,       // 장기 EMA (1m/5m/30m: 13, 1h: 8, 1d: 13)
  bb_upper: number,       // Bollinger Band 상단
  bb_mid: number,         // Bollinger Band 중심 (SMA 20)
  bb_lower: number,       // Bollinger Band 하단
  bbw: number,            // BB Width %
  adx: number             // ADX(14)
}
```

### 모든 타임프레임 MACD 필드 (백엔드 실제 필드명)

**중요: 백엔드가 실제로 전송하는 필드명입니다 (API_SPEC.md 기준)**

```typescript
{
  // ... 기본 필드 ...
  macd: number,           // MACD Line (백엔드 전송 필드명)
  signal: number,         // MACD Signal (백엔드 전송 필드명)
  histogram: number       // MACD Histogram (백엔드 전송 필드명)
}
```

프론트엔드는 하위 호환성을 위해 레거시 필드명도 지원합니다:
- `macd_line` (대체: `macd`)
- `macd_signal` (대체: `signal`)
- `macd_hist` (대체: `histogram`)

### 15m 타임프레임 추가 필드

```typescript
{
  // ... 기본 필드 ...
  ema3: number,           // EMA(3) for 15m
  ema8: number            // EMA(8) for 15m
}
```

## 수정된 파일

### 1. `src/types/dashboard.ts`

**변경 전:**
```typescript
export interface Candle {
  // ...
  ema5?: number;
  ema13?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
}
```

**변경 후:**
```typescript
export interface Candle {
  // ...
  ema_short?: number;    // 백엔드 필드명
  ema_long?: number;     // 백엔드 필드명
  ema3?: number;         // 15m 전용
  ema8?: number;         // 15m 전용
  bb_upper?: number;     // 백엔드 필드명
  bb_mid?: number;       // 백엔드 필드명
  bb_lower?: number;     // 백엔드 필드명
  bbw?: number;
  adx?: number;
  // MACD - 백엔드 실제 필드명 (모든 타임프레임)
  macd?: number;         // MACD Line
  signal?: number;       // MACD Signal
  histogram?: number;    // MACD Histogram
  // 레거시 필드명 (하위 호환성)
  macd_line?: number;
  macd_signal?: number;
  macd_hist?: number;
}
```

### 2. `src/components/PriceChart.tsx`

#### EMA 라인 그리기
**변경 전:**
```typescript
const emaShort = useShortEMA ? candle.ema3 : candle.ema5;
const emaLong = useShortEMA ? candle.ema8 : candle.ema13;
```

**변경 후:**
```typescript
// 백엔드가 타임프레임별로 적절한 값을 제공
if (candle.ema_short !== undefined) {
  emaShortPoints.push(`${x},${y}`);
}
if (candle.ema_long !== undefined) {
  emaLongPoints.push(`${x},${y}`);
}
```

#### Bollinger Bands
**변경 전:**
```typescript
const bbUpper = candle.bbUpper ?? candle.bb_upper;
const bbMiddle = candle.bbMiddle;
const bbLower = candle.bbLower ?? candle.bb_lower;
```

**변경 후:**
```typescript
candle.bb_upper
candle.bb_mid
candle.bb_lower
```

#### MACD
**실제 백엔드 필드명 (API_SPEC.md):**
```typescript
candle.macd        // MACD Line
candle.signal      // MACD Signal
candle.histogram   // MACD Histogram
```

**프론트엔드 폴백 지원:**
```typescript
// 우선순위: 백엔드 실제 필드명 → 레거시 필드명
const macdVal = candle.macd ?? candle.macd_line;
const signalVal = candle.signal ?? candle.macd_signal;
const histVal = candle.histogram ?? candle.macd_hist;
```

### 3. `src/components/futures/KrakenPriceChart.tsx`

**제거한 코드:**
- `addIndicatorsToCandles()` 함수 전체 제거
- 백엔드가 이미 모든 캔들에 인디케이터를 포함하므로, 프론트엔드에서 대시보드 레벨 `indicators`를 마지막 캔들에 병합하는 로직 불필요

**변경 전:**
```typescript
const addIndicatorsToCandles = (candles: any[], timeframe: string) => {
  // 마지막 캔들에 indicators 값 추가
  lastCandle.ema5 = indicators.ema_short;
  lastCandle.ema13 = indicators.ema_long;
  // ...
};
```

**변경 후:**
```typescript
// 백엔드가 이미 모든 캔들에 인디케이터 포함
const priceHistory1m = getCandles('1m');  // 그대로 사용
```

## 차트 구현 예시

### EMA 라인 그리기
```typescript
const candles = data.priceHistories['1m'];  // 200개 캔들
const emaShortLine = candles
  .filter(c => c.ema_short !== undefined)
  .map(c => ({ time: c.time, value: c.ema_short }));
const emaLongLine = candles
  .filter(c => c.ema_long !== undefined)
  .map(c => ({ time: c.time, value: c.ema_long }));
```

### Bollinger Bands
```typescript
const bbUpper = candles.map(c => ({ time: c.time, value: c.bb_upper }));
const bbMid = candles.map(c => ({ time: c.time, value: c.bb_mid }));
const bbLower = candles.map(c => ({ time: c.time, value: c.bb_lower }));
```

### ADX 패널
```typescript
const candles30m = data.priceHistories['30m'];
const adxLine = candles30m.map(c => ({ time: c.time, value: c.adx }));
```

### MACD 패널 (모든 타임프레임)
```typescript
const candles = data.priceHistories['1m'];  // 또는 5m, 15m, 30m, 1h, 4h, 1d
const macdLine = candles.map(c => ({ time: c.time, value: c.macd }));
const signalLine = candles.map(c => ({ time: c.time, value: c.signal }));
const histogram = candles.map(c => ({
  time: c.time,
  value: c.histogram,
  color: c.histogram >= 0 ? '#26a69a' : '#ef5350'
}));
```

## 주의사항

1. **백엔드 필드명 일관성 중요**
   - 프론트엔드가 `ema_short`, `ema_long` 등의 정확한 필드명에 의존
   - 백엔드가 필드명을 변경하면 프론트엔드도 함께 수정 필요

2. **타임프레임별 EMA 기간 차이**
   - 1h: `ema_short` = EMA(3), `ema_long` = EMA(8)
   - 나머지 TF: `ema_short` = EMA(5), `ema_long` = EMA(13)
   - 백엔드가 타임프레임에 맞는 값을 제공

3. **MACD와 타임프레임별 전용 필드**
   - 모든 타임프레임: `macd`, `signal`, `histogram` 포함 (백엔드 실제 필드명)
   - 15m 전용: `ema3`, `ema8` 추가
   - 프론트엔드는 레거시 필드명(`macd_line`, `macd_signal`, `macd_hist`)도 폴백으로 지원

4. **과거 인디케이터 추세**
   - 백엔드가 모든 캔들에 인디케이터를 포함하므로
   - 과거 EMA 크로스, BB 터치, ADX 변화 등을 시각화 가능
