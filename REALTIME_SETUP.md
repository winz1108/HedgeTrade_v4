# 실시간 자산/수익률 업데이트 설정 가이드

## 개요

백엔드에서 1초마다 가격 변동에 따라 자산과 수익률을 계산해서 프론트엔드로 전송합니다.
프론트엔드는 받은 데이터를 그대로 표시만 하면 됩니다.

## 작동 원리

```
┌─────────────┐                    ┌──────────────┐                    ┌─────────────┐
│  Binance    │  1초마다 가격      │   Backend    │  1초마다 계산된    │  Frontend   │
│   API       │ ─────────────────> │   Server     │ ──────────────────> │  Dashboard  │
│             │                    │              │  자산/수익률 전송   │             │
└─────────────┘                    └──────────────┘                    └─────────────┘
                                          │
                                          │ 계산:
                                          │ - 총 자산 = BTC × 현재가 + USDC
                                          │ - 수익률 = (현재 자산 - 초기 자산) / 초기 자산
                                          │ - 미실현 손익 = (현재가 - 진입가) × 보유량
                                          │ - 승률 = 익절 / 총 거래
```

## 빠른 시작

### 1. Oracle VM 서버에서 백엔드 실행

```bash
# SSH 접속
ssh username@130.61.50.101

# 패키지 설치 (최초 1회만)
pip install python-socketio aiohttp python-binance redis

# 백엔드 서버 실행
cd /path/to/project
python simple_realtime_backend.py
```

### 2. 프론트엔드는 자동으로 연결됨

프론트엔드는 이미 준비되어 있습니다!
백엔드가 실행되면 자동으로:
- ✅ WebSocket 연결
- ✅ 1초마다 가격 업데이트
- ✅ 1초마다 자산 업데이트
- ✅ 1초마다 수익률 업데이트
- ✅ 화면에 실시간 표시

## 백엔드에서 전송하는 데이터

### 이벤트 1: `price_update` (1초마다)

```json
{
  "currentPrice": 95123.45,
  "currentTime": 1705334400000
}
```

### 이벤트 2: `account_assets_update` (1초마다)

**이것이 핵심입니다!** 백엔드에서 모든 계산을 수행합니다.

```json
{
  "accountId": "Account_A",
  "asset": {
    "currentAsset": 105250.75,      // ← 계산됨: BTC × 현재가 + USDC
    "currentBTC": 47500.50,         // ← 계산됨: BTC 수량 × 현재가
    "currentCash": 57750.25,        // ← USDC 잔액
    "initialAsset": 100000.0,       // ← 초기 자산
    "btcQuantity": 0.5,             // ← 보유 BTC 수량
    "usdcFree": 57750.25,
    "usdcLocked": 0.0
  },
  "holding": {
    "hasPosition": true,
    "entryPrice": 95000.0,          // ← 진입 가격
    "quantity": 0.5,
    "currentPrice": 95123.45,       // ← 현재 가격
    "unrealizedPnl": 61.73,         // ← 계산됨: (현재가 - 진입가) × 수량
    "unrealizedPnlPct": 0.13,       // ← 계산됨: 수익률 (%)
    "tpPrice": 97500.0,             // ← 익절 목표가
    "slPrice": 92500.0,             // ← 손절 목표가
    "entryTime": 1705334400000,
    "initialTakeProfitProb": 0.72
  },
  "metrics": {
    "portfolioReturn": 5.25,        // ← 계산됨: (현재 자산 - 초기 자산) / 초기 자산
    "portfolioReturnWithCommission": 5.05,  // ← 수수료 반영
    "totalTrades": 150,
    "winningTrades": 105,           // ← 익절 횟수
    "winRate": 70.0,                // ← 계산됨: 익절 / 총 거래 × 100
    "totalPnl": 5250.75,            // ← 총 손익 (달러)
    "avgPnl": 35.0                  // ← 평균 손익
  }
}
```

## 프론트엔드 처리

프론트엔드는 **계산 없이** 받은 데이터를 그대로 표시만 합니다:

```typescript
// App.tsx에서 자동으로 처리됨 (이미 구현됨)
websocketService.onAccountAssetsUpdate((update) => {
  // 자산 업데이트
  setCurrentAsset(update.asset.currentAsset);
  setCurrentBTC(update.asset.currentBTC);

  // 보유 정보 업데이트
  if (update.holding) {
    setHolding({
      isHolding: update.holding.hasPosition,
      buyPrice: update.holding.entryPrice,
      currentProfit: update.holding.unrealizedPnlPct,  // ← 이미 계산된 값!
      // ...
    });
  }

  // 메트릭 업데이트
  if (update.metrics) {
    setMetrics({
      portfolioReturn: update.metrics.portfolioReturn,  // ← 이미 계산된 값!
      winRate: update.metrics.winRate,                  // ← 이미 계산된 값!
      // ...
    });
  }
});
```

## 성능 최적화

### 백엔드 계산 (1초에 1번)

```python
# 매우 간단하고 빠른 계산
btc_value = btc_quantity * current_price       # 곱셈 1번
total_asset = btc_value + usdc                 # 덧셈 1번
portfolio_return = (total - initial) / initial # 나눗셈 1번
unrealized_pnl = (price - entry) * quantity    # 곱셈 1번

# CPU 부하: 거의 없음 (< 0.1ms)
```

### 네트워크 전송 (1초에 1번)

```
데이터 크기: ~300 bytes
초당 전송: 300 bytes × 1번 = 300 bytes/s
100명 동시 접속: 30 KB/s (매우 작음)
```

### 프론트엔드 (받아서 표시만)

```typescript
// 계산 없음! 그냥 표시만
<div>Total Asset: ${data.currentAsset}</div>
<div>Return: {data.metrics.portfolioReturn}%</div>
<div>Profit: {data.holding.unrealizedPnlPct}%</div>
```

## 실제 계정 데이터 연동

### Option 1: DB에서 조회

```python
import psycopg2

def get_account_from_db(account_id: str):
    conn = psycopg2.connect("postgresql://...")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT btc_quantity, usdc_balance, has_position, entry_price
        FROM accounts
        WHERE account_id = %s
    """, (account_id,))

    return cursor.fetchone()
```

### Option 2: Redis 캐시

```python
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379)

def get_account_from_redis(account_id: str):
    account_data = redis_client.get(f"account:{account_id}")
    return json.loads(account_data) if account_data else None
```

### Option 3: 바이낸스 API 직접 조회

```python
async def get_account_from_binance():
    account = await binance_client.get_account()

    balances = {b['asset']: float(b['free'])
                for b in account['balances']}

    return {
        'btcQuantity': balances.get('BTC', 0.0),
        'usdcFree': balances.get('USDC', 0.0),
    }
```

## 거래 발생 시 즉시 업데이트

```python
async def on_trade_executed(account_id: str, trade_type: str, price: float, quantity: float):
    """거래 체결 시 계정 업데이트 및 즉시 전송"""
    account = accounts[account_id]

    if trade_type == 'BUY':
        account['btcQuantity'] += quantity
        account['usdcFree'] -= price * quantity
        account['hasPosition'] = True
        account['entryPrice'] = price
        account['totalTrades'] += 1
    elif trade_type == 'SELL':
        account['btcQuantity'] -= quantity
        account['usdcFree'] += price * quantity
        account['hasPosition'] = False

        # 익절 판단
        if price >= account.get('tpPrice', 0):
            account['winningTrades'] += 1

    # DB 또는 Redis에 저장
    save_to_db(account_id, account)

    # 즉시 프론트엔드로 전송
    account_data = calculate_account_data(account_id, price)
    await sio.emit('account_assets_update', account_data)
```

## PM2로 영구 실행

```bash
# PM2 설치
npm install -g pm2

# 백엔드 서버 실행
pm2 start simple_realtime_backend.py --name hedgetrade-realtime --interpreter python3

# 로그 확인
pm2 logs hedgetrade-realtime

# 자동 시작 설정
pm2 startup
pm2 save

# 상태 확인
pm2 status
```

## 테스트

### 1. 백엔드 실행 확인

```bash
# 프로세스 확인
ps aux | grep simple_realtime_backend

# 포트 확인
netstat -tuln | grep 54321

# 로그 확인
tail -f /var/log/hedgetrade-realtime.log
```

### 2. 프론트엔드 콘솔 확인

브라우저 개발자 도구 콘솔에서:

```
✅ WebSocket CONNECTED
💰 price_update received: 95123.45
💰 account_assets_update received: Account_A
   Asset: $105250.75
   Return: 5.25%
```

### 3. 실시간 업데이트 확인

- 가격이 1초마다 업데이트됨
- 자산 가치가 가격에 따라 실시간 변동
- 수익률이 실시간으로 계산됨
- 미실현 손익이 실시간 업데이트

## 트러블슈팅

### 백엔드가 연결 안 됨

```bash
# 방화벽 확인
sudo ufw status
sudo ufw allow 54321

# 서버 실행 확인
sudo systemctl status hedgetrade-realtime

# 로그 확인
sudo journalctl -u hedgetrade-realtime -f
```

### 데이터가 업데이트 안 됨

```bash
# 백엔드 로그 확인
pm2 logs hedgetrade-realtime

# 바이낸스 API 연결 확인
curl https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT
```

### 프론트엔드 WebSocket 끊김

```javascript
// 브라우저 콘솔에서 확인
websocketService.isConnected()  // true여야 함

// 재연결
websocketService.disconnect()
websocketService.connect()
```

## 결과

백엔드 서버가 실행되면:

✅ **1초마다 실시간 업데이트**
- 가격: 바이낸스 실시간 가격
- 자산: 현재가 × BTC 수량 + USDC
- 수익률: (현재 자산 - 초기 자산) / 초기 자산
- 미실현 손익: (현재가 - 진입가) × 보유량
- 승률: 익절 횟수 / 총 거래 횟수

✅ **프론트엔드 연산 부담 제로**
- 모든 계산은 백엔드에서
- 프론트엔드는 표시만

✅ **완벽한 동기화**
- 모든 클라이언트가 동일한 데이터
- 가격 변동 즉시 반영

✅ **확장 가능**
- 계정 추가 쉬움
- 성능 영향 최소
