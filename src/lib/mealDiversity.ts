import type { MealSlotType, Recipe } from '../types/recipe';

export type DiversityTier =
  | 'base_staple'
  | 'flexible_staple'
  | 'weekly_anchor_protein'
  | 'distinctive_protein'
  | 'distinctive_ingredient';

export interface ClassifiedIngredient {
  key: string;
  tier: DiversityTier;
  family?: string;
}

export interface WeekPlanEntry {
  recipe: Recipe;
  slot: MealSlotType;
  dayIndex: number;
}

const BASE_STAPLE_IDS = new Set([
  'olive_oil',
  'garlic_clove',
  'garlic',
  'yellow_onion',
  'red_onion',
  'onion',
  'lemon',
  'lemon_juice',
  'dried_thyme',
  'dried_oregano',
  'oregano',
  'parsley',
  'fresh_coriander',
  'coriander',
  'cinnamon',
  'ground_cinnamon',
  'ground_cumin',
  'cumin',
  'nutmeg',
  'bay_leaf',
  'cornstarch',
  'water',
  'salt',
]);

const DISTINCTIVE_INGREDIENT_MAP: Record<string, { key: string; family?: string }> = {
  sweet_potato: { key: 'sweet_potato', family: 'tuber' },
  butternut_squash: { key: 'butternut_squash', family: 'squash' },
  beetroot: { key: 'beetroot', family: 'root' },
  broccoli_florets: { key: 'broccoli_florets', family: 'crucifer' },
  cauliflower: { key: 'cauliflower', family: 'crucifer' },
  green_peas: { key: 'peas', family: 'peas' },
  peas: { key: 'peas', family: 'peas' },
  kale: { key: 'kale', family: 'greens' },
  kale_greens: { key: 'kale', family: 'greens' },
  leek: { key: 'leek' },
  mushrooms: { key: 'mushrooms' },
  avocado: { key: 'avocado' },
  dates: { key: 'dates' },
  medjool_dates: { key: 'dates' },
  coconut_milk: { key: 'coconut_milk' },
  peanut_butter: { key: 'peanut_butter', family: 'nut_butter' },
  almond_butter: { key: 'almond_butter', family: 'nut_butter' },
  tahini: { key: 'tahini', family: 'sesame' },
  tahini_sesame: { key: 'tahini', family: 'sesame' },
  walnut_ground: { key: 'walnut_ground' },
  chia_seeds: { key: 'chia_seeds' },
  cheddar_cheese: { key: 'cheddar_cheese' },
  cornbread_broa: { key: 'cornbread_broa' },
  couscous: { key: 'couscous' },
  tortilla_wraps: { key: 'tortilla_wraps' },
  cucumber: { key: 'cucumber' },
  bell_pepper: { key: 'bell_pepper' },
  red_bell_pepper: { key: 'bell_pepper' },
};

const STRUCTURAL_EVERYDAY_KEYS = new Set([
  'egg',
  'rolled_oats',
  'oat_flour',
  'greek_yogurt',
  'milk',
  'bread',
  'pasta',
]);

const FRUIT_KEYS = new Set([
  'banana',
  'apple',
  'orange',
  'mango',
  'blueberries',
  'raspberries',
  'pear',
  'quince_apple',
]);

const RICE_VARIETY_KEYS = new Set([
  'carolino_rice',
  'basmati_rice',
  'rice',
  'brown_rice',
]);

const FLEXIBLE_STAPLE_MAP: Record<string, string> = {
  carolino_rice: 'carolino_rice',
  basmati_rice: 'basmati_rice',
  rice: 'rice',
  brown_rice: 'brown_rice',
  white_potato: 'potato',
  potato: 'potato',
  pasta_penne: 'pasta',
  sourdough_bread: 'bread',
  whole_wheat_bread: 'bread',
  crushed_tomatoes: 'tomato',
  tomato_passata: 'tomato',
  cherry_tomatoes: 'tomato',
  fresh_tomato: 'tomato',
  carrot: 'carrot',
  zucchini: 'zucchini',
  baby_spinach: 'baby_spinach',
  green_beans: 'green_beans',
  egg: 'egg',
  eggs: 'egg',
  rolled_oats: 'rolled_oats',
  oat_flour: 'oat_flour',
  greek_yogurt: 'greek_yogurt',
  plain_yogurt: 'greek_yogurt',
  milk: 'milk',
  ricotta_cheese: 'ricotta',
  ricotta_requeijao: 'ricotta',
  fresh_cheese_pt: 'fresh_cheese_pt',
  banana: 'banana',
  apple: 'apple',
  orange: 'orange',
  mango: 'mango',
  blueberries: 'blueberries',
  raspberries: 'raspberries',
  pear: 'pear',
  quince_apple: 'quince_apple',
};

export function classifyIngredientForDiversity(
  canonicalId: string,
  name = '',
  recipeTitle = '',
  isPantryStaple = false,
): ClassifiedIngredient {
  const id = canonicalId.toLowerCase();
  const context = `${name} ${recipeTitle}`.toLowerCase();

  // Check distinctive proteins first (with PT-PT fish disambiguation)
  if (id === 'hake_fillet' || id === 'hake_white_fish' || id === 'cod_fillet') {
    if (context.includes('tamboril')) {
      return { key: 'monkfish', tier: 'distinctive_protein', family: 'fish' };
    }
    if (context.includes('peixe-espada') || context.includes('espada')) {
      return { key: 'swordfish', tier: 'distinctive_protein', family: 'fish' };
    }
    if (id === 'cod_fillet' && !context.includes('pescada')) {
      return { key: 'cod', tier: 'distinctive_protein', family: 'fish' };
    }
    if (context.includes('bacalhau') && !context.includes('pescada')) {
      return { key: 'cod', tier: 'distinctive_protein', family: 'fish' };
    }
    return { key: 'hake', tier: 'distinctive_protein', family: 'fish' };
  }
  if (id === 'desalted_cod' || id === 'cod_fillet_desalted') {
    return { key: 'cod', tier: 'distinctive_protein', family: 'fish' };
  }
  if (id === 'salmon_fillet' || id === 'salmon') {
    return { key: 'salmon', tier: 'weekly_anchor_protein', family: 'fish' };
  }
  if (id === 'canned_tuna' || id === 'canned_tuna_water') {
    return { key: 'tuna', tier: 'distinctive_protein', family: 'fish' };
  }
  if (id === 'squid_calamari') {
    return { key: 'squid', tier: 'distinctive_protein', family: 'seafood' };
  }
  if (id === 'chicken_breast' || id === 'chicken_thigh') {
    return { key: 'chicken', tier: 'weekly_anchor_protein', family: 'poultry' };
  }
  if (id === 'ground_turkey' || id === 'turkey_breast') {
    return { key: 'turkey', tier: 'distinctive_protein', family: 'poultry' };
  }
  if (id === 'duck_leg_shredded') {
    return { key: 'duck', tier: 'distinctive_protein', family: 'poultry' };
  }
  if (id === 'ground_beef' || id === 'lean_beef') {
    return { key: 'beef', tier: 'distinctive_protein', family: 'red_meat' };
  }
  if (id === 'canned_chickpeas' || id === 'chickpeas') {
    return { key: 'chickpeas', tier: 'distinctive_protein', family: 'legume' };
  }
  if (id === 'red_lentils' || id === 'brown_lentils') {
    return { key: id, tier: 'distinctive_protein', family: 'lentil' };
  }
  if (
    id === 'white_beans' ||
    id === 'red_kidney_beans' ||
    id === 'fava_beans' ||
    id === 'black_eyed_peas'
  ) {
    return { key: id, tier: 'distinctive_protein', family: 'bean' };
  }

  // Distinctive produce/star ingredients that should stay rare across a week
  const dist = DISTINCTIVE_INGREDIENT_MAP[id];
  if (dist) {
    return { key: dist.key, tier: 'distinctive_ingredient', family: dist.family };
  }

  // Unlimited aromatics, oils, herbs, and spices
  if (BASE_STAPLE_IDS.has(id)) {
    return { key: id, tier: 'base_staple' };
  }

  // Flexible everyday kitchen staples (note: distinct rices stay distinct keys)
  const flexKey = FLEXIBLE_STAPLE_MAP[id];
  if (flexKey) {
    return { key: flexKey, tier: 'flexible_staple' };
  }

  if (isPantryStaple) {
    return { key: id, tier: 'base_staple' };
  }

  return { key: id, tier: 'flexible_staple' };
}

export function getRecipeClassifiedIngredients(recipe: Recipe): ClassifiedIngredient[] {
  const seen = new Map<string, ClassifiedIngredient>();
  for (const ing of recipe.ingredients) {
    const classified = classifyIngredientForDiversity(
      ing.canonical_id,
      ing.name,
      recipe.title,
      ing.is_pantry_staple,
    );
    if (!seen.has(classified.key)) {
      seen.set(classified.key, classified);
    }
  }
  return [...seen.values()];
}

/**
 * Scores culinary repetition penalty for placing `candidate` into `(targetSlot, targetDayIndex)`
 * given the other meals already chosen for the week. Returns <= 0 (0 = maximally fresh/diverse).
 */
export function scoreDiversityPenalty(
  candidate: Recipe,
  existingEntries: WeekPlanEntry[],
  targetSlot: MealSlotType,
  targetDayIndex: number,
): number {
  const slotCounts = new Map<string, number>();
  const weekCounts = new Map<string, number>();
  const minDayGap = new Map<string, number>();
  const adjacentDinnerFamilies = new Set<string>();
  const activeSlotIds = new Set<string>();

  for (const entry of existingEntries) {
    if (entry.slot === targetSlot) {
      activeSlotIds.add(entry.recipe.id);
    }
    const items = getRecipeClassifiedIngredients(entry.recipe);
    const gap = Math.abs(entry.dayIndex - targetDayIndex);

    for (const item of items) {
      weekCounts.set(item.key, (weekCounts.get(item.key) ?? 0) + 1);
      if (entry.slot === targetSlot) {
        slotCounts.set(item.key, (slotCounts.get(item.key) ?? 0) + 1);
      }
      const prevGap = minDayGap.get(item.key);
      if (prevGap === undefined || gap < prevGap) {
        minDayGap.set(item.key, gap);
      }
      if (
        targetSlot === 'dinner' &&
        entry.slot === 'dinner' &&
        gap === 1 &&
        (item.tier === 'distinctive_protein' ||
          item.tier === 'weekly_anchor_protein') &&
        item.family
      ) {
        adjacentDinnerFamilies.add(item.family);
      }
    }
  }

  let penalty = 0;

  // Never repeat the exact same recipe in the same weekly slot when avoidable
  if (activeSlotIds.has(candidate.id)) {
    penalty -= 50;
  }

  const candidateItems = getRecipeClassifiedIngredients(candidate);

  for (const item of candidateItems) {
    if (item.tier === 'base_staple') continue;

    const slotCount = slotCounts.get(item.key) ?? 0;
    const weekCount = weekCounts.get(item.key) ?? 0;
    const gap = minDayGap.get(item.key);

    if (item.tier === 'weekly_anchor_protein') {
      // Safe weekly anchor proteins (salmon, chicken): gentle if repeated across slots, avoid 3+ total or back-to-back dinner
      if (slotCount >= 2) {
        penalty -= 18 * (slotCount - 1);
      } else if (slotCount === 1) {
        penalty -= 6;
      } else if (weekCount >= 2) {
        penalty -= 12 * (weekCount - 1);
      }
      if (gap === 0) {
        penalty -= 6;
      } else if (gap === 1 && targetSlot === 'dinner') {
        penalty -= 4;
      }
      if (item.family && adjacentDinnerFamilies.has(item.family)) {
        penalty -= 2;
      }
      continue;
    }

    if (item.tier === 'distinctive_protein') {
      if (slotCount >= 1) {
        penalty -= 28 * slotCount;
      } else if (weekCount === 1) {
        penalty -= 5;
      } else if (weekCount >= 2) {
        penalty -= 24 * (weekCount - 1);
      }
      if (gap === 0) {
        penalty -= 12;
      } else if (gap === 1 && targetSlot === 'dinner') {
        penalty -= 6;
      }
      if (item.family && adjacentDinnerFamilies.has(item.family)) {
        penalty -= 3;
      }
      continue;
    }

    if (item.tier === 'distinctive_ingredient') {
      if (slotCount >= 1) {
        penalty -= 26 * slotCount;
      } else if (weekCount === 1) {
        penalty -= 4;
      } else if (weekCount >= 2) {
        penalty -= 24 * (weekCount - 1);
      }
      if (gap === 0) {
        penalty -= 12;
      } else if (gap === 1) {
        penalty -= 5;
      }
      continue;
    }

    // flexible_staple: allow fruit, yoghurt, bread, pasta, eggs, oats, and different rices comfortably
    if (RICE_VARIETY_KEYS.has(item.key)) {
      if (slotCount >= 2) penalty -= 8 * (slotCount - 1);
      if (gap === 1 && slotCount >= 1) penalty -= 3;
    } else if (FRUIT_KEYS.has(item.key)) {
      if (slotCount >= 3) penalty -= 2 * (slotCount - 2);
      if (weekCount >= 5) penalty -= 2 * (weekCount - 4);
    } else if (STRUCTURAL_EVERYDAY_KEYS.has(item.key)) {
      if (slotCount >= 4) penalty -= 2 * (slotCount - 3);
      if (weekCount >= 8) penalty -= 2 * (weekCount - 7);
    } else {
      if (slotCount >= 2) penalty -= 4 * (slotCount - 1);
      if (weekCount >= 3) penalty -= 4 * (weekCount - 2);
      if (gap === 1 && slotCount >= 1) penalty -= 2;
    }
  }

  return penalty;
}

/**
 * Encourages every week to include core safe family anchors when missing so far:
 * fruit, yoghurt, bread, salmon, chicken, pasta, and eggs.
 */
export function scoreWeeklyAnchorBonus(
  candidate: Recipe,
  existingEntries: WeekPlanEntry[],
): number {
  if (existingEntries.length < 2) return 0;

  const presentKeys = new Set<string>();
  let hasFruit = false;

  for (const entry of existingEntries) {
    for (const item of getRecipeClassifiedIngredients(entry.recipe)) {
      presentKeys.add(item.key);
      if (FRUIT_KEYS.has(item.key)) hasFruit = true;
    }
  }

  let bonus = 0;
  for (const item of getRecipeClassifiedIngredients(candidate)) {
    if (item.key === 'salmon' && !presentKeys.has('salmon')) {
      bonus += 5;
    } else if (item.key === 'chicken' && !presentKeys.has('chicken')) {
      bonus += 5;
    } else if (item.key === 'pasta' && !presentKeys.has('pasta')) {
      bonus += 3.5;
    } else if (item.key === 'bread' && !presentKeys.has('bread')) {
      bonus += 3;
    } else if (item.key === 'greek_yogurt' && !presentKeys.has('greek_yogurt')) {
      bonus += 2.5;
    } else if (item.key === 'egg' && !presentKeys.has('egg')) {
      bonus += 2.5;
    } else if (FRUIT_KEYS.has(item.key) && !hasFruit) {
      bonus += 2.5;
      hasFruit = true;
    }
  }
  return Math.min(5, bonus);
}

export function countWeekIngredientFrequency(
  recipes: Recipe[],
): Record<string, { count: number; tier: DiversityTier }> {
  const result: Record<string, { count: number; tier: DiversityTier }> = {};
  for (const r of recipes) {
    for (const item of getRecipeClassifiedIngredients(r)) {
      const existing = result[item.key];
      if (existing) {
        existing.count += 1;
      } else {
        result[item.key] = { count: 1, tier: item.tier };
      }
    }
  }
  return result;
}

export function selectDiverseSlotIds(params: {
  pool: Recipe[];
  slot: MealSlotType;
  count: number;
  existingEntries: WeekPlanEntry[];
  lockedByDay?: Map<number, Recipe>;
  scoreBase?: (recipe: Recipe) => number;
  jitter?: number;
}): { ids: string[]; entries: WeekPlanEntry[] } {
  const {
    pool,
    slot,
    count,
    existingEntries,
    lockedByDay,
    scoreBase = () => 0,
    jitter = 0,
  } = params;

  const workingEntries = [...existingEntries];
  const ids: string[] = Array.from({ length: count }, () => '');

  // Register locked slots first so unlocked days avoid repeating their rare ingredients
  for (let dayIdx = 0; dayIdx < count; dayIdx += 1) {
    const locked = lockedByDay?.get(dayIdx);
    if (locked) {
      ids[dayIdx] = locked.id;
      workingEntries.push({ recipe: locked, slot, dayIndex: dayIdx });
    }
  }

  for (let dayIdx = 0; dayIdx < count; dayIdx += 1) {
    if (ids[dayIdx]) continue;
    if (pool.length === 0) continue;

    let bestRecipe = pool[0];
    let bestScore = -Infinity;

    for (const candidate of pool) {
      const base = scoreBase(candidate);
      const div = scoreDiversityPenalty(candidate, workingEntries, slot, dayIdx);
      const anchor = scoreWeeklyAnchorBonus(candidate, workingEntries);
      const noise = jitter > 0 ? Math.random() * jitter : 0;
      const total = base + div + anchor + noise;
      if (total > bestScore) {
        bestScore = total;
        bestRecipe = candidate;
      }
    }

    ids[dayIdx] = bestRecipe.id;
    workingEntries.push({ recipe: bestRecipe, slot, dayIndex: dayIdx });
  }

  return { ids, entries: workingEntries };
}
