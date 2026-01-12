# 🔄 HedgeTrade 백엔드-프론트엔드 통합 가이드

**최종 업데이트**: 2025-12-08
**목적**: 백엔드와 프론트엔드 간의 정확한 통신 방식 정의

---

## 📋 현재 시스템 구조

### 데이터 플로우

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Binance API │ --> │ 백엔드 메모리 캐시 │ --> │ Oracle VM API   │ --> │ Edge Function│
│             │     │  (1분마다 업데이트) │     │ (54321 포트)     │     │   (프록시)    │
└─────────────┘     └──────────────────┘     └─────────────────┘     └──────────────┘
                                                       ↓
                                              ┌─────────────────┐
                                              │  프론트엔드      │
                                              │ (1분마다 호출)   │
                                              └─────────────────┘
```

### 통신 방식

- **방식**: REST API (JSON)
- **프로토콜**: HTTP GET
- **엔드포인트**: `http://130.61.50.101:54321/api/dashboard`
- **업데이트 주기**: 프론트엔드가 1분마다 호출
- **데이터 형식**: JSON
- **CSV 사용**: ❌ 없음 (CSV는 사용하지 않음)

---

## 🎯 백엔드가 해야 할 일

### 1. HTTP API 서버 실행

**포트**: `54321`
**호스트**: `0.0.0.0` (외부 접근 가능)

```python
# FastAPI 예시
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS 필수 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=54321)
```

### 2. API 엔드포인트 구현

**엔드포인트**: `GET /api/dashboard`

```python
@app.get("/api/dashboard")
async def get_dashboard():
    """
    프론트엔드가 1분마다 이 엔드포인트를 호출합니다.
    최신 데이터를 JSON으로 반환하세요.
    """

    # 현재 캐시된 데이터 반환
    return {
        "version": get_current_version(),  # ⚠️ 동적으로 가져오기 (하드코딩 금지)
        "currentTime": int(time.time() * 1000),
        "currentPrice": 95100.50,
        "asset": {
            "currentAsset": 105000,
            "currentBTC": 2.5,
            "currentCash": 0,
            "initialAsset": 100000
        },
        "priceHistory": {
            "1m": [...],  # 최소 500개 캔들
            "5m": [...],
            "4h": [...],
            "1d": [...]
        },
        "currentPrediction": {
            "takeProfitProb": 0.72,
            "stopLossProb": 0.28,
            "v5MoeTakeProfitProb": 0.68
        },
        "lastPredictionUpdateTime": int(time.time() * 1000),
        "holding": {
            "isHolding": True,
            "buyPrice": 95000,
            "buyTime": 1700000000000,
            "currentProfit": 0.36,
            "takeProfitPrice": 96500,
            "stopLossPrice": 94000,
            "initialTakeProfitProb": 0.68,
            "v5MoeTakeProfitProb": 0.72,
            "latestPrediction": {...}
        },
        "metrics": {
            "portfolioReturn": 5.0,
            "portfolioReturnWithCommission": 4.2,
            "marketReturn": 3.2,
            "avgTradeReturn": 1.8,
            "takeProfitCount": 12,
            "stopLossCount": 5
        },
        "trades": [...],
        "marketState": {...},
        "gateWeights": {...}
    }
```

### 3. 메모리 캐싱 전략 (권장)

```python
# 전역 캐시 변수
cached_data = {
    "price_history": {},
    "trades": [],
    "holding": {},
    "current_prediction": {},
    "metrics": {}
}

# 백그라운드 작업: 1분마다 캐시 업데이트
async def update_cache_periodically():
    while True:
        # 바이낸스 서버 시간과 동기화
        await time_sync.async_wait_until_next_minute_candle(buffer_seconds=2)

        # 바이낸스 API에서 데이터 다운로드
        current_time = time_sync.get_synced_time()

        # 1분봉 데이터 가져오기
        new_candle = fetch_binance_kline("BTCUSDT", "1m", limit=1)[0]
        cached_data["price_history"]["1m"].append(new_candle)

        # 예측 모델 실행
        prediction = run_prediction_model(cached_data["price_history"]["1m"])
        cached_data["current_prediction"] = prediction
        cached_data["last_prediction_time"] = current_time

        # 매매 로직 실행
        execute_trading_logic(prediction, current_time)

        print(f"✅ 캐시 업데이트 완료: {current_time}")

# 서버 시작 시 백그라운드 작업 시작
@app.on_event("startup")
async def start_background_tasks():
    import asyncio
    asyncio.create_task(update_cache_periodically())
```

---

## ⚠️ 중요: 버전 관리

### 문제점

현재 `v5.0.0.53`이 계속 표시되는 이유:
- ❌ 백엔드에서 버전이 하드코딩되어 있을 가능성
- ❌ 업데이트 로직이 없어서 오래된 버전이 계속 반환됨

### 해결책

**버전을 동적으로 관리하세요:**

```python
# ✅ 올바른 방법: 버전을 변수로 관리
CURRENT_VERSION = "v6.19.0.1"  # 업데이트할 때마다 수정

@app.get("/api/dashboard")
async def get_dashboard():
    return {
        "version": CURRENT_VERSION,
        ...
    }
```

**또는 Git 커밋 해시를 사용:**

```python
import subprocess

def get_git_version():
    try:
        commit = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD']).decode('ascii').strip()
        return f"v6.0.1-{commit}"
    except:
        return "v6.0.1-unknown"

@app.get("/api/dashboard")
async def get_dashboard():
    return {
        "version": get_git_version(),
        ...
    }
```

---

## 🚀 최적화된 아키텍처 (권장)

### 백엔드 구조

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import time

# 전역 변수
CURRENT_VERSION = "v6.0.1.120"
time_sync = BinanceTimeSync()
data_cache = DataCache()

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 엔드포인트
@app.get("/api/dashboard")
async def get_dashboard():
    """프론트엔드가 호출하는 메인 엔드포인트"""
    return {
        "version": CURRENT_VERSION,
        "currentTime": time_sync.get_synced_time(),
        **data_cache.get_all_data()
    }

# 백그라운드 작업: 1분마다 데이터 업데이트
async def periodic_data_update():
    """1분마다 바이낸스에서 데이터를 가져와 캐시 업데이트"""
    while True:
        # 다음 분봉까지 대기
        await time_sync.async_wait_until_next_minute_candle(buffer_seconds=2)

        # 현재 시간
        current_time = time_sync.get_synced_time()

        # 1. 바이낸스에서 새 캔들 가져오기
        new_candles = fetch_new_candles_from_binance()
        data_cache.update_price_history(new_candles)

        # 2. 예측 모델 실행
        prediction = run_prediction_model()
        data_cache.update_prediction(prediction, current_time)

        # 3. 매매 로직 실행
        trade_result = execute_trading_strategy(prediction)
        if trade_result:
            data_cache.add_trade(trade_result)

        # 4. 포지션 및 메트릭 업데이트
        data_cache.update_holding_status()
        data_cache.calculate_metrics()

        print(f"✅ [{current_time}] 데이터 업데이트 완료")

@app.on_event("startup")
async def startup():
    """서버 시작 시 초기화"""
    print(f"🚀 서버 시작 - 버전: {CURRENT_VERSION}")

    # 시간 동기화
    time_sync.sync()

    # 초기 데이터 로드 (바이낸스에서 500개 캔들 다운로드)
    await data_cache.initialize()

    # 백그라운드 작업 시작
    asyncio.create_task(periodic_data_update())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=54321)
```

---

## 📊 캐싱 vs API 비교

| 항목 | 현재 방식 (권장) | 대안 |
|------|-----------------|------|
| **백엔드 캐싱** | ✅ 메모리에 캐시, API로 제공 | ❌ CSV 파일 저장 |
| **업데이트** | ✅ 1분마다 자동 업데이트 | ❌ 파일 I/O 느림 |
| **프론트 호출** | ✅ HTTP GET (빠름) | ❌ 파일 읽기 (느림) |
| **확장성** | ✅ 여러 클라이언트 가능 | ❌ 단일 사용자만 |
| **실시간성** | ✅ 즉시 응답 | ❌ 파일 동기화 필요 |

**결론**: 현재 방식(REST API + 메모리 캐싱)이 최적입니다.

---

## 🔍 프론트엔드 동작 방식

프론트엔드는 이미 완벽하게 구현되어 있습니다:

```typescript
// src/services/oracleApi.ts
export const fetchDashboardData = async (): Promise<DashboardData> => {
  const url = `/.netlify/functions/oracle-proxy?endpoint=${encodeURIComponent('/api/dashboard')}&_=${Date.now()}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    },
  });

  if (!response.ok) {
    throw new Error(`Oracle VM unavailable: ${response.status}`);
  }

  return await response.json();
};
```

```typescript
// src/App.tsx
useEffect(() => {
  const interval = setInterval(() => {
    loadData();  // fetchDashboardData 호출
  }, 60000); // 1분마다

  return () => clearInterval(interval);
}, []);
```

**프론트엔드는 아무것도 수정할 필요 없습니다.**

---

## ✅ 체크리스트: 백엔드 개발자용

### 필수 사항

- [ ] **HTTP 서버가 `0.0.0.0:54321`에서 실행 중**
- [ ] **CORS 헤더가 올바르게 설정됨** (`Access-Control-Allow-Origin: *`)
- [ ] **`GET /api/dashboard` 엔드포인트 구현**
- [ ] **모든 타임스탬프가 밀리초 단위** (`int(time.time() * 1000)`)
- [ ] **`version` 필드가 동적으로 생성됨** (하드코딩 금지)
- [ ] **`currentPrediction`이 모든 응답에 포함**
- [ ] **`lastPredictionUpdateTime`이 모든 응답에 포함**
- [ ] **각 타임프레임별로 최소 500개 캔들 제공** (특히 4h, 1d)

### 성능 최적화

- [ ] **메모리 캐싱 구현** (바이낸스 API 호출 최소화)
- [ ] **바이낸스 서버 시간 동기화** (`binance_sync_example.py` 참고)
- [ ] **1분마다 자동으로 캐시 업데이트** (백그라운드 작업)
- [ ] **API 응답 시간 < 100ms** (캐시에서 즉시 반환)

### 데이터 정확성

- [ ] **`holding.isHolding`이 매도 체결 후에만 false로 변경**
- [ ] **`holding.currentProfit`가 실시간으로 업데이트**
- [ ] **`holding.v5MoeTakeProfitProb`가 최신 예측값 반영**
- [ ] **`trades` 배열이 timestamp 오름차순 정렬**
- [ ] **모든 확률 값이 0~1 사이**

---

## 🐛 자주 발생하는 문제

### 문제 1: "v5.0.0.53"이 계속 표시됨

**원인**: 버전이 하드코딩되어 있음

**해결**:
```python
# ❌ 잘못된 예
return {"version": "v5.0.0.53", ...}

# ✅ 올바른 예
CURRENT_VERSION = "v6.0.1.120"
return {"version": CURRENT_VERSION, ...}
```

### 문제 2: 프론트엔드가 캐시된 데이터를 받음

**원인**: 브라우저 캐싱 또는 백엔드 응답 헤더 문제

**해결**:
```python
from fastapi import Response

@app.get("/api/dashboard")
async def get_dashboard(response: Response):
    # 캐시 방지 헤더
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return {...}
```

### 문제 3: "1970년" 날짜가 표시됨

**원인**: 타임스탬프를 초 단위로 보냄

**해결**:
```python
# ❌ 잘못된 예
timestamp = int(time.time())  # 1700000000 (초)

# ✅ 올바른 예
timestamp = int(time.time() * 1000)  # 1700000000000 (밀리초)
```

### 문제 4: currentProfit가 undefined

**원인**: 백엔드가 `holding.currentProfit`를 보내지 않음

**해결**:
```python
# holding.isHolding = True일 때 반드시 포함
"holding": {
    "isHolding": True,
    "buyPrice": 95000,
    "buyTime": 1700000000000,
    "currentProfit": 0.36,  # ⚠️ 필수
    "takeProfitPrice": 96500,
    "stopLossPrice": 94000,
    "initialTakeProfitProb": 0.68,
    "v5MoeTakeProfitProb": 0.72
}
```

---

## 📚 참고 문서

- **`BACKEND_API_SPEC.md`**: 전체 API 명세 (가장 상세함)
- **`API_SPEC.md`**: 간단한 API 가이드
- **`binance_sync_example.py`**: 바이낸스 시간 동기화 예시
- **`BINANCE_SYNC_README.md`**: 시간 동기화 가이드

---

## 🎯 요약

### 백엔드가 할 일

1. **HTTP 서버 실행** (포트 54321)
2. **`GET /api/dashboard` 엔드포인트 구현**
3. **1분마다 바이낸스에서 데이터 가져와 메모리 캐시 업데이트**
4. **API 호출 시 캐시된 데이터를 JSON으로 반환**
5. **버전을 동적으로 관리** (하드코딩 금지)

### 프론트엔드가 하는 일

1. **1분마다 백엔드 API 호출**
2. **받은 JSON 데이터를 화면에 표시**
3. **아무것도 수정할 필요 없음** (이미 완료)

### 데이터 플로우

```
바이낸스 API
    ↓
백엔드 메모리 캐시 (1분마다 업데이트)
    ↓
백엔드 API 엔드포인트 (GET /api/dashboard)
    ↓
프론트엔드 (1분마다 호출)
```

**CSV는 사용하지 않습니다!**
**모든 통신은 JSON REST API로 처리됩니다!**
