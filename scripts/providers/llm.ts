import { weekGenerationJsonSchema } from '../recipeSchema';
import type { WeekData } from '../../src/types/recipe';

export type LlmProvider = 'gemini' | 'openai';

export function getLlmProvider(): LlmProvider {
  const raw = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  if (raw === 'openai') return 'openai';
  return 'gemini';
}

export function buildWeeklyPrompt(weekId: string): string {
  return [
    `Generate a complete weekly family & baby-safe dinner plan for ISO week "${weekId}".`,
    `Requirements:`,
    `1. Return 16 to 20 unique recipes: 7 planned_ids for dinners, 3 to 5 dinner swap bench recipes, 2 to 3 healthy breakfast_ids (e.g., oat porridge, egg fingers, mini pancakes with zero added sugar or honey), 2 to 3 healthy lunch_ids (e.g., avocado toast strips, lentil soup, veggie fritters), and 2 to 3 healthy batch-prep snack_ids (e.g., banana oat muffins, sweet potato soft cookies with zero added sugar or honey).`,
    `2. Use realistic weeknight prep/cook times (<= 45 min total) and strong ingredient overlap across recipes (shared canonical_id slugs like sweet_potato, broccoli_florets, carrot, garlic_clove, yellow_onion, olive_oil, baby_spinach, basmati_rice, pasta_penne) so the grocery list is compact.`,
    `3. Every recipe id must be kebab-case and image_url must be "meals/{id}.webp".`,
    `4. Metric units ONLY: g, ml, pcs, tbsp, tsp. canonical_id must be snake_case and consistent across recipes.`,
    `5. Every recipe must have base_servings: 4, min_age_months: 6, and ZERO honey anywhere when min_age_months < 12.`,
    `6. Every recipe must have exactly ONE step with is_seasoning_split_point: true, occurring BEFORE any salt or high-sodium sauce (like soy sauce) is added.`,
    `7. Every recipe must provide age_adaptations for all 5 brackets: 6_9m, 9_12m, 12_24m, 2_4y, 4y_plus.`,
    `8. Any round choking hazard (cherry tomatoes, chickpeas, grapes, blueberries, peas, corn kernels, etc.) MUST include explicit prep instructions (quartered, mashed, flattened, smashed) in 6_9m, 9_12m, and 12_24m.`,
  ].join('\n');
}

async function callGemini(prompt: string): Promise<WeekData> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Add it to your environment or .env file.');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseJsonSchema: weekGenerationJsonSchema,
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Add it to your environment or .env file.');
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
