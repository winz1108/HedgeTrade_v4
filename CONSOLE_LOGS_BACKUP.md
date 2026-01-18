# Console Logs Backup

이 문서는 로그 정리 전 원래 있던 console.log들을 백업한 것입니다.
필요시 다시 활성화할 수 있습니다.

## App.tsx

### 갭 감지 (Gap Detection)
```typescript
console.warn(`⚠️ GAP DETECTED in ${timeframe}: ${missedCandles} candles missing`);
console.log(`   Last: ${new Date(lastTimestamp).toLocaleTimeString()}`);
console.log(`   New: ${new Date(newTimestamp).toLocaleTimeString()}`);
console.log(`   Gap: ${(gap / 1000 / 60).toFixed(1)} minutes`);
console.log(`✅ Filled ${addedCount} missing candles in ${timeframe}`);
```

### 초기 로딩
```typescript
console.log('💾 Using cached data while loading fresh data', cached);
console.log('📊 Loading dashboard data...');
console.log(`✅ All data loaded in ${(loadTime / 1000).toFixed(2)}s`);
console.log('📋 Dashboard Data:');
console.log('  - Account Name:', fullDashboard.accountName);
console.log('  - Trades:', fullDashboard.trades?.length || 0);
console.log('  - Metrics loaded:', fullDashboard.metrics ? '✅' : '❌');
console.log('✅ Dashboard ready');
```

### 캔들 재채우기
```typescript
console.log('🔄 Refilling missing candles...');
console.log(`📊 Loading initial ${timeframe} data (100 candles)`);
console.log(`✅ ${timeframe}: Added ${addedCount} missing candles`);
```

### 실시간 캔들 업데이트
```typescript
console.log('🔴 realtime_candle_update (완성봉 isFinal=true):', indicatorStatus);
console.log('   원시 데이터 전체:', update);
console.log('🟡 realtime_candle_update (진행봉 isFinal=false):', indicatorStatus);
console.log('🔄 진행봉→완성봉 전환 [BEFORE UPDATE]:', { ... });
console.log(`   ✅ ${updatedCount}개 지표 업데이트 완료 [AFTER UPDATE]:`, { ... });
```

### 완성봉 이벤트 (candle_complete)
```typescript
console.log('═══════════════════════════════════════');
console.log('📦 candle_complete 원시 데이터:');
console.log('═══════════════════════════════════════');
console.log('⏰ Time:', new Date(update.openTime).toLocaleTimeString());
console.log('📊 Timeframe:', update.timeframe);
console.log('💰 Close:', update.close);
console.log('📉 RSI:', update.rsi);
console.log('📈 MACD:', update.macd, '/ Signal:', update.macdSignal, '/ Histogram:', update.macdHistogram);
console.log('📊 EMA20:', update.ema20, '/ EMA50:', update.ema50);
console.log('📊 BB Upper:', update.bbUpper, '/ Middle:', update.bbMiddle, '/ Lower:', update.bbLower);
console.log('═══════════════════════════════════════');
console.log(`✅ 기술지표 모두 존재 (RSI=${rsiStr}, MACD=${macdStr})`);
console.log(`🔄 ${update.timeframe}: Added ${addedCount} missing candles on complete event`);
console.warn(`⚠️ ${update.timeframe}: ${indicatorMissingCount} candles missing indicators`);
console.log(`   ✅ Last completed candle OK:`, { ... });
```

### 자산 업데이트
```typescript
console.log(`💰 Asset updates: ${assetUpdateCount} in ${elapsed.toFixed(1)}s (${rate.toFixed(2)}/s)`);
```

### 예측 업데이트
```typescript
console.log('🔮 RAW Prediction Update received:', JSON.stringify(update, null, 2));
console.log('🔮 Prediction Update from WebSocket:');
console.log('  - Probability:', (update.probability * 100).toFixed(2) + '%');
console.log('  - Calculated At:', newCalculatedAt, '→', new Date(newCalculatedAt).toLocaleString());
console.log('  - Version:', update.version);
console.log('  - Timestamp:', new Date(update.timestamp).toLocaleString());
console.log('  - Previous predictionCalculatedAt:', prevData.currentPrediction?.predictionCalculatedAt);
console.log('  - New predictionCalculatedAt:', newCalculatedAt);
console.log('  - Changed:', prevData.currentPrediction?.predictionCalculatedAt !== newCalculatedAt);
console.log('  - Updated state:', updated.currentPrediction?.predictionCalculatedAt);
console.log('📊 dashboard_update:', { ... });
console.log('🔍 예측 업데이트 체크 중...');
console.log('  - 이전:', lastPredictionCalculatedAtRef.current, new Date(lastPredictionCalculatedAtRef.current).toLocaleString());
console.log('  - 현재:', newCalculatedAt, new Date(newCalculatedAt || 0).toLocaleString());
console.log('✅ 예측 업데이트 감지! UI 강제 업데이트');
console.log('🔄 State 업데이트 완료:', { ... });
console.log('  ℹ️  변경사항 없음');
console.log(`⏰ 다음 예측 체크: ${minutesUntilNext}분 ${Math.floor((msUntilNext % 60000) / 1000)}초 후 (${nextMinute}분)`);
console.log('🔍 정각 도달 - 1초마다 예측 업데이트 체크 시작');
console.log('🎯 초기 예측 시간 설정:', new Date(lastPredictionCalculatedAtRef.current).toLocaleString());
```

## websocket.ts

### 연결 시도
```typescript
console.log('═══════════════════════════════════════');
console.log('🔌 WebSocket Connection Attempt');
console.log('═══════════════════════════════════════');
console.log('📍 URL:', wsUrl);
console.log('📍 Full path:', `${wsUrl}/ws/dashboard`);
console.log('📍 Namespace: /ws/dashboard');
console.log('📍 Socket.IO path: /socket.io/');
console.log('📍 Socket.IO version:', io.version);
console.log('📍 Transports: websocket, polling');
console.log('═══════════════════════════════════════');
```

### 연결 성공
```typescript
console.log('═══════════════════════════════════════');
console.log('✅ WebSocket CONNECTED');
console.log('═══════════════════════════════════════');
console.log('🔌 Socket ID:', this.socket?.id);
console.log('🌐 Connected to:', wsUrl);
console.log('🔌 Transport:', this.socket?.io?.engine?.transport?.name);
console.log('⏰ Connected at:', new Date().toLocaleString());
console.log('═══════════════════════════════════════');
```

### 연결 해제
```typescript
console.log('═══════════════════════════════════════');
console.log('❌ WebSocket DISCONNECTED');
console.log('═══════════════════════════════════════');
console.log('❌ Reason:', reason);
console.log('⏰ Disconnected at:', new Date().toLocaleString());
console.log('═══════════════════════════════════════');
```

### 재연결
```typescript
console.log(`🔄 Reconnection attempt #${attemptNumber}`);
console.log(`✅ Reconnected after ${attemptNumber} attempts`);
console.log('🔄 Manager reconnect attempt');
console.log('🔌 Available transports:', this.socket?.io?.opts?.transports);
```

### 자산 업데이트
```typescript
console.warn('⚠️ account_assets_update: 백엔드가 dashboard_update 형식으로 보냄 - 무시');
console.warn('   백엔드 수정 필요: { accountId, asset: { currentAsset, currentBTC, currentCash, initialAsset } }');
console.log('💰 account_assets_update received:', { ... });
```

### 예측 업데이트
```typescript
console.log('📨 WebSocket received prediction_update event, forwarding to', this.predictionUpdateCallbacks.size, 'callbacks');
```

### 연결 에러
```typescript
console.log('═══════════════════════════════════════');
console.error('❌ WebSocket CONNECTION ERROR');
console.log('═══════════════════════════════════════');
console.error('❌ Error:', error);
console.error('❌ Message:', error.message);
console.error('❌ Type:', error.type);
console.error('❌ Description:', error.description);
console.error('⏰ Error at:', new Date().toLocaleString());
console.log('═══════════════════════════════════════');
console.log('🔍 DIAGNOSIS:');
console.log('  1. Check if backend server is running');
console.log('  2. Check backend logs for errors');
console.log('  3. Verify WebSocket endpoint: /ws/dashboard');
console.log('  4. Verify Socket.IO namespace is registered');
console.log('  5. Check CORS configuration');
console.log('═══════════════════════════════════════');
```

### 통계
```typescript
console.log('\n═══════════════════════════════════════');
console.log('📊 WebSocket Statistics');
console.log('═══════════════════════════════════════');
console.log(`⏱️  Running time: ${elapsed.toFixed(1)}s`);
console.log('');
console.log(`✅ ${eventName}: ${stats.count} events (${rate.toFixed(2)}/s) - last: ${lastAgo}`);
console.log(`❌ ${eventName}: NOT RECEIVING`);
console.log('');
console.log('Other events:');
console.log(`  ${eventName}: ${stats.count} (${rate.toFixed(2)}/s)`);
console.log('═══════════════════════════════════════\n');
```

### 타임프레임 요청
```typescript
console.log(`📊 Requesting ${timeframe} candle data from server`);
console.warn('⚠️ Cannot request timeframe data: WebSocket not connected');
```

## oracleApi.ts

### 차트 데이터 fetch
```typescript
console.log(`📊 Fetching ${timeframe} chart data from:`, url);
console.log(`✅ ${timeframe} chart data loaded: ${mappedCandles.length} candles`);
console.log(`   📈 Last candle indicators:`, { ... });
```

### 대시보드 데이터 fetch
```typescript
console.log('⚡ Fetching quick dashboard data from:', url);
console.log('✅ Quick dashboard data received:', data ? 'Valid' : 'Empty');
console.log('🔍 Fetching dashboard data from:', url);
console.log('✅ API Response status:', response.status);
console.log('✅ API Response received:', apiResponse ? 'Valid' : 'Empty');
console.log('✅ Dashboard data converted successfully');
```

## MetricsPanel.tsx

### 렌더링 정보
```typescript
console.log('📊 MetricsPanel RENDER:', new Date().toLocaleTimeString());
console.log('  - Probability:', (data.currentPrediction.takeProfitProb * 100).toFixed(2) + '%');
console.log('  - Calculated At (raw):', data.currentPrediction.predictionCalculatedAt);
console.log('  - Calculated At (formatted):', formatLocalTime(data.currentPrediction.predictionCalculatedAt || 0));
console.log('  - Data Timestamp (raw):', data.currentPrediction.predictionDataTimestamp);
```

## PriceChart.tsx

### 트레이드 마커
```typescript
console.log(`Trade marker not rendered - Trade timestamp: ${new Date(trade.timestamp).toISOString()}, Type: ${trade.type}, Timeframe: ${timeframe}, Visible range: ${new Date(visibleTimeRangeStart).toISOString()} - ${new Date(visibleTimeRangeEnd).toISOString()}`);
```

---

## 복구 방법

필요시 이 문서에서 원하는 로그를 복사해서 해당 파일에 다시 추가하면 됩니다.

## 유지되는 로그 (에러만)

다음 에러 로그들은 정리 후에도 유지됩니다:
- `console.error()` - 모든 에러
- `console.warn()` - 중요한 경고
