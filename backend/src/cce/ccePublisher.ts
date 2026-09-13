import { config } from '../config.js';
import { getCceAccessToken } from './cceAuth.js';
import { CloudEventPayload } from './cceTransformer.js';

export interface CceIngestResult {
  success: boolean;
  httpStatus: number;
  data?: {
    eventId: string;
    cloudEventsId: string;
    status: 'accepted' | 'duplicate';
    correlationId: string;
    receivedAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Publishes a CloudEvents 1.0 envelope directly to the CCE Gateway.
 */
export async function publishEventToCce(event: CloudEventPayload): Promise<CceIngestResult> {
  const token = await getCceAccessToken();

  try {
    const response = await fetch(config.cce.gatewayUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    const responseText = await response.text();
    let jsonBody: any;
    try {
      jsonBody = JSON.parse(responseText);
    } catch {
      jsonBody = { raw: responseText };
    }

    if (response.status === 202 || response.status === 200) {
      return {
        success: true,
        httpStatus: response.status,
        data: jsonBody.data,
      };
    } else {
      return {
        success: false,
        httpStatus: response.status,
        error: jsonBody.error || { code: `HTTP_${response.status}`, message: responseText },
      };
    }
  } catch (error: any) {
    console.error(`[CCE Publisher] Network error sending event ${event.id}:`, error);
    return {
      success: false,
      httpStatus: 0,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || 'Unknown network error connecting to CCE Gateway',
      },
    };
  }
}

/**
 * Checks connectivity to the CCE Gateway actuator health endpoint
 */
export async function checkGatewayHealth(): Promise<{ status: 'UP' | 'DOWN'; latencyMs: number; details?: any }> {
  const start = Date.now();
  try {
    const healthUrl = config.cce.gatewayUrl.replace('/v1/events', '/actuator/health');
    const res = await fetch(healthUrl, { method: 'GET' });
    const latencyMs = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      return { status: 'UP', latencyMs, details: data };
    }
    return { status: 'DOWN', latencyMs, details: `HTTP ${res.status}` };
  } catch (err: any) {
    return { status: 'DOWN', latencyMs: Date.now() - start, details: err.message };
  }
}
