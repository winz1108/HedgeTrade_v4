# Backend Authentication Requirements

프론트엔드 로그인 기능이 구현되었습니다. 백엔드에서 다음 API 엔드포인트를 구현해야 합니다.

## 필요한 API 엔드포인트

### 1. POST /api/auth/login
**요청:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "autoLogin": true
}
```

**처리 로직:**
1. `users` 테이블에서 이메일로 사용자 조회
2. 비밀번호 해시 검증 (bcrypt 사용 권장)
3. `is_active`가 false면 로그인 거부
4. 세션 토큰 생성 (UUID 또는 JWT)
5. `sessions` 테이블에 새 레코드 삽입:
   - `user_id`: 사용자 ID
   - `token`: 생성된 토큰
   - `device_info`: User-Agent 또는 기기 정보 (선택)
   - `auto_login`: 요청의 autoLogin 값
   - `expires_at`: autoLogin이 true면 30일 후, false면 1일 후
   - `last_accessed_at`: 현재 시간

**응답 (성공):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "apiKey": "binance_api_key",
    "apiSecret": "binance_api_secret"
  },
  "token": "session_token_here"
}
```

**응답 (실패):**
```json
{
  "message": "Invalid email or password"
}
```
Status: 401

---

### 2. POST /api/auth/verify
**요청:**
```json
{
  "token": "session_token_here"
}
```

**처리 로직:**
1. `sessions` 테이블에서 토큰으로 세션 조회
2. 세션이 없거나 `expires_at`이 지났으면 실패
3. 세션의 `user_id`로 `users` 테이블에서 사용자 조회
4. 사용자의 `is_active`가 false면 실패
5. 세션의 `last_accessed_at` 업데이트
6. 사용자 정보 반환

**응답 (성공):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "apiKey": "binance_api_key",
    "apiSecret": "binance_api_secret"
  }
}
```

**응답 (실패):**
```json
{
  "message": "Invalid or expired session"
}
```
Status: 401

---

### 3. POST /api/auth/logout
**요청:**
```json
{
  "token": "session_token_here"
}
```

**처리 로직:**
1. `sessions` 테이블에서 해당 토큰의 레코드 삭제

**응답:**
```json
{
  "message": "Logged out successfully"
}
```

---

## 비상 로그아웃 (강제 로그아웃)

특정 사용자의 모든 세션을 삭제하려면:

```sql
DELETE FROM sessions WHERE user_id = 'user_uuid_here';
```

특정 세션만 삭제하려면:

```sql
DELETE FROM sessions WHERE token = 'session_token_here';
```

모든 사용자의 모든 세션을 삭제하려면 (비상 시):

```sql
DELETE FROM sessions;
```

---

## 사용자 계정 비활성화

특정 사용자를 로그인 불가능하게 만들려면:

```sql
UPDATE users SET is_active = false WHERE id = 'user_uuid_here';
```

또는 이메일로:

```sql
UPDATE users SET is_active = false WHERE email = 'user@example.com';
```

---

## 사용자 생성 예시

새 사용자를 수동으로 생성하려면 (bcrypt로 비밀번호 해시 필요):

```sql
INSERT INTO users (email, password_hash, api_key, api_secret, is_active)
VALUES (
  'user@example.com',
  '$2b$10$hashed_password_here',  -- bcrypt 해시
  'binance_api_key_here',
  'binance_api_secret_here',
  true
);
```

---

## 보안 권장사항

1. **비밀번호 해싱**: bcrypt 사용 (rounds: 10-12)
2. **토큰 생성**: UUID v4 또는 cryptographically secure random string
3. **HTTPS 필수**: 모든 인증 API는 HTTPS로만 제공
4. **Rate Limiting**: 로그인 엔드포인트에 rate limiting 적용 (예: IP당 분당 5회)
5. **API 키 암호화**: `api_secret`은 데이터베이스에 암호화하여 저장 권장

---

## 데이터베이스 스키마 (이미 생성됨)

### users 테이블
- `id` (uuid, PK)
- `email` (text, unique)
- `password_hash` (text)
- `api_key` (text, nullable) - Binance API Key
- `api_secret` (text, nullable) - Binance API Secret
- `is_active` (boolean, default: true)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### sessions 테이블
- `id` (uuid, PK)
- `user_id` (uuid, FK to users)
- `token` (text, unique)
- `device_info` (text, nullable)
- `auto_login` (boolean, default: false)
- `expires_at` (timestamptz)
- `created_at` (timestamptz)
- `last_accessed_at` (timestamptz)

---

## 프론트엔드 동작

1. 사용자가 로그인하면 `/api/auth/login` 호출
2. 토큰을 `localStorage`에 저장 (`hedgetrade_session_token`)
3. 페이지 로드 시 토큰이 있으면 `/api/auth/verify` 호출하여 자동 로그인
4. 로그아웃 시 `/api/auth/logout` 호출 후 `localStorage`에서 토큰 삭제
5. 로그인되지 않은 사용자는 차트만 보고, 로그인된 사용자는 모든 정보 표시
