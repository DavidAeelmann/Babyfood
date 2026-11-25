import { DEFAULT_HOUSEHOLD } from './constants';
import type { CustomGroceryItem, HouseholdConfig } from '../types/recipe';

const STORAGE_KEY = 'littletable_planner_v1';

export interface PersistedState {
  weekId: string | null;
  household: HouseholdConfig;
  plannedIds: string[];
  lockedIndices: number[];
  checkedGroceries: Record<string, boolean>;
  hidePantryStaples: boolean;
  customItems: CustomGroceryItem[];
  prepChecked: Record<string, Record<string, boolean>>;
}

export function resolveAssetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL || './';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = relativePath.replace(/^\/+/, '');
  return `${cleanBase}${cleanPath}`;
}

export function getDefaultPersistedState(): PersistedState {
  return {
    weekId: null,
    household: DEFAULT_HOUSEHOLD,
    plannedIds: [],
    lockedIndices: [],
    checkedGroceries: {},
    hidePantryStaples: false,
    customItems: [],
    prepChecked: {},
  };
}

export function loadPersistedState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPersistedState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const defaults = getDefaultPersistedState();
    return {
      weekId: typeof parsed.weekId === 'string' ? parsed.weekId : null,
      household: {
        adults:
          typeof parsed.household?.adults === 'number'
            ? Math.max(1, Math.min(4, parsed.household.adults))
            : defaults.household.adults,
        activeBrackets: Array.isArray(parsed.household?.activeBrackets)
          ? parsed.household.activeBrackets
          : defaults.household.activeBrackets,
        excludedAllergens: Array.isArray(parsed.household?.excludedAllergens)
          ? parsed.household.excludedAllergens
          : defaults.household.excludedAllergens,
      },
      plannedIds: Array.isArray(parsed.plannedIds) ? parsed.plannedIds : [],
      lockedIndices: Array.isArray(parsed.lockedIndices) ? parsed.lockedIndices : [],
      checkedGroceries:
        parsed.checkedGroceries && typeof parsed.checkedGroceries === 'object'
          ? parsed.checkedGroceries
          : {},
      hidePantryStaples: Boolean(parsed.hidePantryStaples),
      customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
      prepChecked:
        parsed.prepChecked && typeof parsed.prepChecked === 'object'
          ? parsed.prepChecked
          : {},
    };
  } catch {
    return getDefaultPersistedState();
  }
}

export function savePersistedState(state: PersistedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private mode storage errors
  }
}
