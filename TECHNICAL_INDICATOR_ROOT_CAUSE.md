# 기술지표 누락 문제 - 근본 원인 분석 및 해결책

## 현상

1분마다 새로운 1분봉이 완성될 때 기술지표가 없는 캔들이 생깁니다.

## 근본 원인 분석

### 1. 백엔드 아키텍처 문제

**문제**: 캔들 완성 이벤트와 기술지표 계산이 분리되어 있음

```python
# ❌ 잘못된 패턴
async def on_candle_complete(candle):
    # 1. 캔들 완성 이벤트 즉시 전송
    await sio.emit('candle_complete', candle)

    # 2. 기술지표는 나중에 계산 (또는 아예 안 함)
    # indicators = calculate_indicators()  # 이게 누락되거나 실패함
```

**결과**: 프론트엔드는 기술지표 없는 캔들을 받음

### 2. 가능한 원인들

#### A. 기술지표 계산 누락
```python
# 백엔드에서 이런 코드일 가능성
def process_completed_candle(candle):
    # 캔들만 저장/전송
    await sio.emit('candle_complete', {
        'openTime': candle['openTime'],
        'close': candle['close'],
        # ... 기본 OHLCV만
        # ❌ 기술지표 없음!
    })
```

#### B. 비동기 타이밍 문제
```python
# 이벤트는 먼저 보내고
await sio.emit('candle_complete', candle)

# 기술지표는 나중에 계산 (너무 늦음)
asyncio.create_task(calculate_and_update_indicators())
```

#### C. 데이터 부족으로 스킵
```python
def calculate_indicators(candles):
    if len(candles) < 50:  # EMA50 계산 불가
        return None  # ❌ 기술지표 없이 반환
    # ...
```

#### D. 에러 발생 후 무시
```python
try:
    indicators = calculate_indicators(candles)
except Exception as e:
    print(f"Error: {e}")
    # ❌ 에러 무시하고 캔들만 전송
    await sio.emit('candle_complete', candle_without_indicators)
```

## 해결책

### 🔥 최종 해결책: 원자적 처리 (Atomic Processing)

캔들 완성과 기술지표 계산을 **하나의 트랜잭션**으로 처리:

```python
async def on_candle_complete(raw_candle):
    """캔들 완성 시 호출되는 핸들러"""

    # 1. 필수 데이터 확인
    if not has_sufficient_history():
        logger.error("❌ Insufficient historical data for indicators")
        return

    # 2. 기술지표 계산 (필수!)
    try:
        indicators = calculate_all_indicators(
            candles=get_recent_candles(200),  # EMA, MACD 계산용
            current_candle=raw_candle
        )

        if not indicators:
            raise ValueError("Indicator calculation returned None")

        # 3. 기술지표가 포함된 완전한 캔들 생성
        complete_candle = {
            **raw_candle,
            'is_complete': True,
            'rsi': indicators['rsi'],
            'macd': indicators['macd'],
            'macdSignal': indicators['macd_signal'],
            'macdHistogram': indicators['macd_histogram'],
            'ema20': indicators['ema20'],
            'ema50': indicators['ema50'],
            'bbUpper': indicators['bb_upper'],
            'bbMiddle': indicators['bb_middle'],
            'bbLower': indicators['bb_lower'],
            'bbWidth': indicators['bb_width'],
        }

        # 4. 검증: 모든 지표가 있는지 확인
        required_indicators = ['rsi', 'macd', 'ema20', 'ema50', 'bbUpper']
        for indicator in required_indicators:
            if complete_candle.get(indicator) is None:
                raise ValueError(f"Missing indicator: {indicator}")

        # 5. 완전한 캔들만 전송
        await sio.emit('candle_complete', complete_candle)

        logger.info(f"✅ Sent complete candle with indicators: RSI={indicators['rsi']:.2f}")

    except Exception as e:
        logger.error(f"❌ Failed to process candle: {e}")
        # ❌ 기술지표 없는 캔들은 절대 전송하지 않음!
        raise


def calculate_all_indicators(candles, current_candle):
    """모든 기술지표를 계산"""
    if len(candles) < 200:
        raise ValueError("Need at least 200 candles for indicator calculation")

    closes = [c['close'] for c in candles] + [current_candle['close']]
    highs = [c['high'] for c in candles] + [current_candle['high']]
    lows = [c['low'] for c in candles] + [current_candle['low']]

    # EMA
    ema20 = calculate_ema(closes, 20)[-1]
    ema50 = calculate_ema(closes, 50)[-1]

    # RSI
    rsi = calculate_rsi(closes, 14)[-1]

    # MACD
    macd_line, signal_line, histogram = calculate_macd(closes)

    # Bollinger Bands
    bb_upper, bb_middle, bb_lower = calculate_bollinger_bands(closes, 20, 2)
    bb_width = ((bb_upper[-1] - bb_lower[-1]) / bb_middle[-1]) * 100

    return {
        'ema20': ema20,
        'ema50': ema50,
        'rsi': rsi,
        'macd': macd_line[-1],
        'macd_signal': signal_line[-1],
        'macd_histogram': histogram[-1],
        'bb_upper': bb_upper[-1],
        'bb_middle': bb_middle[-1],
        'bb_lower': bb_lower[-1],
        'bb_width': bb_width,
    }
```

### 백업 해결책: 프론트엔드 폴백

백엔드 수정이 어려운 경우, 프론트엔드에서 대응:

```typescript
const unsubscribeCandleComplete = websocketService.onCandleComplete(async (update) => {
  // 기술지표 확인
  const hasIndicators = update.rsi !== undefined &&
                        update.macd !== undefined &&
                        update.ema20 !== undefined;

  if (!hasIndicators) {
    console.error('❌ Received candle without indicators!', {
      timestamp: new Date(update.openTime).toISOString(),
      timeframe: update.timeframe
    });

    // 백엔드에 다시 요청
    try {
      const chart = await fetchChartData(update.timeframe, 10);
      const matchingCandle = chart.candles.find(c =>
        c.timestamp === update.openTime
      );

      if (matchingCandle && matchingCandle.rsi) {
        // 기술지표 있는 버전으로 대체
        setData(prev => mergeCandle(prev, matchingCandle));
      }
    } catch (error) {
      console.error('Failed to fetch indicators:', error);
    }

    return; // 지표 없는 캔들은 무시
  }

  // 정상 처리
  setData(prev => mergeCandle(prev, update));
});
```

## 백엔드 체크리스트

백엔드 개발자가 확인해야 할 사항:

### ✅ 필수 확인 사항

1. **캔들 완성 이벤트 전송 전에 기술지표 계산**
   ```python
   # ✅ 올바른 순서
   indicators = calculate_indicators()  # 1. 먼저 계산
   complete_candle = {**candle, **indicators}  # 2. 병합
   await sio.emit('candle_complete', complete_candle)  # 3. 전송
   ```

2. **에러 처리: 지표 없으면 전송하지 않음**
   ```python
   if not all([rsi, macd, ema20, ema50]):
       logger.error("❌ Cannot emit candle without indicators")
       return  # 전송하지 않음
   ```

3. **충분한 데이터 확인**
   ```python
   if len(historical_candles) < 200:
       logger.warning("⚠️ Insufficient data for indicators")
       return
   ```

4. **로깅: 기술지표 포함 여부 확인**
   ```python
   logger.info(f"📊 Emitting candle with RSI={rsi:.2f}, MACD={macd:.2f}")
   ```

### 🔍 디버깅 방법

**백엔드 로그에서 확인**:
```bash
# 캔들 완성 시 이런 로그가 있어야 함
✅ Calculated indicators: RSI=65.32, MACD=123.45, EMA20=95000.12
✅ Sent complete candle with indicators
```

**없다면 문제!**:
```bash
# 이런 로그만 있고 지표가 없다면 문제
📊 Candle completed at 2026-01-18 10:30:00
# ❌ 지표 계산 로그 없음!
```

## 모니터링

### 백엔드에 추가할 지표
```python
# 기술지표 계산 성공률 추적
indicator_calculation_stats = {
    'total_attempts': 0,
    'successful': 0,
    'failed': 0,
    'missing_data': 0,
}

def emit_stats():
    success_rate = (stats['successful'] / stats['total_attempts']) * 100
    logger.info(f"📊 Indicator calculation success rate: {success_rate:.1f}%")
```

## 요약

### 근본 원인
백엔드에서 캔들 완성 이벤트를 보낼 때 **기술지표 계산을 하지 않거나**, 계산에 실패해도 **캔들만 전송**하고 있음

### 해결책
1. **백엔드 수정 (필수)**: 기술지표 없으면 절대 전송하지 않기
2. **원자적 처리**: 캔들 + 지표를 하나의 단위로 처리
3. **검증 추가**: 모든 필수 지표가 있는지 확인 후 전송
4. **에러 처리**: 지표 계산 실패 시 재시도 또는 알림

### 확인 방법
백엔드 로그에서:
```bash
✅ Sent candle_complete with indicators: RSI=65.32
```
이런 로그가 **매 1분마다** 나와야 합니다!
