# Socket.IO 백엔드 구현 가이드

Oracle VM 서버에 실시간 데이터 스트리밍 추가

## 1. 패키지 설치

```bash
pip install python-socketio aiohttp python-binance asyncio
```

## 2. Socket.IO 서버 구현

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
    cors_allowed_origins='*',  # 프론트엔드 허용
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


async def emit_price_update():
    """1초마다 가격 업데이트 전송"""
    global current_price

    while True:
        try:
            if len(connected_clients) > 0:
                # 바이낸스에서 현재 가격 가져오기
                ticker = await binance_client.get_symbol_ticker(symbol="BTCUSDT")
                current_price = float(ticker['price'])

                # 현재 시간
                current_time = int(datetime.now().timestamp() * 1000)

                # 모든 클라이언트에게 전송
                await sio.emit('price_update', {
                    'currentPrice': current_price,
                    'currentTime': current_time
                })

                logger.info(f"💰 Price update sent: ${current_price:.2f}")

            await asyncio.sleep(1)  # 1초 대기

        except Exception as e:
            logger.error(f"Price update error: {e}")
            await asyncio.sleep(1)


async def emit_server_time():
    """5초마다 서버 시간 전송"""
    while True:
        try:
            if len(connected_clients) > 0:
                # 바이낸스 서버 시간
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
    app['price_task'] = asyncio.create_task(emit_price_update())
    app['time_task'] = asyncio.create_task(emit_server_time())
    logger.info("✅ Background tasks started")


async def cleanup_background_tasks(app):
    """종료 시 정리"""
    global binance_client

    app['price_task'].cancel()
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

## 3. 서버 실행

```bash
python socketio_server.py
```

## 4. 작동 확인

서버 실행 후 프론트엔드에서 자동으로:
- ✅ WebSocket 연결
- ✅ 1초마다 가격 업데이트
- ✅ 5초마다 서버 시간 업데이트

## 5. 고급 기능 (선택 사항)

### A. 실시간 분봉 업데이트

```python
async def emit_realtime_candle():
    """실시간 분봉 업데이트"""
    bm = BinanceSocketManager(binance_client)

    async with bm.kline_socket(symbol='BTCUSDT', interval='5m') as stream:
        while True:
            msg = await stream.recv()
            kline = msg['k']

            if len(connected_clients) > 0:
                candle_data = {
                    'timeframe': '5m',
                    'candle': {
                        'timestamp': kline['t'],
                        'open': float(kline['o']),
                        'high': float(kline['h']),
                        'low': float(kline['l']),
                        'close': float(kline['c']),
                        'volume': float(kline['v']),
                        'isFinal': kline['x']
                    }
                }

                await sio.emit('realtime_candle_update', candle_data)
                logger.info(f"🔄 Realtime candle: ${float(kline['c']):.2f}")
```

### B. 계정 자산 업데이트

```python
async def emit_account_assets():
    """계정 자산 업데이트"""
    while True:
        try:
            if len(connected_clients) > 0:
                # 계정 정보 가져오기 (DB 또는 계산)
                asset_data = {
                    'accountId': 'Account_A',
                    'asset': {
                        'currentAsset': 105250.75,
                        'currentBTC': 0.5,
                        'currentCash': 57750.75,
                        'initialAsset': 100000.0
                    }
                }

                await sio.emit('account_assets_update', asset_data)

            await asyncio.sleep(1)  # 1초마다 업데이트

        except Exception as e:
            logger.error(f"Asset update error: {e}")
            await asyncio.sleep(1)
```

## 6. PM2로 영구 실행 (선택)

```bash
# PM2 설치
npm install -g pm2

# 서버 실행
pm2 start socketio_server.py --name hedgetrade-socketio --interpreter python3

# 자동 시작 설정
pm2 startup
pm2 save
```

## 7. 테스트

```bash
# 프론트엔드 콘솔에서 확인
# 1초마다: 💰 price_update received: 95123.45
# 5초마다: ⏰ binance_server_time received
```

---

## 요약

1. **설치**: `pip install python-socketio aiohttp python-binance`
2. **코드**: 위의 `socketio_server.py` 복사
3. **실행**: `python socketio_server.py`
4. **결과**: 프론트엔드 차트가 1초마다 실시간 업데이트!

프론트엔드는 이미 준비되어 있으므로 **백엔드만 추가하면 즉시 작동**합니다.
