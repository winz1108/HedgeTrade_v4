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
const btcValue = update.btcBalance * update.btcPrice;
const totalAsset = btcValue + update.usdcBalance;

// 화면에 표시:
// - 총 자산 = btcValue + usdcBalance
// - BTC 가치 = btcBalance × btcPrice
// - USDC 가치 = usdcBalance
```

## 전체 예제

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

async def emit_dashboard_updates():
    """1초마다 dashboard_update 전송"""
    while True:
        try:
            # 1. 현재 BTC 가격 가져오기
            ticker = await binance_client.get_symbol_ticker(symbol="BTCUSDT")
            btc_price = float(ticker['price'])
            timestamp = int(datetime.now().timestamp() * 1000)

            # 2. 각 계정의 데이터 전송
            for account_id, account in accounts.items():
                await sio.emit('dashboard_update', {
                    'btcBalance': account['btc_balance'],
                    'btcPrice': btc_price,
                    'usdcBalance': account['usdc_balance'],
                    'timestamp': timestamp,
                    'accountId': account_id,  # 선택사항
                })

            # 로그 (선택사항)
            btc_value = account['btc_balance'] * btc_price
            total_asset = btc_value + account['usdc_balance']
            print(f"📊 BTC: ${btc_price:.2f} | Total: ${total_asset:.2f}")

        except Exception as e:
            print(f"Error: {e}")

        await asyncio.sleep(1)  # 1초마다 전송

# 백그라운드 태스크 시작
async def start_tasks(app):
    global binance_client
    binance_client = await AsyncClient.create()
    app['dashboard_task'] = asyncio.create_task(emit_dashboard_updates())
```

## 전송 주기

- **권장**: 1초마다 (`await asyncio.sleep(1)`)
- BTC 가격이 바뀔 때마다 자산이 실시간으로 업데이트됨

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

| 이벤트 | 목적 | 전송 데이터 |
|--------|------|-------------|
| `price_update` | BTC 가격만 전송 | `currentPrice`, `currentTime` |
| `account_assets_update` | 계산된 자산 전송 | `currentAsset`, `currentBTC`, `currentCash` |
| `dashboard_update` | 원시 데이터 전송 | `btcBalance`, `btcPrice`, `usdcBalance` |

## 장점

1. 백엔드는 원시 데이터만 전송 (계산 불필요)
2. 프론트엔드에서 유연하게 계산 가능
3. 데이터 흐름이 명확함
