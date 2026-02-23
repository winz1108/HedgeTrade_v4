# Futures Dashboard Backend Requirements

## 현물 UI와 동일한 레이아웃을 위한 필수 백엔드 필드

현물 대시보드의 `MetricsPanel.tsx`와 동일한 UI를 구현하기 위해 백엔드에서 제공해야 하는 필드들입니다.

---

## 1. 왼쪽 상단 패널: Status (자산 현황)

### 현재 구현
```typescript
{
  balance: {
    available: number;        // ✓ 있음
    portfolioValue: number;   // ✓ 있음
    currency: string;         // ✓ 있음
  }
}
```

### 추가 필요
```typescript
{
  balance: {
    available: number;
    portfolioValue: number;
    currency: string;

    // 추가 필요 ↓
    currentBTC: number;       // BTC로 환산한 자산 (현물의 currentBTC와 동일)
    currentCash: number;      // USDC 현금 잔고 (현물의 currentCash와 동일)
  }
}
```

**용도**:
- Total Asset 아래에 BTC/USDC 분리 표시
- 현물처럼 "BTC: $XX.XX / USDC: $XX.XX" 형식

---

## 2. 왼쪽 하단 패널: Buy Conditions (진입 조건 9개)

### 현재 구현
```typescript
{
  strategyA: {
    entry_conditions_live?: {
      '1m_ema_above'?: boolean;
      '5m_ema_above'?: boolean;
      '15m_ema38_above'?: boolean;
      '30m_slope_up'?: boolean;
      '5m_bbw'?: boolean;
      '15m_bbw'?: boolean;
      '30m_gap'?: boolean;
      '30m_adx'?: boolean;
      '1h_adx'?: boolean;
    }
  }
}
```

### 개선 필요
현재는 `entry_conditions_live`가 optional이고, 포지션 진입 시에만 표시됩니다.

**요구사항**:
- ✅ **항상 제공** (포지션 없을 때도)
- ✅ 9개 조건 모두 포함
- ✅ 각 조건의 true/false 상태

현물 UI는 다음과 같이 표시:
```
[✓] 1m GC (Entry)
[✗] 5m EMA(5>13)
[✓] 15m EMA(3>8)
...
```

---

## 3. 오른쪽 상단 패널: Performance (수익률 메트릭)

### 현재 구현
```typescript
{
  // ❌ 없음 - 전체 추가 필요
}
```

### 추가 필요
```typescript
{
  metrics: {
    // 필수 메트릭
    portfolioReturn: number;              // 포트폴리오 수익률 (%)
    portfolioReturnWithCommission: number; // 수수료 차감 후 순수익률 (%)
    marketReturn: number;                 // BTC 시장 변동률 (%)
    avgTradeReturn: number;               // 평균 거래 수익률 (%)

    // 수익 통계
    totalPnl: number;                     // 총 손익 (USDC)
    totalTrades: number;                  // 총 거래 횟수
    takeProfitCount: number;              // TP 횟수
    stopLossCount: number;                // SL 횟수
    winRate: number;                      // 승률 (%)
  }
}
```

**용도**:
- NET PROFIT (수수료 차감 후): `portfolioReturnWithCommission`
- Portfolio Return vs Market Change 비교
- 평균 거래 수익률

---

## 4. 오른쪽 하단 패널: Statistics (거래 통계)

위의 `metrics` 객체에 포함되어 있음:
- `takeProfitCount`: Profit (TP) 횟수
- `stopLossCount`: Loss (SL) 횟수
- `totalTrades`: 총 거래 횟수
- `winRate`: 승률 (%)

---

## 5. 거래 내역 패널: Recent Trades (최근 7일)

### 현재 구현
```typescript
{
  recentTrades: TradeEvent[];
}

interface TradeEvent {
  timestamp: number;
  type: 'buy' | 'sell';
  price: number;
  profit?: number;        // ✓ 있음
  exitReason?: string;    // ✓ 있음
  pnl?: number;           // ✓ 있음
}
```

### 개선 필요
현재 `recentTrades`는 있지만, 필요한 필드가 모두 포함되어야 함:

**요구사항**:
- ✅ `timestamp`: 거래 시간
- ✅ `type`: 'buy' | 'sell'
- ✅ `price`: 거래 가격
- ✅ `profit`: 수익률 (%) - SELL 거래에만
- ✅ `pnl`: 손익 (USDC) - SELL 거래에만
- ✅ `exitReason`: 청산 이유 - SELL 거래에만
  - 예: 'TP', 'SL', '15M_S', '15M_D', 'SMART_SCORE', etc.

---

## 6. 차트 데이터

### 현재 구현
```typescript
{
  priceHistory1m?: Candle[];   // ✓ 있음
  priceHistory5m?: Candle[];   // ✓ 있음
  priceHistory15m?: Candle[];  // ✓ 있음
  priceHistory30m?: Candle[];  // ✓ 있음
  priceHistory1h?: Candle[];   // ✓ 있음
  priceHistory4h?: Candle[];   // ✓ 있음
  priceHistory1d?: Candle[];   // ✓ 있음
}
```

**개선 필요**:
현재는 optional이지만, **최소한 1m, 5m, 15m, 30m, 1h는 필수**로 제공되어야 합니다.

---

## 요약: 백엔드 응답 구조

```typescript
{
  // 기본 정보
  exchange: "kraken",
  accountId: "futures_account_1",
  accountName: "Kraken Futures",
  mode: "futures",
  symbol: "BTC/USD",
  version: "1.0.0",
  currentPrice: 95234.50,
  currentTime: 1234567890000,
  systemStatus: "active",

  // 자산 (왼쪽 상단)
  balance: {
    available: 10000.00,
    portfolioValue: 10500.00,
    currency: "USD",
    currentBTC: 10500.00,      // ← 추가 필요
    currentCash: 500.00,       // ← 추가 필요
  },

  // 포지션
  position: {
    in_position: true,
    position_side: "LONG",
    entry_price: 95000.00,
    entry_quantity: 0.1,
    entry_time: "2024-01-01T00:00:00Z",
    mode: "futures",
    symbol: "BTC/USD",
    exchange: "kraken"
  },

  // 전략 A
  strategyA: {
    name: "전략 A",
    in_position: true,
    side: "LONG",
    entry_price: 95000.00,
    current_pnl: 0.25,
    mfe: 0.35,
    pp_stop: null,
    pp_activated: false,
    hard_sl: -5.0,
    vanished: 0,
    vanish_threshold: 8,
    total_conditions: 9,
    elapsed_min: 45,
    timeout_min: 2880,

    // ← 항상 제공 (포지션 없을 때도)
    entry_conditions_live: {
      '1m_ema_above': true,
      '5m_ema_above': true,
      '15m_ema38_above': false,
      '30m_slope_up': true,
      '5m_bbw': true,
      '15m_bbw': false,
      '30m_gap': true,
      '30m_adx': true,
      '1h_adx': true
    }
  },

  // 매도 조건
  sellConditions: {
    hard_sl: { ... },
    pp: { ... },
    vanish: { ... },
    timeout: { ... }
  },

  // 수익률 메트릭 (오른쪽 상단) ← 전체 추가 필요
  metrics: {
    portfolioReturn: 5.00,
    portfolioReturnWithCommission: 4.90,
    marketReturn: 2.47,
    avgTradeReturn: 0.85,
    totalPnl: 490.00,
    totalTrades: 15,
    takeProfitCount: 10,
    stopLossCount: 5,
    winRate: 66.67
  },

  // 최근 거래 (최근 7일)
  recentTrades: [
    {
      timestamp: 1234567890000,
      type: "sell",
      price: 95234.50,
      profit: 0.25,
      pnl: 23.45,
      exitReason: "TP"
    },
    // ...
  ],

  // 수수료
  feeRate: {
    maker: 0.02,
    taker: 0.05,
    roundTrip: 0.10,
    description: "Kraken Futures Fee",
    breakevenLinePct: 0.10
  },

  // 차트 데이터 (필수)
  priceHistory1m: [ ... ],
  priceHistory5m: [ ... ],
  priceHistory15m: [ ... ],
  priceHistory30m: [ ... ],
  priceHistory1h: [ ... ],
  priceHistory4h: [ ... ],
  priceHistory1d: [ ... ]
}
```

---

## 우선순위

### 🔴 Critical (UI 깨짐)
1. ✅ `priceHistory1m` - 차트 렌더링 필수
2. ❌ `balance.currentBTC` - 왼쪽 상단 자산 표시
3. ❌ `balance.currentCash` - 왼쪽 상단 자산 표시

### 🟡 High (주요 기능)
4. ❌ `metrics` 전체 - 오른쪽 상단 Performance 패널
5. ✅ `strategyA.entry_conditions_live` - 항상 제공 (현재는 포지션 시에만)
6. ✅ `recentTrades` - 완전한 필드 포함

### 🟢 Medium (부가 기능)
7. ❌ `metrics.winRate` - 자동 계산 가능하지만 백엔드 제공 권장
8. ✅ `priceHistory5m, 15m, 30m, 1h` - 멀티 타임프레임

---

## 현재 상태 체크리스트

### ✅ 이미 있는 것
- [x] `balance.available`
- [x] `balance.portfolioValue`
- [x] `currentPrice`
- [x] `position.*`
- [x] `strategyA.entry_price`
- [x] `strategyA.current_pnl`
- [x] `sellConditions.*`
- [x] `priceHistory1m`
- [x] `recentTrades` (구조는 있음)
- [x] `feeRate`

### ❌ 추가 필요
- [ ] `balance.currentBTC`
- [ ] `balance.currentCash`
- [ ] `metrics.portfolioReturn`
- [ ] `metrics.portfolioReturnWithCommission`
- [ ] `metrics.marketReturn`
- [ ] `metrics.avgTradeReturn`
- [ ] `metrics.totalPnl`
- [ ] `metrics.totalTrades`
- [ ] `metrics.takeProfitCount`
- [ ] `metrics.stopLossCount`
- [ ] `metrics.winRate`
- [ ] `strategyA.entry_conditions_live` (항상 제공)

---

## 테스트용 Mock 데이터 예시

```json
{
  "balance": {
    "available": 10000.00,
    "portfolioValue": 10490.00,
    "currency": "USD",
    "currentBTC": 10490.00,
    "currentCash": 490.00
  },
  "metrics": {
    "portfolioReturn": 4.90,
    "portfolioReturnWithCommission": 4.80,
    "marketReturn": 2.47,
    "avgTradeReturn": 0.85,
    "totalPnl": 480.00,
    "totalTrades": 15,
    "takeProfitCount": 10,
    "stopLossCount": 5,
    "winRate": 66.67
  }
}
```
