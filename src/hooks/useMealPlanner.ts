import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_ENABLED_SLOTS } from '../lib/constants';
import {
  FIRST_FOODS_CATALOG,
  getRecipeMatchingFirstFoods,
} from '../lib/firstFoods';
import { aggregateGroceries } from '../lib/groceryAggregator';
import {
  scoreDiversityPenalty,
  selectDiverseSlotIds,
  type WeekPlanEntry,
} from '../lib/mealDiversity';
import {
  createCustomRecipeFromInput,
  scoreRecipeAlignment,
} from '../lib/preferences';
import { decodeCheckedBitmask, decodeShareHash } from '../lib/shareSync';
import {
  loadPersistedState,
  resolveAssetUrl,
  savePersistedState,
  type PersistedState,
} from '../lib/storage';
import type {
  Aisle,
  Allergen,
  BracketKey,
  DayPlan,
  FirstFoodCategory,
  FirstFoodItem,
  MealSlotType,
  Recipe,
  TriedFoodReaction,
  WeekData,
} from '../types/recipe';

function getRecipesBySlot(data: WeekData, slot: MealSlotType): Recipe[] {
  const byProp = data.recipes.filter((r) => r.meal_slot === slot);
  if (byProp.length > 0) return byProp;

  if (slot === 'breakfast') {
    const ids = new Set(data.breakfast_ids ?? []);
    return data.recipes.filter((r) => ids.has(r.id));
  }
  if (slot === 'lunch') {
    const ids = new Set(data.lunch_ids ?? []);
    return data.recipes.filter((r) => ids.has(r.id));
  }
  if (slot === 'snack') {
    const ids = new Set(data.snack_ids ?? []);
    return data.recipes.filter((r) => ids.has(r.id));
  }
  const nonDinner = new Set([
    ...(data.breakfast_ids ?? []),
    ...(data.lunch_ids ?? []),
    ...(data.snack_ids ?? []),
  ]);
  return data.recipes.filter((r) => !nonDinner.has(r.id));
}

function buildInitialWeekGrid(data: WeekData): DayPlan[] {
  const byId = new Map(data.recipes.map((r) => [r.id, r]));
  const pickSlotList = (slotIds: string[] | undefined, slot: MealSlotType): Recipe[] => {
    const ordered = (slotIds ?? [])
      .map((id) => byId.get(id))
      .filter((r): r is Recipe => Boolean(r));
    if (ordered.length > 0) return ordered;
    return getRecipesBySlot(data, slot);
  };

  const bPool = pickSlotList(data.breakfast_ids, 'breakfast');
  const lPool = pickSlotList(data.lunch_ids, 'lunch');
  const sPool = pickSlotList(data.snack_ids, 'snack');
  const dIds = data.planned_ids ?? [];

  return Array.from({ length: 7 }, (_, idx) => ({
    breakfast: bPool[idx % Math.max(1, bPool.length)]?.id ?? dIds[idx] ?? '',
    lunch: lPool[idx % Math.max(1, lPool.length)]?.id ?? dIds[idx] ?? '',
    snack: sPool[idx % Math.max(1, sPool.length)]?.id ?? dIds[idx] ?? '',
    dinner: dIds[idx] ?? '',
  }));
}

function collectWeekEntries(
  weekGrid: DayPlan[],
  plannedIds: string[],
  recipeMap: Map<string, Recipe>,
  exclude?: { dayIndex: number; slot: MealSlotType },
): WeekPlanEntry[] {
  const entries: WeekPlanEntry[] = [];
  const slots: MealSlotType[] = ['dinner', 'lunch', 'breakfast', 'snack'];
  weekGrid.forEach((day, dayIndex) => {
    for (const slot of slots) {
      if (exclude && exclude.dayIndex === dayIndex && exclude.slot === slot) {
        continue;
      }
      const id = slot === 'dinner' ? (plannedIds[dayIndex] ?? day.dinner) : day[slot];
      if (!id) continue;
      const recipe = recipeMap.get(id);
      if (recipe) {
        entries.push({ recipe, slot, dayIndex });
      }
    }
  });
  return entries;
}

export function useMealPlanner() {
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [state, setState] = useState<PersistedState>(() => loadPersistedState());

  useEffect(() => {
    savePersistedState(state);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    async function fetchWeek() {
      try {
        const res = await fetch(resolveAssetUrl('data/week-current.json'));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as WeekData;
        if (cancelled) return;

        setWeekData(data);

        const shared =
          typeof window !== 'undefined'
            ? decodeShareHash(window.location.hash)
            : null;

        setState((prev) => {
          const validIds = new Set([
            ...data.recipes.map((r) => r.id),
            ...prev.customRecipes.map((r) => r.id),
          ]);

          // Hydrate from shared URL hash (#s=...) when present and matching recipes exist
          if (shared && shared.w === data.week_id) {
            const localMap = new Map(
              [...data.recipes, ...prev.customRecipes].map((r) => [r.id, r]),
            );
            const sharedPlanned = shared.p.filter((id) => validIds.has(id));
            const nextGrid =
              shared.g.length === 7
                ? shared.g
                : buildInitialWeekGrid(data);
            const nextPlanned =
              sharedPlanned.length === 7 ? sharedPlanned : [...data.planned_ids];

            // Recompute active recipes in enabled slots to decode checked grocery bitmask
            const activeRecipes: Recipe[] = [];
            nextGrid.forEach((day, idx) => {
              if (shared.s.dinner) {
                const d = localMap.get(nextPlanned[idx] ?? day.dinner);
                if (d) activeRecipes.push(d);
              }
              if (shared.s.breakfast) {
                const b = localMap.get(day.breakfast);
                if (b) activeRecipes.push(b);
              }
              if (shared.s.lunch) {
                const l = localMap.get(day.lunch);
                if (l) activeRecipes.push(l);
              }
              if (shared.s.snack) {
                const s = localMap.get(day.snack);
                if (s) activeRecipes.push(s);
              }
            });
            const sharedGroceryItems = aggregateGroceries(activeRecipes, shared.h);
            const checkedMap = decodeCheckedBitmask(shared.k, sharedGroceryItems);

            return {
              ...prev,
              weekId: data.week_id,
              household: shared.h,
              enabledSlots: shared.s,
              weekGrid: nextGrid,
              plannedIds: nextPlanned,
              customItems: shared.c,
              checkedGroceries: checkedMap,
              lockedIndices: [],
            };
          }

          const isRollover = prev.weekId !== data.week_id;
          const hasValidPlan =
            !isRollover &&
            prev.plannedIds.length === 7 &&
            prev.plannedIds.every((id) => id === '' || validIds.has(id));

          const hasValidGrid =
            prev.weekGrid.length === 7 &&
            prev.weekGrid.every(
              (d) =>
                (d.breakfast === '' || validIds.has(d.breakfast)) &&
                (d.lunch === '' || validIds.has(d.lunch)) &&
                (d.snack === '' || validIds.has(d.snack)) &&
                (d.dinner === '' || validIds.has(d.dinner)),
            );

          if (hasValidPlan) {
            return hasValidGrid
              ? prev
              : { ...prev, weekGrid: buildInitialWeekGrid(data) };
          }

          // Week rollover or first load: preserve householdConfig, enabledSlots,
          // hidePantryStaples, customItems, triedFoods, customRecipes, and favorite/blocked preferences.
          return {
            ...prev,
            weekId: data.week_id,
            plannedIds: [...data.planned_ids],
            weekGrid: buildInitialWeekGrid(data),
            enabledSlots: prev.weekId === null ? { ...DEFAULT_ENABLED_SLOTS } : prev.enabledSlots,
            includedBreakfastIds: [...(data.breakfast_ids ?? [])],
            includedSnackIds: [...(data.snack_ids ?? [])],
            lockedIndices: [],
            checkedGroceries: {},
            prepChecked: {},
          };
        });

        if (shared) {
          if (shared.w === data.week_id) {
            setSyncNotice(`Ementa e lista de compras sincronizadas (${data.week_id})`);
          } else {
            setSyncNotice(`O link partilhado era de ${shared.w}; carregada a semana atual (${data.week_id})`);
          }
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${window.location.search}`,
          );
        }

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar a ementa semanal');
          setLoading(false);
        }
      }
    }
    fetchWeek();
    return () => {
      cancelled = true;
    };
  }, []);

  const allRecipes = useMemo(() => {
    return [...state.customRecipes, ...(weekData?.recipes ?? [])];
  }, [state.customRecipes, weekData]);

  const recipeMap = useMemo(() => {
    const map = new Map<string, Recipe>();
    for (const r of allRecipes) {
      map.set(r.id, r);
    }
    return map;
  }, [allRecipes]);

  const weeklyBreakfasts = useMemo(() => {
    if (!weekData) return state.customRecipes.filter((r) => r.meal_slot === 'breakfast');
    return [
      ...state.customRecipes.filter((r) => r.meal_slot === 'breakfast'),
      ...getRecipesBySlot(weekData, 'breakfast'),
    ];
  }, [weekData, state.customRecipes]);

  const weeklyLunches = useMemo(() => {
    if (!weekData) return state.customRecipes.filter((r) => r.meal_slot === 'lunch');
    return [
      ...state.customRecipes.filter((r) => r.meal_slot === 'lunch'),
      ...getRecipesBySlot(weekData, 'lunch'),
    ];
  }, [weekData, state.customRecipes]);

  const weeklySnacks = useMemo(() => {
    if (!weekData) return state.customRecipes.filter((r) => r.meal_slot === 'snack');
    return [
      ...state.customRecipes.filter((r) => r.meal_slot === 'snack'),
      ...getRecipesBySlot(weekData, 'snack'),
    ];
  }, [weekData, state.customRecipes]);

  const plannedRecipes = useMemo(() => {
    return state.plannedIds
      .map((id) => recipeMap.get(id))
      .filter((r): r is Recipe => Boolean(r));
  }, [state.plannedIds, recipeMap]);

  // Aggregate groceries strictly across currently enabled slots
  const activeSlotRecipes = useMemo(() => {
    const list: Recipe[] = [];
    const grid = state.weekGrid;

    if (grid.length === 7) {
      grid.forEach((day, idx) => {
        if (state.enabledSlots.dinner) {
          const d = recipeMap.get(state.plannedIds[idx] ?? day.dinner);
          if (d) list.push(d);
        }
        if (state.enabledSlots.breakfast) {
          const b = recipeMap.get(day.breakfast);
          if (b) list.push(b);
        }
        if (state.enabledSlots.lunch) {
          const l = recipeMap.get(day.lunch);
          if (l) list.push(l);
        }
        if (state.enabledSlots.snack) {
          const s = recipeMap.get(day.snack);
          if (s) list.push(s);
        }
      });
    } else if (state.enabledSlots.dinner) {
      list.push(...plannedRecipes);
    }

    return list;
  }, [state.weekGrid, state.enabledSlots, state.plannedIds, recipeMap, plannedRecipes]);

  const groceryItems = useMemo(() => {
    return aggregateGroceries(activeSlotRecipes, state.household);
  }, [activeSlotRecipes, state.household]);

  const isRecipeSafe = useCallback(
    (recipe: Recipe) => {
      if (state.household.excludedAllergens.length === 0) return true;
      return !recipe.allergens.some((a) =>
        state.household.excludedAllergens.includes(a),
      );
    },
    [state.household.excludedAllergens],
  );

  const setAdults = useCallback((adults: number) => {
    const clamped = Math.max(1, Math.min(4, adults));
    setState((prev) => ({
      ...prev,
      household: { ...prev.household, adults: clamped },
    }));
  }, []);

  const toggleBracket = useCallback((bracket: BracketKey) => {
    setState((prev) => {
      const exists = prev.household.activeBrackets.includes(bracket);
      const next = exists
        ? prev.household.activeBrackets.filter((b) => b !== bracket)
        : [...prev.household.activeBrackets, bracket];
      return {
        ...prev,
        household: { ...prev.household, activeBrackets: next },
      };
    });
  }, []);

  const toggleAllergen = useCallback((allergen: Allergen) => {
    setState((prev) => {
      const exists = prev.household.excludedAllergens.includes(allergen);
      const next = exists
        ? prev.household.excludedAllergens.filter((a) => a !== allergen)
        : [...prev.household.excludedAllergens, allergen];
      return {
        ...prev,
        household: { ...prev.household, excludedAllergens: next },
      };
    });
  }, []);

  const toggleSlotEnabled = useCallback((slot: MealSlotType) => {
    setState((prev) => {
      const nextSlots = {
        ...prev.enabledSlots,
        [slot]: !prev.enabledSlots[slot],
      };
      // Keep at least one slot enabled so the plan is never blank
      if (
        !nextSlots.breakfast &&
        !nextSlots.lunch &&
        !nextSlots.snack &&
        !nextSlots.dinner
      ) {
        return prev;
      }
      return {
        ...prev,
        enabledSlots: nextSlots,
      };
    });
  }, []);

  const toggleLock = useCallback((dayIndex: number) => {
    setState((prev) => {
      const exists = prev.lockedIndices.includes(dayIndex);
      const next = exists
        ? prev.lockedIndices.filter((i) => i !== dayIndex)
        : [...prev.lockedIndices, dayIndex];
      return { ...prev, lockedIndices: next };
    });
  }, []);

  const getSlotPool = useCallback(
    (slot: MealSlotType): Recipe[] => {
      const customFor = (s: MealSlotType) =>
        state.customRecipes.filter((r) => r.meal_slot === s);

      if (!weekData) {
        return slot === 'breakfast' || slot === 'snack'
          ? [...customFor('breakfast'), ...customFor('snack')]
          : [...customFor('dinner'), ...customFor('lunch')];
      }
      if (slot === 'breakfast' || slot === 'snack') {
        return [
          ...customFor('breakfast'),
          ...customFor('snack'),
          ...getRecipesBySlot(weekData, 'breakfast'),
          ...getRecipesBySlot(weekData, 'snack'),
        ];
      }
      return [
        ...customFor('dinner'),
        ...customFor('lunch'),
        ...getRecipesBySlot(weekData, 'dinner'),
        ...getRecipesBySlot(weekData, 'lunch'),
      ];
    },
    [weekData, state.customRecipes],
  );

  const getPickerOptionsForSlot = useCallback(
    (slot: MealSlotType): Recipe[] => {
      const pool = getSlotPool(slot);
      const blockedSet = new Set(state.blockedIds);

      return pool
        .filter((r) => !blockedSet.has(r.id))
        .sort((a, b) => {
          const alignDiff =
            scoreRecipeAlignment(b, state.favoriteIds, state.blockedIds, recipeMap) -
            scoreRecipeAlignment(a, state.favoriteIds, state.blockedIds, recipeMap);
          if (alignDiff !== 0) return alignDiff;
          const safeDiff = Number(isRecipeSafe(b)) - Number(isRecipeSafe(a));
          if (safeDiff !== 0) return safeDiff;
          return a.title.localeCompare(b.title);
        });
    },
    [getSlotPool, state.blockedIds, state.favoriteIds, recipeMap, isRecipeSafe],
  );

  const clearSlot = useCallback((dayIndex: number, slot: MealSlotType) => {
    setState((prev) => {
      if (prev.lockedIndices.includes(dayIndex)) return prev;
      const nextGrid = prev.weekGrid.map((day, idx) =>
        idx === dayIndex ? { ...day, [slot]: '' } : day,
      );
      const nextPlanned =
        slot === 'dinner'
          ? prev.plannedIds.map((id, idx) => (idx === dayIndex ? '' : id))
          : prev.plannedIds;
      return { ...prev, weekGrid: nextGrid, plannedIds: nextPlanned };
    });
  }, []);

  const assignSlotMeal = useCallback(
    (dayIndex: number, slot: MealSlotType, recipeId: string) => {
      setState((prev) => {
        if (prev.lockedIndices.includes(dayIndex)) return prev;
        const nextGrid = prev.weekGrid.map((day, idx) =>
          idx === dayIndex ? { ...day, [slot]: recipeId } : day,
        );
        const nextPlanned =
          slot === 'dinner'
            ? prev.plannedIds.map((id, idx) =>
                idx === dayIndex ? recipeId : id,
              )
            : prev.plannedIds;
        return { ...prev, weekGrid: nextGrid, plannedIds: nextPlanned };
      });
    },
    [],
  );

  const addRandomSlotMeal = useCallback(
    (dayIndex: number, slot: MealSlotType) => {
      if (!weekData) return;
      setState((prev) => {
        if (prev.lockedIndices.includes(dayIndex)) return prev;
        const pool = getSlotPool(slot);
        const blockedSet = new Set(prev.blockedIds);
        const nonBlocked = pool.filter(
          (r) => !blockedSet.has(r.id) && isRecipeSafe(r),
        );
        const fallback = pool.filter((r) => !blockedSet.has(r.id));
        const finalPool =
          nonBlocked.length > 0 ? nonBlocked : fallback.length > 0 ? fallback : pool;
        if (finalPool.length === 0) return prev;

        const existingEntries = collectWeekEntries(
          prev.weekGrid,
          prev.plannedIds,
          recipeMap,
          { dayIndex, slot },
        );

        const scored = finalPool
          .map((r) => ({
            recipe: r,
            score:
              scoreRecipeAlignment(r, prev.favoriteIds, prev.blockedIds, recipeMap) +
              scoreDiversityPenalty(r, existingEntries, slot, dayIndex),
          }))
          .sort((a, b) => b.score - a.score);

        // Sample among top diverse tier so random clicks feel fresh without repeating rare ingredients
        const topCutoff = scored[0].score - 4;
        const topTier = scored.filter((item) => item.score >= topCutoff);
        const picked = topTier[Math.floor(Math.random() * topTier.length)].recipe;

        const nextGrid = prev.weekGrid.map((day, idx) =>
          idx === dayIndex ? { ...day, [slot]: picked.id } : day,
        );
        const nextPlanned =
          slot === 'dinner'
            ? prev.plannedIds.map((id, idx) =>
                idx === dayIndex ? picked.id : id,
              )
            : prev.plannedIds;
        return { ...prev, weekGrid: nextGrid, plannedIds: nextPlanned };
      });
    },
    [weekData, getSlotPool, isRecipeSafe, recipeMap],
  );

  const swapMeal = useCallback(
    (dayIndex: number) => {
      if (!weekData) return;
      setState((prev) => {
        if (prev.lockedIndices.includes(dayIndex)) return prev;
        const currentId = prev.plannedIds[dayIndex];
        const inPlan = new Set(prev.plannedIds);
        const blockedSet = new Set(prev.blockedIds);
        const dinnerPool = getSlotPool('dinner').filter(
          (r) => !blockedSet.has(r.id),
        );
        const safeBench = dinnerPool.filter(
          (r) => !inPlan.has(r.id) && isRecipeSafe(r),
        );
        const anyBench = dinnerPool.filter((r) => !inPlan.has(r.id));
        const existingEntries = collectWeekEntries(
          prev.weekGrid,
          prev.plannedIds,
          recipeMap,
          { dayIndex, slot: 'dinner' },
        );
        const pool = (safeBench.length > 0 ? safeBench : anyBench).sort((a, b) => {
          const scoreB =
            scoreRecipeAlignment(b, prev.favoriteIds, prev.blockedIds, recipeMap) +
            scoreDiversityPenalty(b, existingEntries, 'dinner', dayIndex);
          const scoreA =
            scoreRecipeAlignment(a, prev.favoriteIds, prev.blockedIds, recipeMap) +
            scoreDiversityPenalty(a, existingEntries, 'dinner', dayIndex);
          return scoreB - scoreA;
        });

        if (pool.length === 0) return prev;

        const candidate =
          pool.find((r) => r.id !== currentId) ?? pool[0];

        const nextPlanned = [...prev.plannedIds];
        nextPlanned[dayIndex] = candidate.id;
        const nextGrid = prev.weekGrid.map((d, idx) =>
          idx === dayIndex ? { ...d, dinner: candidate.id } : d,
        );
        return { ...prev, plannedIds: nextPlanned, weekGrid: nextGrid };
      });
    },
    [weekData, getSlotPool, isRecipeSafe, recipeMap],
  );

  const shuffleUnlocked = useCallback(() => {
    if (!weekData) return;
    setState((prev) => {
      const lockedSet = new Set(prev.lockedIndices);
      const blockedSet = new Set(prev.blockedIds);
      const dinnerPool = getSlotPool('dinner').filter(
        (r) => !blockedSet.has(r.id),
      );
      const safePool = dinnerPool.filter((r) => isRecipeSafe(r));
      const finalPool = safePool.length > 0 ? safePool : dinnerPool;

      const lockedByDay = new Map<number, Recipe>();
      const otherSlotEntries: WeekPlanEntry[] = [];
      prev.weekGrid.forEach((day, idx) => {
        if (lockedSet.has(idx)) {
          const dRecipe = recipeMap.get(prev.plannedIds[idx] ?? day.dinner);
          if (dRecipe) lockedByDay.set(idx, dRecipe);
        }
        (['lunch', 'breakfast', 'snack'] as MealSlotType[]).forEach((slot) => {
          const r = day[slot] ? recipeMap.get(day[slot]) : undefined;
          if (r) otherSlotEntries.push({ recipe: r, slot, dayIndex: idx });
        });
      });

      const { ids: nextPlanned } = selectDiverseSlotIds({
        pool: finalPool,
        slot: 'dinner',
        count: 7,
        existingEntries: otherSlotEntries,
        lockedByDay,
        scoreBase: (r) =>
          scoreRecipeAlignment(r, prev.favoriteIds, prev.blockedIds, recipeMap),
        jitter: 4,
      });

      const resolvedPlanned = prev.plannedIds.map((oldId, idx) =>
        lockedSet.has(idx) ? oldId : (nextPlanned[idx] || oldId),
      );

      const nextGrid = prev.weekGrid.map((d, idx) => ({
        ...d,
        dinner: resolvedPlanned[idx] ?? d.dinner,
      }));

      return { ...prev, plannedIds: resolvedPlanned, weekGrid: nextGrid };
    });
  }, [weekData, getSlotPool, isRecipeSafe, recipeMap]);

  const reSimulateSlot = useCallback(
    (dayIndex: number, slot: MealSlotType) => {
      if (!weekData) return;
      setState((prev) => {
        // Lock Day protects ALL slots on that day
        if (prev.lockedIndices.includes(dayIndex)) return prev;

        const pool = getSlotPool(slot);
        if (pool.length === 0) return prev;
        const currentId =
          prev.weekGrid[dayIndex]?.[slot] ?? prev.plannedIds[dayIndex];

        const blockedSet = new Set(prev.blockedIds);
        const eligible = pool.filter(
          (r) => r.id !== currentId && !blockedSet.has(r.id) && isRecipeSafe(r),
        );
        const fallback = pool.filter(
          (r) => r.id !== currentId && !blockedSet.has(r.id),
        );
        const candidates =
          eligible.length > 0 ? eligible : fallback.length > 0 ? fallback : pool;

        const existingEntries = collectWeekEntries(
          prev.weekGrid,
          prev.plannedIds,
          recipeMap,
          { dayIndex, slot },
        );

        const scored = candidates
          .map((r) => ({
            recipe: r,
            score:
              scoreRecipeAlignment(r, prev.favoriteIds, prev.blockedIds, recipeMap) +
              scoreDiversityPenalty(r, existingEntries, slot, dayIndex),
          }))
          .sort((a, b) => b.score - a.score);

        // Pick from top diverse options within 3.5 pts of best score so repeated taps explore new dishes
        const topCutoff = scored[0].score - 3.5;
        const topTier = scored.filter((item) => item.score >= topCutoff);
        const picked = topTier[Math.floor(Math.random() * topTier.length)].recipe;

        const nextGrid = prev.weekGrid.map((day, idx) =>
          idx === dayIndex ? { ...day, [slot]: picked.id } : day,
        );
        const nextPlanned =
          slot === 'dinner'
            ? prev.plannedIds.map((id, idx) =>
                idx === dayIndex ? picked.id : id,
              )
            : prev.plannedIds;

        return { ...prev, weekGrid: nextGrid, plannedIds: nextPlanned };
      });
    },
    [weekData, getSlotPool, recipeMap, isRecipeSafe],
  );

  const reSimulateWeek = useCallback(() => {
    if (!weekData) return;
    setState((prev) => {
      const lockedSet = new Set(prev.lockedIndices);
      const blockedSet = new Set(prev.blockedIds);

      const getCandidatePool = (slot: MealSlotType): Recipe[] => {
        const pool = getSlotPool(slot);
        const nonBlockedSafe = pool.filter(
          (r) => !blockedSet.has(r.id) && isRecipeSafe(r),
        );
        if (nonBlockedSafe.length > 0) return nonBlockedSafe;
        const nonBlocked = pool.filter((r) => !blockedSet.has(r.id));
        return nonBlocked.length > 0 ? nonBlocked : pool;
      };

      const scoreBase = (r: Recipe) =>
        scoreRecipeAlignment(r, prev.favoriteIds, prev.blockedIds, recipeMap);

      // Build locked maps across all 4 slots first so locked days anchor ingredient budgets
      const lockedEntries: WeekPlanEntry[] = [];
      const lockedMapBySlot: Record<MealSlotType, Map<number, Recipe>> = {
        dinner: new Map(),
        lunch: new Map(),
        breakfast: new Map(),
        snack: new Map(),
      };

      prev.weekGrid.forEach((day, idx) => {
        if (!lockedSet.has(idx)) return;
        (['dinner', 'lunch', 'breakfast', 'snack'] as MealSlotType[]).forEach(
          (slot) => {
            const id = slot === 'dinner' ? (prev.plannedIds[idx] ?? day.dinner) : day[slot];
            const recipe = id ? recipeMap.get(id) : undefined;
            if (recipe) {
              lockedMapBySlot[slot].set(idx, recipe);
              lockedEntries.push({ recipe, slot, dayIndex: idx });
            }
          },
        );
      });

      // Plan sequentially (dinner -> lunch -> breakfast -> snack) so rare proteins and sweet_potato stay diverse week-wide
      let accumulated: WeekPlanEntry[] = [];

      const dinnersRes = selectDiverseSlotIds({
        pool: getCandidatePool('dinner'),
        slot: 'dinner',
        count: 7,
        existingEntries: lockedEntries.filter((e) => e.slot !== 'dinner'),
        lockedByDay: lockedMapBySlot.dinner,
        scoreBase,
        jitter: 4,
      });
      accumulated = dinnersRes.entries;

      const lunchesRes = selectDiverseSlotIds({
        pool: getCandidatePool('lunch'),
        slot: 'lunch',
        count: 7,
        existingEntries: accumulated.filter((e) => e.slot !== 'lunch'),
        lockedByDay: lockedMapBySlot.lunch,
        scoreBase,
        jitter: 4,
      });
      accumulated = lunchesRes.entries;

      const breakfastsRes = selectDiverseSlotIds({
        pool: getCandidatePool('breakfast'),
        slot: 'breakfast',
        count: 7,
        existingEntries: accumulated.filter((e) => e.slot !== 'breakfast'),
        lockedByDay: lockedMapBySlot.breakfast,
        scoreBase,
        jitter: 4,
      });
      accumulated = breakfastsRes.entries;

      const snacksRes = selectDiverseSlotIds({
        pool: getCandidatePool('snack'),
        slot: 'snack',
        count: 7,
        existingEntries: accumulated.filter((e) => e.slot !== 'snack'),
        lockedByDay: lockedMapBySlot.snack,
        scoreBase,
        jitter: 4,
      });

      const nextGrid = prev.weekGrid.map((oldDay, idx) => ({
        breakfast: lockedSet.has(idx) ? oldDay.breakfast : (breakfastsRes.ids[idx] || oldDay.breakfast),
        lunch: lockedSet.has(idx) ? oldDay.lunch : (lunchesRes.ids[idx] || oldDay.lunch),
        snack: lockedSet.has(idx) ? oldDay.snack : (snacksRes.ids[idx] || oldDay.snack),
        dinner: lockedSet.has(idx) ? (prev.plannedIds[idx] || oldDay.dinner) : (dinnersRes.ids[idx] || oldDay.dinner),
      }));

      return {
        ...prev,
        weekGrid: nextGrid,
        plannedIds: nextGrid.map((d) => d.dinner),
      };
    });
  }, [weekData, getSlotPool, isRecipeSafe, recipeMap]);

  const toggleFavorite = useCallback((recipeId: string) => {
    setState((prev) => {
      const exists = prev.favoriteIds.includes(recipeId);
      const nextFav = exists
        ? prev.favoriteIds.filter((id) => id !== recipeId)
        : [...prev.favoriteIds, recipeId];
      const nextBlocked = exists
        ? prev.blockedIds
        : prev.blockedIds.filter((id) => id !== recipeId);
      return { ...prev, favoriteIds: nextFav, blockedIds: nextBlocked };
    });
  }, []);

  const toggleBlocked = useCallback((recipeId: string) => {
    setState((prev) => {
      const exists = prev.blockedIds.includes(recipeId);
      const nextBlocked = exists
        ? prev.blockedIds.filter((id) => id !== recipeId)
        : [...prev.blockedIds, recipeId];
      const nextFav = exists
        ? prev.favoriteIds
        : prev.favoriteIds.filter((id) => id !== recipeId);
      return { ...prev, blockedIds: nextBlocked, favoriteIds: nextFav };
    });
  }, []);

  const toggleGroceryItem = useCallback((key: string) => {
    setState((prev) => ({
      ...prev,
      checkedGroceries: {
        ...prev.checkedGroceries,
        [key]: !prev.checkedGroceries[key],
      },
    }));
  }, []);

  const clearCheckedGroceries = useCallback(() => {
    setState((prev) => ({
      ...prev,
      checkedGroceries: {},
      customItems: prev.customItems.filter((item) => !item.checked),
    }));
  }, []);

  const setHidePantryStaples = useCallback((hide: boolean) => {
    setState((prev) => ({ ...prev, hidePantryStaples: hide }));
  }, []);

  const addCustomItem = useCallback((name: string, aisle: Aisle = 'Pantry') => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      customItems: [
        ...prev.customItems,
        {
          id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: trimmed,
          aisle,
          checked: false,
        },
      ],
    }));
  }, []);

  const toggleCustomItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      customItems: prev.customItems.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    }));
  }, []);

  const removeCustomItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      customItems: prev.customItems.filter((item) => item.id !== id),
    }));
  }, []);

  const togglePrepIngredient = useCallback((recipeId: string, canonicalId: string) => {
    setState((prev) => {
      const recipeMap = prev.prepChecked[recipeId] ?? {};
      return {
        ...prev,
        prepChecked: {
          ...prev.prepChecked,
          [recipeId]: {
            ...recipeMap,
            [canonicalId]: !recipeMap[canonicalId],
          },
        },
      };
    });
  }, []);

  const getUntriedFoodsInRecipe = useCallback(
    (recipe: Recipe): FirstFoodItem[] => {
      return getRecipeMatchingFirstFoods(recipe).filter(
        (food) => !state.triedFoods[food.id],
      );
    },
    [state.triedFoods],
  );

  const toggleFirstFood = useCallback((foodId: string) => {
    setState((prev) => {
      const next = { ...prev.triedFoods };
      if (next[foodId]) {
        delete next[foodId];
      } else {
        next[foodId] = {
          triedAt: new Date().toISOString().slice(0, 10),
          exposures: 1,
        };
      }
      return { ...prev, triedFoods: next };
    });
  }, []);

  const incrementFoodExposure = useCallback((foodId: string) => {
    setState((prev) => {
      const existing = prev.triedFoods[foodId];
      const currentExp = existing?.exposures ?? 0;
      const nextExp = currentExp >= 3 ? 1 : currentExp + 1;
      return {
        ...prev,
        triedFoods: {
          ...prev.triedFoods,
          [foodId]: {
            triedAt: existing?.triedAt ?? new Date().toISOString().slice(0, 10),
            reaction: existing?.reaction,
            exposures: nextExp,
          },
        },
      };
    });
  }, []);

  const markRecipeFoodsTried = useCallback((recipe: Recipe) => {
    const matches = getRecipeMatchingFirstFoods(recipe);
    if (matches.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    setState((prev) => {
      const next = { ...prev.triedFoods };
      for (const food of matches) {
        const existing = next[food.id];
        if (!existing) {
          next[food.id] = { triedAt: today, exposures: 1 };
        } else if (food.allergen && (existing.exposures ?? 1) < 3) {
          next[food.id] = {
            ...existing,
            exposures: (existing.exposures ?? 1) + 1,
          };
        }
      }
      return { ...prev, triedFoods: next };
    });
  }, []);

  const setFirstFoodReaction = useCallback(
    (foodId: string, reaction: TriedFoodReaction) => {
      setState((prev) => {
        const existing = prev.triedFoods[foodId] ?? {
          triedAt: new Date().toISOString().slice(0, 10),
          exposures: 1,
        };
        return {
          ...prev,
          triedFoods: {
            ...prev.triedFoods,
            [foodId]: {
              ...existing,
              reaction: existing.reaction === reaction ? undefined : reaction,
            },
          },
        };
      });
    },
    [],
  );

  const addCustomFirstFood = useCallback(
    (name: string, category: FirstFoodCategory) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const id = `custom_food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setState((prev) => ({
        ...prev,
        customFirstFoods: [
          ...prev.customFirstFoods,
          { id, name: trimmed, category },
        ],
      }));
    },
    [],
  );

  const removeCustomFirstFood = useCallback((id: string) => {
    setState((prev) => {
      const nextTried = { ...prev.triedFoods };
      delete nextTried[id];
      return {
        ...prev,
        customFirstFoods: prev.customFirstFoods.filter((f) => f.id !== id),
        triedFoods: nextTried,
      };
    });
  }, []);

  const addCustomRecipe = useCallback(
    (input: {
      title: string;
      slot: MealSlotType;
      prepMinutes: number;
      cookMinutes: number;
      ingredientsText: string;
      toddlerNote: string;
    }): Recipe => {
      const created = createCustomRecipeFromInput(input);
      setState((prev) => ({
        ...prev,
        customRecipes: [created, ...prev.customRecipes],
      }));
      return created;
    },
    [],
  );

  const dismissSyncNotice = useCallback(() => {
    setSyncNotice(null);
  }, []);

  const totalCatalogFoodsCount =
    FIRST_FOODS_CATALOG.length + state.customFirstFoods.length;

  return {
    loading,
    error,
    syncNotice,
    dismissSyncNotice,
    weekData,
    allRecipes,
    state,
    plannedRecipes,
    weeklyBreakfasts,
    weeklyLunches,
    weeklySnacks,
    activeSlotRecipes,
    groceryItems,
    recipeMap,
    totalCatalogFoodsCount,
    isRecipeSafe,
    setAdults,
    toggleBracket,
    toggleAllergen,
    toggleSlotEnabled,
    toggleLock,
    swapMeal,
    shuffleUnlocked,
    reSimulateSlot,
    reSimulateWeek,
    clearSlot,
    assignSlotMeal,
    addRandomSlotMeal,
    addCustomRecipe,
    getPickerOptionsForSlot,
    toggleFavorite,
    toggleBlocked,
    toggleGroceryItem,
    clearCheckedGroceries,
    setHidePantryStaples,
    addCustomItem,
    toggleCustomItem,
    removeCustomItem,
    togglePrepIngredient,
    getUntriedFoodsInRecipe,
    toggleFirstFood,
    incrementFoodExposure,
    markRecipeFoodsTried,
    setFirstFoodReaction,
    addCustomFirstFood,
    removeCustomFirstFood,
  };
}
