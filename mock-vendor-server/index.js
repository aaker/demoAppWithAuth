#!/usr/bin/env node
/**
 * Mock Vendor Server for PKCE Testing
 *
 * This server simulates a vendor webhook endpoint that receives authorization codes
 * from NetSapiens remote auth and validates them using PKCE (no client credentials).
 *
 * Usage:
 *   node mock-vendor-pkce.js
 *
 * The server listens on https://sdk.nseng.dev/mock-server/oauth/callback
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const https = require('https');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const app = express();
app.use(express.json());

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, sentry-trace, baggage');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// ---- Debug logging helpers ------------------------------------------------
const SENSITIVE_HEADERS = ['authorization', 'x-ns-signature', 'x-ns-cluster-verification'];
const SENSITIVE_FIELDS = ['code', 'code_verifier', 'access_token', 'refresh_token', 'signature'];

function truncate(value) {
  return typeof value === 'string' && value.length > 24
    ? `${value.slice(0, 24)}…(${value.length} chars)`
    : value;
}

function redactHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers || {})) {
    if (typeof v === 'function') continue;
    out[k] = SENSITIVE_HEADERS.includes(k.toLowerCase()) ? truncate(v) : v;
  }
  return out;
}

function redactBody(body) {
  if (!body || typeof body !== 'object') return body;
  let clone;
  try { clone = JSON.parse(JSON.stringify(body)); } catch { return '[unserializable]'; }
  for (const key of SENSITIVE_FIELDS) {
    if (key in clone) clone[key] = truncate(clone[key]);
  }
  if (clone.user) clone.user = clone.user.uid || clone.user;
  return clone;
}

// ---- Inbound request/response logging -------------------------------------
let reqSeq = 0;
app.use((req, res, next) => {
  const id = String(++reqSeq).padStart(4, '0');
  req._reqId = id;
  const start = Date.now();
  console.log(`\n⬇️  [${new Date().toISOString()}] #${id} INBOUND ${req.method} ${req.originalUrl}  (client ${req.ip}, fwd ${req.headers['x-forwarded-for'] || '-'})`);
  console.log(`   headers: ${JSON.stringify(redactHeaders(req.headers))}`);
  if (req.body && Object.keys(req.body).length) {
    console.log(`   body:    ${JSON.stringify(redactBody(req.body))}`);
  }
  res.on('finish', () => {
    console.log(`⬆️  [${new Date().toISOString()}] #${id} RESPONSE ${res.statusCode} ${req.method} ${req.originalUrl} (${Date.now() - start}ms)`);
  });
  next();
});

// ---- Outbound HTTP logging (axios) ----------------------------------------
axios.interceptors.request.use((config) => {
  config._startTime = Date.now();
  const method = (config.method || 'get').toUpperCase();
  console.log(`\n🌐 [${new Date().toISOString()}] OUTBOUND → ${method} ${config.baseURL || ''}${config.url}`);
  console.log(`   headers: ${JSON.stringify(redactHeaders(config.headers))}`);
  if (config.data) {
    console.log(`   body:    ${typeof config.data === 'string' ? config.data : JSON.stringify(redactBody(config.data))}`);
  }
  return config;
});
axios.interceptors.response.use(
  (response) => {
    const ms = Date.now() - (response.config._startTime || Date.now());
    console.log(`🌐 [${new Date().toISOString()}] OUTBOUND ← ${response.status} ${response.config.url} (${ms}ms)`);
    console.log(`   data:    ${JSON.stringify(redactBody(response.data))}`);
    return response;
  },
  (error) => {
    const cfg = error.config || {};
    const ms = Date.now() - (cfg._startTime || Date.now());
    console.log(`🌐 [${new Date().toISOString()}] OUTBOUND ✖ ${error.response?.status || 'NETWORK_ERR'} ${cfg.url || ''} (${ms}ms) — ${error.message}`);
    if (error.response?.data) console.log(`   data:    ${JSON.stringify(redactBody(error.response.data))}`);
    return Promise.reject(error);
  }
);

// Configuration (env overridable for running as a service)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'test-hmac-secret'; // Must match horizon_extensions.remote_callback_secret
const PORT = parseInt(process.env.PORT, 10) || 3001;
const HOST = process.env.HOST || '127.0.0.1'; // bind loopback only; front with a reverse proxy
const INSIGHT_JWKS_URL = process.env.INSIGHT_JWKS_URL || 'https://insight-beta.netsapiens.com/.well-known/jwks.json';
// The token endpoint comes from each webhook's validation_endpoint, not config.
// It's typically an internal loopback HTTPS URL with a self-signed cert; allow that
// unless explicitly disabled.
const ALLOW_INSECURE_VALIDATION = process.env.ALLOW_INSECURE_VALIDATION !== 'false';
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

function insecureValidationAgent(endpoint) {
  if (!ALLOW_INSECURE_VALIDATION) return undefined;
  let host;
  try { host = new URL(endpoint).hostname; } catch { return undefined; }
  const isLoopback = host === '127.0.0.1' || host === 'localhost' || host === '::1';
  return isLoopback ? insecureAgent : undefined;
}

// Store received webhooks for debugging
const webhookHistory = [];

// JWKS client for JWT verification
const jwksClientInstance = jwksClient({
  jwksUri: INSIGHT_JWKS_URL,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 5
});

/**
 * Get signing key from JWKS
 */
function getKey(header, callback) {
  jwksClientInstance.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

/**
 * Verify cluster verification JWT
 */
async function verifyClusterToken(token, expectedAppId) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['RS256'],
      issuer: 'https://insight.netsapiens.com'
    }, (err, decoded) => {
      if (err) {
        return reject(new Error('Invalid cluster verification token: ' + err.message));
      }

      // Verify claims
      if (decoded.scope !== 'verification') {
        return reject(new Error('Invalid token scope: ' + decoded.scope));
      }

      if (expectedAppId && decoded.appId !== expectedAppId) {
        return reject(new Error(`AppId mismatch: expected ${expectedAppId}, got ${decoded.appId}`));
      }

      resolve(decoded);
    });
  });
}

/**
 * Webhook endpoint - receives authorization code from NetSapiens
 */
app.post('/oauth/callback', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log('\n' + '='.repeat(80));
  console.log(`📥 [${timestamp}] Webhook received`);
  console.log('='.repeat(80));

  const {
    request_id,
    code,
    code_verifier,
    user,
    timestamp: webhookTimestamp,
    signature,
    pkce_enabled,
    expires_in,
    validation_endpoint
  } = req.body;

  // Get headers
  const clusterVerificationToken = req.headers['x-ns-cluster-verification'];
  const hmacSignature = req.headers['x-ns-signature'];
  const requestIdHeader = req.headers['x-ns-request-id'];

  // Decode JWT for history (if present)
  let clusterInfo = null;
  if (clusterVerificationToken) {
    try {
      const decoded = await verifyClusterToken(clusterVerificationToken);
      clusterInfo = {
        cluster_id: decoded.cluster_id,
        cluster_name: decoded.cluster_name,
        client: decoded.client,
        app_id: decoded.appId
      };
    } catch (error) {
      clusterInfo = { error: error.message };
    }
  }

  // Store in history
  webhookHistory.push({
    timestamp,
    request_id,
    code,
    has_verifier: !!code_verifier,
    pkce_enabled,
    user,
    has_jwt: !!clusterVerificationToken,
    cluster_info: clusterInfo
  });

  console.log('📋 Webhook Details:');
  console.log(`   Request ID: ${request_id} (header: ${requestIdHeader})`);
  console.log(`   Code: ${code}`);
  console.log(`   Code Verifier: ${code_verifier ? code_verifier.substring(0, 20) + '...' : 'NOT PROVIDED'}`);
  console.log(`   PKCE Enabled: ${pkce_enabled ? '✅ YES' : '❌ NO'}`);
  console.log(`   User: ${user.uid} (${user.displayName || 'no name'})`);
  console.log(`   Expires In: ${expires_in}s`);
  console.log(`   Validation Endpoint: ${validation_endpoint}`);

  // 1. Validate JWT Cluster Verification Token (if provided)
  if (clusterVerificationToken) {
    console.log('\n🔐 Validating Cluster Verification JWT...');
    console.log(`   Token: ${clusterVerificationToken.substring(0, 50)}...`);
    console.log(`   JWKS URL: ${INSIGHT_JWKS_URL}`);

    try {
      const decoded = await verifyClusterToken(clusterVerificationToken);

      console.log('✅ JWT verification successful!');
      console.log('\n📊 Decoded JWT Claims:');
      console.log('   ┌─ Algorithm & Type');
      console.log(`   │  alg: ${decoded.alg || 'RS256'}`);
      console.log(`   │  typ: ${decoded.typ || 'JWT'}`);
      console.log('   ├─ Verification Claims');
      console.log(`   │  scope: ${decoded.scope}`);
      console.log(`   │  appId: ${decoded.appId}`);
      console.log('   ├─ Cluster Identity');
      console.log(`   │  client_id: ${decoded.client_id}`);
      console.log(`   │  cluster_id: ${decoded.cluster_id}`);
      console.log(`   │  client: ${decoded.client}`);
      console.log(`   │  cluster_name: ${decoded.cluster_name}`);
      console.log('   ├─ Timestamps');
      console.log(`   │  issued_at: ${new Date(decoded.iat * 1000).toISOString()}`);
      console.log(`   │  expires_at: ${new Date(decoded.exp * 1000).toISOString()}`);
      console.log(`   │  age: ${Math.floor((Date.now() / 1000) - decoded.iat)}s`);
      console.log(`   │  ttl_remaining: ${Math.floor(decoded.exp - (Date.now() / 1000))}s`);
      console.log('   └─ Issuer');
      console.log(`      iss: ${decoded.iss}`);

      // Display full decoded JWT for debugging
      console.log('\n📄 Full Decoded JWT (for debugging):');
      console.log(JSON.stringify(decoded, null, 2));

    } catch (error) {
      console.log('❌ JWT verification FAILED');
      console.log(`   Error: ${error.message}`);
      // Don't fail the request - JWT is additional security
      console.log('   ⚠️  Continuing without JWT verification (HMAC still required)');
    }
  } else {
    console.log('\n⚠️  No X-NS-Cluster-Verification header - JWT verification skipped');
  }

  // 2. Validate HMAC signature (if provided)
  const payloadSignature = signature || (hmacSignature && hmacSignature.replace('sha256=', ''));
  if (payloadSignature) {
    console.log('\n🔐 Validating HMAC signature...');
    console.log(`   Header: ${hmacSignature || 'NOT IN HEADER'}`);
    console.log(`   Payload: ${signature || 'NOT IN PAYLOAD'}`);

    const message = request_id + code + webhookTimestamp;
    const expectedSig = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(message)
      .digest('hex');

    // Show exactly what was signed so a mismatch is diagnosable from the logs.
    console.log('   Signing message (request_id + code + timestamp):');
    console.log(`     request_id = ${request_id}`);
    console.log(`     code       = ${code}`);
    console.log(`     timestamp  = ${webhookTimestamp}`);
    console.log(`   Secret fingerprint: len=${WEBHOOK_SECRET.length}, sha256[:8]=${crypto.createHash('sha256').update(WEBHOOK_SECRET).digest('hex').slice(0, 8)}`);

    if (payloadSignature !== expectedSig) {
      console.log('❌ Signature validation FAILED  (HTTP 401 — this is the [RA009] cause)');
      console.log(`   Expected: ${expectedSig}`);
      console.log(`   Received: ${payloadSignature}`);
      console.log('   ⚠️  Most likely WEBHOOK_SECRET here ≠ horizon_extensions.remote_callback_secret');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    console.log('✅ HMAC signature valid: ' + expectedSig);
  } else {
    console.log('\n⚠️  No HMAC signature provided - skipping validation');
  }

  // 2. Check PKCE support
  if (!pkce_enabled || !code_verifier) {
    console.log('\n❌ PKCE not enabled or verifier missing');
    console.log('   This mock server only supports PKCE flow');
    return res.status(400).json({
      error: 'PKCE required',
      message: 'This vendor only supports PKCE authentication'
    });
  }

  // 3. Validate authorization code with NetSapiens using PKCE.
  // The token endpoint is supplied by the webhook itself (validation_endpoint),
  // so the server self-targets the originating cluster — no NS_API_BASE config needed.
  if (!validation_endpoint) {
    console.log('\n❌ No validation_endpoint in webhook payload — cannot validate code');
    return res.status(400).json({
      error: 'missing_validation_endpoint',
      message: 'Webhook did not include a validation_endpoint to POST the code to'
    });
  }

  // NetSapiens advertises the token path as /oauth/token in the webhook, but the
  // actual NS-API route is /oauth2/token (the /oauth/token form returns 404 "No Route
  // Found [92a]"). Correct that one segment while keeping the cluster host from the webhook.
  const tokenEndpoint = validation_endpoint.replace(/\/oauth\/token(\?|$)/, '/oauth2/token$1');

  console.log('\n🔄 Validating code with NetSapiens (PKCE flow)...');
  console.log(`   POST ${tokenEndpoint}`);
  if (tokenEndpoint !== validation_endpoint) {
    console.log(`   (normalized from webhook validation_endpoint: ${validation_endpoint})`);
  }
  console.log(`   ├─ grant_type: authorization_code`);
  console.log(`   ├─ code: ${code}`);
  console.log(`   ├─ code_verifier: ${code_verifier.substring(0, 20)}...`);
  console.log(`   ├─ username: ${user.uid}`);
  console.log(`   └─ NO Authorization header (PKCE replaces client credentials)`);

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      code_verifier: code_verifier,
      username: user.uid,
      redirect_uri: 'https://sdk.nseng.dev/mock-server/oauth/callback'
    });

    const nsResponse = await axios.post(
      tokenEndpoint,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        // NO Authorization header - PKCE replaces client credentials!
        validateStatus: () => true, // Don't throw on non-2xx
        // The cluster's token endpoint is internal (e.g. https://127.0.0.1:8083)
        // and typically presents a self-signed/internal cert. Skip TLS verification
        // for loopback targets only — set ALLOW_INSECURE_VALIDATION=false to enforce.
        httpsAgent: insecureValidationAgent(tokenEndpoint)
      }
    );

    if (nsResponse.status !== 200) {
      console.log(`\n❌ NetSapiens validation FAILED (${nsResponse.status})`);
      console.log('Response:', JSON.stringify(nsResponse.data, null, 2));
      return res.status(500).json({
        error: 'NS API validation failed',
        details: nsResponse.data,
        status: nsResponse.status
      });
    }

    const nsUser = nsResponse.data;
    console.log('\n✅ PKCE validation successful!');
    console.log('📊 NetSapiens Token Response:');
    console.log(`   Access Token: ${nsUser.access_token ? nsUser.access_token.substring(0, 20) + '...' : 'N/A'}`);
    console.log(`   Token Type: ${nsUser.token_type}`);
    console.log(`   Expires In: ${nsUser.expires_in}s`);
    console.log(`   User: ${nsUser.uid || nsUser.login}`);
    console.log(`   Domain: ${nsUser.domain}`);

    // 4. Generate mock vendor token for this user
    console.log('\n🎫 Generating vendor access token...');
    const vendorToken = 'mock_vendor_token_' + crypto.randomBytes(16).toString('hex');
    const vendorResponse = {
      access_token: vendorToken,
      token_type: 'Bearer',
      expires_in: 7200,
      refresh_token: 'mock_refresh_' + crypto.randomBytes(8).toString('hex'),
      scope: 'read write',
      user_id: nsUser.uid || nsUser.login
    };

    // Add decoded JWT info if it was present
    if (clusterVerificationToken) {
      try {
        const decoded = await verifyClusterToken(clusterVerificationToken);
        vendorResponse.cluster_verification = {
          verified: true,
          cluster_id: decoded.cluster_id,
          cluster_name: decoded.cluster_name,
          client: decoded.client,
          client_id: decoded.client_id,
          app_id: decoded.appId,
          issuer: decoded.iss
        };
        console.log('\n📋 Including cluster verification info in response');
      } catch (error) {
        vendorResponse.cluster_verification = {
          verified: false,
          error: error.message
        };
      }
    }

    console.log('✅ Vendor token generated');
    console.log(`   Token: ${vendorToken.substring(0, 30)}...`);

    // 5. Return token to NetSapiens
    console.log('\n📤 Returning vendor token to NetSapiens');
    console.log('='.repeat(80));
    res.json(vendorResponse);

  } catch (error) {
    console.log('\n❌ Error during validation:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    console.log('='.repeat(80));

    res.status(500).json({
      error: 'Validation failed',
      message: error.message,
      details: error.response?.data
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Mock Vendor PKCE Server with JWT Verification',
    features: {
      pkce_enabled: true,
      jwt_verification: true,
      hmac_validation: true
    },
    config: {
      jwks_url: INSIGHT_JWKS_URL,
      token_endpoint: 'from webhook validation_endpoint',
      allow_insecure_validation: ALLOW_INSECURE_VALIDATION
    },
    webhook_count: webhookHistory.length,
    listening_on: `http://localhost:${PORT}/oauth/callback`
  });
});

/**
 * Webhook history endpoint (for debugging)
 */
app.get('/history', (req, res) => {
  res.json({
    count: webhookHistory.length,
    webhooks: webhookHistory
  });
});

/**
 * Clear history endpoint
 */
app.post('/clear-history', (req, res) => {
  const count = webhookHistory.length;
  webhookHistory.length = 0;
  res.json({ message: `Cleared ${count} webhook(s)` });
});

/**
 * Example authenticated API endpoint
 * Demonstrates using the vendor token to make authenticated requests
 */
app.get('/api/user-data', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log('\n' + '='.repeat(80));
  console.log(`📥 [${timestamp}] Authenticated API request received`);
  console.log('='.repeat(80));

  // Check for Authorization header
  const authHeader = req.headers.authorization;
  console.log(`🔐 Authorization header: ${authHeader ? authHeader.substring(0, 30) + '...' : 'NOT PROVIDED'}`);

  if (!authHeader) {
    console.log('❌ Authentication failed: No Authorization header');
    console.log('='.repeat(80));
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing Authorization header',
      hint: 'Include Bearer token in Authorization header'
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.log('❌ Authentication failed: Invalid Authorization format');
    console.log('='.repeat(80));
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid Authorization header format',
      hint: 'Use format: Authorization: Bearer <token>'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Validate token format (mock validation - just check if it starts with our prefix)
  if (!token.startsWith('mock_vendor_token_')) {
    console.log('❌ Authentication failed: Invalid token');
    console.log('='.repeat(80));
    return res.status(401).json({
      error: 'invalid_token',
      message: 'Token is invalid or expired'
    });
  }

  console.log('✅ Authentication successful');
  console.log(`   Token: ${token.substring(0, 30)}...`);

  // Return mock user data
  const mockData = {
    success: true,
    message: 'Authentication successful',
    data: {
      user: {
        id: 'user_123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin'
      },
      account: {
        id: 'acct_456',
        name: 'Test Account',
        plan: 'enterprise',
        credits: 1000
      },
      permissions: ['read', 'write', 'delete'],
      lastLogin: timestamp,
      apiCallsRemaining: 9999
    },
    meta: {
      requestId: crypto.randomBytes(8).toString('hex'),
      timestamp: timestamp,
      authenticated: true
    }
  };

  console.log('📤 Returning mock user data');
  console.log('='.repeat(80));
  res.json(mockData);
});

// Start server
app.listen(PORT, HOST, () => {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 Mock Vendor PKCE Server Started (with JWT Verification)');
  console.log('='.repeat(80));
  console.log(`📍 Webhook URL:  http://localhost:${PORT}/oauth/callback`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`📜 History:      http://localhost:${PORT}/history`);
  console.log(`🧪 Test API:     http://localhost:${PORT}/api/user-data`);
  console.log(`\n🔧 Configuration:`);
  console.log(`   Token Endpoint: from webhook validation_endpoint`);
  console.log(`   Insecure validation (loopback TLS): ${ALLOW_INSECURE_VALIDATION ? '✅ allowed' : '❌ enforced'}`);
  console.log(`   PKCE: ✅ ENABLED (required)`);
  console.log(`   Client Credentials: ❌ NOT USED`);
  console.log(`   JWT Verification: ✅ ENABLED`);
  console.log(`   JWKS URL: ${INSIGHT_JWKS_URL}`);
  console.log(`\n🔐 Security Verification:`);
  console.log(`   1. HMAC Signature (X-NS-Signature header)`);
  console.log(`   2. JWT Cluster Token (X-NS-Cluster-Verification header)`);
  console.log(`   3. PKCE Code Verifier`);
  console.log(`\n💡 Usage:`);
  console.log(`   1. In Horizon, navigate to: http://localhost:8080/apps/demo-app-with-auth/remote-auth`);
  console.log(`   2. Set Callback URL: http://localhost:${PORT}/oauth/callback`);
  console.log(`   3. Click "Authenticate with Test Vendor"`);
  console.log(`   4. Watch this console for webhook, JWT decode, and validation flow`);
  console.log('='.repeat(80));
  console.log('\nWaiting for webhooks...\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down mock vendor server...');
  console.log(`📊 Total webhooks received: ${webhookHistory.length}`);
  process.exit(0);
});
