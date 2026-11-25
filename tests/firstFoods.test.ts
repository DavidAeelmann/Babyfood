import { describe, expect, it } from 'vitest';
import {
  FIRST_FOODS_CATALOG,
  TOP_9_ALLERGENS,
  getTriedAllergenExposures,
} from '../src/lib/firstFoods';
import { parseStepTimers } from '../src/lib/stepTimers';

describe('100 First Foods & Top-9 Allergens Tracker', () => {
  it('contains exactly 100 unique curated first foods and all Top-9 allergens', () => {
    expect(FIRST_FOODS_CATALOG).toHaveLength(100);
    const ids = new Set(FIRST_FOODS_CATALOG.map((f) => f.id));
    expect(ids.size).toBe(100);
    expect(TOP_9_ALLERGENS).toHaveLength(9);
    expect(TOP_9_ALLERGENS).toContain('sesame');
  });

  it('calculates 3-day allergen exposure counts across tried foods', () => {
    const exposures = getTriedAllergenExposures({
      egg: { exposures: 2 },
      tahini_sesame: { exposures: 3 },
      salmon: { exposures: 1 },
    });

    expect(exposures.egg).toBe(2);
    expect(exposures.sesame).toBe(3);
    expect(exposures.fish).toBe(1);
    expect(exposures.peanut).toBe(0);
  });
});

describe('parseStepTimers', () => {
  it('extracts single and range minute durations cleanly', () => {
    const timers = parseStepTimers(
      'Roast 15 minutes, then bake 10–12 minutes until golden.',
      2,
    );
    expect(timers).toHaveLength(2);
    expect(timers[0]).toMatchObject({ label: '15 min', seconds: 900 });
    expect(timers[1]).toMatchObject({ label: '10–12 min', seconds: 720 });
  });
});
