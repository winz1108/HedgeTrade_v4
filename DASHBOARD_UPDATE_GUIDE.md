# 백엔드 dashboard_update 이벤트 가이드

## 개요

프론트엔드는 `dashboard_update` 이벤트를 통해 BTC 수량, BTC 가격, USDC 수량을 받아서 자산을 계산합니다.

## 백엔드에서 보내야 하는 필드

```python
await sio.emit('dashboard_update', {
    'btcBalance': 0.5,           # BTC 총 수량 (Number)
    'btcPrice': 95123.45,        # BTC 현재가 (Number)
    'usdcBalance': 50000.0,      # USDC 총 수량 (Number)
    'timestamp': 1234567890000,  # 서버 시간 (밀리초)
})
```

## 프론트엔드 계산 공식

```typescript
// App.tsx에서 자동 계산됨

// 1. dashboard_update 받을 때: BTC 수량과 USDC 수량 저장
btcBalanceRef.current = update.btcBalance;
usdcBalanceRef.current = update.usdcBalance;

// 2. price_update 받을 때마다: 저장된 수량으로 자산 재계산 (1초마다)
const btcValue = btcBalanceRef.current * priceData.currentPrice;
const totalAsset = btcValue + usdcBalanceRef.current;

// 화면에 표시:
// - 총 자산 = btcValue + usdcBalance
// - BTC 가치 = btcBalance × btcPrice (실시간 업데이트)
// - USDC 가치 = usdcBalance
```

## 중요: 실시간 자산 계산

프론트엔드는 다음과 같이 동작합니다:

1. **초기화**: `dashboard_update`로 BTC 수량과 USDC 수량을 받아서 저장
2. **실시간 계산**: `price_update`(1초마다)로 가격이 업데이트될 때마다 자산 재계산
3. **거래 체결**: 거래가 발생하면 새로운 `dashboard_update`로 수량 갱신

이렇게 하면 백엔드에서 가격만 1초마다 보내도, 프론트엔드가 자동으로 자산을 재계산합니다.

## 전체 예제 (최적화)

```python
import asyncio
import socketio
from binance import AsyncClient
from datetime import datetime

sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
binance_client = None

# 계정 정보 (실제로는 DB에서 조회)
accounts = {
    'Account_A': {
        'btc_balance': 0.5,        # BTC 수량
        'usdc_balance': 50000.0,   # USDC 수량
    }
}

async def emit_price_updates():
    """1초마다 가격 업데이트 전송"""
    while True:
        try:
            # 현재 BTC 가격 가져오기
            ticker = await binance_client.get_symbol_ticker(symbol="BTCUSDT")
            btc_price = float(ticker['price'])
            timestamp = int(datetime.now().timestamp() * 1000)

            # 가격만 전송 (경량)
            await sio.emit('price_update', {
                'currentPrice': btc_price,
                'currentTime': timestamp,
            })

            # 프론트엔드가 저장된 BTC 수량으로 자동 재계산함

        except Exception as e:
            print(f"Error: {e}")

        await asyncio.sleep(1)  # 1초마다

async def send_dashboard_update(account_id: str):
    """거래 체결 시 호출 - BTC/USDC 수량 변경 시에만"""
    try:
        ticker = await binance_client.get_symbol_ticker(symbol="BTCUSDT")
        btc_price = float(ticker['price'])
        timestamp = int(datetime.now().timestamp() * 1000)

        account = accounts[account_id]

        await sio.emit('dashboard_update', {
            'btcBalance': account['btc_balance'],
            'btcPrice': btc_price,
            'usdcBalance': account['usdc_balance'],
            'timestamp': timestamp,
            'accountId': account_id,
        })

        print(f"📊 Dashboard updated: BTC={account['btc_balance']}, USDC={account['usdc_balance']}")

    except Exception as e:
        print(f"Error: {e}")

async def execute_buy(account_id: str, btc_amount: float, price: float):
    """매수 체결"""
    account = accounts[account_id]
    cost = btc_amount * price

    account['btc_balance'] += btc_amount
    account['usdc_balance'] -= cost

    # 수량 변경 -> dashboard_update 전송
    await send_dashboard_update(account_id)

async def execute_sell(account_id: str, btc_amount: float, price: float):
    """매도 체결"""
    account = accounts[account_id]
    proceeds = btc_amount * price

    account['btc_balance'] -= btc_amount
    account['usdc_balance'] += proceeds

    # 수량 변경 -> dashboard_update 전송
    await send_dashboard_update(account_id)

# 백그라운드 태스크 시작
async def start_tasks(app):
    global binance_client
    binance_client = await AsyncClient.create()

    # 초기 dashboard_update 전송
    for account_id in accounts.keys():
        await send_dashboard_update(account_id)

    # 가격 업데이트 태스크 시작
    app['price_task'] = asyncio.create_task(emit_price_updates())
```

### 최적화 포인트

1. **가격만 1초마다**: `price_update` 이벤트로 가격만 전송 (경량)
2. **수량은 변경 시에만**: 매수/매도 체결 시에만 `dashboard_update` 전송
3. **프론트 자동 계산**: 저장된 수량 × 실시간 가격 = 실시간 자산

## 전송 주기

### dashboard_update
- **권장**: 초기 연결 시 1회 + 거래 체결 시마다
- BTC 수량이나 USDC 수량이 변경될 때만 전송
- 예: 매수/매도 체결 시

### price_update (별도 이벤트)
- **권장**: 1초마다
- 가격만 전송: `{ currentPrice, currentTime }`
- 프론트엔드가 저장된 수량으로 자동 재계산

## 프론트엔드 로그 확인

브라우저 콘솔에서 다음과 같이 표시됩니다:

```
📊 dashboard_update received: {
  btcBalance: "0.50000000",
  btcPrice: "$95,123.45",
  usdcBalance: "$50,000.00",
  → BTC가치: "$47,561.73",
  → 총자산: "$97,561.73"
}
```

## 계정 잔고 변경 시

거래가 체결되어 BTC/USDC 잔고가 변경되면:

```python
# 매수 시: USDC 감소, BTC 증가
accounts['Account_A']['btc_balance'] += 0.1
accounts['Account_A']['usdc_balance'] -= (0.1 * btc_price)

# 매도 시: BTC 감소, USDC 증가
accounts['Account_A']['btc_balance'] -= 0.1
accounts['Account_A']['usdc_balance'] += (0.1 * btc_price)
```

다음번 `dashboard_update`에 자동으로 반영됩니다.

## 성능

- 계정당 약 80 bytes
- 1초 × 100계정 = 8 KB/s
- 매우 경량

## 기존 이벤트와의 차이

| 이벤트 | 목적 | 전송 주기 | 전송 데이터 |
|--------|------|----------|-------------|
| `price_update` | BTC 가격 전송 | **1초마다** | `currentPrice`, `currentTime` |
| `dashboard_update` | BTC/USDC 수량 전송 | **거래 체결 시** | `btcBalance`, `btcPrice`, `usdcBalance` |
| `account_assets_update` *(구)* | 계산된 자산 전송 | 1초마다 | `currentAsset`, `currentBTC`, `currentCash` |

## 장점

1. **네트워크 효율**: 가격만 1초마다, 수량은 변경 시에만
2. **정확성**: 프론트가 1초마다 최신 가격으로 재계산
3. **백엔드 단순화**: 원시 데이터만 전송, 계산 불필요
4. **유연성**: 프론트엔드에서 다양한 계산 가능
