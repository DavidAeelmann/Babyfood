import { ADULT_WEIGHT, AISLE_ORDER, BRACKET_META, UNIT_LABELS } from './constants';
import { formatCulinaryNumber } from './formatters';
import type {
  Aisle,
  GroceryItem,
  HouseholdConfig,
  MetricUnit,
  Recipe,
} from '../types/recipe';

export function getTotalHouseholdWeight(household: HouseholdConfig): number {
  const adultsWeight = Math.max(1, Math.min(4, household.adults)) * ADULT_WEIGHT;
  const childrenWeight = household.activeBrackets.reduce(
    (sum, key) => sum + (BRACKET_META[key]?.weight ?? 0),
    0,
  );
  return Number((adultsWeight + childrenWeight).toFixed(2));
}

export function getRecipeScaleFactor(
  household: HouseholdConfig,
  baseServings: number,
): number {
  const safeBase = baseServings > 0 ? baseServings : 4;
  return getTotalHouseholdWeight(household) / safeBase;
}

/**
 * Normalizes volume units (tbsp, tsp, ml) to ml so matching canonical_id
 * volume ingredients across different recipes merge cleanly into one row.
 */
export function normalizeIngredientUnit(
  quantity: number,
  unit: MetricUnit,
): { quantity: number; unit: MetricUnit } {
  if (unit === 'tbsp') {
    return { quantity: quantity * 15, unit: 'ml' };
  }
  if (unit === 'tsp') {
    return { quantity: quantity * 5, unit: 'ml' };
  }
  return { quantity, unit };
}

export function roundMetricQuantity(quantity: number, unit: MetricUnit): number {
  if (unit === 'pcs') {
    return Math.max(1, Math.ceil(quantity * 2) / 2);
  }
  if (unit === 'g' || unit === 'ml') {
    if (quantity < 20) return Math.max(1, Math.round(quantity));
    if (quantity < 100) return Math.round(quantity / 5) * 5;
    return Math.round(quantity / 10) * 10;
  }
  return Math.max(0.25, Math.round(quantity * 4) / 4);
}

export function formatQuantity(quantity: number, unit: MetricUnit): string {
  const formatted = formatCulinaryNumber(quantity);
  return `${formatted} ${UNIT_LABELS[unit] ?? unit}`;
}

export function aggregateGroceries(
  plannedRecipes: Recipe[],
  household: HouseholdConfig,
): GroceryItem[] {
  const merged = new Map<string, GroceryItem>();

  for (const recipe of plannedRecipes) {
    const scale = getRecipeScaleFactor(household, recipe.base_servings);

    for (const ing of recipe.ingredients) {
      const normalized = normalizeIngredientUnit(ing.quantity * scale, ing.unit);
      const key = `${ing.canonical_id}::${normalized.unit}`;

      const existing = merged.get(key);
      if (existing) {
        existing.quantity += normalized.quantity;
        if (!existing.meals.includes(recipe.title)) {
          existing.meals.push(recipe.title);
        }
        existing.is_pantry_staple = existing.is_pantry_staple && ing.is_pantry_staple;
      } else {
        merged.set(key, {
          key,
          canonical_id: ing.canonical_id,
          name: ing.name,
          quantity: normalized.quantity,
          unit: normalized.unit,
          aisle: ing.aisle,
          is_pantry_staple: ing.is_pantry_staple,
          meals: [recipe.title],
        });
      }
    }
  }

  return Array.from(merged.values())
    .map((item) => ({
      ...item,
      quantity: roundMetricQuantity(item.quantity, item.unit),
    }))
    .sort((a, b) => {
      const aisleDiff = AISLE_ORDER.indexOf(a.aisle) - AISLE_ORDER.indexOf(b.aisle);
      if (aisleDiff !== 0) return aisleDiff;
      return a.name.localeCompare(b.name);
    });
}

export function groupGroceriesByAisle(
  items: GroceryItem[],
): Array<{ aisle: Aisle; items: GroceryItem[] }> {
  const groups = new Map<Aisle, GroceryItem[]>();
  for (const aisle of AISLE_ORDER) {
    groups.set(aisle, []);
  }
  for (const item of items) {
    const list = groups.get(item.aisle);
    if (list) {
      list.push(item);
    }
  }
  return AISLE_ORDER.map((aisle) => ({
    aisle,
    items: groups.get(aisle) ?? [],
  })).filter((g) => g.items.length > 0);
}
