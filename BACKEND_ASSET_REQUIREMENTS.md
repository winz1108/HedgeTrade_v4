# 백엔드 자산 정보 요구사항

## 현재 상황
- ❌ `account_assets_update` 이벤트 수신 안됨
- ⚠️ `dashboard_update` 이벤트는 수신되지만 자산 정보 누락

## 백엔드에서 반드시 보내야 할 이벤트

### 방법 1: dashboard_update 이벤트 (권장)

**이벤트명**: `dashboard_update`
**전송 주기**: 1초마다

```typescript
{
  btcBalance: number,      // BTC 보유량 (예: 0.05)
  btcPrice: number,        // BTC 현재가 (예: 95000)
  usdcBalance: number,     // USDC 잔고 (예: 5000)
  timestamp: number,       // 서버 시간 밀리초
  accountId?: string,      // 계정 ID (선택)
  version?: string         // API 버전 (선택)
}
```

**예시**:
```javascript
// 백엔드에서 매초 전송
socketIO.to('/ws/dashboard').emit('dashboard_update', {
  btcBalance: 0.05234,         // BTC 0.05234개 보유
  btcPrice: 95234.56,          // 현재 BTC 가격
  usdcBalance: 4523.45,        // USDC $4,523.45 보유
  timestamp: Date.now(),
  accountId: 'main',
  version: '1.0.0'
});

// 계산 예시:
// BTC 가치 = 0.05234 * 95234.56 = $4,984.58
// 총 자산 = $4,984.58 + $4,523.45 = $9,508.03
```

---

### 방법 2: account_assets_update 이벤트 (대안)

**이벤트명**: `account_assets_update`
**전송 주기**: 1초마다

```typescript
{
  accountId: string,       // 계정 ID
  asset: {
    currentAsset: number,  // 현재 총 자산 (USD)
    currentBTC: number,    // BTC 보유량 (USD 환산)
    currentCash: number,   // USDC 잔고
    initialAsset: number   // 초기 자산 (USD)
  }
}
```

**예시**:
```javascript
// 백엔드에서 매초 전송
socketIO.to('/ws/dashboard').emit('account_assets_update', {
  accountId: 'main',
  asset: {
    currentAsset: 9508.03,    // 총 자산 $9,508.03
    currentBTC: 4984.58,      // BTC 가치 $4,984.58
    currentCash: 4523.45,     // USDC $4,523.45
    initialAsset: 10000       // 초기 자산 $10,000
  }
});
```

---

## 어느 방법을 써야 하나?

### ✅ dashboard_update 사용 권장
- 더 간단함 (BTC 수량, BTC 가격, USDC 잔고만 보내면 됨)
- 프론트엔드에서 자동으로 총 자산 계산
- 현재 이미 수신 중이므로 필드만 추가하면 됨

### account_assets_update는 언제?
- 백엔드에서 이미 총 자산을 계산하고 있을 때
- 초기 자산(initialAsset) 정보도 함께 보내고 싶을 때

---

## 체크리스트

백엔드 개발자가 확인해야 할 사항:

1. **현재 Binance API에서 자산 정보를 가져오고 있는가?**
   - `GET /api/v3/account` 또는 유사한 엔드포인트 호출 중?
   - BTC 보유량을 알고 있는가?
   - USDC 잔고를 알고 있는가?

2. **WebSocket 연결이 정상인가?**
   - 프론트엔드가 `/ws/dashboard` 네임스페이스에 연결되어 있음
   - `dashboard_update` 이벤트를 보내고 있지만 자산 필드가 없음

3. **1초마다 전송하고 있는가?**
   - `setInterval(fn, 1000)` 또는 유사한 방식으로 주기적 전송

---

## 디버깅 방법

백엔드에서 다음과 같이 로그 출력:

```javascript
// 전송하기 전 로그
console.log('📤 Sending dashboard_update:', {
  btcBalance,
  btcPrice,
  usdcBalance,
  timestamp: Date.now()
});

socketIO.to('/ws/dashboard').emit('dashboard_update', {
  btcBalance,
  btcPrice,
  usdcBalance,
  timestamp: Date.now()
});
```

---

## 빠른 테스트

백엔드에서 하드코딩된 값으로 테스트:

```javascript
// 테스트용 하드코딩
setInterval(() => {
  socketIO.to('/ws/dashboard').emit('dashboard_update', {
    btcBalance: 0.1,        // 고정값
    btcPrice: 95000,        // 고정값
    usdcBalance: 5000,      // 고정값
    timestamp: Date.now()
  });
}, 1000);
```

프론트엔드에서 자산이 표시되면 성공! 이후 실제 Binance 데이터로 교체.

---

## 최종 요약

**백엔드에서 해야 할 일:**

1. `dashboard_update` 이벤트에 다음 필드 추가:
   - `btcBalance` (BTC 수량)
   - `btcPrice` (BTC 현재가)
   - `usdcBalance` (USDC 잔고)

2. 매 1초마다 WebSocket으로 전송

3. 전송 확인:
   - 백엔드 로그에서 전송 확인
   - 프론트엔드 콘솔에서 수신 확인
   - 프론트엔드 화면에서 자산 표시 확인

**끝!**
