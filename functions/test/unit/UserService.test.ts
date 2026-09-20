import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA } from '../../src/fixtures/seed.js';
import { getDb, Collections } from '../../src/domain/firestore.js';
import { resolveUser } from '../../src/domain/UserService.js';

describe('UserService.resolveUser', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('resolves a seeded active number', async () => {
    const user = await resolveUser(ANITA.phoneNumber);
    expect(user?.id).toBe(ANITA.id);
  });

  it('returns null for an unregistered number (spec §11)', async () => {
    const user = await resolveUser('+911111111111');
    expect(user).toBeNull();
  });

  it('returns null for a registered but inactive user', async () => {
    await getDb().collection(Collections.users).doc(ANITA.id).update({ status: 'INACTIVE' });
    const user = await resolveUser(ANITA.phoneNumber);
    expect(user).toBeNull();
  });
});
