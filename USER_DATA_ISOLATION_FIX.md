# User Data Isolation Fix

## 🚨 CRITICAL BUG

**Problem:** All users see the same trading data regardless of their Binance API keys.

**Root Cause:** Backend is not using session cookies to identify users and fetch their individual trading data.

---

## ✅ Required Fix

### Backend Flow (Current - WRONG)

```python
# ❌ WRONG: Returns same data to all users
def get_dashboard():
    # Fetches data from Oracle VM without user context
    data = call_oracle_vm()
    return data
```

### Backend Flow (Required - CORRECT)

```python
# ✅ CORRECT: Returns user-specific data
def get_dashboard(request):
    # 1. Identify user from session cookie
    session_id = request.cookies.get('session_id')
    user = get_user_from_session(session_id)

    if not user:
        return {
            "isAuthenticated": False,
            "hasApiKeys": False,
            # ... only market data
        }

    # 2. Check if user has API keys
    if not user['api_key']:
        return {
            "isAuthenticated": True,
            "hasApiKeys": False,
            # ... only market data
        }

    # 3. Get THIS USER'S API keys from database
    api_key = user['api_key']
    secret_key = decrypt(user['secret_key_encrypted'])

    # 4. Call Oracle VM with THIS USER'S keys
    user_data = call_oracle_vm(api_key, secret_key)

    # 5. Return THIS USER'S data
    return {
        "isAuthenticated": True,
        "hasApiKeys": True,
        **user_data
    }
```

---

## 📋 Implementation Checklist

### 1. Session Management

```python
def get_user_from_session(session_id: str):
    """
    Get user from database using session_id
    """
    session = db.execute(
        "SELECT user_id, expires_at FROM sessions WHERE session_id = ?",
        (session_id,)
    ).fetchone()

    if not session:
        return None

    if session['expires_at'] < datetime.now():
        return None

    user = db.execute(
        "SELECT id, email, api_key, secret_key_encrypted FROM users WHERE id = ?",
        (session['user_id'],)
    ).fetchone()

    return user
```

### 2. Oracle VM Integration

```python
def call_oracle_vm(api_key: str, secret_key: str):
    """
    Call Oracle VM with user's Binance API keys
    """
    response = requests.post('http://oracle-vm:5000/api/user-data', json={
        'binance_api_key': api_key,
        'binance_secret_key': secret_key
    })

    if not response.ok:
        raise Exception(f"Oracle VM error: {response.status_code}")

    return response.json()
```

### 3. Oracle VM Changes

The Oracle VM must:

1. **Accept user-specific API keys** in each request
2. **Use those keys** to fetch Binance account data
3. **Return user-specific trading data**

```python
# In Oracle VM
def get_user_dashboard(binance_api_key, binance_secret_key):
    # 1. Connect to Binance with these keys
    binance = BinanceClient(binance_api_key, binance_secret_key)

    # 2. Fetch THIS USER'S account data
    account = binance.get_account()
    positions = binance.get_positions()
    trades = binance.get_trades()

    # 3. Run algorithm on THIS USER'S data
    algorithm_output = run_algorithm(account, positions, trades)

    # 4. Return THIS USER'S results
    return {
        "asset": {
            "currentAsset": account.total_value,
            "initialAsset": account.initial_value,
            "currentBTC": account.btc_balance,
            "currentCash": account.usdt_balance
        },
        "holding": positions.current_position,
        "trades": trades.history,
        "metrics": algorithm_output.metrics
    }
```

---

## 🔒 Security Notes

1. **Never log API keys or secret keys**
2. **Always decrypt secret keys only when needed**
3. **Don't cache user trading data between different users**
4. **Each request must identify the user via session cookie**

---

## 🧪 Testing

### Test Case 1: Different Users See Different Data

1. User A logs in with Binance API Key 1
2. User B logs in with Binance API Key 2
3. User A sees trades from Binance Account 1
4. User B sees trades from Binance Account 2
5. ✅ Each user sees ONLY their own data

### Test Case 2: No API Keys

1. User logs in without API keys
2. Response: `hasApiKeys: false`
3. Frontend shows API key input form
4. No trading data displayed

### Test Case 3: Not Authenticated

1. User is not logged in
2. Response: `isAuthenticated: false`
3. Frontend shows login button
4. Only market price chart visible

---

## 📊 Data Flow Diagram

```
Frontend Request
    ↓
[Cookie: session_id=abc123]
    ↓
Backend: /api/dashboard
    ↓
1. Get user from session
    ↓
2. Get user.api_key from DB
    ↓
3. Decrypt user.secret_key_encrypted
    ↓
4. Call Oracle VM with (api_key, secret_key)
    ↓
Oracle VM
    ↓
5. Connect to Binance with api_key
    ↓
6. Fetch account data from THIS USER'S Binance
    ↓
7. Return user-specific trading data
    ↓
Backend: /api/dashboard
    ↓
8. Add isAuthenticated, hasApiKeys flags
    ↓
9. Return to frontend
    ↓
Frontend displays THIS USER'S data
```

---

## 🎯 Key Points

1. **Session Cookie** → Identifies which user
2. **User's API Keys** → Fetches that user's Binance data
3. **Oracle VM** → Returns data for those specific API keys
4. **No Caching** → Each user gets fresh data from their account
5. **Data Isolation** → User A never sees User B's data

---

## ❌ Common Mistakes to Avoid

### Mistake 1: Ignoring Session Cookie
```python
# ❌ WRONG
def get_dashboard():
    data = call_oracle_vm()  # No user context!
    return data
```

### Mistake 2: Sharing Cache Between Users
```python
# ❌ WRONG
cached_data = {}

def get_dashboard(user_id):
    if 'data' not in cached_data:
        cached_data['data'] = call_oracle_vm()
    return cached_data['data']  # Same data for all users!
```

### Mistake 3: Not Using User's API Keys
```python
# ❌ WRONG
def call_oracle_vm():
    # Uses hardcoded or shared API keys
    response = requests.get('http://oracle-vm/data')
    return response.json()
```

---

## ✅ Correct Implementation

```python
# ✅ CORRECT
def get_dashboard(request):
    session_id = request.cookies.get('session_id')
    user = get_user_from_session(session_id)

    if not user or not user['api_key']:
        return minimal_response()

    # Use THIS USER'S keys
    user_data = call_oracle_vm(
        user['api_key'],
        decrypt(user['secret_key_encrypted'])
    )

    return {
        "isAuthenticated": True,
        "hasApiKeys": True,
        **user_data
    }
```
