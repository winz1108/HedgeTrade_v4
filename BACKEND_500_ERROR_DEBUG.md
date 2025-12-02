# Backend Connection Error Debugging Guide

## 🚨 Current Errors

### Error 1: 500 Internal Server Error
```
GET /api/dashboard 500 (Internal Server Error)
Oracle VM unavailable: 500
```

### Error 2: 503 Service Unavailable (Timeout)
```
GET /api/dashboard 503 (Service Unavailable)
Oracle VM unavailable: 503 - This operation was aborted
```

**503 Error means:** The Oracle VM is not responding within 30 seconds (increased from 10 seconds).

## 🔍 Error Information

The frontend is correctly sending requests with session cookies, but the backend Oracle VM is either:
1. Returning a 500 error (internal server crash)
2. Not responding at all (timeout)

### What the Frontend is Doing (✅ Correct)

1. Sends request to: `/.netlify/functions/oracle-proxy?endpoint=/api/dashboard`
2. Includes session cookie: `credentials: 'include'`
3. Proxy forwards to: `http://130.61.50.101:54321/api/dashboard`
4. Proxy includes cookie in forwarded request
5. Waits up to 30 seconds for response

### What Needs to Be Fixed in Backend

**Option A: 500 Error** - Oracle VM crashes while processing request
**Option B: 503 Timeout** - Oracle VM doesn't respond (server not running or stuck)

---

## 🐛 Common Causes of 500 Error

### 1. Session/Authentication Error

**Possible Issue:**
```python
# Backend tries to get user from session but fails
session_id = request.cookies.get('session_id')
user = get_user_from_session(session_id)  # ❌ Throws exception

# No error handling → 500 error returned
```

**Fix:**
```python
try:
    session_id = request.cookies.get('session_id')
    if not session_id:
        return {
            "isAuthenticated": False,
            "hasApiKeys": False,
            # ... minimal data
        }, 200

    user = get_user_from_session(session_id)
    if not user:
        return {
            "isAuthenticated": False,
            "hasApiKeys": False,
            # ... minimal data
        }, 200

except Exception as e:
    print(f"Session error: {e}")
    return {"error": str(e)}, 500
```

### 2. Database Connection Error

**Possible Issue:**
```python
# Database query fails
user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
# ❌ Database connection error → exception → 500
```

**Fix:**
```python
try:
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        return {"isAuthenticated": False}, 200
except sqlite3.Error as e:
    print(f"Database error: {e}")
    return {"error": "Database error"}, 500
```

### 3. Missing Required Fields

**Possible Issue:**
```python
# Code expects certain fields but they're missing
api_key = user['api_key']  # ❌ KeyError if field doesn't exist
```

**Fix:**
```python
api_key = user.get('api_key')
if not api_key:
    return {
        "isAuthenticated": True,
        "hasApiKeys": False,
        # ... minimal data
    }, 200
```

### 4. Oracle VM Internal Error

**Possible Issue:**
```python
# Oracle VM call fails
oracle_data = call_oracle_vm(api_key, secret_key)
# ❌ Oracle VM returns error or crashes
```

**Fix:**
```python
try:
    oracle_data = call_oracle_vm(api_key, secret_key)
except Exception as e:
    print(f"Oracle VM error: {e}")
    return {
        "error": "Failed to fetch trading data",
        "isAuthenticated": True,
        "hasApiKeys": True,
        # ... return minimal data instead of crashing
    }, 200
```

---

## 🛠️ Required Backend Changes

### 1. Add Global Error Handler

```python
@app.errorhandler(Exception)
def handle_error(error):
    print(f"Unhandled error: {error}")
    print(f"Error type: {type(error)}")
    import traceback
    traceback.print_exc()

    return {
        "error": str(error),
        "type": type(error).__name__
    }, 500
```

### 2. Add Detailed Logging

```python
@app.route('/api/dashboard')
def get_dashboard():
    try:
        print("=== DASHBOARD REQUEST START ===")

        # 1. Get session
        session_id = request.cookies.get('session_id')
        print(f"Session ID: {session_id}")

        if not session_id:
            print("No session ID found")
            return minimal_response(), 200

        # 2. Get user
        user = get_user_from_session(session_id)
        print(f"User found: {user['email'] if user else None}")

        if not user:
            print("No user found for session")
            return minimal_response(), 200

        # 3. Check API keys
        has_api_keys = user.get('api_key') is not None
        print(f"Has API keys: {has_api_keys}")

        if not has_api_keys:
            return authenticated_minimal_response(), 200

        # 4. Call Oracle VM
        print("Calling Oracle VM...")
        oracle_data = call_oracle_vm(user['api_key'], user['secret_key_encrypted'])
        print("Oracle VM call successful")

        print("=== DASHBOARD REQUEST END ===")
        return {
            **oracle_data,
            "isAuthenticated": True,
            "hasApiKeys": True
        }, 200

    except Exception as e:
        print(f"ERROR in get_dashboard: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500
```

### 3. Return Proper Error Responses

Instead of crashing with 500, return 200 with error information:

```python
# ❌ BAD: Crashes with 500
def get_dashboard():
    user = get_user_from_session(session_id)  # Raises exception
    # No error handling → 500

# ✅ GOOD: Returns 200 with error info
def get_dashboard():
    try:
        user = get_user_from_session(session_id)
    except Exception as e:
        return {
            "error": f"Session error: {str(e)}",
            "isAuthenticated": False,
            "hasApiKeys": False
        }, 200  # Return 200, not 500
```

---

## 📋 Debugging Checklist

### Check Backend Logs

Look for these in Oracle VM server logs:

```bash
# SSH into Oracle VM
ssh user@130.61.50.101

# Check application logs
tail -f /var/log/oracle-app.log

# Or check Python logs
journalctl -u oracle-app -f
```

### Look For These Log Entries

1. **"No session_id in cookies"** → Frontend not sending cookies correctly
2. **"User not found for session"** → Session expired or invalid
3. **"Database connection error"** → Database issue
4. **"KeyError: 'api_key'"** → User record missing api_key field
5. **"Oracle VM connection failed"** → Oracle VM not responding

### Test Endpoints Manually

```bash
# 1. Check if Oracle VM server is running
curl -v http://130.61.50.101:54321/api/dashboard

# Expected: Should get SOME response (even if error)
# If timeout: Server is not running or blocked by firewall

# 2. Test with session cookie
curl -v -H "Cookie: session_id=YOUR_SESSION_ID" \
  http://130.61.50.101:54321/api/dashboard

# 3. Check server health
curl -v http://130.61.50.101:54321/health
# If no /health endpoint, add one!
```

### Common Timeout Causes (503 Error)

1. **Server Not Running**
   ```bash
   # Check if process is running
   ps aux | grep python
   # Or
   systemctl status oracle-app
   ```

2. **Server Stuck/Frozen**
   - Long-running computation blocking the response
   - Deadlock in database query
   - Waiting for external API that never responds

3. **Firewall Blocking**
   ```bash
   # Check if port is open
   telnet 130.61.50.101 54321
   ```

4. **Heavy Processing**
   - Large dataset causing 30+ second response time
   - Need to optimize database queries
   - Need to add caching

---

## 🎯 Immediate Fix Needed

The backend `/api/dashboard` endpoint needs to:

1. **Catch all exceptions** and return 200 with error info (not 500)
2. **Log detailed information** about what's failing
3. **Handle missing data gracefully** instead of crashing

**Example of robust error handling:**

```python
@app.route('/api/dashboard')
def get_dashboard():
    try:
        # Get session
        session_id = request.cookies.get('session_id')
        if not session_id:
            return no_auth_response(), 200

        # Get user
        try:
            user = get_user_from_session(session_id)
        except Exception as e:
            print(f"Session lookup failed: {e}")
            return no_auth_response(), 200

        if not user:
            return no_auth_response(), 200

        # Check API keys
        api_key = user.get('api_key')
        if not api_key:
            return {
                **market_data(),
                "isAuthenticated": True,
                "hasApiKeys": False
            }, 200

        # Get trading data
        try:
            trading_data = call_oracle_vm(api_key, user.get('secret_key_encrypted'))
        except Exception as e:
            print(f"Oracle VM call failed: {e}")
            return {
                **market_data(),
                "isAuthenticated": True,
                "hasApiKeys": True,
                "error": "Failed to fetch trading data"
            }, 200

        return {
            **market_data(),
            **trading_data,
            "isAuthenticated": True,
            "hasApiKeys": True
        }, 200

    except Exception as e:
        print(f"Unexpected error in get_dashboard: {e}")
        import traceback
        traceback.print_exc()
        return {
            "error": str(e),
            "isAuthenticated": False,
            "hasApiKeys": False
        }, 200  # Still return 200, not 500

def no_auth_response():
    return {
        **market_data(),
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
```

---

## 🔧 Quick Test

To verify the fix works:

1. Backend should return 200 (not 500) even when user is not authenticated
2. Response should include `isAuthenticated: false`
3. Frontend should show login button instead of crashing
4. Console logs should show detailed error information

**Expected behavior:**
- Not logged in → `isAuthenticated: false` → Show login button
- Logged in, no API keys → `hasApiKeys: false` → Show API key form
- Logged in, has API keys → Show full dashboard with trading data
- Any error → Return 200 with error info, don't crash with 500
