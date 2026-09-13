import { config } from '../config.js';

interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

let tokenCache: CachedToken | null = null;

/**
 * Retrieves an active OAuth2 Bearer token from Keycloak for the CCE Gateway.
 * Automatically caches and refreshes the token before expiry.
 */
export async function getCceAccessToken(): Promise<string> {
  const now = Date.now();

  // If token exists and has at least 60 seconds of validity left, reuse it
  if (tokenCache && tokenCache.expiresAt - now > 60 * 1000) {
    return tokenCache.accessToken;
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', config.cce.clientId);
  params.append('client_secret', config.cce.clientSecret);

  try {
    const response = await fetch(config.cce.keycloakTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Keycloak token request failed: HTTP ${response.status} - ${errText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      token_type: string;
    };

    tokenCache = {
      accessToken: data.access_token,
      expiresAt: now + (data.expires_in * 1000),
    };

    console.log(`[CCE Auth] Successfully fetched new Bearer token (valid for ${data.expires_in}s)`);
    return tokenCache.accessToken;
  } catch (error) {
    console.error('[CCE Auth] Error obtaining Keycloak token:', error);
    throw error;
  }
}

/**
 * Checks connection health to Keycloak token endpoint
 */
export async function checkKeycloakHealth(): Promise<{ status: 'UP' | 'DOWN'; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await getCceAccessToken();
    return { status: 'UP', latencyMs: Date.now() - start };
  } catch (err: any) {
    return { status: 'DOWN', latencyMs: Date.now() - start, error: err.message };
  }
}
