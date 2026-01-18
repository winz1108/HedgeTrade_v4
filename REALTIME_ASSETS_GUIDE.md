# 실시간 자산/수익률 업데이트 가이드

백엔드에서 1초마다 가격 변동에 따라 자산과 수익률을 계산해서 프론트엔드로 전송하는 최적화된 방법입니다.

## 개요

프론트엔드는 이미 웹소켓 이벤트를 받아서 처리할 준비가 되어 있습니다.
백엔드에서 1초마다 다음 정보를 계산해서 전송하면 프론트엔드는 그대로 표시만 하면 됩니다.

## 백엔드 구현 (Python + Socket.IO)

### 1. 확장된 이벤트 구조

```python
# socketio_server.py
import asyncio
import socketio
from aiohttp import web
from binance import AsyncClient
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Socket.IO 서버 생성
sio = socketio.AsyncServer(
    async_mode='aiohttp',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

app = web.Application()
sio.attach(app)

# 바이낸스 클라이언트
binance_client = None
current_price = 0.0

# 연결된 클라이언트 추적
connected_clients = set()

# 가상 계정 데이터 (실제로는 DB에서 가져오거나 API에서 조회)
accounts = {
    'Account_A': {
        'initialAsset': 100000.0,
        'btcQuantity': 0.5,  # 현재 보유 BTC 수량
        'usdcFree': 50000.0,  # 현재 보유 USDC
        'hasPosition': True,
        'entryPrice': 95000.0,
        'entryTime': int(datetime.now().timestamp() * 1000),
        'tpPrice': 97500.0,
        'slPrice': 92500.0,
        'totalTrades': 150,
        'winningTrades': 105,
    }
}


def calculate_account_data(account_id: str, current_price: float):
    """계정의 자산, 보유 정보, 메트릭을 계산"""
    account = accounts.get(account_id, {})

    # 자산 계산
    btc_quantity = account.get('btcQuantity', 0.0)
    usdc_free = account.get('usdcFree', 0.0)

    current_btc_value = btc_quantity * current_price
    current_asset = current_btc_value + usdc_free
    initial_asset = account.get('initialAsset', 100000.0)

    # 보유 정보 계산
    has_position = account.get('hasPosition', False)
    holding_data = {}

    if has_position:
        entry_price = account.get('entryPrice', 0.0)
        quantity = btc_quantity
        unrealized_pnl = (current_price - entry_price) * quantity
        unrealized_pnl_pct = ((current_price - entry_price) / entry_price) * 100

        holding_data = {
            'hasPosition': True,
            'entryPrice': entry_price,
            'quantity': quantity,
            'currentPrice': current_price,
            'unrealizedPnl': unrealized_pnl,
            'unrealizedPnlPct': unrealized_pnl_pct,
            'tpPrice': account.get('tpPrice'),
            'slPrice': account.get('slPrice'),
            'entryTime': account.get('entryTime'),
            'initialTakeProfitProb': account.get('initialTakeProfitProb', 0.72),
        }
    else:
        holding_data = {
            'hasPosition': False,
        }

    # 메트릭 계산
    portfolio_return = ((current_asset - initial_asset) / initial_asset) * 100
    total_trades = account.get('totalTrades', 0)
    winning_trades = account.get('winningTrades', 0)
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0

    return {
        'accountId': account_id,
        'asset': {
            'currentAsset': current_asset,
            'currentBTC': current_btc_value,
            'currentCash': usdc_free,
            'initialAsset': initial_asset,
            'btcQuantity': btc_quantity,
            'usdcFree': usdc_free,
            'usdcLocked': 0.0,
        },
        'holding': holding_data,
        'metrics': {
            'portfolioReturn': portfolio_return,
            'totalTrades': total_trades,
            'winningTrades': winning_trades,
            'winRate': win_rate,
            'totalPnl': current_asset - initial_asset,
            'avgPnl': (current_asset - initial_asset) / total_trades if total_trades > 0 else 0,
        }
    }


@sio.event
async def connect(sid, environ):
    """클라이언트 연결"""
    connected_clients.add(sid)
    logger.info(f"✅ Client connected: {sid} (Total: {len(connected_clients)})")


@sio.event
async def disconnect(sid):
    """클라이언트 연결 해제"""
    connected_clients.discard(sid)
    logger.info(f"❌ Client disconnected: {sid} (Total: {len(connected_clients)})")


async def emit_price_and_assets_update():
    """1초마다 가격 + 자산 + 메트릭 업데이트 전송"""
    global current_price

    while True:
        try:
            if len(connected_clients) > 0:
                # 1. 바이낸스에서 현재 가격 가져오기
                ticker = await binance_client.get_symbol_ticker(symbol="BTCUSDT")
                current_price = float(ticker['price'])
                current_time = int(datetime.now().timestamp() * 1000)

                # 2. 가격 업데이트 전송
                await sio.emit('price_update', {
                    'currentPrice': current_price,
                    'currentTime': current_time
                })

                # 3. 각 계정의 자산/메트릭 계산 및 전송
                for account_id in accounts.keys():
                    account_data = calculate_account_data(account_id, current_price)

                    # account_assets_update 이벤트로 모든 정보 전송
                    await sio.emit('account_assets_update', account_data)

                logger.info(f"💰 Price: ${current_price:.2f} | Accounts updated: {len(accounts)}")

            await asyncio.sleep(1)  # 1초 대기

        except Exception as e:
            logger.error(f"Price/Assets update error: {e}")
            await asyncio.sleep(1)


async def emit_server_time():
    """5초마다 서버 시간 전송"""
    while True:
        try:
            if len(connected_clients) > 0:
                server_time_data = await binance_client.get_server_time()
                server_time = server_time_data['serverTime']

                await sio.emit('binance_server_time', {
                    'serverTime': server_time
                })

                logger.info(f"⏰ Server time sent: {datetime.fromtimestamp(server_time/1000)}")

            await asyncio.sleep(5)

        except Exception as e:
            logger.error(f"Server time error: {e}")
            await asyncio.sleep(5)


async def start_background_tasks(app):
    """백그라운드 태스크 시작"""
    global binance_client

    # 바이낸스 클라이언트 초기화
    binance_client = await AsyncClient.create()
    logger.info("✅ Binance client initialized")

    # 백그라운드 태스크 생성
    app['price_assets_task'] = asyncio.create_task(emit_price_and_assets_update())
    app['time_task'] = asyncio.create_task(emit_server_time())
    logger.info("✅ Background tasks started")


async def cleanup_background_tasks(app):
    """종료 시 정리"""
    global binance_client

    app['price_assets_task'].cancel()
    app['time_task'].cancel()

    if binance_client:
        await binance_client.close_connection()

    logger.info("✅ Cleanup completed")


# 앱 시작/종료 이벤트
app.on_startup.append(start_background_tasks)
app.on_cleanup.append(cleanup_background_tasks)


if __name__ == '__main__':
    logger.info("🚀 Starting Socket.IO server on port 54321...")
    web.run_app(app, host='0.0.0.0', port=54321)
```

## 2. 전송되는 데이터 구조

### `account_assets_update` 이벤트 (1초마다)

```json
{
  "accountId": "Account_A",
  "asset": {
    "currentAsset": 105250.75,
    "currentBTC": 47500.50,
    "currentCash": 57750.25,
    "initialAsset": 100000.0,
    "btcQuantity": 0.5,
    "usdcFree": 57750.25,
    "usdcLocked": 0.0
  },
  "holding": {
    "hasPosition": true,
    "entryPrice": 95000.0,
    "quantity": 0.5,
    "currentPrice": 95001.0,
    "unrealizedPnl": 0.5,
    "unrealizedPnlPct": 0.001,
    "tpPrice": 97500.0,
    "slPrice": 92500.0,
    "entryTime": 1705334400000,
    "initialTakeProfitProb": 0.72
  },
  "metrics": {
    "portfolioReturn": 5.25,
    "totalTrades": 150,
    "winningTrades": 105,
    "winRate": 70.0,
    "totalPnl": 5250.75,
    "avgPnl": 35.0
  }
}
```

## 3. 프론트엔드 처리

프론트엔드는 이미 `account_assets_update` 이벤트를 받을 준비가 되어 있습니다.
확장된 데이터를 처리하도록 약간만 수정하면 됩니다.

## 4. 최적화 팁

### A. 계정 데이터를 DB/Redis에서 조회

```python
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_account_from_db(account_id: str):
    """Redis 또는 DB에서 계정 정보 조회"""
    account_key = f"account:{account_id}"
    account_data = redis_client.get(account_key)

    if account_data:
        return json.loads(account_data)
    else:
        # DB에서 조회하거나 기본값 반환
        return {
            'initialAsset': 100000.0,
            'btcQuantity': 0.0,
            'usdcFree': 100000.0,
            'hasPosition': False,
        }
```

### B. 실시간 거래 반영

```python
async def on_trade_executed(account_id: str, trade_type: str, price: float, quantity: float):
    """거래 체결 시 계정 데이터 업데이트"""
    account = accounts[account_id]

    if trade_type == 'BUY':
        # 매수: BTC 증가, USDC 감소
        account['btcQuantity'] += quantity
        account['usdcFree'] -= price * quantity
        account['hasPosition'] = True
        account['entryPrice'] = price
        account['entryTime'] = int(datetime.now().timestamp() * 1000)
        account['totalTrades'] += 1
    elif trade_type == 'SELL':
        # 매도: BTC 감소, USDC 증가
        account['btcQuantity'] -= quantity
        account['usdcFree'] += price * quantity
        account['hasPosition'] = False

        # 익절/손절 판단
        if price >= account.get('tpPrice', 0):
            account['winningTrades'] += 1

    # Redis에 저장
    redis_client.set(
        f"account:{account_id}",
        json.dumps(account)
    )

    # 즉시 업데이트 전송
    account_data = calculate_account_data(account_id, price)
    await sio.emit('account_assets_update', account_data)
```

### C. 여러 계정 동시 지원

```python
async def emit_price_and_assets_update():
    """1초마다 모든 활성 계정의 데이터 전송"""
    global current_price

    while True:
        try:
            if len(connected_clients) > 0:
                ticker = await binance_client.get_symbol_ticker(symbol="BTCUSDT")
                current_price = float(ticker['price'])
                current_time = int(datetime.now().timestamp() * 1000)

                # 가격 업데이트
                await sio.emit('price_update', {
                    'currentPrice': current_price,
                    'currentTime': current_time
                })

                # 활성 계정 목록 조회
                active_accounts = redis_client.smembers('active_accounts')

                # 각 계정의 데이터 계산 및 전송
                for account_id in active_accounts:
                    account_data = calculate_account_data(account_id, current_price)
                    await sio.emit('account_assets_update', account_data)

            await asyncio.sleep(1)

        except Exception as e:
            logger.error(f"Update error: {e}")
            await asyncio.sleep(1)
```

## 5. 실행

```bash
# 필요한 패키지 설치
pip install python-socketio aiohttp python-binance redis

# 서버 실행
python socketio_server.py
```

## 6. 결과

백엔드 서버가 실행되면:
- ✅ 1초마다 가격 업데이트
- ✅ 1초마다 자산 업데이트 (현재가 기준 BTC 가치 계산)
- ✅ 1초마다 수익률 업데이트 (포트폴리오 리턴, 미실현 손익 등)
- ✅ 1초마다 보유 정보 업데이트 (현재 수익률, 익절/손절가 대비 현재가)
- ✅ 프론트엔드는 받은 데이터를 그대로 표시만 함

## 7. 성능 고려사항

### 연산 최적화
- 가격만 변하고 BTC 수량이 안 변하면 간단한 곱셈만 필요
- Redis를 사용하면 계정 정보 조회가 매우 빠름 (< 1ms)
- 1초에 한 번 계산은 CPU 부하가 거의 없음

### 대역폭 최적화
- 한 번에 약 200-300 bytes 정도 전송
- 1초에 한 번 × 100명 = 초당 30KB (매우 작음)
- WebSocket 압축 사용 시 더 작아짐

### 확장성
- 계정이 많아지면 계정별 room으로 분리
- 예: `sio.emit('account_assets_update', data, room=account_id)`
- 클라이언트는 자신의 계정 room에만 join

## 요약

**백엔드가 할 일:**
1. 1초마다 바이낸스에서 가격 가져오기
2. 각 계정의 자산/보유/메트릭 계산
3. `account_assets_update` 이벤트로 전송

**프론트엔드가 할 일:**
1. `account_assets_update` 이벤트 받기
2. state 업데이트
3. 화면에 표시

**결과:**
- 🚀 실시간 자산 가치 변동
- 🚀 실시간 수익률 업데이트
- 🚀 프론트엔드 연산 부담 제로
- 🚀 완벽한 동기화
