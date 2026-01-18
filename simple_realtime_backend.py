#!/usr/bin/env python3
"""
간단한 실시간 자산/수익률 업데이트 백엔드 예제

1초마다 가격, 자산, 보유 정보, 메트릭을 계산해서 프론트엔드로 전송합니다.
프론트엔드는 받은 데이터를 그대로 표시만 하면 됩니다.

실행 방법:
    pip install python-socketio aiohttp python-binance
    python simple_realtime_backend.py
"""

import asyncio
import socketio
from aiohttp import web
from binance import AsyncClient
from datetime import datetime
import logging
import random

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

# 글로벌 변수
binance_client = None
current_price = 0.0
connected_clients = set()

# 가상 계정 데이터 (실제로는 DB에서 조회)
accounts = {
    'Account_A': {
        'initialAsset': 100000.0,
        'btcQuantity': 0.5,  # 현재 보유 BTC 수량
        'usdcFree': 52500.0,  # 현재 보유 USDC
        'hasPosition': True,
        'entryPrice': 95000.0,
        'entryTime': int(datetime.now().timestamp() * 1000),
        'tpPrice': 97500.0,
        'slPrice': 92500.0,
        'initialTakeProfitProb': 0.72,
        'totalTrades': 150,
        'winningTrades': 105,
    }
}


def calculate_account_data(account_id: str, current_price: float):
    """
    계정의 자산, 보유 정보, 메트릭을 실시간으로 계산

    이 함수가 핵심입니다:
    - 현재가를 받아서 BTC 가치 계산
    - 총 자산 = BTC 가치 + USDC
    - 수익률 = (현재 자산 - 초기 자산) / 초기 자산
    - 미실현 손익 = (현재가 - 진입가) × 보유 수량
    """
    account = accounts.get(account_id, {})

    # 1. 자산 계산
    btc_quantity = account.get('btcQuantity', 0.0)
    usdc_free = account.get('usdcFree', 0.0)

    current_btc_value = btc_quantity * current_price  # 현재가 기준 BTC 가치
    current_asset = current_btc_value + usdc_free     # 총 자산
    initial_asset = account.get('initialAsset', 100000.0)

    # 2. 보유 정보 계산
    has_position = account.get('hasPosition', False)
    holding_data = {}

    if has_position:
        entry_price = account.get('entryPrice', 0.0)
        quantity = btc_quantity

        # 미실현 손익 계산
        unrealized_pnl = (current_price - entry_price) * quantity  # 달러
        unrealized_pnl_pct = ((current_price - entry_price) / entry_price) * 100  # 퍼센트

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

    # 3. 메트릭 계산
    portfolio_return = ((current_asset - initial_asset) / initial_asset) * 100
    total_trades = account.get('totalTrades', 0)
    winning_trades = account.get('winningTrades', 0)
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0

    # 4. 통합 데이터 반환
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
            'portfolioReturnWithCommission': portfolio_return - 0.2,  # 수수료 차감 예시
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
    """
    1초마다 가격 + 자산 + 메트릭 업데이트 전송

    이것이 핵심 최적화 포인트:
    - 백엔드에서 모든 계산을 수행
    - 프론트엔드는 받은 데이터를 그대로 표시만
    - 1초마다 실시간 업데이트
    """
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
                    # 여기서 모든 계산 수행!
                    account_data = calculate_account_data(account_id, current_price)

                    # account_assets_update 이벤트로 모든 정보 전송
                    await sio.emit('account_assets_update', account_data)

                logger.info(
                    f"💰 Price: ${current_price:.2f} | "
                    f"Asset: ${account_data['asset']['currentAsset']:.2f} | "
                    f"Return: {account_data['metrics']['portfolioReturn']:.2f}%"
                )

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
    logger.info("🚀 Starting Realtime Assets Backend on port 54321...")
    logger.info("📊 Features:")
    logger.info("   - 1초마다 가격 업데이트")
    logger.info("   - 1초마다 자산 계산 (현재가 × BTC 수량)")
    logger.info("   - 1초마다 수익률 계산")
    logger.info("   - 1초마다 미실현 손익 계산")
    logger.info("   - 프론트엔드는 표시만!")
    logger.info("")
    logger.info("🌐 Connect your frontend to: ws://130.61.50.101:54321/ws/dashboard")
    logger.info("")

    web.run_app(app, host='0.0.0.0', port=54321)
