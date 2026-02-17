# trade_event 웹소켓 이벤트 명세

매수/매도가 체결될 때 백엔드에서 프론트엔드로 보내는 실시간 이벤트

## 이벤트 이름
`trade_event`

## 발생 시점
- 매수 주문 체결 완료 시
- 매도 주문 체결 완료 시

## 데이터 형식

### 전체 구조
```typescript
{
  accountId: string;        // 계정 ID (예: "Account_A")
  trade: TradeData;         // 체결된 거래 정보
  holding: HoldingData;     // 업데이트된 보유 상태
  trades?: TradeData[];     // (선택) 전체 거래 목록
}
```

### TradeData (거래 정보)
```typescript
{
  timestamp: number;        // 체결 시간 (밀리초 단위 Unix timestamp)
  type: "buy" | "sell";     // 거래 유형
  price: number;            // 체결 가격 (USD)
  quantity: number;         // 거래 수량 (BTC)
  pairId: string;           // 매수-매도 쌍 식별자 (같은 pairId로 연결)

  // 매수 시에만 포함
  prediction?: {
    takeProfitProb: number;           // 익절 확률 (0.0 ~ 1.0)
    stopLossProb: number;             // 손절 확률 (0.0 ~ 1.0)
    expectedTakeProfitTime: number;   // 예상 익절 시간 (밀리초)
    expectedStopLossTime: number;     // 예상 손절 시간 (밀리초)
    expectedTakeProfitPrice: number;  // 예상 익절 가격 (USD)
    expectedStopLossPrice: number;    // 예상 손절 가격 (USD)
  };

  // 매도 시에만 포함
  profit?: number;          // 수익률 (%, 예: 2.5 = +2.5%)
  pnl?: number;             // 실제 수익금 (USD)
  exitReason?: string;      // 청산 이유 ("take_profit", "stop_loss", "manual")

  // 상세 정보 (선택)
  buyCost?: number;         // 매수 비용
  sellRevenue?: number;     // 매도 수익
  buyQty?: number;          // 매수 수량
  sellQty?: number;         // 매도 수량
  buyCommission?: number;   // 매수 수수료
  sellCommission?: number;  // 매도 수수료
  entryPrice?: number;      // 진입 가격
  entryTime?: number;       // 진입 시간
  profitNoCommission?: number;        // 수수료 제외 수익
  pnlWithCommission?: number;         // 수수료 포함 수익
}
```

### HoldingData (보유 상태)
```typescript
{
  isHolding: boolean;       // 현재 보유 중 여부

  // isHolding이 true일 때만 포함
  buyPrice?: number;              // 매수 가격 (USD)
  buyTime?: number;               // 매수 시간 (밀리초)
  currentProfit?: number;         // 현재 수익률 (%)
  takeProfitPrice?: number;       // 익절 목표 가격 (USD)
  stopLossPrice?: number;         // 손절 목표 가격 (USD)
  initialTakeProfitProb?: number; // 매수 시점 익절 확률 (0.0 ~ 1.0)
  currentTakeProfitProb?: number; // 현재 익절 확률 (0.0 ~ 1.0)
}
```

## 예시

### 매수 체결 시
```json
{
  "accountId": "Account_A",
  "trade": {
    "timestamp": 1700000000000,
    "type": "buy",
    "price": 95000.00,
    "quantity": 0.1,
    "pairId": "trade-123",
    "prediction": {
      "takeProfitProb": 0.72,
      "stopLossProb": 0.28,
      "expectedTakeProfitTime": 1700003600000,
      "expectedStopLossTime": 1700007200000,
      "expectedTakeProfitPrice": 96500.00,
      "expectedStopLossPrice": 94000.00
    }
  },
  "holding": {
    "isHolding": true,
    "buyPrice": 95000.00,
    "buyTime": 1700000000000,
    "currentProfit": 0.0,
    "takeProfitPrice": 96500.00,
    "stopLossPrice": 94000.00,
    "initialTakeProfitProb": 0.72,
    "currentTakeProfitProb": 0.72
  }
}
```

### 매도 체결 시
```json
{
  "accountId": "Account_A",
  "trade": {
    "timestamp": 1700003600000,
    "type": "sell",
    "price": 96500.00,
    "quantity": 0.1,
    "pairId": "trade-123",
    "profit": 1.58,
    "pnl": 1500.00,
    "exitReason": "take_profit"
  },
  "holding": {
    "isHolding": false
  }
}
```

## 중요 사항

### 1. pairId
- 매수와 매도는 같은 `pairId`를 사용
- 차트에서 매수-매도 쌍을 연결선으로 표시
- 각 거래마다 고유한 ID 사용 (예: "trade-001", "trade-002")

### 2. isHolding 상태
- 매도 주문을 넣었어도 **체결 전까지는** `isHolding: true` 유지
- 매도 체결 완료 시 `isHolding: false`로 변경

### 3. timestamp
- 모든 timestamp는 밀리초 단위 (13자리)
- Python: `int(time.time() * 1000)`
- JavaScript: `Date.now()`

### 4. trades 배열 (선택)
- `trade` 필드로 단일 거래만 보내면 프론트엔드가 자동으로 배열에 추가
- 전체 거래 목록을 다시 보내려면 `trades` 배열 사용
- 둘 중 하나만 사용하면 됨

## Python 구현 예시

```python
import socketio
import time

sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')

async def emit_trade_event(account_id: str, trade_type: str, price: float, quantity: float):
    """매매 체결 시 trade_event 발송"""

    if trade_type == "buy":
        # 매수 체결
        trade_data = {
            "accountId": account_id,
            "trade": {
                "timestamp": int(time.time() * 1000),
                "type": "buy",
                "price": price,
                "quantity": quantity,
                "pairId": f"trade-{int(time.time())}",
                "prediction": {
                    "takeProfitProb": 0.72,
                    "stopLossProb": 0.28,
                    "expectedTakeProfitTime": int(time.time() * 1000) + 3600000,  # +1시간
                    "expectedStopLossTime": int(time.time() * 1000) + 7200000,    # +2시간
                    "expectedTakeProfitPrice": price * 1.015,  # +1.5%
                    "expectedStopLossPrice": price * 0.985     # -1.5%
                }
            },
            "holding": {
                "isHolding": True,
                "buyPrice": price,
                "buyTime": int(time.time() * 1000),
                "currentProfit": 0.0,
                "takeProfitPrice": price * 1.015,
                "stopLossPrice": price * 0.985,
                "initialTakeProfitProb": 0.72,
                "currentTakeProfitProb": 0.72
            }
        }

    else:  # sell
        # 매도 체결
        buy_price = 95000.00  # 실제 매수 가격
        profit_pct = ((price - buy_price) / buy_price) * 100
        profit_amount = (price - buy_price) * quantity

        trade_data = {
            "accountId": account_id,
            "trade": {
                "timestamp": int(time.time() * 1000),
                "type": "sell",
                "price": price,
                "quantity": quantity,
                "pairId": "trade-123",  # 매수 때 사용한 pairId
                "profit": profit_pct,
                "pnl": profit_amount,
                "exitReason": "take_profit"
            },
            "holding": {
                "isHolding": False
            }
        }

    # 모든 클라이언트에게 전송
    await sio.emit('trade_event', trade_data)
    print(f"[Trade Event] {trade_type} @ ${price:.2f}")
```

## 프론트엔드 처리

프론트엔드는 `trade_event`를 받으면:
1. `trade` 정보를 거래 목록에 추가
2. `holding` 상태를 업데이트
3. 차트에 매수/매도 마커 표시
4. 같은 `pairId`를 가진 매수-매도를 선으로 연결

## 테스트 방법

1. 매수 실행
2. 브라우저 콘솔에서 `trade_event` 수신 확인
3. 차트에 매수 마커 표시 확인
4. MetricsPanel에 holding 정보 표시 확인
5. 매도 실행
6. 매도 마커 표시 및 매수-매도 연결선 확인
7. holding 상태가 false로 변경되는지 확인
