import { weekGenerationJsonSchema } from '../recipeSchema';
import type { WeekData } from '../../src/types/recipe';

export type LlmProvider = 'gemini' | 'openai';

export function getLlmProvider(): LlmProvider {
  const raw = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (raw === 'openai') return 'openai';
  if (raw === 'gemini') return 'gemini';
  const apiKey = process.env.OPENAI_API_KEY || process.env.API_KEY || '';
  if (process.env.OPENAI_API_KEY || apiKey.startsWith('sk-')) return 'openai';
  return 'gemini';
}

export interface WeeklyPromptPreferences {
  favorites?: string[];
  blocked?: string[];
  likedIngredients?: string[];
  dislikedIngredients?: string[];
}

export function buildWeeklyPrompt(
  weekId: string,
  preferences?: WeeklyPromptPreferences,
): string {
  const lines = [
    `Generate a complete weekly Portuguese family & baby/toddler-safe meal plan in European Portuguese (PT-PT) for ISO week "${weekId}".`,
    `Requirements:`,
    `1. Write ALL recipe titles, ingredient names, step instructions, and age_adaptations in natural European Portuguese (PT-PT — e.g. pequeno-almoço, lanche, curgete, brócolos, grão-de-bico, pescada, bacalhau demolhado, requeijão).`,
    `2. Return 16 to 20 unique recipes adapted to a Portuguese household with toddlers (12-24m / 2-4y) and babies (6-12m): planned_ids MUST list EXACTLY 7 dinner recipe IDs, plus 3 dinner swap options, 2 lunch_ids (Portuguese soups/meals), 2 breakfast_ids, and 2 snack_ids.`,
    `3. Use realistic weeknight prep/cook times (<= 45 min total). Balance practical pantry reuse with real culinary variety: everyday aromatics, herbs, spices, and fats (olive_oil, garlic_clove, yellow_onion, lemon, cinnamon, cumin, parsley, coriander) may repeat freely across recipes, and varying rice/grain varieties (e.g. carolino_rice, basmati_rice, pasta, potato, sourdough_bread, couscous) is encouraged.`,
    `4. INGREDIENT & PROTEIN DIVERSITY (CRITICAL): Do NOT repeat signature/distinctive ingredients or proteins excessively across a single week! Keep distinctive tubers/produce (especially sweet_potato, butternut_squash, beetroot, broccoli_florets, avocado, mango, green_peas) RARE: at most 1x across the 7 planned_ids dinners and <= 2x across all slots combined. Likewise, NEVER repeat the same fish or meat cut across the 7 planned dinners (e.g., max 1x hake/pescada, max 1x salmon, max 1x cod/bacalhau, max 1x chicken, max 1x turkey, max 1x beef, alternating fish, poultry, meat, and legumes across days).`,
    `5. Every recipe id must be kebab-case and image_url must be "meals/{id}.webp".`,
    `6. Metric units ONLY: g, ml, pcs, tbsp, tsp. canonical_id must be snake_case and consistent across recipes.`,
    `7. Every recipe must have base_servings: 4, min_age_months: 6, ZERO honey anywhere in ingredients, and use phrases like "sem açúcar adicionado" (never use the word honey/mel) in steps.`,
    `8. Every recipe must have exactly ONE step with is_seasoning_split_point: true, occurring BEFORE any salt or high-sodium sauce is added.`,
    `9. Every recipe must set meal_slot (dinner, lunch, breakfast, or snack) and provide age_adaptations for all 5 brackets (6_9m, 9_12m, 12_24m, 2_4y, 4y_plus) with an explicit cut_shape (finger-strip, pincer-dice, quartered-lengthwise, smashed-flat, flaked-fine, or fork-mash). Keep step and adaptation notes crisp (<= 18 words each).`,
    `10. Any round choking hazard (cherry tomatoes / tomate cherry, chickpeas / grão-de-bico, grapes / uvas, blueberries / mirtilos, peas / ervilhas, corn kernels / milho) MUST include explicit PT-PT safe prep instructions (em quartos, esmagados, achatados, triturados) in 6_9m, 9_12m, and 12_24m.`,
  ];

  if (preferences) {
    if (preferences.favorites && preferences.favorites.length > 0) {
      lines.push(
        `11. HOUSEHOLD FAVORITES (include similar dishes, flavor profiles, and cooking styles): ${preferences.favorites.join(', ')}.`,
      );
    }
    if (preferences.likedIngredients && preferences.likedIngredients.length > 0) {
      lines.push(
        `12. PREFERRED INGREDIENTS (lean toward using these frequently): ${preferences.likedIngredients.join(', ')}.`,
      );
    }
    if (preferences.blocked && preferences.blocked.length > 0) {
      lines.push(
        `13. HOUSEHOLD BLOCKED (DO NOT include these dishes or close variations): ${preferences.blocked.join(', ')}.`,
      );
    }
    if (preferences.dislikedIngredients && preferences.dislikedIngredients.length > 0) {
      lines.push(
        `14. AVOID / MINIMIZE INGREDIENTS linked to blocked recipes: ${preferences.dislikedIngredients.join(', ')}.`,
      );
    }
  }

  return lines.join('\n');
}

function sanitizeSchemaForGemini(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(sanitizeSchemaForGemini);
  }
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'additionalProperties' || k === 'minItems' || k === 'maxItems') {
        continue;
      }
      out[k] = sanitizeSchemaForGemini(v);
    }
    return out;
  }
  return node;
}

async function discoverGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      models?: Array<{
        name?: string;
        supportedGenerationMethods?: string[];
      }>;
    };
    const all = (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => (m.name ?? '').replace(/^models\//, ''))
      .filter(
        (name) =>
          name.includes('gemini') &&
          name.includes('flash') &&
          !name.includes('2.0') &&
          !name.includes('2.5') &&
          !name.includes('omni') &&
          !name.includes('image') &&
          !name.includes('audio') &&
          !name.includes('tts') &&
          !name.includes('thinking') &&
          !name.includes('live') &&
          !name.includes('latest'),
      );
    const parseVersion = (s: string) => {
      const m = s.match(/gemini-(\d+(?:\.\d+)?)/);
      return m ? Number.parseFloat(m[1]) : 0;
    };
    return all.sort((a, b) => {
      const liteDiff = Number(a.includes('lite')) - Number(b.includes('lite'));
      if (liteDiff !== 0) return liteDiff;
      const previewDiff =
        Number(a.includes('exp') || a.includes('preview')) -
        Number(b.includes('exp') || b.includes('preview'));
      if (previewDiff !== 0) return previewDiff;
      return parseVersion(b) - parseVersion(a);
    });
  } catch {
    return [];
  }
}

async function callGemini(prompt: string): Promise<WeekData> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY / API_KEY is not set. Add it to your environment or repository secrets.');
  }

  let candidateModels: string[];
  if (process.env.GEMINI_MODEL) {
    candidateModels = [process.env.GEMINI_MODEL];
  } else {
    const discovered = await discoverGeminiModels(apiKey);
    console.log(`Discovered Gemini Flash models: ${discovered.join(', ') || '(none)'}`);
    candidateModels = Array.from(new Set(['gemini-3.8-flash', ...discovered])).slice(0, 6);
  }

  const sanitizedSchema = sanitizeSchemaForGemini(weekGenerationJsonSchema);
  let lastError = 'Unknown Gemini error';

  for (const model of candidateModels) {
    let useThinkingBudgetZero = true;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const generationConfig: Record<string, unknown> = {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseJsonSchema: sanitizedSchema,
      };
      if (useThinkingBudgetZero) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }
      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(90_000),
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig,
          }),
        });
      } catch (err) {
        lastError = `Gemini fetch failed (${model}): ${err instanceof Error ? err.message : String(err)}`;
        console.warn(lastError);
        break;
      }

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error(`Gemini (${model}) returned an empty response.`);
        }
        console.log(`✓ Generated response using ${model}.`);
        return JSON.parse(text) as WeekData;
      }

      const errBody = await res.text();
      lastError = `Gemini API error (${res.status} on ${model}): ${errBody}`;
      if (res.status === 400 && useThinkingBudgetZero && errBody.includes('thinking')) {
        console.warn(`${model} rejected thinkingConfig, retrying without it...`);
        useThinkingBudgetZero = false;
        continue;
      }
      if (res.status === 503 || res.status === 429) {
        console.warn(`${model} temporary ${res.status} (attempt ${attempt}/2), waiting 3s...`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      if (res.status === 404 || res.status === 400) {
        console.warn(`${model} returned ${res.status}, trying next model...`);
        break;
      }
      throw new Error(lastError);
    }
  }

  throw new Error(lastError);
}

async function callOpenAI(prompt: string): Promise<WeekData> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY / API_KEY is not set. Add it to your environment or repository secrets.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You are a pediatric nutritionist and family meal planner. Output strictly valid JSON matching the provided schema.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'weekly_meal_plan',
          strict: true,
          schema: weekGenerationJsonSchema,
        },
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }
  return JSON.parse(content) as WeekData;
}

export async function generateWeekWithLlm(
  provider: LlmProvider,
  prompt: string,
): Promise<WeekData> {
  return provider === 'openai' ? callOpenAI(prompt) : callGemini(prompt);
}
