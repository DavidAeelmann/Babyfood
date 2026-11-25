import { describe, expect, it } from 'vitest';
import {
  buildShareUrl,
  decodeCheckedBitmask,
  decodeShareHash,
  encodeSharePayload,
} from '../src/lib/shareSync';
import type { GroceryItem } from '../src/types/recipe';

describe('shareSync URL hash encoding/decoding', () => {
  const sampleGroceries: GroceryItem[] = [
    {
      key: 'sweet_potato::g',
      canonical_id: 'sweet_potato',
      name: 'Sweet potatoes',
      quantity: 1200,
      unit: 'g',
      aisle: 'Produce',
      is_pantry_staple: false,
      meals: ['Dinner 1'],
    },
    {
      key: 'olive_oil::ml',
      canonical_id: 'olive_oil',
      name: 'Olive oil',
      quantity: 60,
      unit: 'ml',
      aisle: 'Pantry',
      is_pantry_staple: true,
      meals: ['Dinner 1'],
    },
  ];

  it('round-trips household config, enabledSlots, weekGrid, customItems, and checked bitmask', () => {
    const hash = encodeSharePayload({
      weekId: '2026-W48',
      household: {
        adults: 3,
        activeBrackets: ['6_9m', '12_24m'],
        excludedAllergens: ['peanut', 'sesame'],
      },
      enabledSlots: {
        breakfast: true,
        lunch: false,
        snack: false,
        dinner: true,
      },
      weekGrid: [
        {
          breakfast: 'banana-cinnamon-porridge',
          lunch: 'avocado-egg-toast-strips',
          snack: 'banana-oat-baby-muffins',
          dinner: 'lemon-herb-baked-salmon',
        },
      ],
      plannedIds: ['lemon-herb-baked-salmon'],
      customItems: [
        { id: 'c1', name: 'Diapers', aisle: 'Pantry', checked: true },
      ],
      groceryItems: sampleGroceries,
      checkedGroceries: { 'olive_oil::ml': true },
    });

    expect(hash.startsWith('#s=')).toBe(true);

    const decoded = decodeShareHash(hash);
    expect(decoded).not.toBeNull();
    expect(decoded?.w).toBe('2026-W48');
    expect(decoded?.h.adults).toBe(3);
    expect(decoded?.h.excludedAllergens).toEqual(['peanut', 'sesame']);
    expect(decoded?.s.breakfast).toBe(true);
    expect(decoded?.s.lunch).toBe(false);
    expect(decoded?.c).toHaveLength(1);

    const checkedMap = decodeCheckedBitmask(decoded!.k, sampleGroceries);
    expect(checkedMap).toEqual({ 'olive_oil::ml': true });

    const fullUrl = buildShareUrl('https://example.github.io/Babyfood/#old', {
      weekId: '2026-W48',
      household: { adults: 2, activeBrackets: ['6_9m'], excludedAllergens: [] },
      enabledSlots: { breakfast: false, lunch: false, snack: false, dinner: true },
      weekGrid: [],
      plannedIds: ['lemon-herb-baked-salmon'],
      customItems: [],
      groceryItems: sampleGroceries,
      checkedGroceries: {},
    });
    expect(fullUrl.startsWith('https://example.github.io/Babyfood/#s=')).toBe(true);
  });

  it('returns null safely for malformed or empty hashes', () => {
    expect(decodeShareHash('')).toBeNull();
    expect(decodeShareHash('#s=invalid_garbage_123')).toBeNull();
  });
});
