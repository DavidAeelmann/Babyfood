import type { MealSlotType, Recipe } from '../types/recipe';

export interface PreferenceProfile {
  favorites: string[];
  blocked: string[];
  likedIngredients?: string[];
  dislikedIngredients?: string[];
}

function getCoreIngredients(recipe: Recipe): string[] {
  return recipe.ingredients
    .filter((i) => !i.is_pantry_staple)
    .map((i) => i.canonical_id);
}

/**
 * Computes how strongly a candidate recipe aligns with user Favorites (+score)
 * and diverges from Blocked recipes (-penalty on shared core ingredients & allergens).
 */
export function scoreRecipeAlignment(
  candidate: Recipe,
  favoriteIds: string[],
  blockedIds: string[],
  recipeMap: Map<string, Recipe>,
): number {
  const favSet = new Set(favoriteIds);
  const blockedSet = new Set(blockedIds);

  if (blockedSet.has(candidate.id)) {
    return -1000;
  }

  let score = 0;

  if (favSet.has(candidate.id)) {
    score += 12;
  }

  const favCoreIngredients = new Set<string>();
  for (const fid of favoriteIds) {
    const r = recipeMap.get(fid);
    if (!r) continue;
    for (const cid of getCoreIngredients(r)) {
      favCoreIngredients.add(cid);
    }
  }

  const blockedCoreIngredients = new Set<string>();
  const blockedAllergens = new Set<string>();
  for (const bid of blockedIds) {
    const r = recipeMap.get(bid);
    if (!r) continue;
    for (const cid of getCoreIngredients(r)) {
      blockedCoreIngredients.add(cid);
    }
    for (const a of r.allergens) {
      blockedAllergens.add(a);
    }
  }

  for (const cid of getCoreIngredients(candidate)) {
    if (favCoreIngredients.has(cid)) {
      score += 2;
    }
    if (blockedCoreIngredients.has(cid) && !favCoreIngredients.has(cid)) {
      score -= 3;
    }
  }

  for (const a of candidate.allergens) {
    if (blockedAllergens.has(a)) {
      score -= 1;
    }
  }

  return score;
}

export function getSamplingWeight(
  candidate: Recipe,
  favoriteIds: string[],
  blockedIds: string[],
  recipeMap: Map<string, Recipe>,
): number {
  const alignment = scoreRecipeAlignment(candidate, favoriteIds, blockedIds, recipeMap);
  return Math.max(1, Math.min(12, 3 + Math.round(alignment / 2)));
}

export function buildPreferencesProfile(
  favoriteIds: string[],
  blockedIds: string[],
  recipeMap: Map<string, Recipe>,
): PreferenceProfile {
  const favTitles: string[] = [];
  const likedSet = new Set<string>();
  for (const id of favoriteIds) {
    const r = recipeMap.get(id);
    if (!r) continue;
    favTitles.push(r.title);
    for (const cid of getCoreIngredients(r)) likedSet.add(cid);
  }

  const blockedTitles: string[] = [];
  const dislikedSet = new Set<string>();
  for (const id of blockedIds) {
    const r = recipeMap.get(id);
    if (!r) continue;
    blockedTitles.push(r.title);
    for (const cid of getCoreIngredients(r)) {
      if (!likedSet.has(cid)) dislikedSet.add(cid);
    }
  }

  return {
    favorites: favTitles,
    blocked: blockedTitles,
    likedIngredients: [...likedSet],
    dislikedIngredients: [...dislikedSet],
  };
}

export function createCustomRecipeFromInput(input: {
  title: string;
  slot: MealSlotType;
  prepMinutes: number;
  cookMinutes: number;
  ingredientsText: string;
  toddlerNote: string;
}): Recipe {
  const cleanTitle = input.title.trim();
  const slug = cleanTitle
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'receita-familia';
  const id = `custom-${slug}-${Date.now().toString(36)}`;

  const rawIngredients = input.ingredientsText
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const ingredients = (rawIngredients.length > 0 ? rawIngredients : [cleanTitle]).map(
    (name) => {
      const canonical = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'ingrediente_extra';
      return {
        canonical_id: canonical,
        name,
        quantity: 1,
        unit: 'pcs' as const,
        aisle: 'Pantry' as const,
        is_pantry_staple: false,
      };
    },
  );

  const prep = Math.max(0, Math.min(120, Math.round(input.prepMinutes || 10)));
  const cook = Math.max(0, Math.min(180, Math.round(input.cookMinutes || 15)));
  const note =
    input.toddlerNote.trim() ||
    'Cortar em pedaços macios adequados à idade e sem sal adicionado.';

  return {
    id,
    title: cleanTitle,
    image_url: 'icons/icon-512.png',
    meal_slot: input.slot,
    prep_minutes: prep,
    cook_minutes: cook,
    base_servings: 4,
    min_age_months: 6,
    allergens: [],
    ingredients,
    steps: [
      {
        order: 1,
        text: `Preparar os ingredientes (${ingredients.map((i) => i.name).join(', ')}) e cozinhar durante ${cook || 10} minutos até ficar bem macio.`,
        is_seasoning_split_point: false,
      },
      {
        order: 2,
        text: 'SEPARAÇÃO DE TEMPERO: Reservar a dose do bebé e da criança antes de juntar sal ou temperos fortes.',
        is_seasoning_split_point: true,
      },
      {
        order: 3,
        text: 'Ajustar o tempero dos adultos a gosto e servir morno.',
        is_seasoning_split_point: false,
      },
    ],
    age_adaptations: {
      '6_9m': {
        cut_and_texture: `Tiras macias ou puré grosseiro: ${note}`,
        serving_note: 'Zero sal ou açúcar adicionado.',
        cut_shape: 'finger-strip',
      },
      '9_12m': {
        cut_and_texture: `Pedaços pequenos de pinça fáceis de desfazer: ${note}`,
        serving_note: 'Zero sal adicionado.',
        cut_shape: 'pincer-dice',
      },
      '12_24m': {
        cut_and_texture: `Cubos macios para garfo: ${note}`,
        serving_note: 'Servir com fio de azeite virgem extra.',
        cut_shape: 'pincer-dice',
      },
      '2_4y': {
        cut_and_texture: 'Porção infantil cortada em pedaços cómodos.',
        serving_note: 'Incentivar autonomia com garfo ou colher.',
        cut_shape: 'pincer-dice',
      },
      '4y_plus': {
        cut_and_texture: 'Porção pequena igual à da família.',
        serving_note: 'Acompanhar com legumes ou fruta da época.',
        cut_shape: 'finger-strip',
      },
    },
  };
}
