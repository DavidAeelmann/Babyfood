import { describe, expect, it } from 'vitest';
import {
  buildPreferencesProfile,
  createCustomRecipeFromInput,
  scoreRecipeAlignment,
} from '../src/lib/preferences';
import { validateRecipe } from '../src/lib/validateRecipes';
import { buildWeeklyPrompt } from '../scripts/providers/llm';
import type { Recipe } from '../src/types/recipe';

function makeRecipe(id: string, title: string, ingredients: string[], allergens: Recipe['allergens'] = []): Recipe {
  return {
    id,
    title,
    image_url: `meals/${id}.webp`,
    meal_slot: 'dinner',
    prep_minutes: 10,
    cook_minutes: 20,
    base_servings: 4,
    min_age_months: 6,
    allergens,
    ingredients: ingredients.map((cid) => ({
      canonical_id: cid,
      name: cid,
      quantity: 200,
      unit: 'g',
      aisle: 'Produce',
      is_pantry_staple: false,
    })),
    steps: [
      { order: 1, text: 'Cozinhar 15 minutos.', is_seasoning_split_point: false },
      { order: 2, text: 'Separar dose do bebé.', is_seasoning_split_point: true },
    ],
    age_adaptations: {
      '6_9m': { cut_and_texture: 'Em tiras macias.', serving_note: 'Sem sal.', cut_shape: 'finger-strip' },
      '9_12m': { cut_and_texture: 'Em cubinhos macios.', serving_note: 'Sem sal.', cut_shape: 'pincer-dice' },
      '12_24m': { cut_and_texture: 'Macio esmagado.', serving_note: 'Sem sal.', cut_shape: 'pincer-dice' },
      '2_4y': { cut_and_texture: 'Cortado.', serving_note: 'Com garfo.', cut_shape: 'pincer-dice' },
      '4y_plus': { cut_and_texture: 'Normal.', serving_note: 'Em família.', cut_shape: 'finger-strip' },
    },
  };
}

describe('Preferences alignment & custom recipes', () => {
  it('boosts favorite-aligned recipes and penalizes blocked-similar recipes', () => {
    const fav = makeRecipe('fav-hake', 'Pescada Favorita', ['hake_white_fish', 'sweet_potato'], ['fish']);
    const similarToFav = makeRecipe('sim-fav', 'Salmão e Batata-Doce', ['salmon_fillet', 'sweet_potato'], ['fish']);
    const blocked = makeRecipe('blk-curry', 'Caril Bloqueado', ['chickpeas', 'coconut_milk'], []);
    const similarToBlocked = makeRecipe('sim-blk', 'Estufado de Grão', ['chickpeas', 'spinach'], []);

    const map = new Map([fav, similarToFav, blocked, similarToBlocked].map((r) => [r.id, r]));

    const scoreFavAligned = scoreRecipeAlignment(similarToFav, ['fav-hake'], ['blk-curry'], map);
    const scoreBlkAligned = scoreRecipeAlignment(similarToBlocked, ['fav-hake'], ['blk-curry'], map);

    expect(scoreFavAligned).toBeGreaterThan(0);
    expect(scoreBlkAligned).toBeLessThan(0);
    expect(scoreFavAligned).toBeGreaterThan(scoreBlkAligned);
    expect(scoreRecipeAlignment(blocked, ['fav-hake'], ['blk-curry'], map)).toBe(-1000);
  });

  it('builds preference profile JSON and injects into buildWeeklyPrompt', () => {
    const fav = makeRecipe('fav-1', 'Arroz de Frango', ['chicken_breast', 'carrot']);
    const blk = makeRecipe('blk-1', 'Grão Estufado', ['chickpeas']);
    const map = new Map([fav, blk].map((r) => [r.id, r]));

    const profile = buildPreferencesProfile(['fav-1'], ['blk-1'], map);
    expect(profile.favorites).toEqual(['Arroz de Frango']);
    expect(profile.blocked).toEqual(['Grão Estufado']);

    const prompt = buildWeeklyPrompt('2026-W49', profile);
    expect(prompt).toContain('HOUSEHOLD FAVORITES');
    expect(prompt).toContain('Arroz de Frango');
    expect(prompt).toContain('HOUSEHOLD BLOCKED');
    expect(prompt).toContain('Grão Estufado');
  });

  it('creates custom family recipes that pass strict pediatric validation', () => {
    const custom = createCustomRecipeFromInput({
      title: 'Sopa de Agrião da Avó',
      slot: 'lunch',
      prepMinutes: 10,
      cookMinutes: 20,
      ingredientsText: 'Agrião, Batata branca, Cenoura, Azeite',
      toddlerNote: 'Triturar cremoso para bebé.',
    });

    expect(custom.id.startsWith('custom-')).toBe(true);
    expect(custom.meal_slot).toBe('lunch');
    expect(custom.ingredients).toHaveLength(4);
    expect(validateRecipe(custom)).toEqual([]);
  });
});
