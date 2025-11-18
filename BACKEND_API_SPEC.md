# Backend API Specification for HedgeTrade Dashboard

## ⚠️ CRITICAL WARNING

**익절확률 예측(`currentPrediction`)은 매수 결정의 핵심입니다!**

- 익절확률 예측이 없으면 매수할 수 없습니다
- `currentPrediction`과 `lastPredictionUpdateTime`은 **항상 함께 제공**되어야 합니다
- 예측이 몇 시간 전 데이터라면 시스템이 작동하지 않습니다
- 1분마다 업데이트되는 데이터에 최신 예측값이 포함되어야 합니다

## Overview
This document defines the exact data structure that the backend Oracle API must provide to the frontend dashboard.

## API Endpoint
```
GET /oracle/state
```

## Response Format

### Complete Response Schema
```typescript
{
  currentAsset: number;           // Current portfolio value in USD
  initialAsset: number;           // Starting portfolio value in USD
  currentTime: number;            // REQUIRED: Current timestamp in milliseconds (Unix epoch) - 1분마다 업데이트
  currentPrice: number;           // Current BTC price in USD

  priceHistory1m: Candle[];       // 1-minute candle data (required)
  priceHistory5m?: Candle[];      // 5-minute candle data (optional)
  priceHistory15m?: Candle[];     // 15-minute candle data (optional)
  priceHistory1h?: Candle[];      // 1-hour candle data (optional)

  pricePredictions: Candle[];     // Future price predictions (same format as candles)

  trades: TradeEvent[];           // All historical trades

  holding: HoldingInfo;           // Current position information

  currentPrediction: {            // ⚠️ REQUIRED - 매수 결정의 핵심!
    takeProfitProb: number;       // REQUIRED: Current take profit probability (0-1)
    stopLossProb: number;         // REQUIRED: Current stop loss probability (0-1)
  };

  lastPredictionUpdateTime: number;  // ⚠️ REQUIRED: 익절확률을 언제 예측했는지 (Unix timestamp ms)
                                      // currentPrediction과 항상 함께 업데이트되어야 함

  metrics: {
    portfolioReturn: number;      // Portfolio return in percentage
    marketReturn: number;         // Market return in percentage
    avgTradeReturn: number;       // Average trade return in percentage
    takeProfitCount: number;      // Number of take profit exits
    stopLossCount: number;        // Number of stop loss exits
  };
}
```

## Data Structures

### Candle
```typescript
{
  timestamp: number;              // Unix timestamp in milliseconds
  open: number;                   // Opening price
  high: number;                   // Highest price
  low: number;                    // Lowest price
  close: number;                  // Closing price
  volume: number;                 // Trading volume
  isPrediction?: boolean;         // true if this is a prediction, false/undefined for historical

  // Technical indicators (all optional)
  ema20?: number;                 // 20-period EMA
  ema50?: number;                 // 50-period EMA
  bb_upper?: number;              // Bollinger Band upper
  bb_lower?: number;              // Bollinger Band lower
  macd?: number;                  // MACD value
  signal?: number;                // MACD signal line
  histogram?: number;             // MACD histogram
  rsi?: number;                   // RSI value (0-100)
}
```

### TradeEvent
```typescript
{
  timestamp: number;              // Unix timestamp in milliseconds
  type: 'buy' | 'sell';          // Trade type
  price: number;                  // Execution price
  pairId?: string;                // Used to match buy/sell pairs

  prediction?: {                  // Only present for BUY trades
    takeProfitProb: number;       // Take profit probability at time of buy (0-1)
    stopLossProb: number;         // Stop loss probability at time of buy (0-1)
    expectedTakeProfitTime: number;   // Expected time to reach TP (Unix timestamp ms)
    expectedStopLossTime: number;     // Expected time to reach SL (Unix timestamp ms)
    expectedTakeProfitPrice: number;  // Expected take profit price
    expectedStopLossPrice: number;    // Expected stop loss price
  };
}
```

### HoldingInfo
```typescript
{
  isHolding: boolean;             // REQUIRED: true if currently holding a position

  // Required when isHolding = true
  buyPrice?: number;              // Entry price
  buyTime?: number;               // Entry time (Unix timestamp ms)
  currentProfit?: number;         // Current profit in percentage
  takeProfitPrice?: number;       // Target take profit price
  stopLossPrice?: number;         // Target stop loss price

  // REQUIRED when isHolding = true: Initial prediction at buy time
  initialTakeProfitProb?: number; // Take profit probability when position was opened (0-1)

  // REQUIRED when isHolding = true: Current prediction (should match currentPrediction)
  currentTakeProfitProb?: number; // Current take profit probability (0-1)
}
```

## Critical Requirements

### 1. 익절확률 예측 (Most Important!)

⚠️ **이것이 없으면 시스템이 작동하지 않습니다!**

매 API 호출마다 다음 두 필드를 **반드시 함께** 제공해야 합니다:

```typescript
{
  currentPrediction: {
    takeProfitProb: 0.72,    // 현재 익절 확률
    stopLossProb: 0.28        // 현재 손절 확률
  },
  lastPredictionUpdateTime: 1700000000000  // 이 예측을 언제 계산했는지
}
```

**왜 중요한가?**
- 매수 결정은 `takeProfitProb`를 기반으로 합니다
- 예측이 오래되면 (몇 시간 전) 잘못된 매수가 발생합니다
- UI에서 "익절확률이 언제 예측되었는지" 사용자에게 보여줍니다

### 2. Real-time Updates

프론트엔드는 **1분마다** 이 API를 호출합니다:

- `currentTime`: 매 응답마다 현재 시간으로 업데이트
- `lastPredictionUpdateTime`: 예측을 재계산할 때마다 업데이트
- `currentPrediction`: 최신 예측값으로 업데이트

**업데이트 주기:**
- `currentTime`: 1분마다 자동 업데이트 (API 호출 시점)
- `lastPredictionUpdateTime`: 모델이 새로운 예측을 생성할 때 업데이트
- 둘의 차이가 크면 (예: 1시간 이상) UI에 경고 표시 고려

### 3. Prediction Probabilities

보유 포지션이 있을 때:
- `holding.initialTakeProfitProb`: 매수 시점의 익절 확률 (변하지 않음)
- `currentPrediction.takeProfitProb`: 현재 실시간 익절 확률 (계속 업데이트)
- 두 값을 비교하여 익절 확률이 얼마나 변했는지 보여줍니다

### 4. Timestamp Format

모든 타임스탬프는 **밀리초 단위** Unix epoch time이어야 합니다:

```javascript
// ✅ 올바름
timestamp: 1700000000000  // 밀리초 (13자리)

// ❌ 잘못됨
timestamp: 1700000000     // 초 단위 (10자리) - 날짜 포맷 깨짐
```

## Example Response

```json
{
  "currentAsset": 105000,
  "initialAsset": 100000,
  "currentTime": 1700000000000,
  "currentPrice": 42150.50,
  "priceHistory1m": [
    {
      "timestamp": 1699999940000,
      "open": 42100,
      "high": 42180,
      "low": 42090,
      "close": 42150,
      "volume": 125.5,
      "ema20": 42120,
      "ema50": 42080,
      "rsi": 58.5
    }
  ],
  "pricePredictions": [
    {
      "timestamp": 1700000060000,
      "open": 42150,
      "high": 42200,
      "low": 42140,
      "close": 42180,
      "volume": 100,
      "isPrediction": true
    }
  ],
  "trades": [
    {
      "timestamp": 1699995000000,
      "type": "buy",
      "price": 42000,
      "pairId": "pair_123",
      "prediction": {
        "takeProfitProb": 0.68,
        "stopLossProb": 0.32,
        "expectedTakeProfitTime": 1700001800000,
        "expectedStopLossTime": 1700003600000,
        "expectedTakeProfitPrice": 42500,
        "expectedStopLossPrice": 41800
      }
    }
  ],
  "holding": {
    "isHolding": true,
    "buyPrice": 42000,
    "buyTime": 1699995000000,
    "currentProfit": 0.36,
    "takeProfitPrice": 42500,
    "stopLossPrice": 41800,
    "initialTakeProfitProb": 0.68,
    "currentTakeProfitProb": 0.72
  },
  "currentPrediction": {
    "takeProfitProb": 0.72,
    "stopLossProb": 0.28
  },
  "lastPredictionUpdateTime": 1699999980000,
  "metrics": {
    "portfolioReturn": 5.0,
    "marketReturn": 3.2,
    "avgTradeReturn": 1.8,
    "takeProfitCount": 12,
    "stopLossCount": 5
  }
}
```

## Update Frequency

프론트엔드는 **1분(60초)마다** 이 엔드포인트를 호출합니다:

- API는 초당 1 요청을 처리할 수 있어야 합니다 (실제로는 1분당 1 요청)
- `currentTime`은 매 호출마다 약 60000ms씩 증가합니다
- `lastPredictionUpdateTime`은 예측을 재계산할 때만 업데이트됩니다

**권장사항:**
- 예측 모델이 실시간으로 돌아가면: 매 요청마다 `lastPredictionUpdateTime` 업데이트
- 예측 모델이 주기적으로 돌아가면: 예측 생성 시점에만 `lastPredictionUpdateTime` 업데이트
- `currentTime`과 `lastPredictionUpdateTime`의 차이가 5분 이상이면 경고 고려

## UI Display Locations

### Header (Top)
- **버전 옆에 현재 시간 표시**: `currentTime` 사용
- 형식: "HH:MM:SS" (예: "14:35:22")
- 1분마다 자동 업데이트됨

### MetricsPanel (Left Side)
- **익절확률 예측 시간**: `lastPredictionUpdateTime` 사용
- 형식: "HH:MM:SS" (예: "14:34:50")
- 익절확률 바 옆에 작게 표시
- "Updated: HH:MM:SS" 또는 시간만 표시

### PriceChart Tooltip (on BUY marker hover)
- `initialTakeProfitProb`: 매수시 익절확률
- `currentPrediction.takeProfitProb`: 현재 익절확률
- `lastPredictionUpdateTime`: 익절확률 업데이트 시간
- `currentTime`: 마지막 업데이트 시간

## Testing Checklist

필수 체크리스트:

- [ ] **`currentPrediction`이 모든 응답에 포함되어 있는가?** (가장 중요!)
- [ ] **`lastPredictionUpdateTime`이 모든 응답에 포함되어 있는가?**
- [ ] 모든 타임스탬프가 밀리초 단위인가? (13자리, 10자리 아님)
- [ ] `currentTime`이 매 API 호출마다 증가하는가?
- [ ] `lastPredictionUpdateTime`과 `currentTime`의 차이가 합리적인가? (< 5분 권장)
- [ ] `initialTakeProfitProb`가 포지션 오픈 시 설정되는가?
- [ ] `currentTakeProfitProb`가 `currentPrediction.takeProfitProb`와 일치하는가?
- [ ] 모든 확률 값이 0과 1 사이인가?

## Common Issues

### Issue 1: 익절확률이 업데이트되지 않음
**증상:** `lastPredictionUpdateTime`이 몇 시간 전

**원인:**
- 예측 모델이 작동하지 않음
- `lastPredictionUpdateTime` 업데이트 로직 누락

**해결:**
- 예측 모델이 정상 작동하는지 확인
- 매 응답에 최신 `lastPredictionUpdateTime` 포함

### Issue 2: 매수가 일어나지 않음
**증상:** 좋은 시그널인데 매수가 안 됨

**원인:**
- `currentPrediction`이 누락됨
- `takeProfitProb`가 0이거나 매우 낮음

**해결:**
- 모든 응답에 `currentPrediction` 포함
- 예측 모델이 합리적인 확률을 반환하는지 확인

### Issue 3: 시간 표시가 이상함
**증상:** 1970년 날짜가 표시됨

**원인:**
- 타임스탬프를 초 단위로 보냄 (밀리초여야 함)

**해결:**
```python
# ❌ 잘못됨
timestamp = int(time.time())  # 1700000000 (초)

# ✅ 올바름
timestamp = int(time.time() * 1000)  # 1700000000000 (밀리초)
```

## Questions?

If anything is unclear, refer to:
- `/src/types/dashboard.ts` for TypeScript definitions
- `/src/components/MetricsPanel.tsx` for MetricsPanel implementation
- `/src/App.tsx` for header time display
- `/src/components/PriceChart.tsx` for chart tooltip implementation

## 백엔드 개발자에게

이 스펙을 커서(Cursor)에게 전달할 때:

1. **익절확률 예측의 중요성** 강조
2. `currentPrediction`과 `lastPredictionUpdateTime`은 항상 함께 제공
3. 밀리초 단위 타임스탬프 사용
4. 1분마다 업데이트되는 데이터에 최신 예측 포함

이 API가 제대로 작동해야 대시보드가 작동합니다!
