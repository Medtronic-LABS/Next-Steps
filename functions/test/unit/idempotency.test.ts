import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { claimMessageId } from '../../src/webhook/idempotency.js';

describe('claimMessageId', () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  it('claims a new message id and reports later claims as duplicates (spec §15/§18)', async () => {
    const first = await claimMessageId('wamid.ABC123');
    expect(first).toBe(false); // not a duplicate — proceed

    const second = await claimMessageId('wamid.ABC123');
    expect(second).toBe(true); // duplicate — caller must skip domain execution

    const different = await claimMessageId('wamid.XYZ789');
    expect(different).toBe(false);
  });
});
