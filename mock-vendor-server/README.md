# Mock Vendor PKCE Server with JWT Verification

A Node.js/Express server that simulates a third-party vendor webhook endpoint for testing NetSapiens remote authentication with PKCE (Proof Key for Code Exchange) and JWT cluster verification.

## Features

- ✅ **PKCE Authentication** - Validates authorization codes using code_verifier (no client secrets needed)
- 🔐 **HMAC Signature Validation** - Verifies webhook integrity via shared secret
- 🔑 **JWT Cluster Verification** - Validates RS256-signed JWT from Insight server
- 📄 **JWT Decode Display** - Shows all decoded JWT claims for debugging
- 📊 **Request History** - Tracks all received webhooks for debugging
- 🎨 **Beautiful Console Output** - Color-coded logs showing the entire auth flow
- 🏥 **Health Check Endpoint** - Monitor server status

## Installation

```bash
npm install
```

## Usage

### Start the server

```bash
npm start
```

Or with auto-reload for development:

```bash
npm run dev
```

The server will start on `http://localhost:3001`

### Configuration

Edit `index.js` to change:

```javascript
const WEBHOOK_SECRET = 'test-hmac-secret'; // Must match horizon_extensions.remote_callback_secret
const NS_API_BASE = 'http://localhost:8080/ns-api/v2';
const PORT = 3001;
const INSIGHT_JWKS_URL = 'https://insight-beta.netsapiens.com/.well-known/jwks.json';
```

Or set environment variable:

```bash
# For beta/dev testing (default)
INSIGHT_JWKS_URL=https://insight-beta.netsapiens.com/.well-known/jwks.json npm start

# For production testing
INSIGHT_JWKS_URL=https://insight.netsapiens.com/.well-known/jwks.json npm start
```

## Endpoints

### `POST /oauth/callback`
Main webhook endpoint that receives authorization codes from NetSapiens.

**Request Body:**
```json
{
  "request_id": "remauth_xxx",
  "code": "authorization_code",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "user": {
    "uid": "user@domain.com",
    "domain": "domain.com",
    "displayName": "John Doe"
  },
  "expires_in": 600,
  "validation_endpoint": "https://api.netsapiens.com/oauth2/token",
  "timestamp": 1779491231,
  "signature": "hmac_sha256_signature",
  "pkce_enabled": true
}
```

**Response:**
```json
{
  "access_token": "mock_vendor_token_xxx",
  "token_type": "Bearer",
  "expires_in": 7200,
  "refresh_token": "mock_refresh_xxx",
  "scope": "read write",
  "user_id": "user@domain.com",
  "cluster_verification": {
    "verified": true,
    "cluster_id": 23573,
    "cluster_name": "Dev Lab (Chris)",
    "client": "netsapiens",
    "client_id": 1,
    "app_id": "demo-app-with-auth",
    "issuer": "https://insight.netsapiens.com"
  }
}
```

**Note:** The `cluster_verification` field is only included when the `X-NS-Cluster-Verification` header is present and valid.

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "Mock Vendor PKCE Server with JWT Verification",
  "features": {
    "pkce_enabled": true,
    "jwt_verification": true,
    "hmac_validation": true
  },
  "webhook_count": 5,
  "listening_on": "https://sdk.nseng.dev/mock-server/oauth/callback"
}
```

### `GET /history`
View all received webhooks.

**Response:**
```json
{
  "count": 5,
  "webhooks": [
    {
      "timestamp": "2026-05-26T10:30:00.000Z",
      "request_id": "remauth_xxx",
      "code": "auth_code_xxx",
      "has_verifier": true,
      "pkce_enabled": true,
      "user": { "uid": "user@domain.com" }
    }
  ]
}
```

### `POST /clear-history`
Clear webhook history.

**Response:**
```json
{
  "message": "Cleared 5 webhook(s)"
}
```

## Testing Flow

1. **Configure Horizon Debug App**:
   ```sql
   UPDATE horizon_extensions
   SET
       remote_auth_enabled = 'yes',
       allowed_hostnames = 'http://localhost:3001',
       remote_callback_secret = 'test-hmac-secret',
       remote_timeout_seconds = 60
   WHERE id = 'demo-app-with-auth';
   ```

2. **Start this mock server**:
   ```bash
   npm start
   ```

3. **Trigger remote auth in Horizon**:
   - Navigate to: http://localhost:8080/apps/demo-app-with-auth/remote-auth
   - Callback URL: `https://sdk.nseng.dev/mock-server/oauth/callback`
   - Click "Authenticate with Test Vendor"

4. **Watch the console output** - you'll see:
   - 📥 Webhook received with PKCE data
   - 🔐 HMAC signature validation
   - 🔄 NetSapiens code validation (with PKCE, no client credentials!)
   - ✅ PKCE validation success
   - 🎫 Mock token generation
   - 📤 Token returned to NetSapiens

## Expected Console Output

```
================================================================================
📥 [2026-05-26T10:30:00.000Z] Webhook received
================================================================================
📋 Webhook Details:
   Request ID: remauth_xxx (header: remauth_xxx)
   Code: auth_code_xxx
   Code Verifier: dBjftJeZ4CVP-mB92K27...
   PKCE Enabled: ✅ YES
   User: 1000@netsapiens (Chris Aaker)
   Expires In: 600s
   Validation Endpoint: http://localhost:8080/ns-api/v2/oauth2/token

🔐 Validating Cluster Verification JWT...
   Token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI...
   JWKS URL: https://insight-beta.netsapiens.com/.well-known/jwks.json
✅ JWT verification successful!

📊 Decoded JWT Claims:
   ┌─ Algorithm & Type
   │  alg: RS256
   │  typ: JWT
   ├─ Verification Claims
   │  scope: verification
   │  appId: demo-app-with-auth
   ├─ Cluster Identity
   │  client_id: 1
   │  cluster_id: 23573
   │  client: netsapiens
   │  cluster_name: Dev Lab (Chris)
   ├─ Timestamps
   │  issued_at: 2026-05-26T10:30:25.000Z
   │  expires_at: 2026-05-26T22:30:25.000Z
   │  age: 15s
   │  ttl_remaining: 43185s
   └─ Issuer
      iss: https://insight.netsapiens.com

📄 Full Decoded JWT (for debugging):
{
  "scope": "verification",
  "appId": "demo-app-with-auth",
  "client_id": 1,
  "cluster_id": 23573,
  "client": "netsapiens",
  "cluster_name": "Dev Lab (Chris)",
  "iat": 1779839025,
  "exp": 1779925425,
  "iss": "https://insight.netsapiens.com"
}

🔐 Validating HMAC signature...
   Header: sha256=a7f3e9c2d8b4f1e6a9c7b2d4e8f3a1c5...
   Payload: a7f3e9c2d8b4f1e6a9c7b2d4e8f3a1c5...
✅ HMAC signature valid: a7f3e9c2d8b4f1e6a9c7b2d4e8f3a1c5...

🔄 Validating code with NetSapiens (PKCE flow)...
   POST http://localhost:8080/ns-api/v2/oauth2/token
   ├─ grant_type: authorization_code
   ├─ code: auth_code_xxx
   ├─ code_verifier: dBjftJeZ4CVP...
   ├─ username: 1000@netsapiens
   └─ NO Authorization header (PKCE replaces client credentials)

✅ PKCE validation successful!
📊 NetSapiens Token Response:
   Access Token: ns_access_token...
   Token Type: Bearer
   Expires In: 3600s
   User: 1000@netsapiens
   Domain: netsapiens

🎫 Generating vendor access token...
✅ Vendor token generated
   Token: mock_vendor_token_xxx...

📤 Returning vendor token to NetSapiens
================================================================================
```

## Troubleshooting

### Port already in use
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Dependencies not installed
```bash
npm install
```

### Connection refused from NetSapiens
- Ensure the server is running: `curl http://localhost:3001/health`
- Check `allowed_hostnames` includes `http://localhost:3001`
- Verify no firewall blocking port 3001

### No JWT header received
**Symptom:** `⚠️ No X-NS-Cluster-Verification header - JWT verification skipped`

**Possible causes:**
1. Insight server unreachable (JWT fetch failed on NS API)
2. Insight token file missing: `/etc/netsapiens/insight.d/token.jwt`
3. Cached token expired and new fetch failed
4. API version doesn't include JWT support yet

**Debug steps:**
- Check NS API logs for JWT fetch errors
- Verify Insight server is running and accessible
- Test JWT endpoint manually:
  ```bash
  curl -X POST \
    -H "Authorization: Bearer $(cat /etc/netsapiens/insight.d/token.jwt)" \
    "https://insight-beta.netsapiens.com/getClusterVerificationToken?appId=demo-app-with-auth"
  ```

### JWT verification fails
**Symptom:** `❌ JWT verification FAILED - Error: Invalid cluster verification token`

**Solutions:**
1. **Check JWKS URL is accessible:**
   ```bash
   curl https://insight-beta.netsapiens.com/.well-known/jwks.json
   ```

2. **Verify clock synchronization** (JWT has exp claim):
   ```bash
   date
   # Should match server time
   ```

3. **Check Insight server environment:**
   - Beta: `https://insight-beta.netsapiens.com`
   - Production: `https://insight.netsapiens.com`
   - Set `INSIGHT_JWKS_URL` to match

4. **Decode JWT manually to inspect:**
   ```bash
   # Copy the JWT token from console output
   echo "<jwt-token>" | cut -d. -f2 | base64 -d | jq
   ```

### HMAC validation fails
**Symptom:** `❌ Signature validation FAILED`

**Solutions:**
- Verify secret is exactly: `test-hmac-secret` (case-sensitive)
- Check `horizon_extensions.remote_callback_secret` matches
- Ensure concatenation order: `request_id + code + timestamp`
- No extra whitespace or encoding issues

## Development

Watch mode with auto-reload:
```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when you make changes to `index.js`.

## PKCE Flow Diagram

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│  Horizon    │         │  NS API v2   │         │ Mock Vendor  │
│  Debug App  │         │              │         │ (This Server)│
└──────┬──────┘         └──────┬───────┘         └──────┬───────┘
       │                       │                         │
       │ 1. Remote Auth        │                         │
       ├──────────────────────>│                         │
       │                       │                         │
       │                       │ 2. Generate PKCE pair   │
       │                       │    code_verifier        │
       │                       │    code_challenge       │
       │                       │                         │
       │                       │ 3. Webhook (code +      │
       │                       │    code_verifier)       │
       │                       ├────────────────────────>│
       │                       │                         │
       │                       │                         │ 4. Validate
       │                       │ 5. Token Request        │    signature
       │                       │    (code + verifier)    │
       │                       │<────────────────────────┤
       │                       │    NO client creds!     │
       │                       │                         │
       │                       │ 6. Validate PKCE        │
       │                       │    SHA256(verifier) ==  │
       │                       │    stored challenge?    │
       │                       │                         │
       │                       │ 7. NS Token             │
       │                       ├────────────────────────>│
       │                       │                         │
       │                       │                         │ 8. Generate
       │                       │ 9. Vendor Token         │    mock token
       │                       │<────────────────────────┤
       │ 10. Success!          │                         │
       │<──────────────────────┤                         │
       │                       │                         │
```

## License

MIT
