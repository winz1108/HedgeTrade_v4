# 바이낸스 서버 시간 동기화 가이드

## 📋 개요

바이낸스 API와 정확하게 동기화하여 1분봉 데이터를 수집하는 방법을 설명합니다.

## 🎯 핵심 개념

### 1. 왜 서버 시간 동기화가 필요한가?

- **로컬 시간 문제**: 컴퓨터 시계가 정확하지 않을 수 있음
- **네트워크 지연**: API 호출 시 왕복 시간 발생
- **정확한 타이밍**: 분봉이 정확히 완료된 후 데이터 수집 필요

### 2. 동기화 방식

```
1. 바이낸스 서버 시간 가져오기
   ↓
2. 로컬 시간과 비교하여 오프셋 계산
   ↓
3. 네트워크 지연 보정
   ↓
4. 이후 모든 시간 계산에 오프셋 적용
```

## 🔧 구현 방법

### 기본 사용법

```python
from binance_sync_example import BinanceTimeSync

# 1. 시간 동기화 객체 생성
time_sync = BinanceTimeSync()

# 2. 초기 동기화
time_sync.sync()

# 3. 메인 루프
while True:
    # 다음 분봉까지 대기 (2초 버퍼)
    time_sync.wait_until_next_minute_candle(buffer_seconds=2)

    # 동기화된 현재 시간
    current_time = time_sync.get_synced_time()

    # 데이터 수집
    download_candle_data(current_time)
```

### 타임라인 예시

```
현재 시간: 14:30:45.123
다음 분봉 완성: 14:31:00.000
버퍼 2초 추가: 14:31:02.000

→ 대기 시간: 16.877초

[14:31:02에 API 호출]
→ 14:30:00 ~ 14:31:00 캔들 데이터 확실히 확보
```

## 📊 로그 출력 예시

### 초기 동기화

```
======================================================================
⏰ 바이낸스 서버 시간 동기화 완료
   로컬 시간:  2024-01-15 14:30:45.123 (KST)
   서버 시간:  2024-01-15 05:30:45.098 (UTC)
   시간 차이:  -25 ms
   네트워크 지연: 12 ms
======================================================================
```

### 분봉 대기

```
⏳ 다음 분봉 대기 중...
   현재 시간 (서버): 2024-01-15 05:30:45.098
   다음 업데이트:     2024-01-15 05:31:02.000
   대기 시간:         16.9초

✅ 분봉 업데이트 완료! 현재 시간: 2024-01-15 05:31:02.001
```

## 🚀 FastAPI 통합

### 전체 코드 예시

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
from binance_sync_example import BinanceTimeSync

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 전역 시간 동기화 객체
time_sync = BinanceTimeSync()

# 전역 데이터 캐시
latest_data = {}

@app.on_event("startup")
async def startup_event():
    """서버 시작 시 초기화"""
    # 시간 동기화
    time_sync.sync()

    # 백그라운드 태스크 시작
    asyncio.create_task(periodic_update())

    print("✅ 서버 시작 완료")

async def periodic_update():
    """주기적으로 데이터 업데이트"""
    global latest_data

    while True:
        try:
            # 다음 분봉까지 대기 (2초 버퍼)
            await time_sync.async_wait_until_next_minute_candle(buffer_seconds=2)

            # 동기화된 현재 시간
            current_time = time_sync.get_synced_time()

            # 바이낸스 API에서 데이터 다운로드
            candle_data = download_binance_data(current_time)

            # 기술 지표 계산
            candle_data = calculate_indicators(candle_data)

            # 전역 캐시 업데이트
            latest_data = {
                "currentTime": current_time,
                "currentPrice": candle_data[-1]["close"],
                "priceHistory1m": candle_data,
                # ... 나머지 필드
            }

            print(f"✅ 데이터 업데이트 완료: {current_time}")

        except Exception as e:
            print(f"❌ 업데이트 오류: {e}")

@app.get("/api/dashboard")
async def get_dashboard():
    """실시간 대시보드 데이터 반환"""
    if not latest_data:
        return {"error": "Data not ready"}

    return latest_data

@app.get("/api/sim_data")
async def get_simulation_data():
    """시뮬레이션 데이터 반환"""
    # 시뮬레이션 데이터 반환 로직
    pass

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=54321)
```

## 📦 필수 라이브러리

```bash
pip install requests fastapi uvicorn
```

## ⚙️ 설정 옵션

### BinanceTimeSync 파라미터

| 파라미터 | 설명 | 기본값 |
|---------|------|--------|
| `sync_interval` | 재동기화 간격 (초) | 3600 (1시간) |
| `buffer_seconds` | 분봉 완료 후 대기 시간 (초) | 2 |

### 버퍼 시간 설정 가이드

```python
# 보수적 (안정적)
time_sync.wait_until_next_minute_candle(buffer_seconds=3)

# 표준 (권장)
time_sync.wait_until_next_minute_candle(buffer_seconds=2)

# 공격적 (빠른 응답, 위험)
time_sync.wait_until_next_minute_candle(buffer_seconds=1)
```

**권장**: 2초 버퍼 사용
- 1초: 바이낸스 서버에서 데이터 처리 시간
- 1초: 네트워크 지연 및 여유

## 🔍 문제 해결

### 1. 시간 차이가 너무 큼 (±1초 이상)

**원인**: 로컬 시스템 시간 불일치

**해결**:
```bash
# Linux/Mac
sudo ntpdate time.google.com

# Windows: 설정 → 시간 및 언어 → 지금 동기화
```

### 2. 네트워크 지연이 큼 (100ms 이상)

**원인**: 인터넷 연결 불안정

**해결**:
- 더 나은 네트워크 환경으로 이동
- 바이낸스 서버와 가까운 지역의 VPS 사용

### 3. 데이터 누락

**원인**: 버퍼 시간 부족

**해결**:
```python
# 버퍼 시간 증가
time_sync.wait_until_next_minute_candle(buffer_seconds=3)
```

## 📈 성능 최적화

### 1. 비동기 방식 사용

```python
# 동기 방식 (블로킹)
time_sync.wait_until_next_minute_candle()

# 비동기 방식 (논블로킹) - 권장
await time_sync.async_wait_until_next_minute_candle()
```

### 2. 재동기화 간격 조정

```python
# 자주 동기화 (더 정확)
time_sync.sync_interval = 1800  # 30분마다

# 덜 자주 동기화 (덜 정확하지만 API 호출 감소)
time_sync.sync_interval = 7200  # 2시간마다
```

## 🧪 테스트

### 동기화 정확도 확인

```python
time_sync = BinanceTimeSync()
time_sync.sync()

# 오프셋 확인
print(f"시간 오프셋: {time_sync.time_offset} ms")

# 정상 범위: ±500ms 이내
if abs(time_sync.time_offset) < 500:
    print("✅ 동기화 정상")
else:
    print("⚠️ 시간 차이가 큽니다. 시스템 시계를 확인하세요.")
```

### 분봉 타이밍 테스트

```python
# 현재 시간 출력
for i in range(5):
    current_time = time_sync.get_synced_time()
    current_dt = datetime.fromtimestamp(current_time / 1000)
    print(f"{i}: {current_dt.strftime('%H:%M:%S.%f')[:-3]}")
    time.sleep(1)
```

## 📚 추가 리소스

- [바이낸스 API 문서](https://binance-docs.github.io/apidocs/spot/en/)
- [바이낸스 서버 시간 엔드포인트](https://api.binance.com/api/v3/time)
- [API 명세서](./API_SPEC.md)

## ❓ FAQ

### Q: 로컬 시간 대신 서버 시간을 왜 써야 하나요?

A: 로컬 시간이 부정확하거나 시간대가 다르면 캔들 타이밍이 맞지 않아 데이터가 누락될 수 있습니다.

### Q: 버퍼 시간 2초면 충분한가요?

A: 대부분의 경우 충분합니다. 네트워크가 매우 느리면 3초로 증가하세요.

### Q: 재동기화는 왜 필요한가요?

A: 시간이 지나면서 로컬 시계가 조금씩 어긋날 수 있습니다. 1시간마다 재동기화하여 정확도를 유지합니다.

### Q: 비동기와 동기 방식 중 어떤 걸 써야 하나요?

A: FastAPI 등 비동기 프레임워크를 사용한다면 `async_wait_until_next_minute_candle`을 사용하세요.

## 📝 라이선스

이 예시 코드는 자유롭게 사용하실 수 있습니다.
