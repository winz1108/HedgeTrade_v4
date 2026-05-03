# 캔들별 인디케이터 포함 요청

## 현재 상황

백엔드는 대시보드 레벨에서만 `indicators` 객체를 제공하고 있습니다:

```json
{
  "indicators": {
    "1m": {
      "ema_short": 66347.24,
      "ema_long": 66374.37,
      "above": false,
      "bbw": 0.3151,
      "adx": 28.7,
      ...
    }
  }
}
```

각 캔들에는 인디케이터가 없습니다:
```json
{
  "time": 1771841640,
  "open": 66317.17,
  "high": 66324.99,
  "low": 66298.25,
  "close": 66302.99,
  "volume": 6.79858
  // ❌ EMA, ADX, BB 등이 없음
}
```

## 요청사항

모든 타임프레임의 **각 캔들**에 해당 시점의 인디케이터 값을 포함해주세요.

### 모든 타임프레임 (1m, 5m, 15m, 30m, 1h, 1d)

```json
{
  "time": 1771841640,
  "open": 66317.17,
  "high": 66324.99,
  "low": 66298.25,
  "close": 66302.99,
  "volume": 6.79858,

  // ✅ 추가 필요
  "ema5": 66347.24,      // EMA short (5 for 1m/5m/30m/1h/1d)
  "ema13": 66374.37,     // EMA long (13 for 1m/5m/30m/1h/1d)
  "adx": 28.7,           // ADX indicator
  "bbUpper": 66500.5,    // Bollinger Band Upper
  "bbMiddle": 66350.0,   // Bollinger Band Middle (SMA 20)
  "bbLower": 66200.5,    // Bollinger Band Lower
  "bbWidth": 0.3151      // BB Width percentage
}
```

### 15m 타임프레임 추가 필드

```json
{
  // ... 기본 OHLCV ...

  "ema3": 66219.86,      // EMA(3) for 15m
  "ema8": 65978.2,       // EMA(8) for 15m
  "ema5": 66094.64,      // EMA short (기존)
  "ema13": 65844.21,     // EMA long (기존)
  "adx": 25.1,
  "bbUpper": 67000.0,
  "bbMiddle": 66000.0,
  "bbLower": 65000.0,
  "bbWidth": 2.3422
}
```

### 4h 타임프레임 추가 필드

```json
{
  // ... 기본 OHLCV ...

  "macd": -302.52,        // MACD line
  "signal": -63.26,       // MACD signal line
  "histogram": -239.26    // MACD histogram
}
```

## 이점

1. **차트에 모든 인디케이터 표시 가능**
   - EMA 라인을 연속적으로 그릴 수 있음
   - Bollinger Bands를 영역으로 표시 가능
   - MACD 히스토그램을 차트 하단에 표시

2. **과거 패턴 분석 가능**
   - 골든크로스/데드크로스 시점 확인
   - 과거 ADX 추세 확인
   - BB Width 변화 추이 확인

3. **프론트엔드 성능 향상**
   - 클라이언트에서 계산할 필요 없음
   - 일관된 인디케이터 계산 로직

## 우선순위

- **필수**: ema5, ema13, bbWidth, adx
- **중요**: bbUpper, bbMiddle, bbLower
- **옵션**: 15m의 ema3/ema8, 4h의 MACD

## 대안 (현재 임시 방법)

현재는 프론트엔드에서 **마지막 캔들에만** 대시보드 레벨의 `indicators` 값을 병합하고 있습니다. 이는 최신 값만 보여주고 과거 인디케이터는 표시할 수 없습니다.
