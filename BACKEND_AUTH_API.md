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
  "password": "password123",
  "rememberMe": false
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "hasApiKeys": true
}
```

**Important:**
- `hasApiKeys = true`: User has already saved Binance API keys
- `hasApiKeys = false`: User needs to input API keys (frontend will show API key form)

**Database Check:**
```python
# Check if user has API keys
user = db.execute(
    "SELECT id, api_key FROM users WHERE email = ?",
    (email,)
).fetchone()

has_api_keys = user['api_key'] is not None and user['api_key'] != ''
```

**Set-Cookie Header:**

If `rememberMe = true` (30 days):
```
Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000
```

If `rememberMe = false` (24 hours):
```
Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
```

**Response (Error - 401):**
```json
{
  "error": "Invalid email or password"
}
```

**Session Duration Logic:**
- `rememberMe = true`: 30 days (2,592,000 seconds)
- `rememberMe = false`: 24 hours (86,400 seconds)

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

**⚠️ CRITICAL: Each user MUST see their OWN trading data!**

**Request:**
No body (uses session cookie)

**Backend Flow:**
```python
# 1. Get user from session
session_id = request.cookies.get('session_id')
user = get_user_from_session(session_id)

if not user:
    return {
        "isAuthenticated": False,
        "hasApiKeys": False,
        "currentPrice": <market_price>,
        "currentTime": <timestamp>,
        # ... only market data, no user-specific data
    }

# 2. Check if user has API keys
has_api_keys = user['api_key'] is not None and user['api_key'] != ''

if not has_api_keys:
    return {
        "isAuthenticated": True,
        "hasApiKeys": False,
        "currentPrice": <market_price>,
        "currentTime": <timestamp>,
        # ... only market data, no trading data
    }

# 3. Get user's trading data using THEIR API keys
api_key = user['api_key']
secret_key = decrypt(user['secret_key_encrypted'])

# 4. Call Oracle VM with THIS USER'S API keys
# The Oracle VM MUST use these API keys to fetch Binance account data
oracle_response = call_oracle_vm(api_key, secret_key)

# 5. Return user-specific data
return {
    "isAuthenticated": True,
    "hasApiKeys": True,
    "currentPrice": oracle_response['currentPrice'],
    "currentTime": oracle_response['currentTime'],
    "asset": oracle_response['asset'],  # ← THIS USER'S asset
    "holding": oracle_response['holding'],  # ← THIS USER'S positions
    "trades": oracle_response['trades'],  # ← THIS USER'S trades
    "metrics": oracle_response['metrics'],  # ← THIS USER'S metrics
    # ...
}
```

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
  "isAuthenticated": true,  // ← ADD THIS FIELD
  "hasApiKeys": true  // ← ADD THIS FIELD (check if user has api_key in DB)
}
```

**⚠️ IMPORTANT:**
- Each user sees ONLY their own trading data
- Data is fetched using each user's unique Binance API keys
- NO CACHING between different users
- Session cookie identifies which user is making the request

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
  "isAuthenticated": false,  // ← User sees chart only
  "hasApiKeys": false
}
```

**Complete Backend Implementation:**
```python
def get_dashboard(request):
    # 1. Get session and user
    session_id = request.cookies.get('session_id')
    user = get_user_from_session(session_id)

    # 2. Get market data (price history, current price) - same for all users
    market_data = get_market_data()

    # 3. If not authenticated, return only market data
    if not user:
        return {
            **market_data,
            "isAuthenticated": False,
            "hasApiKeys": False,
            "asset": {"currentAsset": 0, "initialAsset": 0},
            "holding": {"isHolding": False},
            "trades": [],
            "metrics": {
                "portfolioReturn": 0,
                "marketReturn": 0,
                "avgTradeReturn": 0,
                "takeProfitCount": 0,
                "stopLossCount": 0
            }
        }

    # 4. Check if user has API keys
    has_api_keys = user['api_key'] is not None and user['api_key'] != ''

    if not has_api_keys:
        return {
            **market_data,
            "isAuthenticated": True,
            "hasApiKeys": False,
            "asset": {"currentAsset": 0, "initialAsset": 0},
            "holding": {"isHolding": False},
            "trades": [],
            "metrics": {
                "portfolioReturn": 0,
                "marketReturn": 0,
                "avgTradeReturn": 0,
                "takeProfitCount": 0,
                "stopLossCount": 0
            }
        }

    # 5. Get THIS USER'S trading data from Oracle VM
    api_key = user['api_key']
    secret_key = decrypt(user['secret_key_encrypted'])

    # ⚠️ CRITICAL: Pass user's API keys to Oracle VM
    # Oracle VM will use these keys to fetch Binance account data
    user_trading_data = call_oracle_vm(api_key, secret_key)

    # 6. Return complete data with user's trading info
    return {
        **market_data,
        "isAuthenticated": True,
        "hasApiKeys": True,
        "asset": user_trading_data['asset'],  # User's asset
        "holding": user_trading_data['holding'],  # User's positions
        "trades": user_trading_data['trades'],  # User's trades
        "metrics": user_trading_data['metrics'],  # User's metrics
        "currentPrediction": user_trading_data.get('currentPrediction'),
        "lastPredictionUpdateTime": user_trading_data.get('lastPredictionUpdateTime')
    }

def call_oracle_vm(api_key: str, secret_key: str):
    """
    Call Oracle VM with user's Binance API keys.
    Oracle VM will:
    1. Connect to Binance using these keys
    2. Fetch account balance, positions, trade history
    3. Run trading algorithm
    4. Return user-specific data
    """
    response = requests.post('http://oracle-vm:5000/api/dashboard', json={
        'api_key': api_key,
        'secret_key': secret_key
    })
    return response.json()
```

**⚠️ Data Isolation:**
- User A with API Key 1 → Gets trading data from Binance Account 1
- User B with API Key 2 → Gets trading data from Binance Account 2
- NO shared cache between users
- Each request uses that user's unique API keys

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

# Login with remember me
def login(email: str, password: str, remember_me: bool = False) -> dict:
    user = db.execute(
        "SELECT id, email, password_hash FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    if not user or not verify_password(password, user['password_hash']):
        return None

    # Create session
    session_id = generate_session_id()

    # Set expiration based on remember_me
    if remember_me:
        max_age = 2592000  # 30 days in seconds
    else:
        max_age = 86400  # 24 hours in seconds

    expires_at = datetime.now() + timedelta(seconds=max_age)

    # Save session to database
    db.execute(
        "INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)",
        (session_id, user['id'], expires_at)
    )

    return {
        "session_id": session_id,
        "max_age": max_age
    }

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

### API Key Flow

1. **User signs up** → Frontend automatically shows API key input form
2. **User logs in without API keys** → Backend returns `hasApiKeys: false` → Frontend shows API key input form
3. **User logs in with API keys** → Backend returns `hasApiKeys: true` → Frontend shows full dashboard
4. **User closes API key form without saving** → Next login will show API key form again (API keys remain `null` in DB)

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
