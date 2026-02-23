# Kraken Futures Backend API Specification

## Overview
This document specifies the exact data structure that the Kraken Futures backend must provide to the frontend dashboard.

## API Endpoint

### GET `/api/kraken/dashboard`

Returns complete dashboard state including balance, position, strategy data, metrics, trades, and price history.

## Response Structure

```typescript
{
  // Meta Information
  "version": "1.0.0",           // Backend version string
  "accountName": "Kraken",      // Exchange name
  "symbol": "BTC/USD",          // Trading pair
  "currentTime": 1234567890000, // Unix timestamp in milliseconds
  "currentPrice": 95432.50,     // Current BTC price

  // Balance Information
  "balance": {
    "portfolioValue": 10500.00, // Total portfolio value (available + position value)
    "available": 10500.00       // Available balance for trading
  },

  // Position Information
  "position": {
    "in_position": true,        // Boolean: whether currently in a position
    "position_side": "LONG"     // "LONG" | "SHORT" | null
  },

  // Strategy A Data (Entry Strategy)
  "strategyA": {
    "entry_price": 95000.00,    // Entry price if in position, null otherwise
    "current_pnl": 0.45,        // Current profit/loss percentage (e.g., 0.45 = +0.45%)
    "entry_time": 1234567890000, // Unix timestamp when position was entered

    // Live Entry Conditions (9 conditions)
    "entry_conditions_live": {
      "1m_golden_cross": true,  // 1m EMA golden cross detected
      "5m_above": true,         // 5m EMA(5) above EMA(13)
      "15m_above": true,        // 15m EMA(3) above EMA(8)
      "30m_slope_up": false,    // 30m EMA slope is positive
      "5m_bbw": true,           // 5m Bollinger Band Width > 0.5%
      "15m_bbw": false,         // 15m Bollinger Band Width > 0.6%
      "30m_gap": true,          // 30m EMA gap > 0.08%
      "30m_adx": true,          // 30m ADX > 15
      "no_recent_loss": true    // No recent loss in last N trades
    }
  },

  // Performance Metrics
  "metrics": {
    // Returns
    "portfolioReturnWithCommission": 5.23,  // Net profit % (after fees)
    "portfolioReturn": 5.50,                // Gross profit % (before fees)
    "marketReturn": 2.30,                   // BTC price change % since start
    "avgTradeReturn": 0.85,                 // Average return per trade %
    "totalPnl": 523.00,                     // Total profit/loss in USD

    // Trade Statistics
    "totalTrades": 45,          // Total number of completed trades
    "takeProfitCount": 30,      // Number of profitable exits (TP + PP)
    "stopLossCount": 15,        // Number of loss exits (SL + HARD_SL)
    "winRate": 66.67            // Win rate percentage (TP/(TP+SL) * 100)
  },

  // Recent Trades (Last 7 Days, Max 40)
  "recentTrades": [
    // Entry Trade
    {
      "type": "buy",
      "price": 95000.00,
      "timestamp": 1234567890000,
      "side": "LONG"            // "LONG" | "SHORT"
    },

    // Exit Trade (Take Profit)
    {
      "type": "sell",
      "price": 95450.00,
      "timestamp": 1234567895000,
      "exitReason": "TP",       // Exit reason code
      "profit": 0.47,           // Profit/loss percentage
      "pnl": 45.00              // Profit/loss in USD
    },

    // Exit Trade (Partial Profit)
    {
      "type": "sell",
      "price": 95200.00,
      "timestamp": 1234567895000,
      "exitReason": "PP",
      "profit": 0.21,
      "pnl": 20.00
    },

    // Exit Trade (Stop Loss)
    {
      "type": "sell",
      "price": 94800.00,
      "timestamp": 1234567895000,
      "exitReason": "SL",
      "profit": -0.21,
      "pnl": -20.00
    },

    // Exit Trade (Hard Stop Loss)
    {
      "type": "sell",
      "price": 94500.00,
      "timestamp": 1234567895000,
      "exitReason": "HARD_SL",
      "profit": -0.53,
      "pnl": -50.00
    },

    // Exit Trade (Vanish Signal)
    {
      "type": "sell",
      "price": 95100.00,
      "timestamp": 1234567895000,
      "exitReason": "VANISH",
      "profit": 0.11,
      "pnl": 10.00
    },

    // Exit Trade (Timeout)
    {
      "type": "sell",
      "price": 95050.00,
      "timestamp": 1234567895000,
      "exitReason": "TIMEOUT",
      "profit": 0.05,
      "pnl": 5.00
    }
  ],

  // 1-Minute Price History (Last 500 Candles)
  "priceHistory1m": [
    {
      "time": 1234567890,       // Unix timestamp in SECONDS
      "open": 95000.00,
      "high": 95100.00,
      "low": 94950.00,
      "close": 95050.00,
      "volume": 1250.5
    }
    // ... 499 more candles
  ]
}
```

## Exit Reason Codes

| Code | Label | Description | Color |
|------|-------|-------------|-------|
| `TP` | TP | Take Profit - Target reached | Green |
| `PP` | PP | Partial Profit - Early exit with profit | Green |
| `SL` | SL | Stop Loss - Regular stop loss hit | Red |
| `HARD_SL` | Hard SL | Hard Stop Loss - Emergency stop | Red |
| `VANISH` | Vanish | Signal disappeared | Orange |
| `TIMEOUT` | Timeout | Position held too long | Cyan |

## Chart Data Endpoint

### GET `/api/kraken/chart/:timeframe/:limit`

Returns candlestick data for charting.

**Parameters:**
- `timeframe`: `"1m"` | `"5m"` | `"15m"` | `"30m"` | `"1h"` | `"4h"` | `"1d"`
- `limit`: Number of candles (1-1000)

**Response:**
```typescript
{
  "candles": [
    {
      "time": 1234567890,     // Unix timestamp in SECONDS
      "open": 95000.00,
      "high": 95100.00,
      "low": 94950.00,
      "close": 95050.00,
      "volume": 1250.5
    }
    // ... more candles
  ]
}
```

## Data Update Frequency

The frontend polls the dashboard endpoint every **10 seconds**.

Backend should:
- Update position and P&L in real-time
- Recalculate entry conditions every minute
- Append new trades to `recentTrades` array
- Maintain 7-day trade history (max 40 trades shown)
- Keep metrics up-to-date with latest trades

## Implementation Notes

### Entry Conditions Logic

All 9 conditions must be calculated and returned as boolean values:

1. **1m_golden_cross**: EMA(5) crosses above EMA(13) on 1-minute chart
2. **5m_above**: EMA(5) > EMA(13) on 5-minute chart
3. **15m_above**: EMA(3) > EMA(8) on 15-minute chart
4. **30m_slope_up**: 30-minute EMA slope is positive
5. **5m_bbw**: 5-minute Bollinger Band Width > 0.5%
6. **15m_bbw**: 15-minute Bollinger Band Width > 0.6%
7. **30m_gap**: Gap between fast and slow EMA on 30m > 0.08%
8. **30m_adx**: 30-minute ADX indicator > 15
9. **no_recent_loss**: No losing trades in recent history (define threshold)

### Trade Side Tracking

- When entering a position, include `"side": "LONG"` or `"side": "SHORT"` in the buy trade
- Frontend displays this in the trade history
- Position side shown in status panel and animated badge

### Liquidation Price Calculation

Frontend calculates liquidation price for display:
- **LONG**: `liquidation = entry_price * (1 - 0.95 / leverage)`
- **SHORT**: `liquidation = entry_price * (1 + 0.95 / leverage)`

Backend does not need to provide this.

### Performance Metrics

- **portfolioReturnWithCommission**: Primary metric, includes all fees
- **portfolioReturn**: Gross return before fees
- **marketReturn**: Buy-and-hold BTC return for comparison
- **avgTradeReturn**: Average return across all completed trades
- **totalPnl**: Absolute USD profit/loss

### Win Rate Calculation

```
winRate = (takeProfitCount / (takeProfitCount + stopLossCount)) * 100
```

Where:
- `takeProfitCount` = exits with TP or PP reasons
- `stopLossCount` = exits with SL or HARD_SL reasons

## Error Handling

If data is temporarily unavailable, return appropriate HTTP status codes:
- `500` - Server error (backend calculation failed)
- `503` - Service unavailable (Kraken API down)

Frontend will display error message and retry button.

## Example Test Data

See the main response structure above for a complete example.

For testing without live data:
- Set `in_position: false` to show "NO POSITION" state
- Set `entry_conditions_live` with varying true/false values to test visual states
- Include a mix of TP, SL, PP trades in `recentTrades` to test color coding
- Ensure `currentTime` is current Unix timestamp in milliseconds

## Migration from Spot Dashboard

Key differences from the spot dashboard:

1. **Position Side**: Added `position_side` field ("LONG" or "SHORT")
2. **Exit Reasons**: Expanded to include HARD_SL, PP, VANISH, TIMEOUT
3. **Entry Conditions**: Different set of 9 conditions specific to futures strategy
4. **Leverage**: Frontend displays 1x leverage (hardcoded for now)
5. **Liquidation**: Frontend calculates based on entry price and leverage

The overall structure remains similar to ease migration.
