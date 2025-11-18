# Backend API Specification for HedgeTrade Dashboard

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
  currentTime: number;            // Current timestamp in milliseconds (Unix epoch)
  currentPrice: number;           // Current BTC price in USD

  priceHistory1m: Candle[];       // 1-minute candle data (required)
  priceHistory5m?: Candle[];      // 5-minute candle data (optional)
  priceHistory15m?: Candle[];     // 15-minute candle data (optional)
  priceHistory1h?: Candle[];      // 1-hour candle data (optional)

  pricePredictions: Candle[];     // Future price predictions (same format as candles)

  trades: TradeEvent[];           // All historical trades

  holding: HoldingInfo;           // Current position information

  currentPrediction?: {           // Latest prediction from Oracle
    takeProfitProb: number;       // REQUIRED: Current take profit probability (0-1)
    stopLossProb: number;         // REQUIRED: Current stop loss probability (0-1)
    expectedTakeProfitTime?: number;  // REQUIRED: Expected time to reach TP (Unix timestamp ms)
    expectedStopLossTime?: number;    // REQUIRED: Expected time to reach SL (Unix timestamp ms)
  };

  lastPredictionUpdateTime?: number;  // REQUIRED: When prediction was last updated (Unix timestamp ms)

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

### 1. Real-time Updates
- The API must update `currentTime` with every response
- `lastPredictionUpdateTime` must be set to the time when the prediction was last calculated
- These timestamps are displayed to users as "Last Update Time"

### 2. Prediction Probabilities
When holding a position, the backend MUST provide:
- `holding.initialTakeProfitProb` - The probability when the BUY was executed
- `currentPrediction.takeProfitProb` - The current real-time probability
- Both values should be between 0 and 1 (0% to 100%)

### 3. Expected Exit Times
When holding a position, the backend SHOULD provide:
- `currentPrediction.expectedTakeProfitTime` - Unix timestamp (ms) when TP is expected
- `currentPrediction.expectedStopLossTime` - Unix timestamp (ms) when SL is expected
- These are displayed as "~X분 후" (in X minutes) in the MetricsPanel

### 4. Timestamp Format
ALL timestamps must be Unix epoch time in **milliseconds** (not seconds)
```javascript
// Correct
timestamp: 1700000000000  // milliseconds

// Incorrect
timestamp: 1700000000     // seconds (will break date formatting)
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
    "stopLossProb": 0.28,
    "expectedTakeProfitTime": 1700001200000,
    "expectedStopLossTime": 1700003600000
  },
  "lastPredictionUpdateTime": 1700000000000,
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

The frontend polls this endpoint every **1 second** (1000ms), so:
- Ensure the API can handle 1 request per second
- `currentTime` should increment by ~1000ms each call
- `lastPredictionUpdateTime` should be updated whenever predictions are recalculated
- Real-time probability updates are critical for user experience

## UI Display Locations

### MetricsPanel (Left Side)
- Shows "Updated: HH:MM:SS" from `lastPredictionUpdateTime`
- Shows `initialTakeProfitProb` vs `currentPrediction.takeProfitProb`
- Shows "Expected Exit Time" calculated from `expectedTakeProfitTime` and `expectedStopLossTime`
- Shows "Last Updated" from `currentTime`

### PriceChart Tooltip (on BUY marker hover)
- Shows `initialTakeProfitProb` (매수시 익절확률)
- Shows `currentPrediction.takeProfitProb` (현재 익절확률)
- Shows "익절확률 업데이트" from `lastPredictionUpdateTime`
- Shows "마지막 업데이트" from `currentTime`

## Testing Checklist

- [ ] All timestamps are in milliseconds (13 digits, not 10)
- [ ] `currentTime` increments with each API call
- [ ] `lastPredictionUpdateTime` is set to when prediction was calculated
- [ ] `initialTakeProfitProb` is set when opening position
- [ ] `currentTakeProfitProb` matches `currentPrediction.takeProfitProb`
- [ ] `expectedTakeProfitTime` and `expectedStopLossTime` are set when holding
- [ ] All probability values are between 0 and 1
- [ ] Time predictions show reasonable future timestamps

## Questions?

If anything is unclear, refer to:
- `/src/types/dashboard.ts` for TypeScript definitions
- `/src/components/MetricsPanel.tsx` for MetricsPanel implementation
- `/src/components/PriceChart.tsx` for chart tooltip implementation
