import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';

// PRD §15, §10.1 (ITEM-5-TEST-CASES.md TC-ID-001). Sequential ids leak
// enrolment counts across a deployment; ids derived from the mobile number
// put a phone number into every log line, Kafka partition key and dedup
// table downstream. The current uid() helper (inMemoryEngine.ts) produces
// `pat-<base36 timestamp>-<counter>` — readable, sequential and time-derived,
// none of which is a UUID.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('TC-ID-001 — patient ids are opaque UUIDs (EXPECTED FAIL)', () => {
  it('assigns a well-formed, unrelated UUID to each patient registered in succession', async () => {
    const engine = new InMemoryCoordinationEngine();

    const first = await engine.createPatient({
      name: 'Ramesh Kulkarni',
      mobile: '98450 12210',
      gender: 'Male',
      age: 58,
      cid: 'TC-ID-001-A',
      consent: true,
    });

    const second = await engine.createPatient({
      name: 'Sunita Rao',
      mobile: '90080 33344',
      gender: 'Female',
      age: 42,
      cid: 'TC-ID-001-B',
      consent: true,
    });

    expect(first.id, 'patient id must be a well-formed UUID').toMatch(UUID_V4);
    expect(second.id, 'patient id must be a well-formed UUID').toMatch(UUID_V4);
    expect(first.id, 'two patients registered in succession must have unrelated ids').not.toBe(second.id);

    const mobileDigits = first.mobile.replace(/\D/g, '');
    expect(
      first.id.replace(/\D/g, '').includes(mobileDigits),
      'id must not be derived from the mobile number',
    ).toBe(false);

    const nameSlug = first.name.toLowerCase().replace(/[^a-z]/g, '');
    expect(
      first.id.toLowerCase().replace(/[^a-z]/g, '').includes(nameSlug),
      'id must not be derived from the name',
    ).toBe(false);
  });
});
