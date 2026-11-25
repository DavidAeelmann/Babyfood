import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  aggregateGroceries,
  getTotalHouseholdWeight,
  groupGroceriesByAisle,
} from '../src/lib/groceryAggregator';
import type { HouseholdConfig, WeekData } from '../src/types/recipe';

const weekPath = resolve(process.cwd(), 'public/data/week-current.json');
const weekData = JSON.parse(readFileSync(weekPath, 'utf-8')) as WeekData;

describe('groceryAggregator', () => {
  const initialPlanned = weekData.planned_ids.map(
    (id) => weekData.recipes.find((r) => r.id === id)!,
  );

  it('scales quantities differently when toggling 6_9m vs 2_4y', () => {
    const hhBaby: HouseholdConfig = {
      adults: 2,
      activeBrackets: ['6_9m'],
      excludedAllergens: [],
    };
    const hhToddler: HouseholdConfig = {
      adults: 2,
      activeBrackets: ['2_4y'],
      excludedAllergens: [],
    };

    expect(getTotalHouseholdWeight(hhBaby)).toBe(2.25);
    expect(getTotalHouseholdWeight(hhToddler)).toBe(2.55);

    const listBaby = aggregateGroceries(initialPlanned, hhBaby);
    const listToddler = aggregateGroceries(initialPlanned, hhToddler);

    const spBaby = listBaby.find((i) => i.canonical_id === 'sweet_potato')!;
    const spToddler = listToddler.find((i) => i.canonical_id === 'sweet_potato')!;
    expect(spToddler.quantity).toBeGreaterThan(spBaby.quantity);
  });

  it('merges overlapping canonical_id ingredients with zero duplicates and normalizes tbsp/tsp to ml', () => {
    const hh: HouseholdConfig = {
      adults: 2,
      activeBrackets: ['6_9m', '2_4y'],
      excludedAllergens: [],
    };
    const items = aggregateGroceries(initialPlanned, hh);
    const keys = items.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);

    // olive_oil is in tbsp across all 7 recipes; should normalize to a single ml entry
    const oliveOils = items.filter((i) => i.canonical_id === 'olive_oil');
    expect(oliveOils).toHaveLength(1);
    expect(oliveOils[0].unit).toBe('ml');
    expect(oliveOils[0].quantity).toBeGreaterThan(0);

    // Grouping by aisle preserves all items
    const grouped = groupGroceriesByAisle(items);
    const totalGrouped = grouped.reduce((acc, g) => acc + g.items.length, 0);
    expect(totalGrouped).toBe(items.length);
  });

  it('recalculates cleanly with zero duplicates when swapping a meal', () => {
    const hh: HouseholdConfig = {
      adults: 2,
      activeBrackets: ['6_9m'],
      excludedAllergens: [],
    };
    const swappedPlan = [...initialPlanned];
    swappedPlan[0] = weekData.recipes.find((r) => r.id === 'beef-lentil-bolognese')!;

    const items = aggregateGroceries(swappedPlan, hh);
    const ids = items.map((i) => i.canonical_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(items.some((i) => i.canonical_id === 'ground_beef')).toBe(true);
  });
});
