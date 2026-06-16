import { useState, useMemo } from 'react';
import type { HorizonContext } from '@netsapiens/horizon-sdk';

interface RemoteAuthDemoProps {
  horizonContext: HorizonContext;
}

export default function RemoteAuthDemo({ horizonContext }: RemoteAuthDemoProps) {
  // Automatically use app ID as vendor ID
  const vendorId = horizonContext.appId || 'demo-app-with-auth';

  const [callbackUrl, setCallbackUrl] = useState('https://sdk.nseng.dev/mock-server/oauth/callback');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<any>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [apiRequest, setApiRequest] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setDebugLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleAuthenticate = async () => {
    setLoading(true);
    setStatus('Initiating remote authentication...');
    setToken(null);
    setDebugLogs([]);
    setApiRequest(null);

    const requestPayload = {
      vendorId,
      callbackUrl,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    // Store API request details for display
    setApiRequest({
      method: 'POST',
      endpoint: '/ns-api/v2/oauth2/remote-auth/initiate',
      body: requestPayload,
    });

    addDebugLog('🚀 Starting remote authentication flow');
    addDebugLog(`📍 Vendor ID: ${vendorId}`);
    addDebugLog(`🔗 Callback URL: ${callbackUrl}`);

    try {
      addDebugLog('📤 Sending request to NetSapiens API...');

      const response = await horizonContext.auth.requestRemoteAuth(
        requestPayload,
        { timeout: 90000 }
      );

      addDebugLog('✅ Received response from API');
      addDebugLog(`🎫 Access Token: ${response.accessToken?.substring(0, 20)}...`);
      addDebugLog(`⏰ Expires At: ${response.expiresAt ? new Date(response.expiresAt * 1000).toLocaleString() : 'N/A'}`);

      console.log('Received token response from remote auth:', response);
      setToken(response);
      setStatus('✅ Authentication successful!');
      addDebugLog('💾 Token stored in localStorage');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Error: ${errorMsg}`);
      setStatus(`❌ Error: ${errorMsg}`);
      console.error('Remote auth failed:', error);
    } finally {
      setLoading(false);
      addDebugLog('🏁 Authentication flow completed');
    }
  };

  const handleCheckToken = () => {
    const cachedToken = horizonContext.auth.getRemoteAuthToken(vendorId);
    if (cachedToken) {
      setToken(cachedToken);
      setStatus('✅ Found cached token');
    } else {
      setStatus('❌ No cached token found');
      setToken(null);
    }
  };

  const handleClearToken = () => {
    horizonContext.auth.clearRemoteAuthToken(vendorId);
    setToken(null);
    setStatus('🗑️ Token cleared from cache');
    setTestResult(null);
  };

  const handleTestAuthenticatedRequest = async () => {
    setTestLoading(true);
    setTestResult(null);

    const testEndpoint = 'https://sdk.nseng.dev/mock-server/api/user-data';

    try {
      addDebugLog('🧪 Testing authenticated API request...');
      addDebugLog(`📍 Endpoint: ${testEndpoint}`);

      if (!token || !token.accessToken) {
        addDebugLog('❌ No access token available');
        setTestResult({
          success: false,
          error: 'No token available. Please authenticate first.',
          status: null,
        });
        setTestLoading(false);
        return;
      }

      addDebugLog(`🔑 Using token: ${token.accessToken.substring(0, 20)}...`);

      const response = await fetch(testEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      addDebugLog(`📥 Response status: ${response.status} ${response.statusText}`);

      const data = await response.json();

      if (response.ok) {
        addDebugLog('✅ Authenticated request successful');
        setTestResult({
          success: true,
          status: response.status,
          data: data,
        });
      } else {
        addDebugLog(`❌ Request failed: ${data.message || data.error}`);
        setTestResult({
          success: false,
          status: response.status,
          error: data.message || data.error,
          data: data,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Request error: ${errorMsg}`);
      setTestResult({
        success: false,
        error: errorMsg,
        status: null,
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Remote Authentication Demo</h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Test the remote authentication flow with third-party vendors. This allows the SDK app to
        request access tokens from external services.
      </p>

      {/* Configuration Form */}
      <div style={{ marginBottom: '32px', maxWidth: '600px' }}>
        <h2>Configuration</h2>

        {/* Auto-configured values (read-only display) */}
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            border: '1px solid #e0e0e0',
          }}
        >
          <div>
            <strong style={{ fontSize: '12px', color: '#666' }}>Vendor ID (auto):</strong>{' '}
            <code style={{ fontSize: '13px', color: '#1976d2' }}>{vendorId}</code>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label
            style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}
          >
            Callback URL
          </label>
          <input
            type="text"
            value={callbackUrl}
            onChange={(e) => setCallbackUrl(e.target.value)}
            placeholder="https://sdk.nseng.dev/mock-server/oauth/callback"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
          <small style={{ color: '#666', fontSize: '12px' }}>
            Vendor's webhook URL (must be in allowed_hostnames)
          </small>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginBottom: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={handleAuthenticate}
          disabled={loading || !callbackUrl}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {loading ? 'Authenticating...' : 'Authenticate with Vendor'}
        </button>

        <button
          onClick={handleCheckToken}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#fff',
            color: '#1976d2',
            border: '1px solid #1976d2',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Check Cached Token
        </button>

        <button
          onClick={handleClearToken}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#fff',
            color: '#d32f2f',
            border: '1px solid #d32f2f',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Clear Token
        </button>

        <button
          onClick={handleTestAuthenticatedRequest}
          disabled={loading || testLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: testLoading ? '#ccc' : '#fff',
            color: '#2e7d32',
            border: '1px solid #2e7d32',
            borderRadius: '4px',
            cursor: testLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {testLoading ? 'Testing...' : '🧪 Test Authenticated Request'}
        </button>
      </div>

      {/* Status */}
      {status && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: status.includes('✅') ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${status.includes('✅') ? '#4caf50' : '#f44336'}`,
            borderRadius: '4px',
            marginBottom: '24px',
            fontSize: '14px',
          }}
        >
          <strong>Status:</strong> {status}
        </div>
      )}

      {/* API Request Details */}
      {apiRequest && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>API Request</h3>
          <div
            style={{
              backgroundColor: '#f5f5f5',
              padding: '16px',
              borderRadius: '4px',
              border: '1px solid #ddd',
            }}
          >
            <div
              style={{
                marginBottom: '12px',
                padding: '8px 12px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#856404',
              }}
            >
              <strong>🔐 Authentication:</strong> User identity and scope are automatically included via
              session token in HTTP cookie
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '13px', color: '#666' }}>Method:</strong>{' '}
              <code
                style={{
                  backgroundColor: '#fff',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '13px',
                  color: '#1976d2',
                }}
              >
                {apiRequest.method}
              </code>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '13px', color: '#666' }}>Endpoint:</strong>{' '}
              <code
                style={{
                  backgroundColor: '#fff',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '13px',
                  color: '#1976d2',
                }}
              >
                {apiRequest.endpoint}
              </code>
            </div>
            <div>
              <strong style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '8px' }}>
                Request Body:
              </strong>
              <pre
                style={{
                  backgroundColor: '#fff',
                  padding: '12px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                  margin: 0,
                  border: '1px solid #e0e0e0',
                }}
              >
                {JSON.stringify(apiRequest.body, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Debug Logs */}
      {debugLogs.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Debug Log</h3>
          <div
            style={{
              backgroundColor: '#1e1e1e',
              padding: '16px',
              borderRadius: '4px',
              border: '1px solid #333',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#d4d4d4',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {debugLogs.map((log, index) => (
              <div key={index} style={{ marginBottom: '4px', lineHeight: '1.5' }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token Display */}
      {token && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Received Token</h3>
          <pre
            style={{
              backgroundColor: '#f5f5f5',
              padding: '16px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
              border: '1px solid #ddd',
            }}
          >
            {JSON.stringify(token, null, 2)}
          </pre>
        </div>
      )}

      {/* Test Request Result */}
      {testResult && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>
            {testResult.success ? '✅ Authenticated Request Successful' : '❌ Authenticated Request Failed'}
          </h3>
          <div
            style={{
              backgroundColor: testResult.success ? '#e8f5e9' : '#ffebee',
              padding: '16px',
              borderRadius: '4px',
              border: `1px solid ${testResult.success ? '#4caf50' : '#f44336'}`,
              marginBottom: '16px',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <strong>Status:</strong>{' '}
              <code
                style={{
                  backgroundColor: '#fff',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '13px',
                }}
              >
                {testResult.status || 'Network Error'}
              </code>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Endpoint:</strong>{' '}
              <code style={{ fontSize: '12px' }}>GET https://sdk.nseng.dev/mock-server/api/user-data</code>
            </div>
            <div>
              <strong>Authorization:</strong>{' '}
              <code style={{ fontSize: '12px' }}>
                Bearer {token?.accessToken?.substring(0, 20)}...
              </code>
            </div>
          </div>
          <div>
            <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>Response Body:</h4>
            <pre
              style={{
                backgroundColor: '#f5f5f5',
                padding: '16px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
                border: '1px solid #ddd',
              }}
            >
              {JSON.stringify(testResult.data || { error: testResult.error }, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Documentation */}
      <div style={{ marginTop: '48px', padding: '24px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h2>How It Works</h2>
        <ol style={{ lineHeight: '1.8' }}>
          <li>
            <strong>App Configuration:</strong> The app must have <code>remote_auth_enabled='yes'</code> and
            valid <code>allowed_hostnames</code> in the database
          </li>
          <li>
            <strong>SDK Request:</strong> App calls <code>horizonContext.auth.requestRemoteAuth()</code>
          </li>
          <li>
            <strong>Validation:</strong> Horizon validates the callback URL against allowed_hostnames
          </li>
          <li>
            <strong>Authcode Generation:</strong> API generates a temporary authorization code
          </li>
          <li>
            <strong>Webhook:</strong> API POSTs authcode to vendor's callback URL with HMAC signature
          </li>
          <li>
            <strong>Vendor Validation:</strong> Vendor validates the authcode via <code>/oauth2/token</code>
          </li>
          <li>
            <strong>Token Response:</strong> Vendor returns their access token synchronously
          </li>
          <li>
            <strong>Token Storage:</strong> Horizon stores the token in localStorage (scoped to appId:vendorId)
          </li>
        </ol>

        <h3 style={{ marginTop: '24px' }}>Prerequisites</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li>App must have <code>remote-auth:request</code> permission in manifest</li>
          <li>Database must have remote auth columns configured for this app</li>
          <li>Vendor must implement webhook endpoint that validates authcodes</li>
          <li>Vendor webhook URL must be in the app's <code>allowed_hostnames</code> list</li>
        </ul>

        <h3 style={{ marginTop: '24px' }}>Testing Locally</h3>
        <p>
          To test without a real vendor, you can use a tool like{' '}
          <a href="https://webhook.site" target="_blank" rel="noopener noreferrer">
            webhook.site
          </a>{' '}
          to capture the webhook payload, or set up a local mock server that returns a test token.
        </p>
      </div>
    </div>
  );
}
