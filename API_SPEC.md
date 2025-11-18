# 대시보드 API 명세서

## 엔드포인트

### 1. 실시간 데이터 조회
- **URL**: `http://localhost:54321/api/dashboard`
- **Method**: `GET`
- **Content-Type**: `application/json`

### 2. 시뮬레이션 데이터 조회
- **URL**: `http://localhost:54321/api/sim_data`
- **Method**: `GET`
- **Content-Type**: `application/json`

---

## 응답 데이터 구조

### 최상위 객체 (DashboardData)

```typescript
{
  currentAsset: number;           // 현재 자산 (USD)
  initialAsset: number;           // 초기 자산 (USD)
  currentTime: number;            // 현재 시간 (Unix timestamp, milliseconds)
  currentPrice: number;           // 현재 BTC 가격 (USD) - 필수
  priceHistory1m: Candle[];       // 1분봉 가격 데이터 배열 (필수)
  priceHistory5m?: Candle[];      // 5분봉 가격 데이터 배열 (선택, 없으면 자동 생성)
  priceHistory15m?: Candle[];     // 15분봉 가격 데이터 배열 (선택, 없으면 자동 생성)
  priceHistory1h?: Candle[];      // 1시간봉 가격 데이터 배열 (선택, 없으면 자동 생성)
  pricePredictions: Candle[];     // 미래 예측 가격 데이터 배열 (필수, 빈 배열 가능)
  trades: TradeEvent[];           // 거래 이벤트 배열 (필수, 빈 배열 가능)
  holding: HoldingInfo;           // 현재 보유 상태 (필수)
  metrics: {                      // 성과 지표 (필수)
    portfolioReturn: number;      // 포트폴리오 수익률 (%)
    marketReturn: number;         // 시장 수익률 (%)
    avgTradeReturn: number;       // 평균 거래 수익률 (%)
    takeProfitCount: number;      // 익절 횟수
    stopLossCount: number;        // 손절 횟수
  };
}
```

---

## 상세 타입 정의

### Candle (캔들 데이터)

```typescript
{
  timestamp: number;              // 캔들 시작 시간 (Unix timestamp, milliseconds) - 필수
  open: number;                   // 시가 (USD) - 필수
  high: number;                   // 고가 (USD) - 필수
  low: number;                    // 저가 (USD) - 필수
  close: number;                  // 종가 (USD) - 필수
  volume: number;                 // 거래량 - 필수
  isPrediction?: boolean;         // 예측 데이터 여부 (선택, pricePredictions에서만 true)

  // ⭐ 기술 지표 (선택, 제공하면 차트에 표시됨)
  ema20?: number;                 // 20일 지수이동평균 (주황색 라인)
  ema50?: number;                 // 50일 지수이동평균 (파란색 라인)
  bb_upper?: number;              // 볼린저 밴드 상단 (회색 점선)
  bb_lower?: number;              // 볼린저 밴드 하단 (회색 점선)
  macd?: number;                  // MACD 값 (중간 패널, 파란색 라인)
  signal?: number;                // MACD Signal 값 (중간 패널, 주황색 라인)
  histogram?: number;             // MACD Histogram 값 (중간 패널, 히스토그램)
  rsi?: number;                   // RSI 값 (하단 패널, 0-100, 보라색 라인)
}
```

**예시:**
```json
{
  "timestamp": 1700000000000,
  "open": 95000.50,
  "high": 95200.00,
  "low": 94950.00,
  "close": 95100.75,
  "volume": 1234.56,
  "isPrediction": false,
  "ema20": 95050.25,
  "ema50": 94900.50,
  "bb_upper": 95500.00,
  "bb_lower": 94500.00,
  "macd": 120.50,
  "signal": 115.25,
  "histogram": 5.25,
  "rsi": 65.5
}
```

**주의사항:**
- 기술 지표는 모든 캔들에 일관되게 제공해야 합니다
- 일부 캔들만 제공하면 차트에서 라인이 끊어집니다
- 제공하지 않으면 해당 지표는 차트에 표시되지 않습니다

---

### TradeEvent (거래 이벤트)

```typescript
{
  timestamp: number;              // 거래 발생 시간 (Unix timestamp, milliseconds) - 필수
  type: 'buy' | 'sell';          // 거래 유형 (매수 또는 매도) - 필수
  price: number;                  // 거래 가격 (USD) - 필수
  pairId?: string;                // 매수-매도 쌍 식별자 (선택, 같은 pairId를 가진 buy/sell이 연결됨)

  prediction?: {                  // 거래 시점의 예측 데이터 (선택, buy 거래에서 제공 권장)
    takeProfitProb: number;       // 익절 확률 (0.0 ~ 1.0) - 필수
    stopLossProb: number;         // 손절 확률 (0.0 ~ 1.0) - 필수
    expectedTakeProfitTime: number;   // 예상 익절 시간 (Unix timestamp, milliseconds) - 필수
    expectedStopLossTime: number;     // 예상 손절 시간 (Unix timestamp, milliseconds) - 필수
    expectedTakeProfitPrice: number;  // 예상 익절 가격 (USD) - 필수
    expectedStopLossPrice: number;    // 예상 손절 가격 (USD) - 필수
  };
}
```

**예시:**
```json
{
  "timestamp": 1700000000000,
  "type": "buy",
  "price": 95000.00,
  "pairId": "trade-001",
  "prediction": {
    "takeProfitProb": 0.68,
    "stopLossProb": 0.32,
    "expectedTakeProfitTime": 1700003600000,
    "expectedStopLossTime": 1700007200000,
    "expectedTakeProfitPrice": 96500.00,
    "expectedStopLossPrice": 94000.00
  }
}
```

**주의사항:**
- `pairId`가 같은 buy와 sell이 차트에서 선으로 연결됩니다
- `prediction`은 buy 거래에만 제공하면 됩니다
- `takeProfitProb + stopLossProb`는 1.0이어야 합니다

---

### HoldingInfo (보유 상태)

```typescript
{
  isHolding: boolean;             // 현재 포지션 보유 여부 - 필수

  // ⭐ 아래 필드들은 isHolding이 true일 때만 제공
  buyPrice?: number;              // 매수 가격 (USD) - isHolding=true일 때 필수
  buyTime?: number;               // 매수 시간 (Unix timestamp, milliseconds) - isHolding=true일 때 필수
  currentProfit?: number;         // 현재 수익률 (%, 예: 2.5 = +2.5%) - isHolding=true일 때 필수
  takeProfitPrice?: number;       // 익절 목표 가격 (USD) - isHolding=true일 때 필수
  stopLossPrice?: number;         // 손절 목표 가격 (USD) - isHolding=true일 때 필수
  initialTakeProfitProb?: number; // ⭐ 매수 시점의 익절 확률 (0.0 ~ 1.0) - isHolding=true일 때 필수
  currentTakeProfitProb?: number; // ⭐ 현재 시점의 익절 확률 (0.0 ~ 1.0) - isHolding=true일 때 필수
}
```

**예시 1 (보유 중):**
```json
{
  "isHolding": true,
  "buyPrice": 95000.00,
  "buyTime": 1700000000000,
  "currentProfit": 2.15,
  "takeProfitPrice": 96500.00,
  "stopLossPrice": 94000.00,
  "initialTakeProfitProb": 0.65,
  "currentTakeProfitProb": 0.72
}
```

**예시 2 (보유 안함):**
```json
{
  "isHolding": false
}
```

**⚠️ 중요: 매도 주문과 체결의 구분**

매도 주문을 넣었더라도 **실제로 체결되기 전까지는** `isHolding: true`를 유지해야 합니다.

```json
// ✅ 올바른 예시: 매도 주문 넣음 (미체결)
{
  "holding": {
    "isHolding": true,              // ← 매도 주문 넣어도 체결 전까지 true
    "buyPrice": 95000.00,
    "buyTime": 1700000000000,
    "currentProfit": 2.15,
    "takeProfitPrice": 96500.00,
    "stopLossPrice": 94000.00,
    "initialTakeProfitProb": 0.65,
    "currentTakeProfitProb": 0.72
  }
}

// ✅ 올바른 예시: 매도 체결 완료
{
  "holding": {
    "isHolding": false              // ← 체결 완료 후 false
  },
  "trades": [
    {
      "timestamp": 1700000000000,
      "type": "buy",
      "price": 95000.00,
      "pairId": "trade-001"
    },
    {
      "timestamp": 1700003600000,
      "type": "sell",
      "price": 96500.00,
      "pairId": "trade-001"         // ← 같은 pairId로 연결
    }
  ]
}
```

---

## 완전한 응답 예시

```json
{
  "currentAsset": 10250.50,
  "initialAsset": 10000.00,
  "currentTime": 1700000000000,
  "currentPrice": 95100.50,
  "priceHistory1m": [
    {
      "timestamp": 1699999940000,
      "open": 95000.00,
      "high": 95100.00,
      "low": 94950.00,
      "close": 95050.00,
      "volume": 1234.56,
      "ema20": 95025.50,
      "ema50": 94900.25,
      "bb_upper": 95500.00,
      "bb_lower": 94500.00,
      "macd": 120.50,
      "signal": 115.25,
      "histogram": 5.25,
      "rsi": 65.5
    },
    {
      "timestamp": 1700000000000,
      "open": 95050.00,
      "high": 95150.00,
      "low": 95000.00,
      "close": 95100.50,
      "volume": 1456.78,
      "ema20": 95050.75,
      "ema50": 94925.50,
      "bb_upper": 95550.00,
      "bb_lower": 94550.00,
      "macd": 125.75,
      "signal": 118.50,
      "histogram": 7.25,
      "rsi": 67.2
    }
  ],
  "pricePredictions": [
    {
      "timestamp": 1700000060000,
      "open": 95100.50,
      "high": 95250.00,
      "low": 95050.00,
      "close": 95200.00,
      "volume": 1200.00,
      "isPrediction": true
    },
    {
      "timestamp": 1700000120000,
      "open": 95200.00,
      "high": 95350.00,
      "low": 95150.00,
      "close": 95300.00,
      "volume": 1100.00,
      "isPrediction": true
    }
  ],
  "trades": [
    {
      "timestamp": 1699990000000,
      "type": "buy",
      "price": 94500.00,
      "pairId": "trade-001",
      "prediction": {
        "takeProfitProb": 0.70,
        "stopLossProb": 0.30,
        "expectedTakeProfitTime": 1699993600000,
        "expectedStopLossTime": 1699997200000,
        "expectedTakeProfitPrice": 96000.00,
        "expectedStopLossPrice": 93500.00
      }
    },
    {
      "timestamp": 1699995000000,
      "type": "sell",
      "price": 95500.00,
      "pairId": "trade-001"
    },
    {
      "timestamp": 1699998000000,
      "type": "buy",
      "price": 95000.00,
      "pairId": "trade-002",
      "prediction": {
        "takeProfitProb": 0.65,
        "stopLossProb": 0.35,
        "expectedTakeProfitTime": 1700001600000,
        "expectedStopLossTime": 1700005200000,
        "expectedTakeProfitPrice": 96500.00,
        "expectedStopLossPrice": 94000.00
      }
    }
  ],
  "holding": {
    "isHolding": true,
    "buyPrice": 95000.00,
    "buyTime": 1699998000000,
    "currentProfit": 0.11,
    "takeProfitPrice": 96500.00,
    "stopLossPrice": 94000.00,
    "initialTakeProfitProb": 0.65,
    "currentTakeProfitProb": 0.72
  },
  "metrics": {
    "portfolioReturn": 2.51,
    "marketReturn": 1.85,
    "avgTradeReturn": 1.25,
    "takeProfitCount": 15,
    "stopLossCount": 8
  }
}
```

---

## 필수/선택 필드 요약

### ✅ 필수 필드 (반드시 제공해야 함)

**최상위 레벨:**
- `currentAsset`, `initialAsset`, `currentTime`, `currentPrice`
- `priceHistory1m` (최소 1개 이상의 Candle)
- `pricePredictions` (빈 배열 가능)
- `trades` (빈 배열 가능)
- `holding`, `metrics`

**Candle (priceHistory1m 내):**
- `timestamp`, `open`, `high`, `low`, `close`, `volume`

**HoldingInfo (isHolding=true일 때):**
- `buyPrice`, `buyTime`, `currentProfit`
- `takeProfitPrice`, `stopLossPrice`
- ⭐ **`initialTakeProfitProb`** (매우 중요)
- ⭐ **`currentTakeProfitProb`** (매우 중요)

**Metrics:**
- `portfolioReturn`, `marketReturn`, `avgTradeReturn`
- `takeProfitCount`, `stopLossCount`

### 🔹 선택 필드 (없어도 동작함)

- `priceHistory5m`, `priceHistory15m`, `priceHistory1h` (없으면 자동 생성)
- Candle 내 기술 지표: `ema20`, `ema50`, `bb_upper`, `bb_lower`, `macd`, `signal`, `histogram`, `rsi`
- TradeEvent의 `pairId`, `prediction`

---

## 중요 사항

### 1. Timestamp 형식
모든 timestamp는 **Unix timestamp (milliseconds)** 형식이어야 합니다.
- 예: `1700000000000` (2023-11-15 00:00:00 UTC)
- JavaScript: `Date.now()` 또는 `new Date().getTime()`
- Python: `int(time.time() * 1000)`

### 2. 가격 단위
모든 가격은 **USD** 기준입니다.

### 3. 확률 값
모든 확률 값은 **0.0 ~ 1.0** 사이의 소수입니다.
- 예: `0.65` = 65%, `0.32` = 32%
- `takeProfitProb + stopLossProb = 1.0`이어야 합니다

### 4. 수익률
퍼센트 단위로 표시합니다.
- 예: `2.5` = +2.5%, `-1.2` = -1.2%

### 5. 배열 순서
다음 배열들은 모두 **timestamp 오름차순**으로 정렬되어야 합니다:
- `priceHistory1m`, `priceHistory5m`, `priceHistory15m`, `priceHistory1h`
- `pricePredictions`
- `trades`

### 6. pairId 사용
- 매수와 매도를 연결하려면 같은 `pairId`를 사용하세요
- 차트에서 매수-매도 연결선이 표시됩니다
- 예: `"pairId": "trade-001"`

### 7. 기술 지표
- 제공하지 않으면 차트에 표시되지 않습니다
- 모든 캔들에 일관되게 제공하는 것을 권장합니다
- 일부만 제공하면 라인이 끊어집니다

### 8. holding 상태
- `isHolding`이 `false`인 경우, 나머지 필드는 제공하지 않거나 `null`로 설정하세요
- `isHolding`이 `true`인 경우, **모든 필드를 제공해야 합니다**
- 특히 `initialTakeProfitProb`와 `currentTakeProfitProb`는 필수입니다

---

## CORS 설정

백엔드에서 CORS를 허용해야 프론트엔드와 통신할 수 있습니다:

**FastAPI 예시:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Express 예시:**
```javascript
const cors = require('cors');
app.use(cors());
```

---

## 백엔드 서버 실행

서버를 `localhost` 또는 `127.0.0.1` 포트 `54321`에서 실행해야 합니다:

**FastAPI + uvicorn:**
```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=54321)
```

**Express:**
```javascript
app.listen(54321, '127.0.0.1', () => {
  console.log('Server running on http://127.0.0.1:54321');
});
```

⚠️ **주의**: `0.0.0.0`으로 실행하면 프론트엔드와 연결이 안 될 수 있습니다.

---

## 프론트엔드 연결

프론트엔드는 이미 설정되어 있습니다:
- Realtime 탭: `http://localhost:54321/api/dashboard` 호출
- Simulation 탭: `http://localhost:54321/api/sim_data` 호출

백엔드에서 위 두 엔드포인트를 구현하고 명세에 맞게 데이터를 반환하면 자동으로 연결됩니다.
