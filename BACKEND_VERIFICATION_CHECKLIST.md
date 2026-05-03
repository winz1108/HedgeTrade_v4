# 백엔드 검증 체크리스트

백엔드 백업 복원 후 오늘 작업한 내용이 제대로 되어있는지 확인하는 문서입니다.

## 🎯 오늘 작업 요약

### 1. 실시간 완성봉 기술지표 업데이트 수정
- **문제**: 완성봉(isFinal=true)이 왔을 때 기술지표가 업데이트되지 않음
- **해결**: `realtime_candle_update` 이벤트에서 완성봉일 때 기술지표 업데이트
- **백엔드 확인 필요**: 없음 (프론트엔드 로직만 수정)

### 2. Prediction Update 필드명 통일
- **문제**: 백엔드가 `prediction_calculated_at` 보내는데 프론트가 `predictionCalculatedAt` 기대
- **해결**: 프론트엔드에서 snake_case → camelCase 변환 추가
- **백엔드 확인**: `prediction_update` 이벤트가 다음 필드를 보내는지 확인
  ```python
  {
    "probability": float,           # 0.0 ~ 1.0
    "prediction_calculated_at": int,  # timestamp (밀리초)
    "timestamp": int,                # timestamp (밀리초)
    "version": str,
    "stop_loss_prob": float,        # optional
    "market_state": dict,           # optional
    "gate_weights": dict            # optional
  }
  ```

### 3. 1초 업데이트 로직 수정
- **문제**: `account_assets_update` 이벤트가 누락되거나 잘못된 형식으로 옴
- **해결**: 프론트엔드에서 형식 검증 추가
- **백엔드 확인**: `account_assets_update` 이벤트가 다음 형식으로 오는지 확인
  ```python
  {
    "accountId": str,
    "asset": {
      "currentAsset": float,
      "currentBTC": float,
      "currentCash": float,
      "initialAsset": float
    }
  }
  ```

---

## ✅ 백엔드 검증 항목

### 1. WebSocket 이벤트 확인

브라우저 콘솔을 열고 다음 로그들이 정상적으로 나오는지 확인:

#### A. 웹소켓 연결
```
🔌 WebSocket connecting to: https://api.hedgetrade.eu/ws/dashboard
✅ WebSocket CONNECTED
```

#### B. 완성봉 이벤트 (1분마다)
```
🔴 realtime_candle_update (완성봉): {
  timeframe: "1m",
  time: "10:23:00",
  close: 102345.67,
  rsi: 65.2,        // ❌가 아니어야 함!
  macd: 123.4,      // ❌가 아니어야 함!
  ema20: 102300     // ❌가 아니어야 함!
}
```

**⚠️ 만약 `rsi: ❌`가 나온다면**: 백엔드가 기술지표를 보내지 않고 있음!

#### C. 완성봉 확정 이벤트 (1분마다)
```
📦 candle_complete: {
  timeframe: "1m",
  time: "10:23:00",
  close: 102345.67,
  rsi: 65.2,        // ❌가 아니어야 함!
  macd: 123.4,      // ❌가 아니어야 함!
  ema20: 102300     // ❌가 아니어야 함!
}
✅ 기술지표 존재 (RSI=65.2, MACD=123.4)
```

**⚠️ 만약 에러가 나온다면**:
```
❌ CRITICAL: 기술지표 누락!
   백엔드에서 기술지표를 계산해서 보내야 합니다!
```

#### D. 예측 업데이트 (5분마다)
```
🔮 Prediction Update: {
  probability: "75.23%",
  calculatedAt: "2026-01-19 10:25:00",
  version: "v1.2.3"
}
```

### 2. API 엔드포인트 확인

#### A. 차트 데이터 로드
새로고침 시 다음 로그가 나와야 함:
```
📊 Loading dashboard data...
📊 Fetching 1m chart data (limit: 500)
✅ 1m loaded: 500 candles
📊 Fetching 5m chart data (limit: 500)
✅ 5m loaded: 500 candles
...
✅ All data loaded in 2.34s
✅ Dashboard ready
```

**⚠️ 만약 경고가 나온다면**:
```
⚠️ 1m last candle missing indicators!
```
→ 백엔드 CSV 파일에 기술지표가 없음!

#### B. 갭 감지
데이터 누락 시 다음 로그가 나와야 함:
```
⚠️ GAP DETECTED in 1m: 5 candles missing
   Last: 10:20:00
   New: 10:25:00
   Gap: 5.0 minutes
✅ Filled 5 missing candles in 1m
```

---

## 🔍 백엔드 코드 확인 포인트

### 1. `realtime_candle_update` 이벤트

**확인할 것**: 완성봉(isFinal=true)일 때 기술지표를 함께 보내는가?

```python
# ✅ 올바른 예시
emit('realtime_candle_update', {
    'timeframe': '1m',
    'openTime': timestamp,
    'close': close_price,
    'isFinal': True,
    'rsi': 65.2,           # 필수!
    'macd': 123.4,         # 필수!
    'macdSignal': 120.1,
    'macdHistogram': 3.3,
    'ema20': 102300,       # 필수!
    'ema50': 102100,       # 필수!
    'bbUpper': 103000,
    'bbMiddle': 102300,
    'bbLower': 101600,
    # ... 기타 OHLCV
})

# ❌ 잘못된 예시 (기술지표 없음)
emit('realtime_candle_update', {
    'timeframe': '1m',
    'openTime': timestamp,
    'close': close_price,
    'isFinal': True,
    # rsi, macd, ema20 등이 없음!
})
```

### 2. `candle_complete` 이벤트

**확인할 것**: 같은 기술지표를 보내는가?

```python
# ✅ 올바른 예시
emit('candle_complete', {
    'timeframe': '1m',
    'openTime': timestamp,
    'close': close_price,
    'rsi': 65.2,           # 필수!
    'macd': 123.4,         # 필수!
    'ema20': 102300,       # 필수!
    'ema50': 102100,       # 필수!
    # ...
})
```

### 3. `prediction_update` 이벤트

**확인할 것**: snake_case로 필드명을 보내는가?

```python
# ✅ 올바른 예시
emit('prediction_update', {
    'probability': 0.7523,
    'prediction_calculated_at': 1737280500000,  # snake_case!
    'timestamp': 1737280500000,
    'version': 'v1.2.3',
    'stop_loss_prob': 0.15,
    'market_state': {...},
    'gate_weights': {...}
})

# ❌ 잘못된 예시 (camelCase)
emit('prediction_update', {
    'probability': 0.7523,
    'predictionCalculatedAt': 1737280500000,  # 이건 안됨!
    # ...
})
```

### 4. `account_assets_update` 이벤트

**확인할 것**: 올바른 형식으로 보내는가?

```python
# ✅ 올바른 예시
emit('account_assets_update', {
    'accountId': 'Account_A',
    'asset': {
        'currentAsset': 10234.56,
        'currentBTC': 5234.56,
        'currentCash': 5000.0,
        'initialAsset': 10000.0
    }
})

# ❌ 잘못된 예시 1 (dashboard_update 형식)
emit('account_assets_update', {
    'accounts': [...],
    'totalAsset': 10234.56,
    # ...
})

# ❌ 잘못된 예시 2 (asset 객체 없음)
emit('account_assets_update', {
    'accountId': 'Account_A',
    'currentAsset': 10234.56,  # asset 객체로 감싸져야 함!
    'currentBTC': 5234.56,
    # ...
})
```

---

## 🧪 테스트 시나리오

### 1. 기술지표 업데이트 테스트

1. 페이지 새로고침
2. 1분 기다림
3. 콘솔에서 확인:
   ```
   🔴 realtime_candle_update (완성봉): { rsi: 65.2, macd: 123.4, ... }
   🔄 진행봉→완성봉 전환: { rsi: 65.2, macd: 123.4 }
   ```
4. 차트에서 확인: 마지막 완성봉에 RSI/MACD 라인이 그려지는가?

### 2. Prediction 업데이트 테스트

1. 페이지 새로고침
2. 다음 5분 정각까지 대기 (예: 10:24:50 → 10:25:00)
3. 콘솔에서 확인:
   ```
   🔮 Prediction Update: { probability: "75.23%", ... }
   ```
4. UI에서 확인: 왼쪽 패널 확률이 업데이트되는가?

### 3. 1초 업데이트 테스트

1. 페이지 새로고침
2. 10초 대기
3. 콘솔에 에러가 없는지 확인:
   - ✅ 정상: 에러 없음
   - ❌ 비정상: `❌ account_assets_update: asset 객체 없음`

---

## 🐛 자주 발생하는 문제

### 문제 1: 기술지표가 ❌로 표시됨
**원인**: 백엔드가 기술지표를 계산하지 않거나 보내지 않음
**해결**:
1. 백엔드 코드에서 `realtime_candle_update` / `candle_complete` 이벤트 확인
2. CSV 파일에 기술지표 컬럼이 있는지 확인

### 문제 2: Prediction이 5분마다 업데이트 안됨
**원인**: 백엔드가 `prediction_calculated_at` 필드를 안 보냄
**해결**: 백엔드 코드에서 `prediction_update` 이벤트에 필드 추가

### 문제 3: WebSocket 연결 안됨
**원인**: 백엔드 서버가 꺼져있거나 네임스페이스가 다름
**확인**:
```bash
# 백엔드 서버 확인
curl https://api.hedgetrade.eu/health

# WebSocket 확인 (Python 예시)
python3 -c "
import socketio
sio = socketio.Client()
sio.connect('https://api.hedgetrade.eu', namespaces=['/ws/dashboard'])
print('Connected!')
"
```

### 문제 4: account_assets_update 형식 오류
**원인**: 백엔드가 잘못된 형식으로 보냄
**콘솔 로그 확인**:
```
⚠️ account_assets_update: 백엔드가 dashboard_update 형식으로 보냄 - 무시
❌ account_assets_update: asset 객체 없음
```
**해결**: 백엔드 코드 수정 필요

---

## 📋 최종 체크리스트

백엔드 복원 후 다음 항목을 모두 확인하세요:

- [ ] 웹소켓 연결 성공 (`✅ WebSocket CONNECTED`)
- [ ] 완성봉 이벤트에 기술지표 포함 (RSI, MACD, EMA20 모두 숫자)
- [ ] `candle_complete` 이벤트에 기술지표 포함
- [ ] Prediction 업데이트 이벤트 5분마다 수신
- [ ] `prediction_calculated_at` 필드가 snake_case로 옴
- [ ] `account_assets_update` 형식이 올바름 (asset 객체 포함)
- [ ] 1초 업데이트 에러 없음
- [ ] 차트 로드 시 모든 타임프레임 기술지표 있음
- [ ] 갭 감지 및 자동 채우기 동작

모든 항목이 체크되면 ✅ 정상 작동!

---

## 🔧 프론트엔드 로그 확인 방법

1. 브라우저에서 F12 → Console 탭
2. 페이지 새로고침
3. 위 로그들이 나오는지 확인
4. 1분~5분 대기하면서 실시간 이벤트 로그 확인

**중요**: 에러나 경고가 있으면 반드시 백엔드 확인 필요!
