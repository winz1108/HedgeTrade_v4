# 백엔드에서 자산/수익률을 1초마다 업데이트하는 방법

## 요약

프론트엔드는 이미 `account_assets_update` 이벤트를 받고 있습니다.
백엔드에서 이 이벤트를 현재보다 더 자주 (1초마다) 보내면 됩니다.

## 현재 프론트엔드가 받고 있는 데이터

```typescript
// 이미 구현되어 있음
websocketService.onAccountAssetsUpdate((update) => {
  // update.asset.currentAsset  - 현재 총 자산
  // update.asset.currentBTC     - BTC 가치
  // update.asset.currentCash    - 현금
  // update.asset.initialAsset   - 초기 자산
});
```

## 백엔드에서 할 일

### 1. 현재 가격 업데이트 주기에 맞춰서 자산도 함께 보내기

```python
# 현재 코드에서 price_update를 보내는 곳을 찾아서
async def emit_price_updates():
    while True:
        # 현재 가격 가져오기
        current_price = await get_current_price()

        # 가격 업데이트 전송
        await sio.emit('price_update', {
            'currentPrice': current_price,
            'currentTime': int(time.time() * 1000)
        })

        # 자산 계산 및 전송 (여기 추가!)
        for account_id in active_accounts:
            account_data = calculate_account_assets(account_id, current_price)
            await sio.emit('account_assets_update', {
                'accountId': account_id,
                'asset': account_data
            })

        await asyncio.sleep(1)  # 1초 대기
```

### 2. 자산 계산 함수

```python
def calculate_account_assets(account_id: str, current_price: float):
    """현재 가격으로 자산 계산"""
    # DB나 메모리에서 계정 정보 가져오기
    account = get_account_info(account_id)

    btc_quantity = account['btc_quantity']
    usdc_balance = account['usdc_balance']
    initial_asset = account['initial_asset']

    # 계산
    current_btc_value = btc_quantity * current_price
    current_asset = current_btc_value + usdc_balance

    return {
        'currentAsset': current_asset,
        'currentBTC': current_btc_value,
        'currentCash': usdc_balance,
        'initialAsset': initial_asset,
    }
```

### 3. 전체 예제

```python
import asyncio
import socketio
from binance import AsyncClient

sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
binance_client = None

# 계정 정보 (실제로는 DB에서 조회)
accounts = {
    'Account_A': {
        'btc_quantity': 0.5,
        'usdc_balance': 50000.0,
        'initial_asset': 100000.0,
    }
}

async def emit_price_and_assets():
    """1초마다 가격 + 자산 업데이트"""
    while True:
        try:
            # 1. 가격 가져오기
            ticker = await binance_client.get_symbol_ticker(symbol="BTCUSDT")
            current_price = float(ticker['price'])
            current_time = int(datetime.now().timestamp() * 1000)

            # 2. 가격 전송
            await sio.emit('price_update', {
                'currentPrice': current_price,
                'currentTime': current_time
            })

            # 3. 각 계정의 자산 계산 및 전송
            for account_id, account in accounts.items():
                btc_value = account['btc_quantity'] * current_price
                total_asset = btc_value + account['usdc_balance']

                await sio.emit('account_assets_update', {
                    'accountId': account_id,
                    'asset': {
                        'currentAsset': total_asset,
                        'currentBTC': btc_value,
                        'currentCash': account['usdc_balance'],
                        'initialAsset': account['initial_asset'],
                    }
                })

            print(f"💰 Price: ${current_price:.2f} | Asset: ${total_asset:.2f}")

        except Exception as e:
            print(f"Error: {e}")

        await asyncio.sleep(1)  # 1초 대기

# 백그라운드 태스크 시작
async def start_tasks(app):
    global binance_client
    binance_client = await AsyncClient.create()
    app['update_task'] = asyncio.create_task(emit_price_and_assets())
```

## 핵심 포인트

1. **1초마다 실행**: `await asyncio.sleep(1)`
2. **가격 가져오기**: 바이낸스 API에서 현재가 조회
3. **자산 계산**: `BTC 수량 × 현재가 + USDC`
4. **즉시 전송**: `account_assets_update` 이벤트로 전송

## 프론트엔드는 변경 없음

프론트엔드는 이미 `account_assets_update`를 받고 있으므로:
- ✅ 코드 수정 없음
- ✅ 자동으로 1초마다 업데이트됨
- ✅ 대시보드에 실시간으로 표시됨

## 수익률 계산

수익률도 프론트엔드에서 자동 계산되므로 백엔드는 자산만 보내면 됩니다:

```typescript
// 프론트엔드에서 자동 계산됨 (MetricsPanel.tsx)
const portfolioReturn = ((currentAsset - initialAsset) / initialAsset) * 100;
```

만약 백엔드에서 수익률까지 계산해서 보내려면 기존 이벤트에 추가하면 됩니다.

## 성능

- 계산 부하: 거의 없음 (곱셈 + 덧셈만)
- 네트워크: 계정 1개당 ~100 bytes
- 1초 × 100명 = 10 KB/s (매우 적음)

## 확인

백엔드 로그에서:
```
💰 Price: $95123.45 | Asset: $105250.75
💰 Price: $95124.12 | Asset: $105251.08
💰 Price: $95123.89 | Asset: $105250.97
```

프론트엔드 콘솔에서:
```
account_assets_update received: { accountId: 'Account_A', asset: { currentAsset: 105250.75, ... } }
```

이렇게 1초마다 찍히면 성공입니다!
