import React, { useState } from 'react';

interface RemoteAuthDemoProps {
  horizonContext: {
    auth: {
      requestRemoteAuth: (
        request: {
          vendorId: string;
          callbackUrl: string;
          scopes?: string[];
        },
        options?: { timeout?: number }
      ) => Promise<{
        vendorId: string;
        accessToken: string;
        tokenType?: string;
        expiresAt?: number;
      }>;
      getRemoteAuthToken: (vendorId: string) => {
        vendorId: string;
        accessToken: string;
        tokenType?: string;
        expiresAt?: number;
      } | null;
      clearRemoteAuthToken: (vendorId: string) => void;
    };
    ui?: {
      Button?: React.ComponentType<unknown>;
      Typography?: React.ComponentType<unknown>;
      Paper?: React.ComponentType<unknown>;
      Stack?: React.ComponentType<unknown>;
      Alert?: React.ComponentType<unknown>;
    };
  };
}

export default function RemoteAuthDemo({ horizonContext }: RemoteAuthDemoProps) {
  const { auth, ui } = horizonContext;
  const [status, setStatus] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const Button = ui?.Button || 'button';
  const Typography = ui?.Typography || 'p';
  const Paper = ui?.Paper || 'div';
  const Stack = ui?.Stack || 'div';
  const Alert = ui?.Alert || 'div';

  const handleAuth = async () => {
    setStatus('');
    setToken('');
    setIsLoading(true);

    try {
      setStatus('Authenticating with vendor...');

      const response = await auth.requestRemoteAuth(
        {
          vendorId: 'test-vendor',
          callbackUrl: 'https://example.com/oauth/callback',
          scopes: ['read', 'write'],
        },
        { timeout: 90000 }
      );

      setToken(response.accessToken);
      setStatus('Authentication successful!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`Authentication failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearToken = () => {
    auth.clearRemoteAuthToken('test-vendor');
    setToken('');
    setStatus('Token cleared');
  };

  const existingToken = auth.getRemoteAuthToken('test-vendor');

  return (
    <Paper style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <Stack spacing={3}>
        <Typography variant="h4">Remote Authentication Demo</Typography>

        <Typography variant="body1">
          This demo shows how SDK apps can authenticate with third-party vendors using the remote
          authentication flow.
        </Typography>

        <Stack spacing={2}>
          <Button
            variant="contained"
            onClick={handleAuth}
            disabled={isLoading}
            style={{ width: 'fit-content' }}
          >
            {isLoading ? 'Authenticating...' : 'Authenticate with Test Vendor'}
          </Button>

          {existingToken && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleClearToken}
              disabled={isLoading}
              style={{ width: 'fit-content' }}
            >
              Clear Cached Token
            </Button>
          )}
        </Stack>

        {status && (
          <Alert severity={status.includes('failed') ? 'error' : 'success'}>{status}</Alert>
        )}

        {token && (
          <Paper style={{ padding: '16px', backgroundColor: '#f5f5f5' }}>
            <Typography variant="subtitle2" style={{ marginBottom: '8px' }}>
              Access Token:
            </Typography>
            <Typography
              variant="body2"
              style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
            >
              {token.substring(0, 40)}...
            </Typography>
          </Paper>
        )}

        {existingToken && !token && (
          <Alert severity="info">
            <Typography variant="body2">
              Cached token available for test-vendor
              <br />
              Expires: {existingToken.expiresAt ? new Date(existingToken.expiresAt * 1000).toLocaleString() : 'Never'}
            </Typography>
          </Alert>
        )}

        <Paper style={{ padding: '16px', backgroundColor: '#f0f7ff' }}>
          <Typography variant="subtitle2" style={{ marginBottom: '8px' }}>
            How it works:
          </Typography>
          <Typography variant="body2" component="div">
            <ol style={{ paddingLeft: '20px', margin: 0 }}>
              <li>SDK app calls auth.requestRemoteAuth()</li>
              <li>Horizon generates authcode and sends to vendor webhook</li>
              <li>Vendor validates authcode with NetSapiens API</li>
              <li>Vendor returns their access token</li>
              <li>SDK app receives token for vendor API calls</li>
            </ol>
          </Typography>
        </Paper>
      </Stack>
    </Paper>
  );
}
