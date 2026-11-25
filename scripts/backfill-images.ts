import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LlmProvider } from './providers/llm';
import { generateMealWebpStrict } from './providers/images';
import type { WeekData } from '../src/types/recipe';

const WEEK_PATH = resolve(process.cwd(), 'public/data/week-current.json');
const MEALS_DIR = resolve(process.cwd(), 'public/meals');

function resolveProvider(): LlmProvider {
  const explicit = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (explicit === 'openai' || explicit === 'gemini') {
    return explicit;
  }
  if (process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY && !process.env.API_KEY) {
    return 'openai';
  }
  return 'gemini';
}

async function main(): Promise<void> {
  const maxImages = Number.parseInt(process.env.MAX_IMAGES || '15', 10) || 15;
  const thresholdBytes = Number.parseInt(process.env.ILLUSTRATION_MAX_BYTES || '45000', 10) || 45000;
  const provider = resolveProvider();

  const data = JSON.parse(readFileSync(WEEK_PATH, 'utf-8')) as WeekData;
  const candidates = data.recipes.filter((r) => {
    const filePath = resolve(process.cwd(), 'public', r.image_url);
    if (!existsSync(filePath)) return true;
    return statSync(filePath).size < thresholdBytes;
  });

  if (candidates.length === 0) {
    console.log('✓ All recipes already have high-resolution photography.');
    return;
  }

  const batch = candidates.slice(0, maxImages);
  console.log(
    `Backfilling AI photography for up to ${batch.length} of ${candidates.length} illustrated/missing recipes using ${provider}...`,
  );

  let upgraded = 0;
  for (const recipe of batch) {
    try {
      await generateMealWebpStrict(provider, recipe.id, recipe.title, MEALS_DIR);
      upgraded += 1;
      console.log(`  ✓ [${upgraded}/${batch.length}] ${recipe.id}.webp`);
      // Brief pause between requests to respect burst limits
      await new Promise((r) => setTimeout(r, 1200));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ⚠ Stopped backfill on ${recipe.id}: ${msg.slice(0, 240)}`);
      break;
    }
  }

  console.log(`Done. Upgraded ${upgraded} recipe image(s) to AI photography.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
