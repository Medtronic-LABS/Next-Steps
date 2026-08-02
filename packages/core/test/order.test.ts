import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { decorate, orderSection } from '../src/logic';
import type { WorkStep } from '../src/types';

describe('TC-ORDER-001 — BR-014 overdue section ordering', () => {
  it('orders SEED overdue steps exactly Ramesh Kulkarni, Iqbal Khan, Sunita Rao', async () => {
    const engine = new InMemoryCoordinationEngine();
    const sections = await engine.sections('all');
    expect(sections.overdue.map((s) => ({ name: s.name, priority: s.priority, over: s.over }))).toEqual([
      { name: 'Ramesh Kulkarni', priority: 'HIGH', over: 8 },
      { name: 'Iqbal Khan', priority: 'NORMAL', over: 6 },
      { name: 'Sunita Rao', priority: 'NORMAL', over: 5 },
    ]);
  });
});

describe('TC-ORDER-002 — BR-014 overdue tie-break is deterministic', () => {
  const step = (name: string, id: string): WorkStep => ({
    id,
    pid: id,
    name,
    cat: 'FOLLOW_UP_VISIT',
    detail: '',
    due: '1 Jul',
    over: 4,
    priority: 'NORMAL',
    delivery: '—',
    attempts: 0,
    section: 'overdue',
    status: 'SCHEDULED',
  });

  it('places Aarti Bose before Zoya Khan regardless of input order', () => {
    const zoya = decorate(step('Zoya Khan', 'z1'));
    const aarti = decorate(step('Aarti Bose', 'a1'));

    expect(orderSection([zoya, aarti]).map((s) => s.name)).toEqual(['Aarti Bose', 'Zoya Khan']);
    expect(orderSection([aarti, zoya]).map((s) => s.name)).toEqual(['Aarti Bose', 'Zoya Khan']);
  });
});
