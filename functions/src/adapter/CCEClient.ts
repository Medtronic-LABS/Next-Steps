/**
 * CCE (Care Coordination Engine) delivery client — mirrors the
 * WhatsAppClient real/mock split (adapter/WhatsAppClient.ts). No real CCE
 * endpoint exists for this synthetic MVP yet (spec §14 describes the outbox
 * pattern but not a concrete CCE API), so the "real" client is a thin HTTP
 * POST behind an opt-in URL/API-key secret, and defaults to the mock
 * everywhere else — including a real deploy with no CCE configured, so the
 * consumer never crashes a scheduled run over a partner that doesn't exist
 * yet.
 */
export interface CCEClient {
  send(payload: Record<string, unknown>): Promise<void>;
}

export class HttpCCEClient implements CCEClient {
  constructor(
    private readonly endpointUrl: string,
    private readonly apiKey: string,
  ) {}

  async send(payload: Record<string, unknown>): Promise<void> {
    const res = await fetch(this.endpointUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`CCE send failed (${res.status}): ${text}`);
    }
  }
}

/** Records every send in memory — used in the emulator, in tests, and when no real CCE endpoint is configured. */
export class MockCCEClient implements CCEClient {
  public readonly sent: Record<string, unknown>[] = [];

  async send(payload: Record<string, unknown>): Promise<void> {
    this.sent.push(payload);
  }

  reset(): void {
    this.sent.length = 0;
  }
}

let sharedMock: MockCCEClient | undefined;

export function getCCEClient(): CCEClient {
  const endpointUrl = process.env.CCE_ENDPOINT_URL;
  const apiKey = process.env.CCE_API_KEY;
  if (endpointUrl && apiKey) {
    return new HttpCCEClient(endpointUrl, apiKey);
  }
  if (!sharedMock) sharedMock = new MockCCEClient();
  return sharedMock;
}
