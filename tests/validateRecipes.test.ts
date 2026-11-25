import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateRecipe, validateRecipes, validateWeekData } from '../src/lib/validateRecipes';
import type { Recipe, WeekData } from '../src/types/recipe';

const weekPath = resolve(process.cwd(), 'public/data/week-current.json');
const weekData = JSON.parse(readFileSync(weekPath, 'utf-8')) as WeekData;

describe('validateRecipes & seeded week-current.json', () => {
  it('validates week-current.json with zero issues across all 4 slots', () => {
    const result = validateWeekData(weekData);
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
    expect(weekData.recipes.length).toBeGreaterThanOrEqual(16);
    expect(weekData.planned_ids).toHaveLength(7);
    expect(weekData.breakfast_ids?.length).toBeGreaterThanOrEqual(2);
    expect(weekData.lunch_ids?.length).toBeGreaterThanOrEqual(2);
    expect(weekData.snack_ids?.length).toBeGreaterThanOrEqual(2);

    for (const r of weekData.recipes) {
      expect(['breakfast', 'lunch', 'snack', 'dinner']).toContain(r.meal_slot);
      expect(r.age_adaptations['6_9m'].cut_shape).toBeDefined();
    }
  });

  it('rejects non-metric units', () => {
    const badRecipe: Recipe = {
      ...weekData.recipes[0],
      id: 'bad-unit-recipe',
      ingredients: [
        {
          canonical_id: 'sweet_potato',
          name: 'Sweet potato',
          quantity: 2,
          unit: 'cup' as unknown as 'g',
          aisle: 'Produce',
          is_pantry_staple: false,
        },
      ],
    };
    const issues = validateRecipe(badRecipe);
    expect(issues.some((i) => i.rule === 'units')).toBe(true);
  });

  it('rejects honey when min_age_months < 12', () => {
    const badRecipe: Recipe = {
      ...weekData.recipes[0],
      id: 'honey-baby-recipe',
      min_age_months: 6,
      ingredients: [
        {
          canonical_id: 'honey',
          name: 'Raw honey',
          quantity: 1,
          unit: 'tbsp',
          aisle: 'Pantry',
          is_pantry_staple: true,
        },
      ],
    };
    const issues = validateRecipe(badRecipe);
    expect(issues.some((i) => i.rule === 'safety_honey')).toBe(true);
  });

  it('requires safe prep keyword for round choking hazards in infant brackets', () => {
    const baseWithTomato =
      weekData.recipes.find((r) =>
        r.ingredients.some((i) => i.canonical_id.includes('cherry_tomato')),
      ) ?? weekData.recipes[0];
    const badRecipe: Recipe = {
      ...baseWithTomato,
      id: 'unsafe-tomato-recipe',
      ingredients: [
        {
          canonical_id: 'cherry_tomatoes',
          name: 'Tomate cherry',
          quantity: 150,
          unit: 'g',
          aisle: 'Produce',
          is_pantry_staple: false,
        },
      ],
      age_adaptations: {
        ...baseWithTomato.age_adaptations,
        '6_9m': {
          cut_and_texture: 'Servir tomates inteiros ao lado.',
          serving_note: 'Sem sal adicionado.',
        },
      },
    };
    const issues = validateRecipe(badRecipe);
    expect(issues.some((i) => i.rule === 'safety_choking')).toBe(true);
  });

  it('rejects mixing weight and volume dimensions for the same canonical_id', () => {
    const r1: Recipe = { ...weekData.recipes[0], id: 'r-one' };
    const r2: Recipe = {
      ...weekData.recipes[1],
      id: 'r-two',
      ingredients: [
        {
          canonical_id: 'salmon_fillet',
          name: 'Salmon',
          quantity: 100,
          unit: 'ml',
          aisle: 'Meat & Fish',
          is_pantry_staple: false,
        },
      ],
    };
    const res = validateRecipes([r1, r2]);
    expect(res.valid).toBe(false);
    expect(res.issues.some((i) => i.rule === 'canonical_id')).toBe(true);
  });
});
