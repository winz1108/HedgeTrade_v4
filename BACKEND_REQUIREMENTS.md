# 백엔드 API 요구사항 명세서

## 목차
1. [개요](#개요)
2. [REST API 엔드포인트](#rest-api-엔드포인트)
3. [WebSocket 이벤트](#websocket-이벤트)
4. [데이터 구조](#데이터-구조)
5. [매매 기록 및 페어링](#매매-기록-및-페어링)
6. [툴팁 양식](#툴팁-양식)
7. [메트릭 및 통계](#메트릭-및-통계)

---

## 개요

이 문서는 HedgeTrade 프론트엔드가 백엔드에 요구하는 모든 데이터 구조, API 엔드포인트, WebSocket 이벤트를 정의합니다.

**중요 사항:**
- 모든 시간은 밀리초 단위 타임스탬프 (Unix timestamp in milliseconds)
- 가격은 USD 기준 소수점 표시
- 퍼센트는 0-1 사이의 소수 (예: 0.75 = 75%)

---

## REST API 엔드포인트

### 1. 대시보드 데이터 조회
**엔드포인트:** `GET /api/data`

**쿼리 파라미터:**
- `accountId` (optional): 특정 계정 ID (예: `Account_A`, `Account_B`)

**응답 구조:**
```json
{
  "version": "v2.0.0",
  "cacheStatus": "CACHE_HIT",
  "currentTime": 1705334400000,
  "currentPrice": 42150.50,
  "priceHistory1m": [...], // Candle 배열 (최대 500개)
  "priceHistory5m": [...], // Candle 배열 (최대 500개)
  "priceHistory15m": [...],
  "priceHistory30m": [...],
  "priceHistory1h": [...],
  "priceHistory4h": [...],
  "priceHistory1d": [...],
  "currentPrediction": {
    "v5MoeTakeProfitProb": 0.68,
    "v5MoeStopLossProb": 0.32,
    "takeProfitProb": 0.72,
    "stopLossProb": 0.28,
    "lastUpdateTime": 1705334400000,
    "predictionTargetTimestampMs": 1705334700000,
    "marketState": {...},
    "gateWeights": [0.15, 0.25, 0.30, 0.20, 0.10]
  },
  "lastPredictionUpdateTime": 1705334400000,
  "marketState": {
    "bullDiv": 0.15,
    "bullConv": 0.25,
    "sideways": 0.30,
    "bearConv": 0.20,
    "bearDiv": 0.10,
    "activeState": "sideways"
  },
  "gateWeights": [0.15, 0.25, 0.30, 0.20, 0.10],
  "accounts": [...], // AccountData 배열
  "metrics": {
    "portfolioReturn": 12.45,
    "totalTrades": 150,
    "winningTrades": 105,
    "winRate": 70.0,
    "marketReturn": 8.30
  }
}
```

### 2. 차트 데이터 조회
**엔드포인트:** `GET /api/chart_data`

**쿼리 파라미터:**
- `timeframe` (required): `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`
- `limit` (optional, default: 500): 반환할 캔들 개수

**응답 구조:**
```json
{
  "candles": [...], // Candle 배열
  "count": 500
}
```

### 3. 디버그/검증 엔드포인트
**엔드포인트:** `GET /api/debug`

**응답:** JSON 형식의 서버 상태 정보

### 4. 실시간 성능 지표
**엔드포인트:** `GET /api/realtime_performance`

**응답:** JSON 형식의 실시간 성능 통계

---

## WebSocket 이벤트

**네임스페이스:** `/ws/dashboard`

**연결 URL:**
- 개발: `ws://localhost:54321/ws/dashboard`
- 프로덕션: `wss://api.hedgetrade.eu/ws/dashboard`

**Socket.IO 설정:**
```javascript
{
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity
}
```

### 이벤트 목록

#### 1. `price_update` (고빈도)
**빈도:** 초당 1회
**데이터 구조:**
```typescript
{
  currentPrice: number,      // 현재 BTC 가격
  currentTime: number        // 밀리초 타임스탬프
}
```

#### 2. `realtime_candle_update` (5분봉 실시간 업데이트)
**빈도:** 5분봉 진행 중 실시간 업데이트
**데이터 구조:**
```typescript
{
  timeframe: "5m",
  openTime: number,          // 캔들 시작 시간 (밀리초)
  closeTime: number,         // 캔들 종료 시간 (밀리초)
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
  isFinal: boolean,          // true면 완성된 캔들, false면 진행중
  timestamp: string,         // ISO 8601 형식
  rsi?: number,              // RSI 지표 (14)
  macd?: number,
  macdSignal?: number,
  macdHistogram?: number,
  bbUpper?: number,          // 볼린저 밴드 상단
  bbMiddle?: number,         // 볼린저 밴드 중간 (SMA 20)
  bbLower?: number,          // 볼린저 밴드 하단
  bbWidth?: number,          // 볼린저 밴드 폭
  ema20?: number,            // EMA 20
  ema50?: number             // EMA 50
}
```

**동작:**
- `isFinal: false`: 진행 중인 캔들 업데이트 (기존 미완성 캔들 교체)
- `isFinal: true`: 캔들 완성 (새 캔들로 추가, 가장 오래된 캔들 제거)

#### 3. `candle_update` (다른 타임프레임 업데이트)
**빈도:** 각 타임프레임별 캔들 완성 시
**데이터 구조:** `realtime_candle_update`와 동일하나 `timeframe` 값이 다름
```typescript
{
  timeframe: "1m" | "15m" | "30m" | "1h" | "4h" | "1d",
  // ... 나머지는 realtime_candle_update와 동일
}
```

#### 4. `candle_complete` (캔들 완성 알림)
**빈도:** 캔들 완성 시
**데이터 구조:** `candle_update`와 동일하며 `isFinal: true`

#### 5. `account_assets_update` (계좌 자산 업데이트)
**빈도:** 거래 발생 시 또는 가격 변동에 따른 자산 변화 시
**데이터 구조:**
```typescript
{
  accountId: string,         // 예: "Account_A"
  asset: {
    currentAsset: number,    // 현재 총 자산 (USD)
    currentBTC: number,      // BTC 보유량 기준 USD 가치
    currentCash: number,     // USDC 보유량 (USD)
    initialAsset: number     // 초기 자산 (USD)
  }
}
```

#### 6. `binance_server_time` (바이낸스 서버 시간 동기화)
**빈도:** 주기적 (예: 초당 1회)
**데이터 구조:**
```typescript
{
  serverTime: number         // 바이낸스 서버 시간 (밀리초)
}
```

---

## 데이터 구조

### Candle (캔들스틱 데이터)
```typescript
{
  timestamp: number,         // 캔들 시작 시간 (밀리초)
  open: number,              // 시가
  high: number,              // 고가
  low: number,               // 저가
  close: number,             // 종가
  volume: number,            // 거래량
  isComplete?: boolean,      // 완성 여부
  isPrediction?: boolean,    // 예측 데이터 여부

  // 기술적 지표 (선택사항)
  ema20?: number,
  ema50?: number,
  bb_upper?: number,         // 또는 bbUpper
  bb_lower?: number,         // 또는 bbLower
  bbUpper?: number,
  bbMiddle?: number,
  bbLower?: number,
  bbWidth?: number,
  macd?: number,
  signal?: number,           // MACD 시그널
  histogram?: number,        // MACD 히스토그램
  rsi?: number
}
```

### TradeEvent (매매 이벤트)
```typescript
{
  timestamp: number,         // 거래 발생 시간 (밀리초)
  type: "buy" | "sell",     // 매수/매도
  price: number,             // 거래 가격
  profit?: number,           // 수익률 (%) - 매도 시에만
  pairId?: string,           // 매수-매도 페어링 ID

  // 매수 시 예측 정보 (선택사항)
  prediction?: {
    takeProfitProb: number,              // 익절 확률 (0-1)
    stopLossProb: number,                // 손절 확률 (0-1)
    expectedTakeProfitTime: number,      // 예상 익절 시간 (밀리초)
    expectedStopLossTime: number,        // 예상 손절 시간 (밀리초)
    expectedTakeProfitPrice: number,     // 예상 익절 가격
    expectedStopLossPrice: number        // 예상 손절 가격
  }
}
```

### HoldingInfo (현재 보유 정보)
```typescript
{
  isHolding: boolean,                    // 현재 보유 중 여부

  // 보유 중일 때만 제공
  buyPrice?: number,                     // 매수 가격
  buyTime?: number,                      // 매수 시간 (밀리초)
  currentProfit?: number,                // 현재 수익률 (%)
  takeProfitPrice?: number,              // 익절 목표 가격
  stopLossPrice?: number,                // 손절 목표 가격
  initialTakeProfitProb?: number,        // 매수 시 익절 확률 (0-1)
  v5MoeTakeProfitProb?: number,          // v5 MoE 익절 확률 (0-1)

  // 현재 예측 (선택사항)
  latestPrediction?: {
    takeProfitProb: number,
    stopLossProb: number
  }
}
```

### MarketState (시장 상태)
```typescript
{
  bullDiv: number,           // 강세 발산 확률 (0-1)
  bullConv: number,          // 강세 수렴 확률 (0-1)
  bearDiv: number,           // 약세 발산 확률 (0-1)
  bearConv: number,          // 약세 수렴 확률 (0-1)
  sideways: number,          // 횡보 확률 (0-1)
  activeState: string        // "bullDiv" | "bullConv" | "bearDiv" | "bearConv" | "sideways"
}
```

### AccountAsset (계좌 자산)
```typescript
{
  currentAsset: number,      // 현재 총 자산 (USD)
  initialAsset: number,      // 초기 자산 (USD)
  currentBTC: number,        // BTC 가치 (USD)
  currentCash: number,       // USDC 잔액 (USD)
  btcQuantity: number,       // BTC 보유 수량
  usdcFree: number,          // 사용 가능 USDC
  usdcLocked: number         // 잠긴 USDC
}
```

### AccountHolding (계좌 보유 정보)
```typescript
{
  hasPosition: boolean,      // 포지션 보유 여부

  // 포지션 보유 시
  entryPrice?: number,       // 진입 가격
  quantity?: number,         // 보유 수량
  currentPrice?: number,     // 현재 가격
  unrealizedPnl?: number,    // 미실현 손익 (USD)
  unrealizedPnlPct?: number, // 미실현 손익률 (%)
  tpPrice?: number,          // 익절 가격
  slPrice?: number,          // 손절 가격
  entryTime?: number,        // 진입 시간 (밀리초)
  initialTakeProfitProb?: number  // 진입 시 익절 확률 (0-1)
}
```

### AccountTrade (완료된 거래)
```typescript
{
  entryPrice: number,        // 진입 가격
  exitPrice: number,         // 청산 가격
  quantity: number,          // 거래 수량
  entryTime: number,         // 진입 시간 (밀리초)
  exitTime: number,          // 청산 시간 (밀리초)
  pnl: number,              // 손익 (USD)
  pnlPct: number,           // 손익률 (%)
  profit: number,           // 수익 (USD)
  exitReason: "TP" | "SL",  // 청산 사유 (익절/손절)
  completed: boolean        // 완료 여부 (항상 true)
}
```

### AccountMetrics (계좌 메트릭)
```typescript
{
  portfolioReturn: number,              // 포트폴리오 수익률 (%)
  portfolioReturnWithCommission?: number, // 수수료 반영 수익률 (%)
  totalTrades: number,                  // 총 거래 수
  winningTrades: number,                // 익절 거래 수
  winRate: number,                      // 승률 (%)
  totalPnl?: number,                    // 총 손익 (USD)
  avgPnl?: number                       // 평균 손익 (USD)
}
```

### AccountData (계좌 데이터)
```typescript
{
  accountId: string,         // 예: "Account_A"
  accountName?: string,      // 예: "메인 계좌"
  asset: AccountAsset,
  holding: AccountHolding,
  trades: AccountTrade[],    // 완료된 거래 목록
  metrics: AccountMetrics
}
```

### DashboardData (통합 대시보드 데이터)
```typescript
{
  version?: string,                      // API 버전
  currentAsset: number,                  // 현재 총 자산
  currentBTC?: number,                   // BTC 가치
  currentCash?: number,                  // USDC 잔액
  initialAsset: number,                  // 초기 자산
  currentTime: number,                   // 현재 시간 (밀리초)
  currentPrice: number,                  // 현재 BTC 가격

  // 차트 데이터
  priceHistory1m: Candle[],
  priceHistory5m?: Candle[],
  priceHistory15m?: Candle[],
  priceHistory30m?: Candle[],
  priceHistory1h?: Candle[],
  priceHistory4h?: Candle[],
  priceHistory1d?: Candle[],
  pricePredictions: Candle[],            // 예측 캔들 (선택사항)

  // 거래 이벤트
  trades: TradeEvent[],                  // 매매 기록 (최근 30일)
  holding: HoldingInfo,

  // 예측 정보
  currentPrediction?: {
    takeProfitProb: number,
    stopLossProb: number,
    v5MoeTakeProfitProb?: number,
    predictionDataTimestamp?: number,    // 예측 데이터 기준 시간
    predictionCalculatedAt?: number,     // 예측 계산 시간
    v2UpdateCount?: number,
    v2LastUsed5minTimestamp?: number
  },
  lastPredictionUpdateTime?: number,

  // 시장 상태
  marketState?: MarketState,
  gateWeights?: number[],                // MoE 게이트 가중치

  // 메트릭
  metrics: {
    portfolioReturn: number,
    portfolioReturnWithCommission?: number,
    marketReturn: number,
    avgTradeReturn: number,
    takeProfitCount: number,            // 익절 횟수
    stopLossCount: number               // 손절 횟수
  },

  // 계정 정보
  accountId?: string,
  accountName?: string,
  availableAccounts?: Array<{
    id: string,
    name: string
  }>
}
```

---

## 매매 기록 및 페어링

### 페어링 로직
프론트엔드는 매수(buy)와 매도(sell) 이벤트를 자동으로 페어링합니다:

1. **pairId가 있는 경우**: `pairId`를 기준으로 매수-매도를 매칭
2. **pairId가 없는 경우**: 타임스탬프 순서대로 가장 가까운 매수-매도를 자동 매칭

**권장 구현:**
```typescript
// 백엔드에서 매도 시 pairId 설정 예시
{
  timestamp: 1705334700000,
  type: "sell",
  price: 42500.00,
  profit: 2.35,              // 수익률 (%)
  pairId: "trade_12345"      // 매수 이벤트의 타임스탬프 또는 고유 ID
}
```

### 매매 기록 필터링
- **기본 표시:** 최근 7일 매매 기록
- **최대 표시:** 40개
- **정렬:** 최신순 (역순)

---

## 툴팁 양식

### 매수(Buy) 버튼 호버 툴팁

#### 케이스 1: 현재 보유 중 (isHolding: true)
```
[Buy] 매수 $42,150.50
2024-01-15 14:30:00

=== 매수 시 예측 (Initial) ===
익절 확률       72.5%
손절 확률       27.5%
익절확률 업데이트  14:30:00
예상 익절가     $43,200.00
예상 손절가     $41,500.00

=== 현재 결과 (Current) ===
현재가         $42,500.00
수익률         +0.83%
경과 시간      25분
마지막 업데이트  14:55:00
✓ 진행 중
```

#### 케이스 2: 보유하지 않음 (isHolding: false)
```
[Buy] 매수 $42,150.50
2024-01-15 14:30:00

=== 현재 상태 ===
현재가         $42,500.00
현재 수익률     +0.83%
보유 시간      25분
```

### 매도(Sell) 버튼 호버 툴팁

#### 케이스 1: 페어링된 거래 (완료된 거래)
```
[Sell] 매도 $42,500.00
2024-01-15 14:55:00

거래 완료

매수가         $42,150.50
매도가         $42,500.00
수익률         +0.83%
보유 시간      25분
```

#### 케이스 2: 페어링 안 된 매수 (보유 중)
```
[Buy] 보유 중
2024-01-15 14:30:00

매수가         $42,150.50
현재가         $42,500.00
현재 수익률     +0.83%
```

### 툴팁 표시 조건
- **익절 달성**: 현재가 >= 익절가 → "✓ 익절 달성" (녹색)
- **손절 발생**: 현재가 <= 손절가 → "✗ 손절 발생" (빨강)
- **진행 중**: 그 외 → "진행 중" (회색)

---

## 메트릭 및 통계

### 좌측 패널 (Current Status)

#### Total Asset
```
Total Asset: $10,245.67
  BTC:  $3,456.78
  USDC: $6,788.89
```

#### Holding Status
```
보유 중:
  Buy Price:      $42,150.50
  Current Profit: +0.83%
```

#### Target Levels (보유 중일 때만)
```
Take Profit: $43,200.00
Stop Loss:   $41,500.00
```

### Take Profit Probability

#### 보유 중일 때
```
Initial (At Buy)    72.5%  [파란색 바]
  매수 시간: 14:30:00

Current            68.2%  [녹색 바]
  계산 시간: 14:55:00

Change             -4.3%  [빨강/녹색]
```

#### 보유 안 할 때
```
Current Prediction  72.5%  [녹색 바]
  계산 시간: 14:55:00

No active position
```

### 우측 패널 (Performance)

```
ACTUAL PROFIT       +12.45%  [큰 글씨, 녹색 박스]

Portfolio Return    +12.45%
Market Change       +8.30%
Avg Trade Return    +0.83%
```

### Trade Statistics (30일 기준)

```
Take Profit Exits   105  [녹색]
Stop Loss Exits     45   [빨강]

Win Rate           70.0%  [파란색 바]
```

### Recent Trades (최근 7일, 최대 40개)

```
[BUY]  $42,150.50
       2024-01-15 14:30:00

[SELL] $42,500.00
       2024-01-15 14:55:00

...
```

---

## 추가 요구사항

### 시간 관련
- **모든 타임스탬프**: 밀리초 단위 Unix timestamp
- **바이낸스 서버 시간**: WebSocket을 통해 주기적으로 전송하여 클라이언트 시간 동기화

### 가격 정밀도
- **BTC 가격**: 소수점 2자리까지 표시
- **수익률**: 소수점 2자리까지 표시 (예: +12.34%)
- **확률**: 소수점 1자리까지 표시 (예: 72.5%)

### 캔들 데이터
- **권장 개수**: 각 타임프레임당 500개
- **기술적 지표**: 가능하면 백엔드에서 계산하여 제공
  - EMA 20, EMA 50
  - Bollinger Bands (20, 2σ)
  - MACD (12, 26, 9)
  - RSI (14)

### 거래 데이터
- **보관 기간**: 최소 30일
- **페어링**: 가능하면 백엔드에서 pairId 설정 권장

### 성능 고려사항
- **WebSocket 이벤트 빈도**:
  - `price_update`: 초당 1회
  - `realtime_candle_update`: 진행 중인 캔들만 (5분봉)
  - `candle_update`: 완성된 캔들만
  - `account_assets_update`: 거래 발생 시 또는 중요한 변화 시

### 에러 처리
- **HTTP 상태 코드**: 표준 REST API 상태 코드 사용
- **WebSocket 재연결**: 클라이언트가 자동 재연결 지원

---

## 디버그 엔드포인트 (권장사항)

### `/api/debug`
서버 상태, 캐시 상태, 실행 중인 전략 등 디버그 정보 제공

### `/api/realtime_performance`
실시간 성능 지표, 거래 통계, 시스템 메트릭 제공

---

## 참고 사항

1. **다중 계정 지원**: `accountId`를 통해 여러 계정 관리
2. **버전 관리**: API 버전 정보를 응답에 포함하여 호환성 관리
3. **캐시 전략**: `cacheStatus`를 통해 캐시 적중 여부 표시 권장
4. **타임존**: 서버는 UTC, 클라이언트가 로컬 타임존으로 변환
5. **에러 메시지**: 사용자 친화적인 에러 메시지 제공

---

## 예제 응답

### 성공적인 대시보드 데이터 응답 예제
```json
{
  "version": "v2.1.0",
  "cacheStatus": "CACHE_HIT",
  "currentTime": 1705334400000,
  "currentPrice": 42150.50,
  "priceHistory1m": [
    {
      "timestamp": 1705334340000,
      "open": 42145.00,
      "high": 42155.00,
      "low": 42140.00,
      "close": 42150.50,
      "volume": 12.45,
      "isComplete": true,
      "ema20": 42100.00,
      "ema50": 42050.00,
      "bbUpper": 42250.00,
      "bbMiddle": 42150.00,
      "bbLower": 42050.00,
      "bbWidth": 200.00,
      "macd": 15.5,
      "signal": 12.3,
      "histogram": 3.2,
      "rsi": 68.5
    }
  ],
  "currentPrediction": {
    "takeProfitProb": 0.725,
    "stopLossProb": 0.275,
    "v5MoeTakeProfitProb": 0.680,
    "lastUpdateTime": 1705334400000,
    "predictionTargetTimestampMs": 1705334700000,
    "marketState": {
      "bullDiv": 0.15,
      "bullConv": 0.25,
      "sideways": 0.30,
      "bearConv": 0.20,
      "bearDiv": 0.10,
      "activeState": "sideways"
    },
    "gateWeights": [0.15, 0.25, 0.30, 0.20, 0.10]
  },
  "accounts": [
    {
      "accountId": "Account_A",
      "accountName": "메인 계좌",
      "asset": {
        "currentAsset": 10245.67,
        "initialAsset": 10000.00,
        "currentBTC": 3456.78,
        "currentCash": 6788.89,
        "btcQuantity": 0.082,
        "usdcFree": 6788.89,
        "usdcLocked": 0.00
      },
      "holding": {
        "hasPosition": true,
        "entryPrice": 42150.50,
        "quantity": 0.082,
        "currentPrice": 42500.00,
        "unrealizedPnl": 28.67,
        "unrealizedPnlPct": 0.83,
        "tpPrice": 43200.00,
        "slPrice": 41500.00,
        "entryTime": 1705333800000,
        "initialTakeProfitProb": 0.725
      },
      "trades": [
        {
          "entryPrice": 41000.00,
          "exitPrice": 41500.00,
          "quantity": 0.100,
          "entryTime": 1705247400000,
          "exitTime": 1705248900000,
          "pnl": 50.00,
          "pnlPct": 1.22,
          "profit": 50.00,
          "exitReason": "TP",
          "completed": true
        }
      ],
      "metrics": {
        "portfolioReturn": 12.45,
        "portfolioReturnWithCommission": 11.89,
        "totalTrades": 150,
        "winningTrades": 105,
        "winRate": 70.0,
        "totalPnl": 1245.67,
        "avgPnl": 8.30
      }
    }
  ],
  "metrics": {
    "portfolioReturn": 12.45,
    "totalTrades": 150,
    "winningTrades": 105,
    "winRate": 70.0,
    "marketReturn": 8.30
  }
}
```

---

## 문서 버전
- **버전**: 1.0.0
- **최종 수정일**: 2024-01-15
- **작성자**: HedgeTrade 프론트엔드 팀
