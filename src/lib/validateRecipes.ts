import { AISLE_ORDER, ALLERGEN_KEYS, BRACKET_KEYS, METRIC_UNITS } from './constants';
import type { BracketKey, MetricUnit, Recipe, WeekData } from '../types/recipe';

export interface ValidationIssue {
  recipeId: string;
  rule: 'schema' | 'units' | 'canonical_id' | 'split_step' | 'adaptations' | 'safety_honey' | 'safety_choking';
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const SNAKE_CASE_REGEX = /^[a-z][a-z0-9_]*$/;
const KEBAB_CASE_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const ROUND_HAZARD_TOKENS = [
  'grape',
  'cherry_tomato',
  'blueberry',
  'chickpea',
  'pea',
  'corn_kernel',
  'sausage',
  'hot_dog',
  'raw_carrot',
  'whole_nut',
  'popcorn',
];

const SAFE_PREP_KEYWORDS = [
  'quarter',
  'mash',
  'flatten',
  'smash',
  'finely',
  'puree',
  'grate',
  'soft',
  'strip',
  'shred',
  'mince',
  'halve',
  'crush',
];

const INFANT_BRACKETS: BracketKey[] = ['6_9m', '9_12m', '12_24m'];

function getUnitDimension(unit: MetricUnit): 'weight' | 'volume' | 'count' {
  if (unit === 'g') return 'weight';
  if (unit === 'ml' || unit === 'tbsp' || unit === 'tsp') return 'volume';
  return 'count';
}

export function validateRecipe(recipe: Recipe): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const recipeId = recipe?.id || '<unknown>';

  if (!recipe || typeof recipe !== 'object') {
    return [{ recipeId, rule: 'schema', message: 'Recipe must be an object.' }];
  }

  if (!recipe.id || !KEBAB_CASE_REGEX.test(recipe.id)) {
    issues.push({
      recipeId,
      rule: 'schema',
      message: `Recipe id "${recipe.id}" must be kebab-case.`,
    });
  }

  if (!recipe.title || typeof recipe.title !== 'string') {
    issues.push({ recipeId, rule: 'schema', message: 'Missing recipe title.' });
  }

  if (!Number.isFinite(recipe.base_servings) || recipe.base_servings <= 0) {
    issues.push({ recipeId, rule: 'schema', message: 'base_servings must be a positive number.' });
  }

  if (!Number.isFinite(recipe.min_age_months) || recipe.min_age_months < 6) {
    issues.push({ recipeId, rule: 'schema', message: 'min_age_months must be >= 6.' });
  }

  if (!Array.isArray(recipe.allergens)) {
    issues.push({ recipeId, rule: 'schema', message: 'allergens must be an array.' });
  } else {
    for (const allergen of recipe.allergens) {
      if (!ALLERGEN_KEYS.includes(allergen)) {
        issues.push({
          recipeId,
          rule: 'schema',
          message: `Unknown allergen "${allergen}".`,
        });
      }
    }
  }

  // 1. Ingredients: metric units + canonical_id + honey safety
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    issues.push({ recipeId, rule: 'schema', message: 'ingredients must be a non-empty array.' });
  } else {
    for (const ing of recipe.ingredients) {
      if (!SNAKE_CASE_REGEX.test(ing.canonical_id)) {
        issues.push({
          recipeId,
          rule: 'canonical_id',
          message: `Ingredient canonical_id "${ing.canonical_id}" must be snake_case.`,
        });
      }

      if (!METRIC_UNITS.includes(ing.unit)) {
        issues.push({
          recipeId,
          rule: 'units',
          message: `Ingredient "${ing.name}" uses non-metric unit "${ing.unit}". Allowed: ${METRIC_UNITS.join(', ')}.`,
        });
      }

      if (!Number.isFinite(ing.quantity) || ing.quantity <= 0) {
        issues.push({
          recipeId,
          rule: 'units',
          message: `Ingredient "${ing.name}" quantity must be > 0.`,
        });
      }

      if (!AISLE_ORDER.includes(ing.aisle)) {
        issues.push({
          recipeId,
          rule: 'schema',
          message: `Ingredient "${ing.name}" has invalid aisle "${ing.aisle}".`,
        });
      }

      // Hard safety: zero honey if min_age_months < 12
      if (
        recipe.min_age_months < 12 &&
        (/\bhoney\b/i.test(ing.canonical_id) || /\bhoney\b/i.test(ing.name))
      ) {
        issues.push({
          recipeId,
          rule: 'safety_honey',
          message: `Honey is forbidden in "${recipe.title}" when min_age_months (${recipe.min_age_months}) < 12.`,
        });
      }
    }
  }

  // 2. Steps: sequential order, exactly one seasoning split point, honey in text check
  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) {
    issues.push({ recipeId, rule: 'split_step', message: 'steps must be a non-empty array.' });
  } else {
    const splitSteps = recipe.steps.filter((s) => s.is_seasoning_split_point === true);
    if (splitSteps.length !== 1) {
      issues.push({
        recipeId,
        rule: 'split_step',
        message: `Expected exactly 1 seasoning split step, found ${splitSteps.length}.`,
      });
    }

    recipe.steps.forEach((step, idx) => {
      if (step.order !== idx + 1) {
        issues.push({
          recipeId,
          rule: 'split_step',
          message: `Step order mismatch at index ${idx}: expected ${idx + 1}, got ${step.order}.`,
        });
      }
      if (recipe.min_age_months < 12 && /\bhoney\b/i.test(step.text)) {
        issues.push({
          recipeId,
          rule: 'safety_honey',
          message: `Step ${step.order} mentions honey while min_age_months < 12.`,
        });
      }
    });
  }

  // 3. Age adaptations for all 5 brackets
  if (!recipe.age_adaptations || typeof recipe.age_adaptations !== 'object') {
    issues.push({
      recipeId,
      rule: 'adaptations',
      message: 'Missing age_adaptations object.',
    });
  } else {
    for (const bracket of BRACKET_KEYS) {
      const adaptation = recipe.age_adaptations[bracket];
      if (
        !adaptation ||
        !adaptation.cut_and_texture?.trim() ||
        !adaptation.serving_note?.trim()
      ) {
        issues.push({
          recipeId,
          rule: 'adaptations',
          message: `Missing cut_and_texture or serving_note for bracket "${bracket}".`,
        });
      }
    }
  }

  // 4. Hard safety: round choking hazards must have explicit safe prep in infant/toddler brackets
  if (Array.isArray(recipe.ingredients) && recipe.age_adaptations) {
    const hazardIngredients = recipe.ingredients.filter((ing) =>
      ROUND_HAZARD_TOKENS.some(
        (token) =>
          ing.canonical_id.includes(token) ||
          ing.name.toLowerCase().includes(token.replace('_', ' ')),
      ),
    );

    if (hazardIngredients.length > 0) {
      for (const bracket of INFANT_BRACKETS) {
        const ad = recipe.age_adaptations[bracket];
        const combined = `${ad?.cut_and_texture ?? ''} ${ad?.serving_note ?? ''}`.toLowerCase();
        const hasSafePrep = SAFE_PREP_KEYWORDS.some((kw) => combined.includes(kw));
        if (!hasSafePrep) {
          issues.push({
            recipeId,
            rule: 'safety_choking',
            message: `Round hazard (${hazardIngredients.map((h) => h.canonical_id).join(', ')}) lacks explicit safe prep rule (e.g. quartered/mashed/flattened) in bracket "${bracket}".`,
          });
        }
      }
    }
  }

  return issues;
}

export function validateRecipes(recipes: Recipe[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();
  const canonicalDimension = new Map<string, { dim: string; unit: MetricUnit; recipeId: string }>();

  for (const recipe of recipes) {
    if (seenIds.has(recipe.id)) {
      issues.push({
        recipeId: recipe.id,
        rule: 'schema',
        message: `Duplicate recipe id "${recipe.id}".`,
      });
    }
    seenIds.add(recipe.id);

    issues.push(...validateRecipe(recipe));

    for (const ing of recipe.ingredients ?? []) {
      const dim = getUnitDimension(ing.unit);
      const prev = canonicalDimension.get(ing.canonical_id);
      if (prev && prev.dim !== dim) {
        issues.push({
          recipeId: recipe.id,
          rule: 'canonical_id',
          message: `canonical_id "${ing.canonical_id}" mixes ${prev.dim} (${prev.unit} in ${prev.recipeId}) with ${dim} (${ing.unit} in ${recipe.id}).`,
        });
      } else if (!prev) {
        canonicalDimension.set(ing.canonical_id, { dim, unit: ing.unit, recipeId: recipe.id });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateWeekData(data: WeekData): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!data.week_id || typeof data.week_id !== 'string') {
    issues.push({
      recipeId: '<week>',
      rule: 'schema',
      message: 'week_id is required (e.g., "2026-W48").',
    });
  }

  if (!Array.isArray(data.planned_ids) || data.planned_ids.length !== 7) {
    issues.push({
      recipeId: '<week>',
      rule: 'schema',
      message: 'planned_ids must contain exactly 7 recipe IDs.',
    });
  }

  if (!Array.isArray(data.recipes) || data.recipes.length < 7) {
    issues.push({
      recipeId: '<week>',
      rule: 'schema',
      message: 'recipes must contain at least 7 recipes.',
    });
    return { valid: false, issues };
  }

  const recipeValidation = validateRecipes(data.recipes);
  issues.push(...recipeValidation.issues);

  const recipeIdSet = new Set(data.recipes.map((r) => r.id));
  for (const pid of data.planned_ids ?? []) {
    if (!recipeIdSet.has(pid)) {
      issues.push({
        recipeId: pid,
        rule: 'schema',
        message: `planned_id "${pid}" not found in recipes array.`,
      });
    }
  }

  for (const bid of data.breakfast_ids ?? []) {
    if (!recipeIdSet.has(bid)) {
      issues.push({
        recipeId: bid,
        rule: 'schema',
        message: `breakfast_id "${bid}" not found in recipes array.`,
      });
    }
  }

  for (const sid of data.snack_ids ?? []) {
    if (!recipeIdSet.has(sid)) {
      issues.push({
        recipeId: sid,
        rule: 'schema',
        message: `snack_id "${sid}" not found in recipes array.`,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
