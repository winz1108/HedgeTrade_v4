# Multi-Account Architecture Design

## 🎯 목표

**하나의 트레이딩 에이전트가 신호를 보내면, 3개의 Binance 계정이 각각 매매하고, 각 계정 소유자는 자기 계정 데이터만 대시보드에서 볼 수 있어야 함.**

---

## 🚨 현재 구조의 문제점

### 문제 1: Oracle VM이 단일 인스턴스로 작동
```
현재 구조:
┌─────────────┐
│  Oracle VM  │ ← 하나의 VM이 하나의 Binance 계정만 관리
│  (단일)     │
└─────────────┘
```

**문제:**
- Oracle VM이 하나의 Binance API 키만 가지고 있음
- 모든 요청이 같은 계정 데이터를 반환
- 사용자별 API 키를 받아도 Oracle VM 내부 상태가 공유됨

### 문제 2: 캐시/상태 공유
```python
# Oracle VM 내부 (잘못된 구조)
class OracleVM:
    def __init__(self):
        self.binance_client = BinanceClient(API_KEY, SECRET)  # ❌ 고정된 하나의 클라이언트
        self.current_position = None
        self.trade_history = []
```

**문제:**
- 인스턴스 변수로 상태를 저장
- User A가 요청 → User A 데이터 캐시
- User B가 요청 → User A 캐시를 그대로 반환 또는 덮어씀

---

## ✅ 해결 방법

### 아키텍처 1: 사용자별 세션 격리 (권장)

```
┌──────────────────────────────────────────────────────────────┐
│                      Oracle VM (Flask)                       │
│                                                              │
│  def get_dashboard(request):                                │
│      api_key = request.json['api_key']                      │
│      secret_key = request.json['secret_key']                │
│                                                              │
│      # 매 요청마다 새로운 클라이언트 생성                     │
│      binance = BinanceClient(api_key, secret_key)           │
│      account_data = binance.get_account()                   │
│      trades = binance.get_trades()                          │
│                                                              │
│      # 알고리즘 실행 (이 사용자의 데이터로만)                │
│      result = run_algorithm(account_data, trades)           │
│      return result                                          │
└──────────────────────────────────────────────────────────────┘
```

**핵심:**
1. **매 요청마다** 사용자의 API 키로 새로운 Binance 클라이언트 생성
2. **상태를 인스턴스 변수에 저장하지 않음**
3. **모든 데이터를 요청 범위(request scope) 내에서만 처리**

### 구현 예시

```python
# ✅ CORRECT: Stateless approach
@app.route('/api/dashboard', methods=['POST'])
def get_dashboard():
    try:
        # 1. Get user's API keys from request
        api_key = request.json.get('api_key')
        secret_key = request.json.get('secret_key')

        if not api_key or not secret_key:
            return jsonify({"error": "API keys required"}), 400

        # 2. Create Binance client for THIS USER ONLY
        binance = BinanceClient(api_key, secret_key)

        # 3. Fetch THIS USER'S data
        account = binance.get_account()
        positions = binance.get_positions()
        trades = binance.get_my_trades(symbol='BTCUSDT', limit=100)

        # 4. Run algorithm on THIS USER'S data
        current_price = float(binance.get_symbol_ticker(symbol='BTCUSDT')['price'])
        prediction = run_prediction_model(current_price, trades)

        # 5. Calculate THIS USER'S metrics
        metrics = calculate_metrics(account, trades)

        # 6. Return THIS USER'S data
        return jsonify({
            "currentPrice": current_price,
            "currentTime": int(time.time() * 1000),
            "asset": {
                "currentAsset": account['totalAsset'],
                "initialAsset": 10000,  # Get from DB
                "currentBTC": account['balances']['BTC'],
                "currentCash": account['balances']['USDT']
            },
            "holding": {
                "isHolding": len(positions) > 0,
                "buyPrice": positions[0]['entryPrice'] if positions else None,
                # ...
            },
            "trades": format_trades(trades),
            "metrics": metrics,
            "currentPrediction": prediction
        }), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


# ❌ WRONG: Stateful approach (현재 구조의 문제)
class OracleVM:
    def __init__(self):
        self.binance = None  # ❌ 공유 상태
        self.current_position = None  # ❌ 공유 상태

    def get_dashboard(self, api_key, secret_key):
        # 첫 번째 사용자 데이터로 초기화
        if not self.binance:
            self.binance = BinanceClient(api_key, secret_key)

        # ❌ 두 번째 사용자가 요청하면 첫 번째 사용자 데이터 반환
        return self.binance.get_account()
```

---

## 🔄 사용자별 데이터 격리 체크리스트

### 1. Binance 클라이언트
```python
# ❌ BAD: Shared client
binance_client = BinanceClient(API_KEY, SECRET)  # Global variable

@app.route('/api/dashboard')
def get_dashboard():
    data = binance_client.get_account()  # All users see same data
    return data

# ✅ GOOD: Per-request client
@app.route('/api/dashboard', methods=['POST'])
def get_dashboard():
    api_key = request.json['api_key']
    secret_key = request.json['secret_key']

    binance_client = BinanceClient(api_key, secret_key)  # New client per user
    data = binance_client.get_account()
    return data
```

### 2. 캐시 관리
```python
# ❌ BAD: Shared cache
cache = {}

@app.route('/api/dashboard', methods=['POST'])
def get_dashboard():
    if 'data' in cache:
        return cache['data']  # All users get same cached data

    data = fetch_data()
    cache['data'] = data
    return data

# ✅ GOOD: User-specific cache
cache = {}

@app.route('/api/dashboard', methods=['POST'])
def get_dashboard():
    user_id = request.json['user_id']
    cache_key = f"user_{user_id}"

    if cache_key in cache:
        return cache[cache_key]

    data = fetch_data(user_id)
    cache[cache_key] = data
    return data
```

### 3. 거래 기록 저장
```python
# ❌ BAD: Single trade history
trade_history = []

def record_trade(trade):
    trade_history.append(trade)  # Mixed trades from all users

# ✅ GOOD: User-specific trade history (use database)
def record_trade(user_id, trade):
    db.execute(
        "INSERT INTO trades (user_id, type, price, timestamp) VALUES (?, ?, ?, ?)",
        (user_id, trade['type'], trade['price'], trade['timestamp'])
    )

def get_trades(user_id):
    return db.execute(
        "SELECT * FROM trades WHERE user_id = ? ORDER BY timestamp DESC",
        (user_id,)
    ).fetchall()
```

---

## 🏗️ 권장 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                               │
│  User A Dashboard  │  User B Dashboard  │  User C Dashboard    │
└────────┬────────────┴────────┬───────────┴────────┬─────────────┘
         │                     │                     │
         │ Cookie: session_A   │ Cookie: session_B   │ Cookie: session_C
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Flask/FastAPI)                      │
│                                                                 │
│  /api/dashboard (POST)                                         │
│    1. Get session from cookie                                  │
│    2. Get user from DB using session                           │
│    3. Get user's API keys from DB                              │
│    4. Call Oracle VM with user's API keys                      │
│    5. Return user-specific data                                │
└────────┬────────────────────┬──────────────────┬───────────────┘
         │                    │                  │
         │ api_key_A          │ api_key_B        │ api_key_C
         │ secret_A           │ secret_B         │ secret_C
         │                    │                  │
         ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Oracle VM (Stateless)                      │
│                                                                 │
│  def get_dashboard(api_key, secret_key):                       │
│      binance = BinanceClient(api_key, secret_key)  # New!     │
│      account = binance.get_account()                           │
│      trades = binance.get_trades()                             │
│      return process_data(account, trades)                      │
└────────┬────────────────────┬──────────────────┬───────────────┘
         │                    │                  │
         ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Binance API                             │
│   Account A          Account B          Account C              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 트레이딩 신호 전파 (하나의 에이전트 → 여러 계정)

### 방법 1: Webhook 방식 (권장)

```
┌───────────────────┐
│  Trading Agent    │  ← 하나의 알고리즘이 신호 생성
│  (Oracle VM Core) │
└────────┬──────────┘
         │
         │ 매수/매도 신호 발생
         │
         ▼
┌───────────────────┐
│  Signal Service   │
│                   │
│  signal = {       │
│    action: "BUY", │
│    price: 42000,  │
│    time: now()    │
│  }                │
└────────┬──────────┘
         │
         │ 모든 계정에 신호 전파
         ├──────────┬──────────┐
         ▼          ▼          ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  User A     │ │  User B     │ │  User C     │
│  API Keys   │ │  API Keys   │ │  API Keys   │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Binance A   │ │ Binance B   │ │ Binance C   │
│ BUY BTC     │ │ BUY BTC     │ │ BUY BTC     │
└─────────────┘ └─────────────┘ └─────────────┘
```

### 구현 예시

```python
# 1. Trading Agent (신호 생성)
class TradingAgent:
    def check_signal(self):
        current_price = get_current_price()
        prediction = run_model(current_price)

        if should_buy(prediction):
            signal = {
                "action": "BUY",
                "price": current_price,
                "timestamp": time.time(),
                "prediction": prediction
            }
            broadcast_signal(signal)

        elif should_sell(prediction):
            signal = {
                "action": "SELL",
                "price": current_price,
                "timestamp": time.time()
            }
            broadcast_signal(signal)


# 2. Signal Service (신호 전파)
def broadcast_signal(signal):
    """모든 활성 사용자에게 신호 전파"""
    # Get all users with API keys
    users = db.execute(
        "SELECT id, api_key, secret_key_encrypted FROM users WHERE api_key IS NOT NULL"
    ).fetchall()

    for user in users:
        try:
            execute_trade(
                user_id=user['id'],
                api_key=user['api_key'],
                secret_key=decrypt(user['secret_key_encrypted']),
                signal=signal
            )
        except Exception as e:
            print(f"Failed to execute trade for user {user['id']}: {e}")


# 3. Execute Trade (개별 계정에서 실행)
def execute_trade(user_id, api_key, secret_key, signal):
    """특정 사용자의 계정에서 거래 실행"""
    binance = BinanceClient(api_key, secret_key)

    if signal['action'] == 'BUY':
        # Get user's available balance
        account = binance.get_account()
        usdt_balance = float(account['balances']['USDT']['free'])

        # Calculate buy amount (예: 자산의 95% 사용)
        buy_amount = usdt_balance * 0.95 / signal['price']

        # Execute buy order
        order = binance.create_market_buy_order(
            symbol='BTCUSDT',
            quantity=buy_amount
        )

        # Record trade in database
        db.execute(
            "INSERT INTO trades (user_id, type, price, quantity, timestamp) VALUES (?, ?, ?, ?, ?)",
            (user_id, 'buy', signal['price'], buy_amount, signal['timestamp'])
        )

    elif signal['action'] == 'SELL':
        # Get user's BTC balance
        account = binance.get_account()
        btc_balance = float(account['balances']['BTC']['free'])

        # Execute sell order
        order = binance.create_market_sell_order(
            symbol='BTCUSDT',
            quantity=btc_balance
        )

        # Record trade in database
        db.execute(
            "INSERT INTO trades (user_id, type, price, quantity, timestamp) VALUES (?, ?, ?, ?, ?)",
            (user_id, 'sell', signal['price'], btc_balance, signal['timestamp'])
        )
```

---

## 📊 데이터베이스 스키마

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    api_key TEXT,
    secret_key_encrypted TEXT,
    initial_asset DECIMAL(20, 8) DEFAULT 10000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trades table (user-specific)
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(10) NOT NULL,  -- 'buy' or 'sell'
    price DECIMAL(20, 8) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    timestamp BIGINT NOT NULL,
    pair_id UUID,  -- Link buy/sell pairs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_timestamp (user_id, timestamp)
);

-- Signals table (shared across all users)
CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(10) NOT NULL,  -- 'BUY' or 'SELL'
    price DECIMAL(20, 8) NOT NULL,
    prediction JSONB,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 구현 우선순위

### Phase 1: 데이터 격리 수정 (최우선)
1. Oracle VM을 stateless로 변경
2. 매 요청마다 사용자 API 키로 새 Binance 클라이언트 생성
3. 모든 공유 상태 제거

### Phase 2: 사용자별 데이터 저장
1. 거래 기록을 DB에 user_id와 함께 저장
2. 각 사용자의 initial_asset 저장
3. 대시보드 API가 DB에서 사용자별 데이터 조회

### Phase 3: 신호 전파 시스템
1. Trading Agent가 신호 생성
2. Signal Service가 모든 활성 사용자에게 전파
3. 각 사용자의 API 키로 거래 실행

---

## 🎯 핵심 포인트

1. **Stateless Oracle VM**: 인스턴스 변수 없음, 모든 데이터는 요청 스코프
2. **Per-Request Clients**: 매 요청마다 사용자 API 키로 새 클라이언트
3. **Database for Persistence**: 거래 기록, 사용자 설정 등 DB에 저장
4. **Signal Broadcasting**: 하나의 신호 → 모든 계정에 전파

캐시를 다르게 하는 것보다 **근본적으로 stateless 구조**로 변경하는 것이 정답입니다.
