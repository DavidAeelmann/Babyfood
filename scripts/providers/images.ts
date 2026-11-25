import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { LlmProvider } from './llm';

function buildFoodPhotoPrompt(title: string): string {
  return `Clean overhead natural-light food photography of ${title}, served on a matte warm cream ceramic plate or bowl, wooden kitchen table, soft morning daylight, editorial cookbook style, no text, no watermarks`;
}

let cachedImageCandidates: { generateContent: string[]; predict: string[] } | null = null;

async function discoverGeminiImageModels(
  apiKey: string,
): Promise<{ generateContent: string[]; predict: string[] }> {
  if (cachedImageCandidates) {
    return cachedImageCandidates;
  }
  const generateContent: string[] = [];
  const predict: string[] = [];
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (res.ok) {
      const data = (await res.json()) as {
        models?: Array<{
          name?: string;
          supportedGenerationMethods?: string[];
        }>;
      };
      for (const m of data.models ?? []) {
        const name = (m.name ?? '').replace(/^models\//, '');
        if (!name || !/image/i.test(name)) continue;
        const methods = m.supportedGenerationMethods ?? [];
        if (methods.includes('generateContent')) {
          generateContent.push(name);
        }
        if (methods.includes('predict')) {
          predict.push(name);
        }
      }
    }
  } catch {
    // Fallback to static candidates below
  }

  for (const fallback of [
    'gemini-3.1-flash-image-preview',
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-preview-image-generation',
  ]) {
    if (!generateContent.includes(fallback)) generateContent.push(fallback);
  }
  for (const fallback of ['imagen-3.0-generate-002', 'imagen-4.0-generate-001']) {
    if (!predict.includes(fallback)) predict.push(fallback);
  }

  cachedImageCandidates = { generateContent, predict };
  return cachedImageCandidates;
}

async function generateWithGeminiNative(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<Buffer> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini image (${model}) error (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string; mimeType?: string };
        }>;
      };
    }>;
  };
  for (const cand of data.candidates ?? []) {
    for (const part of cand.content?.parts ?? []) {
      const b64 = part.inlineData?.data;
      if (b64) {
        return Buffer.from(b64, 'base64');
      }
    }
  }
  throw new Error(`Gemini image (${model}) returned no inline image bytes.`);
}

async function generateWithImagenPredict(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<Buffer> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '4:3',
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini Imagen (${model}) error (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    predictions?: Array<{ bytesBase64Encoded?: string }>;
  };
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) {
    throw new Error(`Gemini Imagen (${model}) returned no image bytes.`);
  }
  return Buffer.from(b64, 'base64');
}

async function generateWithGeminiImagen(prompt: string): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY / API_KEY is required for Gemini image generation.');
  }

  const explicit = process.env.GEMINI_IMAGE_MODEL;
  const discovered = await discoverGeminiImageModels(apiKey);
  const attempts: Array<() => Promise<Buffer>> = [];

  if (explicit) {
    if (explicit.includes('imagen')) {
      attempts.push(() => generateWithImagenPredict(apiKey, explicit, prompt));
    } else {
      attempts.push(() => generateWithGeminiNative(apiKey, explicit, prompt));
    }
  }
  for (const model of discovered.generateContent) {
    if (model !== explicit) {
      attempts.push(() => generateWithGeminiNative(apiKey, model, prompt));
    }
  }
  for (const model of discovered.predict) {
    if (model !== explicit) {
      attempts.push(() => generateWithImagenPredict(apiKey, model, prompt));
    }
  }

  let lastError: unknown;
  for (const fn of attempts) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Try next candidate on 404/400 unsupported; rethrow immediately on auth or quota exhaustion? Still try fallback model in case quota is per-model, unless all fail.
      if (msg.includes('(401)') || msg.includes('(403)')) {
        throw err;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Gemini image generation failed for all discovered models.');
}

async function generateWithOpenAI(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY / API_KEY is required for OpenAI image generation.');
  }

  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      size: '1024x1024',
      n: 1,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI Image error (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI Image API returned no image bytes.');
  }
  return Buffer.from(b64, 'base64');
}

function buildFallbackPlateSvg(recipeId: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="#E6DAC7"/>
    <circle cx="400" cy="300" r="190" fill="#FAF7F0" stroke="#DDD3C2" stroke-width="4"/>
    <rect x="295" y="215" width="135" height="68" rx="22" fill="#EE8365" transform="rotate(-10 360 250)"/>
    <circle cx="465" cy="240" r="32" fill="#3E8248"/>
    <circle cx="505" cy="265" r="26" fill="#4E9658"/>
    <rect x="315" y="325" width="76" height="28" rx="11" fill="#E98135"/>
    <rect x="405" y="330" width="72" height="26" rx="11" fill="#F0D99B"/>
    <title>${recipeId}</title>
  </svg>`;
  return Buffer.from(svg, 'utf-8');
}

async function writeResizedWebp(rawBuffer: Buffer, outPath: string): Promise<string> {
  mkdirSync(dirname(outPath), { recursive: true });
  const { default: sharp } = await import('sharp');
  const webpBuffer = await sharp(rawBuffer)
    .resize(800, 600, { fit: 'cover' })
    .webp({ quality: 82 })
    .toBuffer();
  writeFileSync(outPath, webpBuffer);
  return outPath;
}

export async function generateMealWebpStrict(
  provider: LlmProvider,
  recipeId: string,
  title: string,
  outputDir: string,
): Promise<string> {
  const prompt = buildFoodPhotoPrompt(title);
  const rawBuffer =
    provider === 'openai'
      ? await generateWithOpenAI(prompt)
      : await generateWithGeminiImagen(prompt);
  const outPath = resolve(outputDir, `${recipeId}.webp`);
  return writeResizedWebp(rawBuffer, outPath);
}

export async function generateMealWebp(
  provider: LlmProvider,
  recipeId: string,
  title: string,
  outputDir: string,
): Promise<string> {
  const prompt = buildFoodPhotoPrompt(title);
  let rawBuffer: Buffer;
  try {
    rawBuffer =
      provider === 'openai'
        ? await generateWithOpenAI(prompt)
        : await generateWithGeminiImagen(prompt);
  } catch (err) {
    console.warn(`Image API fallback for ${recipeId}: ${err instanceof Error ? err.message : String(err)}`);
    rawBuffer = buildFallbackPlateSvg(recipeId);
  }

  const outPath = resolve(outputDir, `${recipeId}.webp`);
  return writeResizedWebp(rawBuffer, outPath);
}
