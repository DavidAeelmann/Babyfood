import { DEFAULT_ENABLED_SLOTS, DEFAULT_HOUSEHOLD } from './constants';
import type {
  CustomFirstFood,
  CustomGroceryItem,
  DayPlan,
  EnabledSlots,
  HouseholdConfig,
  Recipe,
  TriedFoodEntry,
} from '../types/recipe';

const STORAGE_KEY = 'littletable_planner_v1';

export interface PersistedState {
  weekId: string | null;
  household: HouseholdConfig;
  enabledSlots: EnabledSlots;
  plannedIds: string[];
  weekGrid: DayPlan[];
  includedBreakfastIds: string[];
  includedSnackIds: string[];
  lockedIndices: number[];
  checkedGroceries: Record<string, boolean>;
  hidePantryStaples: boolean;
  customItems: CustomGroceryItem[];
  prepChecked: Record<string, Record<string, boolean>>;
  stepsChecked: Record<string, Record<number, boolean>>;
  triedFoods: Record<string, TriedFoodEntry>;
  customFirstFoods: CustomFirstFood[];
  favoriteIds: string[];
  blockedIds: string[];
  customRecipes: Recipe[];
}

export function resolveAssetUrl(relativePath: string): string {
  if (/^(https?:|data:|blob:)/i.test(relativePath)) {
    return relativePath;
  }
  const base = import.meta.env.BASE_URL || './';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = relativePath.replace(/^\/+/, '');
  return `${cleanBase}${cleanPath}`;
}

export function getDefaultPersistedState(): PersistedState {
  return {
    weekId: null,
    household: DEFAULT_HOUSEHOLD,
    enabledSlots: { ...DEFAULT_ENABLED_SLOTS },
    plannedIds: [],
    weekGrid: [],
    includedBreakfastIds: [],
    includedSnackIds: [],
    lockedIndices: [],
    checkedGroceries: {},
    hidePantryStaples: false,
    customItems: [],
    prepChecked: {},
    stepsChecked: {},
    triedFoods: {},
    customFirstFoods: [],
    favoriteIds: [],
    blockedIds: [],
    customRecipes: [],
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
      enabledSlots: {
        breakfast: Boolean(parsed.enabledSlots?.breakfast ?? defaults.enabledSlots.breakfast),
        lunch: Boolean(parsed.enabledSlots?.lunch ?? defaults.enabledSlots.lunch),
        snack: Boolean(parsed.enabledSlots?.snack ?? defaults.enabledSlots.snack),
        dinner: Boolean(parsed.enabledSlots?.dinner ?? defaults.enabledSlots.dinner),
      },
      plannedIds: Array.isArray(parsed.plannedIds) ? parsed.plannedIds : [],
      weekGrid: Array.isArray(parsed.weekGrid) ? parsed.weekGrid : [],
      includedBreakfastIds: Array.isArray(parsed.includedBreakfastIds)
        ? parsed.includedBreakfastIds
        : [],
      includedSnackIds: Array.isArray(parsed.includedSnackIds)
        ? parsed.includedSnackIds
        : [],
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
      stepsChecked:
        parsed.stepsChecked && typeof parsed.stepsChecked === 'object'
          ? parsed.stepsChecked
          : {},
      triedFoods:
        parsed.triedFoods && typeof parsed.triedFoods === 'object'
          ? parsed.triedFoods
          : {},
      customFirstFoods: Array.isArray(parsed.customFirstFoods)
        ? parsed.customFirstFoods
        : [],
      favoriteIds: Array.isArray(parsed.favoriteIds) ? parsed.favoriteIds : [],
      blockedIds: Array.isArray(parsed.blockedIds) ? parsed.blockedIds : [],
      customRecipes: Array.isArray(parsed.customRecipes) ? parsed.customRecipes : [],
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
