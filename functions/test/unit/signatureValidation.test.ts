import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySignature } from '../../src/webhook/signatureValidation.js';

const APP_SECRET = 'test-app-secret';

function sign(body: Buffer, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('verifySignature (spec §15 webhook authenticity)', () => {
  it('accepts a correctly signed body', () => {
    const body = Buffer.from(JSON.stringify({ hello: 'world' }));
    expect(verifySignature(body, sign(body, APP_SECRET), APP_SECRET)).toBe(true);
  });

  it('rejects a body signed with the wrong secret', () => {
    const body = Buffer.from(JSON.stringify({ hello: 'world' }));
    expect(verifySignature(body, sign(body, 'wrong-secret'), APP_SECRET)).toBe(false);
  });

  it('rejects a tampered body whose signature no longer matches', () => {
    const original = Buffer.from(JSON.stringify({ hello: 'world' }));
    const signature = sign(original, APP_SECRET);
    const tampered = Buffer.from(JSON.stringify({ hello: 'mallory' }));
    expect(verifySignature(tampered, signature, APP_SECRET)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    const body = Buffer.from(JSON.stringify({ hello: 'world' }));
    expect(verifySignature(body, undefined, APP_SECRET)).toBe(false);
  });

  it('rejects a header missing the sha256= prefix', () => {
    const body = Buffer.from(JSON.stringify({ hello: 'world' }));
    const raw = createHmac('sha256', APP_SECRET).update(body).digest('hex');
    expect(verifySignature(body, raw, APP_SECRET)).toBe(false);
  });
});
