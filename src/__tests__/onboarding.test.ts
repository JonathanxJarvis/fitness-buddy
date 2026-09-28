import { describe, expect, it } from '@jest/globals';
import { PEP, SLEEP, planForDays, splitForDays } from '@/components/onboarding/script';

describe('onboarding starter plan', () => {
  it('maps days a week to a split', () => {
    expect(splitForDays(2)).toBe('full3');
    expect(splitForDays(3)).toBe('full3');
    expect(splitForDays(4)).toBe('ul');
    expect(splitForDays(5)).toBe('bro');
    expect(splitForDays(6)).toBe('ppl');
  });

  it('trains exactly the chosen number of days', () => {
    for (const d of [2, 3, 4, 5, 6]) {
      const plan = planForDays(d, '2026-09-28');
      expect(plan.week).toHaveLength(7);
      expect(plan.week.filter(Boolean)).toHaveLength(d);
      expect(plan.since).toBe('2026-09-28');
    }
  });

  it('has a pep line for every step and sleep options in order', () => {
    for (const k of ['hello', 'petName', 'body', 'activity', 'goal', 'motivation', 'experience', 'days', 'obstacle', 'sleep', 'plan']) {
      expect(PEP[k]?.length).toBeGreaterThan(0);
    }
    expect(SLEEP.map((s) => s.key)).toEqual([5, 6, 7, 8, 9]);
  });
});
