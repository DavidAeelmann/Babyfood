import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type {
  CustomGroceryItem,
  DayPlan,
  EnabledSlots,
  GroceryItem,
  HouseholdConfig,
} from '../types/recipe';

export interface SharePayload {
  v: 2;
  w: string; // week_id
  h: HouseholdConfig;
  s: EnabledSlots;
  g: DayPlan[];
  p: string[]; // planned_ids (dinners)
  c: CustomGroceryItem[];
  k: string; // checked grocery bitmask (base36 or binary string)
}

export function encodeCheckedBitmask(
  groceryItems: GroceryItem[],
  checkedGroceries: Record<string, boolean>,
): string {
  if (groceryItems.length === 0) return '';
  return groceryItems
    .map((item) => (checkedGroceries[item.key] ? '1' : '0'))
    .join('');
}

export function decodeCheckedBitmask(
  bitmask: string,
  groceryItems: GroceryItem[],
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (let i = 0; i < Math.min(bitmask.length, groceryItems.length); i += 1) {
    if (bitmask[i] === '1') {
      result[groceryItems[i].key] = true;
    }
  }
  return result;
}

export function encodeSharePayload(params: {
  weekId: string;
  household: HouseholdConfig;
  enabledSlots: EnabledSlots;
  weekGrid: DayPlan[];
  plannedIds: string[];
  customItems: CustomGroceryItem[];
  groceryItems: GroceryItem[];
  checkedGroceries: Record<string, boolean>;
}): string {
  const payload: SharePayload = {
    v: 2,
    w: params.weekId,
    h: params.household,
    s: params.enabledSlots,
    g: params.weekGrid,
    p: params.plannedIds,
    c: params.customItems,
    k: encodeCheckedBitmask(params.groceryItems, params.checkedGroceries),
  };
  const compressed = compressToEncodedURIComponent(JSON.stringify(payload));
  return `#s=${compressed}`;
}

export function buildShareUrl(
  baseUrl: string,
  params: Parameters<typeof encodeSharePayload>[0],
): string {
  const cleanBase = baseUrl.split('#')[0];
  return `${cleanBase}${encodeSharePayload(params)}`;
}

export function decodeShareHash(hash: string): SharePayload | null {
  try {
    if (!hash || !hash.includes('s=')) return null;
    const raw = hash.replace(/^#/, '');
    const match = raw.match(/(?:^|&)s=([^&]+)/);
    const token = match ? match[1] : raw.startsWith('s=') ? raw.slice(2) : null;
    if (!token) return null;

    const json = decompressFromEncodedURIComponent(token);
    if (!json) return null;
    const parsed = JSON.parse(json) as Partial<SharePayload>;

    if (
      parsed.v !== 2 ||
      typeof parsed.w !== 'string' ||
      !parsed.h ||
      !parsed.s ||
      !Array.isArray(parsed.g) ||
      !Array.isArray(parsed.p)
    ) {
      return null;
    }

    return {
      v: 2,
      w: parsed.w,
      h: parsed.h,
      s: parsed.s,
      g: parsed.g,
      p: parsed.p,
      c: Array.isArray(parsed.c) ? parsed.c : [],
      k: typeof parsed.k === 'string' ? parsed.k : '',
    };
  } catch {
    return null;
  }
}
