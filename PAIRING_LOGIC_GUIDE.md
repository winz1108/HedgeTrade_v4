# 매수-매도 페어링 로직 가이드

## 개요
백엔드에서 매수(buy)와 매도(sell) 거래를 올바르게 페어링하여 차트에 연결선을 표시하는 로직입니다.

## 핵심 원칙

### 1. pairId는 매수 시점에 생성
```python
import time
import uuid

# 매수 체결 시
pair_id = f"trade-{uuid.uuid4().hex[:8]}-{int(time.time())}"

buy_trade = {
    "timestamp": int(time.time() * 1000),
    "type": "buy",
    "price": entry_price,
    "quantity": quantity,
    "pairId": pair_id,  # ✅ 매수 시 생성된 ID
    "side": "LONG" or "SHORT"
}
```

### 2. 매도 시 동일한 pairId 사용
```python
# 매도 체결 시 (buy_trade의 pairId 사용)
sell_trade = {
    "timestamp": int(time.time() * 1000),
    "type": "sell",
    "price": exit_price,
    "quantity": quantity,
    "pairId": pair_id,  # ✅ 매수 때와 동일한 ID
    "profit": profit_pct,
    "exitReason": "TP" or "SL"
}
```

### 3. pairId를 내부적으로 추적
포지션에 진입할 때 pairId를 저장하고, 청산 시 재사용:

```python
class TradingBot:
    def __init__(self):
        self.current_position = None  # 현재 포지션 정보

    async def execute_buy(self, price: float, quantity: float, side: str):
        """매수 체결"""
        # 1. pairId 생성
        pair_id = f"trade-{uuid.uuid4().hex[:8]}-{int(time.time())}"

        # 2. 포지션 정보 저장
        self.current_position = {
            "pairId": pair_id,
            "entryPrice": price,
            "quantity": quantity,
            "side": side,
            "entryTime": int(time.time() * 1000)
        }

        # 3. 매수 trade_event 발송
        await self.emit_trade_event({
            "accountId": self.account_id,
            "trade": {
                "timestamp": self.current_position["entryTime"],
                "type": "buy",
                "price": price,
                "quantity": quantity,
                "pairId": pair_id,
                "side": side
            },
            "holding": {
                "isHolding": True,
                "buyPrice": price,
                "buyTime": self.current_position["entryTime"],
                "positionSide": side
            }
        })

        return pair_id

    async def execute_sell(self, price: float, exit_reason: str):
        """매도 체결"""
        if not self.current_position:
            print("❌ ERROR: 포지션이 없는데 매도 시도")
            return

        # 1. 저장된 pairId 사용
        pair_id = self.current_position["pairId"]
        quantity = self.current_position["quantity"]
        entry_price = self.current_position["entryPrice"]

        # 2. 수익 계산
        profit_pct = ((price - entry_price) / entry_price) * 100
        pnl = (price - entry_price) * quantity

        # 3. 매도 trade_event 발송
        await self.emit_trade_event({
            "accountId": self.account_id,
            "trade": {
                "timestamp": int(time.time() * 1000),
                "type": "sell",
                "price": price,
                "quantity": quantity,
                "pairId": pair_id,  # ✅ 동일한 pairId
                "profit": profit_pct,
                "pnl": pnl,
                "exitReason": exit_reason,
                "entryPrice": entry_price,
                "entryTime": self.current_position["entryTime"]
            },
            "holding": {
                "isHolding": False
            }
        })

        # 4. 포지션 초기화
        self.current_position = None

        return pair_id
```

## 구현 체크리스트

### ✅ 필수 구현 사항

1. **매수 시**
   - [ ] 고유한 pairId 생성
   - [ ] pairId를 포지션 정보와 함께 저장
   - [ ] trade_event 발송 시 pairId 포함
   - [ ] side (LONG/SHORT) 정보 포함

2. **매도 시**
   - [ ] 저장된 pairId 재사용
   - [ ] 동일한 pairId로 trade_event 발송
   - [ ] profit, exitReason 정보 포함
   - [ ] 포지션 정보 초기화

3. **에러 처리**
   - [ ] 포지션 없이 매도 시도 방지
   - [ ] pairId 누락 시 에러 로깅
   - [ ] 중복 pairId 발생 방지

### ⚠️ 흔한 실수

**❌ 매도 시 새로운 pairId 생성**
```python
# 잘못된 예시
sell_trade = {
    "pairId": f"trade-{int(time.time())}",  # ❌ 새로운 ID 생성
    "type": "sell"
}
```

**✅ 저장된 pairId 재사용**
```python
# 올바른 예시
sell_trade = {
    "pairId": self.current_position["pairId"],  # ✅ 저장된 ID 사용
    "type": "sell"
}
```

**❌ pairId를 저장하지 않음**
```python
# 잘못된 예시
async def execute_buy(self):
    pair_id = f"trade-{int(time.time())}"
    # pair_id를 어디에도 저장하지 않음 ❌
```

**✅ pairId를 포지션과 함께 저장**
```python
# 올바른 예시
async def execute_buy(self):
    pair_id = f"trade-{int(time.time())}"
    self.current_position = {
        "pairId": pair_id,  # ✅ 저장
        "entryPrice": price
    }
```

## 검증 방법

### 백엔드 로그 확인
```python
print(f"[BUY] pairId: {pair_id}")
# 출력: [BUY] pairId: trade-a1b2c3d4-1234567890

print(f"[SELL] pairId: {pair_id}")
# 출력: [SELL] pairId: trade-a1b2c3d4-1234567890
# ✅ 동일한 ID 확인
```

### 프론트엔드에서 확인
브라우저 콘솔에서:
```javascript
// 매수 이벤트
console.log('[trade_event] BUY:', {
  pairId: 'trade-a1b2c3d4-1234567890',
  type: 'buy'
});

// 매도 이벤트 (같은 pairId)
console.log('[trade_event] SELL:', {
  pairId: 'trade-a1b2c3d4-1234567890',  // ✅ 동일
  type: 'sell'
});
```

### 차트 확인
- 매수 마커(파란색 L 또는 노란색 S) 클릭
- 연결선이 매도 마커(흰색 X)로 이어지는지 확인
- 연결선이 없으면 pairId가 다른 것

## 완성된 예시 코드

```python
import asyncio
import socketio
import time
import uuid

class TradingStrategy:
    def __init__(self, sio: socketio.AsyncServer):
        self.sio = sio
        self.account_id = "Account_A"
        self.current_position = None
        self.all_trades = []  # 모든 거래 기록

    async def emit_trade_event(self, data: dict):
        """trade_event 발송"""
        await self.sio.emit('trade_event', data)

        # 거래 기록 저장
        if data.get("trade"):
            self.all_trades.append(data["trade"])

        print(f"[trade_event] {data['trade']['type'].upper()}: pairId={data['trade'].get('pairId')}")

    async def open_position(self, price: float, side: str):
        """포지션 진입 (매수)"""
        # pairId 생성
        pair_id = f"trade-{uuid.uuid4().hex[:8]}-{int(time.time())}"
        quantity = 0.01  # 예시

        # 포지션 저장
        self.current_position = {
            "pairId": pair_id,
            "entryPrice": price,
            "quantity": quantity,
            "side": side,
            "entryTime": int(time.time() * 1000)
        }

        # 매수 이벤트 발송
        await self.emit_trade_event({
            "accountId": self.account_id,
            "trade": {
                "timestamp": self.current_position["entryTime"],
                "type": "buy",
                "price": price,
                "quantity": quantity,
                "pairId": pair_id,
                "side": side
            },
            "holding": {
                "isHolding": True,
                "buyPrice": price,
                "buyTime": self.current_position["entryTime"],
                "positionSide": side
            },
            "trades": self.all_trades  # 전체 거래 목록
        })

        print(f"✅ {side} 포지션 진입 @ ${price:.2f} (pairId: {pair_id})")

    async def close_position(self, price: float, exit_reason: str):
        """포지션 청산 (매도)"""
        if not self.current_position:
            print("❌ 포지션이 없습니다")
            return

        # 저장된 정보 사용
        pair_id = self.current_position["pairId"]
        quantity = self.current_position["quantity"]
        entry_price = self.current_position["entryPrice"]
        side = self.current_position["side"]

        # 수익 계산
        if side == "LONG":
            profit_pct = ((price - entry_price) / entry_price) * 100
        else:  # SHORT
            profit_pct = ((entry_price - price) / entry_price) * 100

        pnl = profit_pct * entry_price * quantity / 100

        # 매도 이벤트 발송
        await self.emit_trade_event({
            "accountId": self.account_id,
            "trade": {
                "timestamp": int(time.time() * 1000),
                "type": "sell",
                "price": price,
                "quantity": quantity,
                "pairId": pair_id,  # ✅ 동일한 pairId
                "profit": profit_pct,
                "pnl": pnl,
                "exitReason": exit_reason,
                "entryPrice": entry_price,
                "entryTime": self.current_position["entryTime"]
            },
            "holding": {
                "isHolding": False
            },
            "trades": self.all_trades  # 전체 거래 목록
        })

        print(f"✅ {side} 포지션 청산 @ ${price:.2f} (pairId: {pair_id}, profit: {profit_pct:.2f}%)")

        # 포지션 초기화
        self.current_position = None

# 사용 예시
async def main():
    sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
    strategy = TradingStrategy(sio)

    # 롱 포지션 진입
    await strategy.open_position(95000.0, "LONG")
    await asyncio.sleep(5)

    # 롱 포지션 청산
    await strategy.close_position(96500.0, "TP")
    await asyncio.sleep(2)

    # 숏 포지션 진입
    await strategy.open_position(96500.0, "SHORT")
    await asyncio.sleep(5)

    # 숏 포지션 청산
    await strategy.close_position(95000.0, "TP")

if __name__ == "__main__":
    asyncio.run(main())
```

## 결론

페어링이 제대로 작동하려면:
1. ✅ 매수 시 pairId 생성
2. ✅ pairId를 포지션 정보와 함께 저장
3. ✅ 매도 시 저장된 pairId 재사용
4. ✅ trade_event에 pairId 포함하여 발송

이 4가지만 지키면 차트에서 매수-매도가 깔끔하게 연결됩니다!
