import type { RecipeStep } from '../types/recipe';

const PT_SHORT_MONTHS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

/**
 * Formats an ISO week string (e.g. "2026-W48") into a humanized PT-PT date range
 * such as "23–29 Nov" or "30 Nov–6 Dez".
 */
export function formatIsoWeekRangePt(weekId?: string): string {
  if (!weekId) return '';
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekId;

  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(week) || week < 1 || week > 53) {
    return weekId;
  }

  // ISO week 1 always contains Jan 4
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // 1 = Monday .. 7 = Sunday
  const week1Monday = new Date(Date.UTC(year, 0, 4 - (jan4Day - 1)));
  const monday = new Date(week1Monday.getTime() + (week - 1) * 7 * 86_400_000);
  const sunday = new Date(monday.getTime() + 6 * 86_400_000);

  const d1 = monday.getUTCDate();
  const m1 = PT_SHORT_MONTHS[monday.getUTCMonth()];
  const d2 = sunday.getUTCDate();
  const m2 = PT_SHORT_MONTHS[sunday.getUTCMonth()];

  if (m1 === m2) {
    return `${d1}–${d2} ${m1}`;
  }
  return `${d1} ${m1}–${d2} ${m2}`;
}

/**
 * Formats a numeric quantity using common Unicode culinary fractions
 * (e.g. 0.5 -> "½", 0.25 -> "¼", 0.75 -> "¾", 1.5 -> "1½").
 */
export function formatCulinaryNumber(quantity: number): string {
  if (!Number.isFinite(quantity)) return String(quantity);

  const whole = Math.floor(quantity + 1e-6);
  const frac = quantity - whole;

  const fractionMap: Array<[number, string]> = [
    [0.25, '¼'],
    [1 / 3, '⅓'],
    [0.5, '½'],
    [2 / 3, '⅔'],
    [0.75, '¾'],
  ];

  if (frac < 0.04) {
    return String(whole);
  }
  if (frac > 0.96) {
    return String(whole + 1);
  }

  for (const [target, glyph] of fractionMap) {
    if (Math.abs(frac - target) <= 0.04) {
      return whole > 0 ? `${whole}${glyph}` : glyph;
    }
  }

  return Number.isInteger(quantity)
    ? quantity.toString()
    : quantity.toFixed(1).replace(/\.0$/, '');
}

/**
 * Strips redundant leading all-caps prefixes (like "SEPARAÇÃO DE TEMPERO: ")
 * from seasoning-split step instructions when the dedicated alert pill is shown.
 */
export function formatStepText(step: RecipeStep): string {
  const raw = step.text.trim();
  if (!step.is_seasoning_split_point) return raw;

  const stripped = raw.replace(
    /^[A-ZÀ-ÚÇ][A-ZÀ-ÚÇ0-9\s\-–—/]{2,}:\s*/,
    '',
  );
  if (!stripped) return raw;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}
