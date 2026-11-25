import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { validateWeekData } from '../src/lib/validateRecipes';
import {
  selectDiverseSlotIds,
  type WeekPlanEntry,
} from '../src/lib/mealDiversity';
import { generateMealWebp } from './providers/images';
import {
  buildWeeklyPrompt,
  generateWeekWithLlm,
  getLlmProvider,
  type WeeklyPromptPreferences,
} from './providers/llm';
import type { Recipe, WeekData } from '../src/types/recipe';

const WEEK_JSON_PATH = resolve(process.cwd(), 'public/data/week-current.json');
const MEALS_DIR = resolve(process.cwd(), 'public/meals');

function loadPreferences(): WeeklyPromptPreferences | undefined {
  if (process.env.MEAL_PREFERENCES_JSON?.trim()) {
    try {
      return JSON.parse(process.env.MEAL_PREFERENCES_JSON) as WeeklyPromptPreferences;
    } catch {
      console.warn('Warning: invalid MEAL_PREFERENCES_JSON ignored.');
    }
  }
  const argPath = process.argv.find((a) => a.startsWith('--preferences='))?.split('=')[1];
  const prefPath = argPath
    ? resolve(process.cwd(), argPath)
    : resolve(process.cwd(), 'public/data/preferences.json');
  if (existsSync(prefPath)) {
    try {
      return JSON.parse(readFileSync(prefPath, 'utf-8')) as WeeklyPromptPreferences;
    } catch {
      console.warn(`Warning: failed parsing ${prefPath}`);
    }
  }
  return undefined;
}

function getIsoWeekId(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function scorePromptPreference(
  recipe: Recipe,
  preferences?: WeeklyPromptPreferences,
): number {
  if (!preferences) return 0;
  let score = 0;
  const titleLower = recipe.title.toLowerCase();
  if (preferences.blocked?.some((b) => titleLower.includes(b.toLowerCase()))) {
    score -= 1000;
  }
  if (preferences.favorites?.some((f) => titleLower.includes(f.toLowerCase()))) {
    score += 10;
  }
  const liked = new Set(preferences.likedIngredients ?? []);
  const disliked = new Set(preferences.dislikedIngredients ?? []);
  for (const ing of recipe.ingredients) {
    if (ing.is_pantry_staple) continue;
    if (liked.has(ing.canonical_id)) score += 1.5;
    if (disliked.has(ing.canonical_id)) score -= 3;
  }
  return score;
}

function normalizeWeekData(
  data: WeekData,
  weekId: string,
  preferences?: WeeklyPromptPreferences,
): WeekData {
  const bSet = new Set(data.breakfast_ids ?? []);
  const lSet = new Set(data.lunch_ids ?? []);
  const sSet = new Set(data.snack_ids ?? []);

  const normalizedRecipes: Recipe[] = data.recipes.map((r) => ({
    ...r,
    meal_slot:
      r.meal_slot ??
      (bSet.has(r.id)
        ? 'breakfast'
        : lSet.has(r.id)
          ? 'lunch'
          : sSet.has(r.id)
            ? 'snack'
            : 'dinner'),
    image_url: `meals/${r.id}.webp`,
  }));

  const dinners = normalizedRecipes.filter((r) => r.meal_slot === 'dinner');
  const lunches = normalizedRecipes.filter((r) => r.meal_slot === 'lunch');
  const breakfasts = normalizedRecipes.filter((r) => r.meal_slot === 'breakfast');
  const snacks = normalizedRecipes.filter((r) => r.meal_slot === 'snack');

  const baseScore = (r: Recipe) => scorePromptPreference(r, preferences);

  // Select diverse Mon-Sun dinners first, then layer lunches, breakfasts, and snacks
  // so rare ingredients (e.g. sweet_potato, pescada, salmon) stay varied week-wide.
  const dinnerRes = selectDiverseSlotIds({
    pool: dinners,
    slot: 'dinner',
    count: Math.min(7, dinners.length),
    existingEntries: [],
    scoreBase: baseScore,
  });

  let accumulated: WeekPlanEntry[] = dinnerRes.entries;

  const lunchRes = selectDiverseSlotIds({
    pool: lunches,
    slot: 'lunch',
    count: Math.min(7, lunches.length),
    existingEntries: accumulated,
    scoreBase: baseScore,
  });
  accumulated = lunchRes.entries;

  const breakfastRes = selectDiverseSlotIds({
    pool: breakfasts,
    slot: 'breakfast',
    count: Math.min(7, breakfasts.length),
    existingEntries: accumulated,
    scoreBase: baseScore,
  });
  accumulated = breakfastRes.entries;

  const snackRes = selectDiverseSlotIds({
    pool: snacks,
    slot: 'snack',
    count: Math.min(7, snacks.length),
    existingEntries: accumulated,
    scoreBase: baseScore,
  });

  const orderWithRest = (selected: string[], fullPool: Recipe[]): string[] => {
    const pickedSet = new Set(selected);
    return [
      ...selected.filter(Boolean),
      ...fullPool.filter((r) => !pickedSet.has(r.id)).map((r) => r.id),
    ];
  };

  return {
    ...data,
    week_id: weekId,
    generated_at: new Date().toISOString(),
    planned_ids: dinnerRes.ids.filter(Boolean),
    breakfast_ids: orderWithRest(breakfastRes.ids, breakfasts),
    lunch_ids: orderWithRest(lunchRes.ids, lunches),
    snack_ids: orderWithRest(snackRes.ids, snacks),
    recipes: normalizedRecipes,
  };
}

function writeJsonAtomically(targetPath: string, payload: WeekData): void {
  mkdirSync(dirname(targetPath), { recursive: true });
  const tmpPath = `${targetPath}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  renameSync(tmpPath, targetPath);
}

function cleanupStaleImages(validIds: Set<string>): number {
  if (!existsSync(MEALS_DIR)) return 0;
  let removed = 0;
  for (const file of readdirSync(MEALS_DIR)) {
    if (!file.endsWith('.webp')) continue;
    const id = file.slice(0, -'.webp'.length);
    if (!validIds.has(id)) {
      unlinkSync(resolve(MEALS_DIR, file));
      removed += 1;
    }
  }
  return removed;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const validateOnly = args.has('--validate-only');
  const skipImages = args.has('--skip-images');
  const dryRun = args.has('--dry-run');
  const mockMode = args.has('--mock');

  if (validateOnly) {
    const existing = JSON.parse(readFileSync(WEEK_JSON_PATH, 'utf-8')) as WeekData;
    const result = validateWeekData(existing);
    if (!result.valid) {
      console.error('Validation failed:');
      for (const issue of result.issues) {
        console.error(`  - [${issue.recipeId}] (${issue.rule}) ${issue.message}`);
      }
      process.exit(1);
    }
    console.log(
      `✓ Validated ${WEEK_JSON_PATH}: ${existing.recipes.length} recipes (week_id=${existing.week_id}).`,
    );
    return;
  }

  const weekId = getIsoWeekId();
  const provider = getLlmProvider();
  const preferences = loadPreferences();
  console.log(`Generating weekly meal plan for ${weekId} (provider=${mockMode ? 'mock' : provider})...`);

  let candidate: WeekData;

  if (mockMode) {
    candidate = JSON.parse(readFileSync(WEEK_JSON_PATH, 'utf-8')) as WeekData;
    candidate = normalizeWeekData(candidate, weekId, preferences);
  } else {
    let prompt = buildWeeklyPrompt(weekId, preferences);
    let attempts = 0;
    const maxAttempts = 3;

    while (true) {
      attempts += 1;
      const raw = await generateWeekWithLlm(provider, prompt);
      candidate = normalizeWeekData(raw, weekId, preferences);

      const validation = validateWeekData(candidate);
      if (validation.valid) {
        console.log(`✓ Validation passed on attempt ${attempts} (${candidate.recipes.length} recipes).`);
        break;
      }

      console.warn(`Attempt ${attempts} failed validation with ${validation.issues.length} issue(s):`);
      for (const issue of validation.issues) {
        console.warn(`  - [${issue.recipeId}] (${issue.rule}) ${issue.message}`);
      }

      if (attempts >= maxAttempts) {
        console.error('Exhausted validation repair attempts. Aborting without modifying public/data/week-current.json.');
        process.exit(1);
      }

      const errorSummary = validation.issues
        .map((i) => `- [${i.recipeId}] (${i.rule}): ${i.message}`)
        .join('\n');
      prompt = `${buildWeeklyPrompt(weekId, preferences)}\n\nPREVIOUS OUTPUT FAILED VALIDATION. FIX ALL OF THESE ISSUES:\n${errorSummary}`;
    }
  }

  const finalCheck = validateWeekData(candidate);
  if (!finalCheck.valid) {
    console.error('Final validation failed:', finalCheck.issues);
    process.exit(1);
  }

  if (dryRun) {
    console.log(`✓ Dry run complete: ${candidate.recipes.length} valid recipes for ${weekId}. No files written.`);
    return;
  }

  if (!skipImages && !mockMode) {
    console.log(`Generating ${candidate.recipes.length} overhead .webp meal photos...`);
    for (const recipe of candidate.recipes) {
      const outPath = await generateMealWebp(provider, recipe.id, recipe.title, MEALS_DIR);
      console.log(`  ✓ ${outPath}`);
    }
    const validIds = new Set(candidate.recipes.map((r) => r.id));
    const removed = cleanupStaleImages(validIds);
    if (removed > 0) {
      console.log(`  Cleaned up ${removed} stale meal photo(s).`);
    }
  } else {
    console.log('Skipping image generation (--skip-images or --mock).');
  }

  writeJsonAtomically(WEEK_JSON_PATH, candidate);
  console.log(`✓ Wrote ${WEEK_JSON_PATH} (${candidate.recipes.length} recipes, week_id=${candidate.week_id}).`);
}

main().catch((err) => {
  console.error('generate-week failed:', err);
  process.exit(1);
});
