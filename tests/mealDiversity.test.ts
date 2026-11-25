import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  classifyIngredientForDiversity,
  countWeekIngredientFrequency,
  scoreDiversityPenalty,
  selectDiverseSlotIds,
  type WeekPlanEntry,
} from '../src/lib/mealDiversity';
import type { Recipe, WeekData } from '../src/types/recipe';

function makeTestRecipe(
  id: string,
  title: string,
  mealSlot: Recipe['meal_slot'],
  ingredients: Array<{ canonical_id: string; name?: string; is_pantry_staple?: boolean }>,
): Recipe {
  return {
    id,
    title,
    image_url: `meals/${id}.webp`,
    meal_slot: mealSlot,
    prep_minutes: 10,
    cook_minutes: 20,
    base_servings: 4,
    min_age_months: 6,
    allergens: [],
    ingredients: ingredients.map((ing) => ({
      canonical_id: ing.canonical_id,
      name: ing.name ?? ing.canonical_id,
      quantity: 100,
      unit: 'g',
      aisle: 'Produce',
      is_pantry_staple: ing.is_pantry_staple ?? false,
    })),
    steps: [
      { order: 1, text: 'Cozinhar.', is_seasoning_split_point: true },
    ],
    age_adaptations: {
      '6_9m': { cut_and_texture: 'Puré', serving_note: 'Ok' },
      '9_12m': { cut_and_texture: 'Cubos', serving_note: 'Ok' },
      '12_24m': { cut_and_texture: 'Cubos', serving_note: 'Ok' },
      '2_4y': { cut_and_texture: 'Normal', serving_note: 'Ok' },
      '4y_plus': { cut_and_texture: 'Familiar', serving_note: 'Ok' },
    },
  };
}

describe('mealDiversity culinary rules', () => {
  it('treats garlic, onion, olive oil as unlimited base staples and keeps rice varieties distinct', () => {
    expect(classifyIngredientForDiversity('garlic_clove').tier).toBe('base_staple');
    expect(classifyIngredientForDiversity('olive_oil').tier).toBe('base_staple');
    expect(classifyIngredientForDiversity('yellow_onion').tier).toBe('base_staple');

    const carolino = classifyIngredientForDiversity('carolino_rice');
    const basmati = classifyIngredientForDiversity('basmati_rice');
    expect(carolino.tier).toBe('flexible_staple');
    expect(basmati.tier).toBe('flexible_staple');
    expect(carolino.key).not.toBe(basmati.key);

    expect(classifyIngredientForDiversity('sweet_potato').tier).toBe('distinctive_ingredient');
    expect(classifyIngredientForDiversity('hake_fillet').key).toBe('hake');
    expect(classifyIngredientForDiversity('hake_white_fish', 'Lombos de pescada').key).toBe('hake');
    expect(
      classifyIngredientForDiversity(
        'hake_white_fish',
        'Cubos de tamboril',
        'Arroz de Tamboril com Coentros',
      ).key,
    ).toBe('monkfish');
  });

  it('allows repeating garlic/olive oil and using different rices cleanly while penalizing rare ingredient repeats', () => {
    const carolinoChicken = makeTestRecipe('carolino-chicken', 'Arroz Carolino de Frango', 'dinner', [
      { canonical_id: 'chicken_thigh' },
      { canonical_id: 'carolino_rice' },
      { canonical_id: 'garlic_clove', is_pantry_staple: true },
      { canonical_id: 'olive_oil', is_pantry_staple: true },
    ]);
    const basmatiBeef = makeTestRecipe('basmati-beef', 'Carne com Arroz Basmati', 'dinner', [
      { canonical_id: 'lean_beef' },
      { canonical_id: 'basmati_rice' },
      { canonical_id: 'garlic_clove', is_pantry_staple: true },
      { canonical_id: 'olive_oil', is_pantry_staple: true },
    ]);
    const hakeSweetPotato1 = makeTestRecipe('hake-sp-1', 'Pescada com Batata-Doce', 'dinner', [
      { canonical_id: 'hake_fillet' },
      { canonical_id: 'sweet_potato' },
    ]);
    const hakeSweetPotato2 = makeTestRecipe('hake-sp-2', 'Filetes de Pescada e Batata-Doce', 'dinner', [
      { canonical_id: 'hake_white_fish', name: 'Filetes de pescada' },
      { canonical_id: 'sweet_potato' },
    ]);

    const day0Only: WeekPlanEntry[] = [{ recipe: carolinoChicken, slot: 'dinner', dayIndex: 0 }];
    expect(scoreDiversityPenalty(basmatiBeef, day0Only, 'dinner', 3)).toBe(0);

    const hakeEntry: WeekPlanEntry[] = [{ recipe: hakeSweetPotato1, slot: 'dinner', dayIndex: 1 }];
    expect(scoreDiversityPenalty(hakeSweetPotato2, hakeEntry, 'dinner', 4)).toBeLessThanOrEqual(-50);
  });

  it('keeps active week-current.json and re-simulated 4-slot weeks free of excessive batata-doce or pescada repeats', () => {
    const data = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/data/week-current.json'), 'utf-8'),
    ) as WeekData;
    const byId = new Map(data.recipes.map((r) => [r.id, r]));

    // 1. Check active week-current.json first 7 of each slot
    const activeDinners = data.planned_ids.slice(0, 7).map((id) => byId.get(id)!);
    const activeAll = [
      ...data.planned_ids.slice(0, 7),
      ...(data.lunch_ids ?? []).slice(0, 7),
      ...(data.breakfast_ids ?? []).slice(0, 7),
      ...(data.snack_ids ?? []).slice(0, 7),
    ].map((id) => byId.get(id)!);

    const dinnerFreq = countWeekIngredientFrequency(activeDinners);
    const allFreq = countWeekIngredientFrequency(activeAll);

    expect(dinnerFreq.sweet_potato?.count ?? 0).toBeLessThanOrEqual(1);
    expect(allFreq.sweet_potato?.count ?? 0).toBeLessThanOrEqual(2);
    expect(dinnerFreq.hake?.count ?? 0).toBeLessThanOrEqual(1);
    expect(allFreq.hake?.count ?? 0).toBeLessThanOrEqual(2);

    for (const [key, info] of Object.entries(dinnerFreq)) {
      if (info.tier === 'distinctive_protein') {
        expect(info.count, `dinner protein ${key} should stay <= 1`).toBeLessThanOrEqual(1);
      }
    }

    // 2. Check randomized re-simulation across all 4 slots preserves strict diversity
    const dinners = data.recipes.filter((r) => r.meal_slot === 'dinner');
    const lunches = data.recipes.filter((r) => r.meal_slot === 'lunch');
    const breakfasts = data.recipes.filter((r) => r.meal_slot === 'breakfast');
    const snacks = data.recipes.filter((r) => r.meal_slot === 'snack');

    const dRes = selectDiverseSlotIds({ pool: dinners, slot: 'dinner', count: 7, existingEntries: [], jitter: 4 });
    const lRes = selectDiverseSlotIds({ pool: lunches, slot: 'lunch', count: 7, existingEntries: dRes.entries, jitter: 4 });
    const bRes = selectDiverseSlotIds({ pool: breakfasts, slot: 'breakfast', count: 7, existingEntries: lRes.entries, jitter: 4 });
    const sRes = selectDiverseSlotIds({ pool: snacks, slot: 'snack', count: 7, existingEntries: bRes.entries, jitter: 4 });

    expect(new Set(dRes.ids).size).toBe(7);
    expect(new Set(lRes.ids).size).toBe(7);
    expect(new Set(bRes.ids).size).toBe(7);
    expect(new Set(sRes.ids).size).toBe(7);

    const simAll = sRes.entries.map((e) => e.recipe);
    const simFreq = countWeekIngredientFrequency(simAll);
    expect(simFreq.sweet_potato?.count ?? 0).toBeLessThanOrEqual(2);
    expect(simFreq.hake?.count ?? 0).toBeLessThanOrEqual(2);

    // Every simulated 4-slot week should include the 7 core weekly anchors:
    // fruit, yoghurt, bread, salmon, chicken, pasta, eggs
    expect(simFreq.salmon?.count ?? 0).toBeGreaterThanOrEqual(1);
    expect(simFreq.chicken?.count ?? 0).toBeGreaterThanOrEqual(1);
    expect(simFreq.pasta?.count ?? 0).toBeGreaterThanOrEqual(1);
    expect(simFreq.bread?.count ?? 0).toBeGreaterThanOrEqual(1);
    expect(simFreq.greek_yogurt?.count ?? 0).toBeGreaterThanOrEqual(1);
    expect(simFreq.egg?.count ?? 0).toBeGreaterThanOrEqual(1);
    const fruitCount =
      (simFreq.banana?.count ?? 0) +
      (simFreq.apple?.count ?? 0) +
      (simFreq.pear?.count ?? 0) +
      (simFreq.mango?.count ?? 0) +
      (simFreq.blueberries?.count ?? 0) +
      (simFreq.raspberries?.count ?? 0);
    expect(fruitCount).toBeGreaterThanOrEqual(1);
  });

  it('allows repeating safe weekly anchors (fruit, yoghurt, bread, salmon, chicken, pasta, eggs) cleanly', () => {
    const breakfast1 = makeTestRecipe('b1', 'Papas Iogurte e Manga', 'breakfast', [
      { canonical_id: 'greek_yogurt' },
      { canonical_id: 'mango' },
      { canonical_id: 'egg' },
    ]);
    const lunch1 = makeTestRecipe('l1', 'Tosta com Ovo e Frango', 'lunch', [
      { canonical_id: 'sourdough_bread' },
      { canonical_id: 'chicken_breast' },
      { canonical_id: 'egg' },
    ]);
    const dinner1 = makeTestRecipe('d1', 'Massa com Salmão', 'dinner', [
      { canonical_id: 'salmon_fillet' },
      { canonical_id: 'pasta_penne' },
    ]);
    const snack1 = makeTestRecipe('s1', 'Iogurte e Banana', 'snack', [
      { canonical_id: 'greek_yogurt' },
      { canonical_id: 'banana' },
      { canonical_id: 'whole_wheat_bread' },
    ]);

    const existing: WeekPlanEntry[] = [
      { recipe: breakfast1, slot: 'breakfast', dayIndex: 0 },
      { recipe: lunch1, slot: 'lunch', dayIndex: 1 },
      { recipe: dinner1, slot: 'dinner', dayIndex: 2 },
    ];
    // Repeating yoghurt + bread + fruit across another slot scores 0 penalty
    expect(scoreDiversityPenalty(snack1, existing, 'snack', 4)).toBe(0);
  });
});
