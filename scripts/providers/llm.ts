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
    `2. Return 22 to 28 unique recipes adapted to a Portuguese household with toddlers (12-24m / 2-4y) and babies (6-12m): 7 planned_ids for dinners, 5 dinner swap options, 4 lunch_ids (including Portuguese soups like caldo verde sem chouriço/sal, canja sem sal, sopa de legumes, pataniscas no forno), 4 breakfast_ids (papas de aveia, papas de maizena sem açúcar, panquecas sem açúcar, pão de mistura com requeijão/abacate), and 4 snack_ids (queques saudáveis, bolinhas de aveia e tâmara, marmelo assado, zero açúcar adicionado ou mel).`,
    `3. Use realistic weeknight prep/cook times (<= 45 min total) and strong ingredient overlap across recipes (shared canonical_id slugs like sweet_potato, broccoli_florets, carrot, garlic_clove, yellow_onion, olive_oil, baby_spinach, rice, hake_white_fish, chicken_breast) so the grocery list is compact.`,
    `4. Every recipe id must be kebab-case and image_url must be "meals/{id}.webp".`,
    `5. Metric units ONLY: g, ml, pcs, tbsp, tsp. canonical_id must be snake_case and consistent across recipes.`,
    `6. Every recipe must have base_servings: 4, min_age_months: 6, and ZERO honey ("mel") or added sugar anywhere when min_age_months < 12.`,
    `7. Every recipe must have exactly ONE step with is_seasoning_split_point: true, occurring BEFORE any salt or high-sodium sauce is added.`,
    `8. Every recipe must set meal_slot (dinner, lunch, breakfast, or snack) and provide age_adaptations for all 5 brackets (6_9m, 9_12m, 12_24m, 2_4y, 4y_plus) with an explicit cut_shape (finger-strip, pincer-dice, quartered-lengthwise, smashed-flat, flaked-fine, or fork-mash).`,
    `9. Any round choking hazard (cherry tomatoes / tomate cherry, chickpeas / grão-de-bico, grapes / uvas, blueberries / mirtilos, peas / ervilhas, corn kernels / milho) MUST include explicit PT-PT safe prep instructions (em quartos, esmagados, achatados, triturados) in 6_9m, 9_12m, and 12_24m.`,
  ];

  if (preferences) {
    if (preferences.favorites && preferences.favorites.length > 0) {
      lines.push(
        `10. HOUSEHOLD FAVORITES (include similar dishes, flavor profiles, and cooking styles): ${preferences.favorites.join(', ')}.`,
      );
    }
    if (preferences.likedIngredients && preferences.likedIngredients.length > 0) {
      lines.push(
        `11. PREFERRED INGREDIENTS (lean toward using these frequently): ${preferences.likedIngredients.join(', ')}.`,
      );
    }
    if (preferences.blocked && preferences.blocked.length > 0) {
      lines.push(
        `12. HOUSEHOLD BLOCKED (DO NOT include these dishes or close variations): ${preferences.blocked.join(', ')}.`,
      );
    }
    if (preferences.dislikedIngredients && preferences.dislikedIngredients.length > 0) {
      lines.push(
        `13. AVOID / MINIMIZE INGREDIENTS linked to blocked recipes: ${preferences.dislikedIngredients.join(', ')}.`,
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

async function callGemini(prompt: string): Promise<WeekData> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY / API_KEY is not set. Add it to your environment or repository secrets.');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseJsonSchema: sanitizeSchemaForGemini(weekGenerationJsonSchema),
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }
  return JSON.parse(text) as WeekData;
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
