# 프론트엔드에서 기대하는 API 필드 명세

이 문서는 프론트엔드가 백엔드 API로부터 받을 것으로 기대하는 모든 필드들을 정리합니다.

## 1. 기본 정보

```typescript
{
  version: string;                    // API 버전 정보
  currentTime: number;                // 현재 시간 (밀리초 타임스탬프)
  currentPrice: number;               // 현재 BTC 가격
}
```

## 2. 자산 정보

```typescript
{
  currentAsset: number;               // 현재 총 자산 (USD)
  currentBTC: number;                 // BTC 보유량 (USD 환산)
  currentCash: number;                // USDC 보유량
  initialAsset: number;               // 초기 자산 (USD)
}
```

## 3. 가격 히스토리

각 타임프레임별 캔들 데이터 배열:

```typescript
{
  priceHistory1m: Candle[];          // 1분봉 히스토리
  priceHistory5m: Candle[];          // 5분봉 히스토리
  priceHistory15m: Candle[];         // 15분봉 히스토리
  priceHistory30m: Candle[];         // 30분봉 히스토리
  priceHistory1h: Candle[];          // 1시간봉 히스토리
  priceHistory4h: Candle[];          // 4시간봉 히스토리
  priceHistory1d: Candle[];          // 일봉 히스토리
  pricePredictions: Candle[];        // 가격 예측 데이터
}
```

### 3.1 Candle 객체 구조

```typescript
interface Candle {
  timestamp: number;                 // 캔들 시작 시간 (밀리초)
  open: number;                      // 시가
  high: number;                      // 고가
  low: number;                       // 저가
  close: number;                     // 종가
  volume: number;                    // 거래량
  isComplete?: boolean;              // 캔들 완성 여부
  isPrediction?: boolean;            // 예측 데이터 여부

  // 기술적 지표
  ema20?: number;                    // 20 EMA
  ema50?: number;                    // 50 EMA
  bbUpper?: number;                  // 볼린저 밴드 상단
  bbMiddle?: number;                 // 볼린저 밴드 중간
  bbLower?: number;                  // 볼린저 밴드 하단
  bbWidth?: number;                  // 볼린저 밴드 폭
  macd?: number;                     // MACD
  signal?: number;                   // MACD 시그널
  histogram?: number;                // MACD 히스토그램
  rsi?: number;                      // RSI

  // 백엔드 호환성을 위한 필드 (자동 변환됨)
  bb_upper?: number;                 // bbUpper와 동일
  bb_lower?: number;                 // bbLower와 동일
}
```

## 4. 예측 정보 (currentPrediction)

⭐ **중요**: 예측 관련 시간 필드

```typescript
{
  currentPrediction: {
    takeProfitProb: number;                    // 익절 확률 (0~1)
    stopLossProb: number;                      // 손절 확률 (0~1)
    v5MoeTakeProfitProb?: number;              // V5 MoE 모델 익절 확률 (0~1)

    // ⭐ 예측 시간 관련 필드
    predictionDataTimestamp?: number;          // 예측에 사용된 데이터의 기준 시간 (밀리초)
    predictionCalculatedAt?: number;           // 예측이 실제로 계산된 시간 (밀리초)

    // 기타 필드
    v2UpdateCount?: number;                    // V2 업데이트 카운트
    v2LastUsed5minTimestamp?: number;          // V2가 마지막으로 사용한 5분 타임스탬프
  };

  lastPredictionUpdateTime?: number;           // 마지막 예측 업데이트 시간 (밀리초)
}
```

### 4.1 백엔드에서 프론트엔드로 변환되는 필드명

백엔드에서 다음 필드명을 사용하면 프론트엔드에서 자동 변환됩니다:

```typescript
// 백엔드 → 프론트엔드 매핑
{
  predictionTargetTimestampMs → predictionDataTimestamp
  lastUpdateTime → predictionCalculatedAt
}
```

## 5. 보유 정보 (holding)

```typescript
{
  holding: {
    isHolding: boolean;                        // 보유 여부
    buyPrice?: number;                         // 매수 가격
    buyTime?: number;                          // 매수 시간 (밀리초)
    currentProfit?: number;                    // 현재 수익률 (%)
    takeProfitPrice?: number;                  // 익절 목표 가격
    stopLossPrice?: number;                    // 손절 가격
    initialTakeProfitProb?: number;            // 매수 시점의 초기 익절 확률 (0~1)
    v5MoeTakeProfitProb?: number;              // V5 MoE 모델 익절 확률 (0~1)
    latestPrediction?: {
      takeProfitProb: number;                  // 최신 익절 확률
      stopLossProb: number;                    // 최신 손절 확률
    };
  }
}
```

## 6. 거래 정보 (trades)

```typescript
{
  trades: TradeEvent[];
}

interface TradeEvent {
  timestamp: number;                           // 거래 시간 (밀리초)
  type: 'buy' | 'sell';                       // 거래 유형
  price: number;                               // 거래 가격
  profit?: number;                             // 수익률 (%) - sell 타입일 때만
  pairId?: string;                             // 매수-매도 페어 ID
  prediction?: {                               // 거래 시점의 예측 정보
    takeProfitProb: number;
    stopLossProb: number;
    expectedTakeProfitTime: number;
    expectedStopLossTime: number;
    expectedTakeProfitPrice: number;
    expectedStopLossPrice: number;
  };
}
```

## 7. 성과 메트릭 (metrics)

```typescript
{
  metrics: {
    portfolioReturn: number;                   // 포트폴리오 수익률 (%)
    portfolioReturnWithCommission?: number;    // 수수료 포함 수익률 (%)
    marketReturn: number;                      // 시장 수익률 (%)
    avgTradeReturn: number;                    // 평균 거래 수익률 (%)
    takeProfitCount: number;                   // 익절 거래 횟수
    stopLossCount: number;                     // 손절 거래 횟수
  }
}
```

## 8. 시장 상태 (marketState)

```typescript
{
  marketState: {
    bullDiv: number;                           // 상승 발산 확률 (0~1)
    bullConv: number;                          // 상승 수렴 확률 (0~1)
    bearDiv: number;                           // 하락 발산 확률 (0~1)
    bearConv: number;                          // 하락 수렴 확률 (0~1)
    sideways: number;                          // 횡보 확률 (0~1)
    activeState: string;                       // 활성 상태명
  }
}
```

## 9. 게이트 가중치

```typescript
{
  gateWeights: number[];                       // 게이트 가중치 배열
}
```

## 10. 계정 정보

```typescript
{
  accountId?: string;                          // 현재 계정 ID
  accountName?: string;                        // 현재 계정 이름
  availableAccounts?: Array<{                  // 사용 가능한 계정 목록
    id: string;                                // 계정 ID
    name: string;                              // 계정 이름
  }>;
}
```

## 11. 거래 설정 (tradingConfig)

```typescript
{
  tradingConfig?: {
    takeProfitPercent: number;                 // 익절 목표 비율 (%)
    stopLossPercent: number;                   // 손절 비율 (%)
  }
}
```

## 12. WebSocket 이벤트

프론트엔드는 다음 WebSocket 이벤트를 수신합니다:

### 12.1 price_update
```typescript
{
  currentPrice: number;
  currentTime: number;
}
```

### 12.2 realtime_candle_update
```typescript
{
  timeframe: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isFinal: boolean;
  timestamp: string;

  // 기술적 지표
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  bbWidth?: number;
  ema20?: number;
  ema50?: number;
}
```

### 12.3 candle_update
```typescript
// realtime_candle_update와 동일한 구조
```

### 12.4 account_assets_update
```typescript
{
  accountId: string;
  asset: {
    currentAsset: number;
    currentBTC: number;
    currentCash: number;
    initialAsset: number;
  };
}
```

### 12.5 binance_server_time
```typescript
{
  serverTime: number;
}
```

### 12.6 prediction_update
```typescript
{
  success: boolean;
  prediction?: {
    prob: number;                              // 익절 확률
    stopLossProb: number;                      // 손절 확률
    predictionCalculatedAt: number;            // ⭐ 예측 계산 시간
    predictionTargetTimestampMs: number;       // ⭐ 예측 데이터 기준 시간
    model_version: string;
    market_state?: any;
    gate_weights?: number[];
  };
  timestamp: string;
}
```

### 12.7 dashboard_update
```typescript
{
  // DashboardData의 모든 필드 가능
  [key: string]: any;
}
```

## 13. API 엔드포인트

### 13.1 GET /api/dashboard
전체 대시보드 데이터 조회

**응답**: 위의 모든 필드를 포함하는 `ApiResponse` 객체

### 13.2 GET /api/chart/:timeframe
특정 타임프레임의 차트 데이터 조회

**파라미터**:
- `timeframe`: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`
- `limit` (query): 반환할 캔들 개수 (기본값: 500)

**응답**:
```typescript
{
  success: boolean;
  timeframe: string;
  candles: Candle[];
  count: number;
  source: string;
}
```

## 요약

### ⭐ 예측 시간 관련 핵심 필드 (백엔드에서 반드시 제공해야 함)

1. **`predictionDataTimestamp`** (또는 `predictionTargetTimestampMs`)
   - 의미: 예측에 사용된 입력 데이터의 기준 시간
   - 타입: `number` (밀리초 타임스탬프)
   - 표시 위치: "데이터 기준: HH:MM:SS"

2. **`predictionCalculatedAt`** (또는 `lastUpdateTime`)
   - 의미: 예측이 실제로 계산되어 완료된 시간
   - 타입: `number` (밀리초 타임스탬프)
   - 표시 위치: 예측 확률 옆 "HH:MM:SS"

### 필드명 변환 규칙

프론트엔드는 다음과 같이 자동 변환합니다:

```typescript
// API → Frontend
predictionTargetTimestampMs → predictionDataTimestamp
lastUpdateTime → predictionCalculatedAt
bb_upper → bbUpper
bb_middle → bbMiddle
bb_lower → bbLower
bb_width → bbWidth
macd_signal → signal
macd_histogram → histogram
```

백엔드에서는 **어느 쪽 필드명을 사용해도 무방**하지만, 일관성을 위해 다음을 권장합니다:
- `predictionTargetTimestampMs` 또는 `predictionDataTimestamp`
- `predictionCalculatedAt` 또는 `lastUpdateTime`
