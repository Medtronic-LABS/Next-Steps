import { getDb, Collections } from '../domain/firestore.js';
import { HYPERTENSION_COHORT_PATIENTS, SEED_FACILITIES, SEED_PATIENTS, SEED_USERS } from './seed.js';

/**
 * Seeds the deterministic fixtures into whatever Firestore `getDb()` currently
 * points at — the emulator during local dev/tests (FIRESTORE_EMULATOR_HOST),
 * or a real project if that env var is unset. Safe to re-run (upserts).
 *
 * `withHypertensionCohort` adds Ramesh Kumar (addendum §17's
 * condition-neutrality proof) — off by default since golden conversation
 * tests assume exactly one patient exists.
 */
export async function loadFixtures(opts: { withHypertensionCohort?: boolean } = {}): Promise<void> {
  const db = getDb();
  const batch = db.batch();

  for (const facility of SEED_FACILITIES) {
    batch.set(db.collection(Collections.facilities).doc(facility.id), facility);
  }
  for (const user of SEED_USERS) {
    batch.set(db.collection(Collections.users).doc(user.id), user);
  }
  const patients = opts.withHypertensionCohort ? [...SEED_PATIENTS, ...HYPERTENSION_COHORT_PATIENTS] : SEED_PATIENTS;
  for (const patient of patients) {
    batch.set(db.collection(Collections.patients).doc(patient.id), patient);
  }

  await batch.commit();
}

const isMain = process.argv[1]?.endsWith('loadFixtures.ts') || process.argv[1]?.endsWith('loadFixtures.js');
if (isMain) {
  loadFixtures()
    .then(() => {
      console.log('Fixtures loaded.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to load fixtures:', err);
      process.exit(1);
    });
}
