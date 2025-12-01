# Backend Authentication API Specification

This document specifies the authentication API endpoints that the backend must implement.

## Authentication Flow

1. **Sign Up** → **API Keys** → Dashboard with full access
2. **Login** → Dashboard with full access
3. **Password Reset** → Login with new password
4. **Logout** → Dashboard with chart only

## Session Management

- Use **cookie-based sessions** (not JWT tokens)
- Session cookie name: `session_id` or similar
- Cookie must have `HttpOnly`, `Secure`, and `SameSite=Strict` flags
- Frontend sends `credentials: 'include'` with all requests

## API Endpoints

### 1. POST /api/auth/signup

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "userId": "uuid-here"
}
```

**Response (Error - 400/409):**
```json
{
  "error": "Email already exists"
}
```

**Database Storage:**
```python
users = {
    "id": "uuid",
    "email": "user@example.com",
    "password_hash": "bcrypt_hash",  # NEVER store plain password
    "created_at": "2025-12-01T10:00:00Z",
    "api_key": null,  # Set later in /api/auth/apikeys
    "secret_key_encrypted": null
}
```

### 2. POST /api/auth/login

Log in existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Logged in successfully"
}
```

**Set-Cookie Header:**
```
Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
```

**Response (Error - 401):**
```json
{
  "error": "Invalid email or password"
}
```

### 3. POST /api/auth/logout

Log out current user.

**Request:**
No body needed (uses session cookie)

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Set-Cookie Header:**
```
Set-Cookie: session_id=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0
```

### 4. POST /api/auth/apikeys

Save Binance API keys for authenticated user.

**Request:**
```json
{
  "apiKey": "binance_api_key_here",
  "secretKey": "binance_secret_key_here"
}
```

**Requirements:**
- Must be authenticated (check session cookie)
- **NEVER store secret key in plain text**
- Encrypt secret key before storing (use Fernet, AES, or similar)
- Store encryption key in environment variable

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "API keys saved successfully"
}
```

**Response (Error - 401):**
```json
{
  "error": "Not authenticated"
}
```

**Database Update:**
```python
users = {
    "id": "uuid",
    "email": "user@example.com",
    "password_hash": "bcrypt_hash",
    "api_key": "binance_api_key_here",  # Can be plain text
    "secret_key_encrypted": "encrypted_secret_key",  # MUST be encrypted
    "updated_at": "2025-12-01T10:05:00Z"
}
```

### 5. POST /api/auth/reset-password

Reset user password (requires current password verification).

**SECURITY REQUIREMENT:**
- **NEVER return or access API keys in this endpoint**
- Only handle email and password fields
- Verify current password before allowing reset

**Request:**
```json
{
  "email": "user@example.com",
  "currentPassword": "old_password123",
  "newPassword": "new_password456"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Response (Error - 401):**
```json
{
  "error": "Invalid email or current password"
}
```

**Response (Error - 400):**
```json
{
  "error": "New password must be at least 8 characters"
}
```

**Database Update:**
```python
# Only update password_hash, DO NOT touch api_key or secret_key_encrypted
users = {
    "id": "uuid",
    "email": "user@example.com",
    "password_hash": "new_bcrypt_hash",  # Update only this
    "api_key": "...",  # DO NOT ACCESS
    "secret_key_encrypted": "...",  # DO NOT ACCESS
    "updated_at": "2025-12-01T10:10:00Z"
}
```

### 6. GET /api/dashboard (Modified)

Return dashboard data with authentication status.

**Request:**
No body (uses session cookie)

**Response (Success - 200):**
```json
{
  "currentPrice": 42000,
  "currentTime": 1733050800000,
  "asset": {
    "currentAsset": 10500,
    "initialAsset": 10000,
    "currentBTC": 0.05,
    "currentCash": 8000
  },
  "priceHistory": {
    "1m": [...],
    "5m": [...],
    "15m": [...],
    "1h": [...],
    "4h": [...],
    "1d": [...]
  },
  "holding": {
    "isHolding": true,
    "buyPrice": 41500,
    "buyTime": 1733047200000
  },
  "trades": [...],
  "metrics": {
    "portfolioReturn": 5.0,
    "marketReturn": 3.0,
    "avgTradeReturn": 1.2,
    "takeProfitCount": 10,
    "stopLossCount": 3
  },
  "isAuthenticated": true  // ← ADD THIS FIELD
}
```

**If NOT authenticated:**
```json
{
  "currentPrice": 42000,
  "currentTime": 1733050800000,
  "asset": { ... },
  "priceHistory": { ... },
  "holding": { ... },
  "trades": [],
  "metrics": { ... },
  "isAuthenticated": false  // ← User sees chart only
}
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    api_key TEXT,
    secret_key_encrypted TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### Sessions Table

```sql
CREATE TABLE sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

## Security Requirements

1. **Password Storage:**
   - Use `bcrypt` or `argon2` for password hashing
   - Never store plain text passwords

2. **API Key Storage:**
   - Binance API Key: Can be stored as plain text (needed for API calls)
   - Binance Secret Key: **MUST be encrypted** before storage
   - Use environment variable for encryption key

3. **Session Security:**
   - Generate cryptographically secure random session IDs
   - Set reasonable expiration (24 hours recommended)
   - Clean up expired sessions regularly

4. **Validation:**
   - Email format validation
   - Password minimum length (8+ characters)
   - API key format validation

5. **Password Reset Security:**
   - **CRITICAL**: Never return or expose API keys during password reset
   - Only SELECT and UPDATE email and password_hash fields
   - API keys must remain completely isolated from password operations

## Python Implementation Example

```python
import bcrypt
from cryptography.fernet import Fernet
import os
import secrets

# Password hashing
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), hash.encode())

# Secret key encryption
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')  # Must be set in .env
cipher = Fernet(ENCRYPTION_KEY)

def encrypt_secret(secret: str) -> str:
    return cipher.encrypt(secret.encode()).decode()

def decrypt_secret(encrypted: str) -> str:
    return cipher.decrypt(encrypted.encode()).decode()

# Session management
def generate_session_id() -> str:
    return secrets.token_urlsafe(32)

# Password reset implementation example
def reset_password(email: str, current_password: str, new_password: str) -> bool:
    # ✅ SECURE: Only select email and password_hash
    user = db.execute(
        "SELECT id, email, password_hash FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    if not user or not verify_password(current_password, user['password_hash']):
        return False

    # ✅ SECURE: Only update password_hash
    new_hash = hash_password(new_password)
    db.execute(
        "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
        (new_hash, user['id'])
    )

    return True

# ❌ INSECURE: Don't do this
def reset_password_insecure(email: str, current_password: str, new_password: str):
    # BAD: Selects ALL columns including api_key and secret_key_encrypted
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    # This exposes API keys unnecessarily
```

## Frontend Integration

The frontend sends these requests:

1. **Login/Signup:** `POST /api/auth/login` or `POST /api/auth/signup`
2. **Save API Keys:** `POST /api/auth/apikeys`
3. **Password Reset:** `POST /api/auth/reset-password`
4. **Dashboard:** `GET /api/dashboard` (every 3 seconds)
5. **Logout:** `POST /api/auth/logout`

All requests include `credentials: 'include'` to send cookies.

## Proxy Configuration

The frontend uses a Netlify proxy function that:
- Forwards all HTTP methods (GET, POST, PUT, DELETE)
- Passes cookies between frontend and backend
- Forwards request body for POST/PUT requests
- Returns response cookies via `Set-Cookie` header

## Testing Checklist

- [ ] Sign up with new email
- [ ] Sign up with existing email (should fail)
- [ ] Login with correct credentials
- [ ] Login with incorrect credentials (should fail)
- [ ] Save API keys after signup
- [ ] Save API keys after login
- [ ] Reset password with correct current password
- [ ] Reset password with incorrect current password (should fail)
- [ ] Password reset does not expose API keys
- [ ] Dashboard shows `isAuthenticated: true` when logged in
- [ ] Dashboard shows `isAuthenticated: false` when not logged in
- [ ] Logout clears session
- [ ] Session persists across page refreshes
- [ ] Session expires after 24 hours
- [ ] Encrypted secret key can be decrypted correctly
