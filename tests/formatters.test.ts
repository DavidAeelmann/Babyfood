import { describe, expect, it } from 'vitest';
import {
  formatCulinaryNumber,
  formatIsoWeekRangePt,
  formatStepText,
} from '../src/lib/formatters';
import { formatQuantity } from '../src/lib/groceryAggregator';

describe('formatters', () => {
  it('formats ISO week IDs into readable PT-PT date ranges', () => {
    expect(formatIsoWeekRangePt('2026-W48')).toBe('23–29 Nov');
    expect(formatIsoWeekRangePt('2026-W49')).toBe('30 Nov–6 Dez');
    expect(formatIsoWeekRangePt('2026-W01')).toBe('29 Dez–4 Jan');
    expect(formatIsoWeekRangePt('invalid')).toBe('invalid');
  });

  it('formats decimal quantities into Unicode culinary fractions', () => {
    expect(formatCulinaryNumber(0.25)).toBe('¼');
    expect(formatCulinaryNumber(0.5)).toBe('½');
    expect(formatCulinaryNumber(0.75)).toBe('¾');
    expect(formatCulinaryNumber(1.5)).toBe('1½');
    expect(formatCulinaryNumber(2)).toBe('2');
    expect(formatQuantity(0.5, 'tbsp')).toBe('½ c. sopa');
    expect(formatQuantity(1.5, 'tsp')).toBe('1½ c. chá');
  });

  it('strips redundant leading all-caps prefixes from seasoning split steps', () => {
    expect(
      formatStepText({
        order: 3,
        text: 'SEPARAÇÃO DE TEMPERO: Retire as porções do bebé e da criança antes de temperar com sal.',
        is_seasoning_split_point: true,
      }),
    ).toBe('Retire as porções do bebé e da criança antes de temperar com sal.');

    expect(
      formatStepText({
        order: 3,
        text: 'Misture carne, cenoura ralada, ovo e aveia antes de salgar.',
        is_seasoning_split_point: true,
      }),
    ).toBe('Misture carne, cenoura ralada, ovo e aveia antes de salgar.');
  });
});
