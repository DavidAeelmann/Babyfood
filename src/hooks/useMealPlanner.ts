import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_ENABLED_SLOTS } from '../lib/constants';
import {
  FIRST_FOODS_CATALOG,
  getRecipeMatchingFirstFoods,
} from '../lib/firstFoods';
import { aggregateGroceries } from '../lib/groceryAggregator';
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
  const bPool = getRecipesBySlot(data, 'breakfast');
  const lPool = getRecipesBySlot(data, 'lunch');
  const sPool = getRecipesBySlot(data, 'snack');
  const dIds = data.planned_ids ?? [];

  return Array.from({ length: 7 }, (_, idx) => ({
    breakfast: bPool[idx % Math.max(1, bPool.length)]?.id ?? dIds[idx] ?? '',
    lunch: lPool[idx % Math.max(1, lPool.length)]?.id ?? dIds[idx] ?? '',
    snack: sPool[idx % Math.max(1, sPool.length)]?.id ?? dIds[idx] ?? '',
    dinner: dIds[idx] ?? '',
  }));
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
          const validIds = new Set(data.recipes.map((r) => r.id));

          // Hydrate from shared URL hash (#s=...) when present and matching recipes exist
          if (shared && shared.w === data.week_id) {
            const localMap = new Map(data.recipes.map((r) => [r.id, r]));
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
            prev.plannedIds.every((id) => validIds.has(id));

          const hasValidGrid =
            prev.weekGrid.length === 7 &&
            prev.weekGrid.every(
              (d) =>
                validIds.has(d.breakfast) &&
                validIds.has(d.lunch) &&
                validIds.has(d.snack) &&
                validIds.has(d.dinner),
            );

          if (hasValidPlan) {
            return hasValidGrid
              ? prev
              : { ...prev, weekGrid: buildInitialWeekGrid(data) };
          }

          // Week rollover or first load: preserve householdConfig, enabledSlots,
          // hidePantryStaples, customItems, triedFoods, and favorite/blocked preferences.
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
            setSyncNotice(`Synced shared plan & grocery list (${data.week_id})`);
          } else {
            setSyncNotice(`Shared link was for ${shared.w}; loaded current week (${data.week_id})`);
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
          setError(err instanceof Error ? err.message : 'Failed to load meal plan');
          setLoading(false);
        }
      }
    }
    fetchWeek();
    return () => {
      cancelled = true;
    };
  }, []);

  const recipeMap = useMemo(() => {
    const map = new Map<string, Recipe>();
    for (const r of weekData?.recipes ?? []) {
      map.set(r.id, r);
    }
    return map;
  }, [weekData]);

  const weeklyBreakfasts = useMemo(() => {
    if (!weekData) return [];
    return getRecipesBySlot(weekData, 'breakfast');
  }, [weekData]);

  const weeklyLunches = useMemo(() => {
    if (!weekData) return [];
    return getRecipesBySlot(weekData, 'lunch');
  }, [weekData]);

  const weeklySnacks = useMemo(() => {
    if (!weekData) return [];
    return getRecipesBySlot(weekData, 'snack');
  }, [weekData]);

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
      if (!weekData) return [];
      return getRecipesBySlot(weekData, slot);
    },
    [weekData],
  );

  const swapMeal = useCallback(
    (dayIndex: number) => {
      if (!weekData) return;
      setState((prev) => {
        if (prev.lockedIndices.includes(dayIndex)) return prev;
        const currentId = prev.plannedIds[dayIndex];
        const inPlan = new Set(prev.plannedIds);
        const blockedSet = new Set(prev.blockedIds);
        const favSet = new Set(prev.favoriteIds);
        const dinnerPool = getSlotPool('dinner').filter(
          (r) => !blockedSet.has(r.id),
        );
        const safeBench = dinnerPool.filter(
          (r) => !inPlan.has(r.id) && isRecipeSafe(r),
        );
        const anyBench = dinnerPool.filter((r) => !inPlan.has(r.id));
        const pool = (safeBench.length > 0 ? safeBench : anyBench).sort(
          (a, b) => Number(favSet.has(b.id)) - Number(favSet.has(a.id)),
        );

        if (pool.length === 0) return prev;

        const currentIdxInAll = dinnerPool.findIndex((r) => r.id === currentId);
        const candidate =
          pool.find((r) => dinnerPool.indexOf(r) > currentIdxInAll) ?? pool[0];

        const nextPlanned = [...prev.plannedIds];
        nextPlanned[dayIndex] = candidate.id;
        const nextGrid = prev.weekGrid.map((d, idx) =>
          idx === dayIndex ? { ...d, dinner: candidate.id } : d,
        );
        return { ...prev, plannedIds: nextPlanned, weekGrid: nextGrid };
      });
    },
    [weekData, getSlotPool, isRecipeSafe],
  );

  const shuffleUnlocked = useCallback(() => {
    if (!weekData) return;
    setState((prev) => {
      const lockedSet = new Set(prev.lockedIndices);
      const blockedSet = new Set(prev.blockedIds);
      const favSet = new Set(prev.favoriteIds);
      const lockedIds = new Set(
        prev.plannedIds.filter((_, idx) => lockedSet.has(idx)),
      );
      const dinnerPool = getSlotPool('dinner').filter(
        (r) => !blockedSet.has(r.id),
      );

      const safeCandidates = dinnerPool.filter(
        (r) => !lockedIds.has(r.id) && isRecipeSafe(r),
      );
      const fallbackCandidates = dinnerPool.filter(
        (r) => !lockedIds.has(r.id) && !safeCandidates.includes(r),
      );

      const sortWithFavBias = (list: Recipe[]) =>
        [...list].sort((a, b) => {
          const favDiff = Number(favSet.has(b.id)) - Number(favSet.has(a.id));
          return favDiff !== 0 ? favDiff : Math.random() - 0.5;
        });

      const pool = [
        ...sortWithFavBias(safeCandidates),
        ...sortWithFavBias(fallbackCandidates),
      ];

      let poolCursor = 0;
      const nextPlanned = prev.plannedIds.map((id, idx) => {
        if (lockedSet.has(idx)) return id;
        const replacement = pool[poolCursor];
        if (replacement) {
          poolCursor += 1;
          return replacement.id;
        }
        return id;
      });

      const nextGrid = prev.weekGrid.map((d, idx) => ({
        ...d,
        dinner: nextPlanned[idx] ?? d.dinner,
      }));

      return { ...prev, plannedIds: nextPlanned, weekGrid: nextGrid };
    });
  }, [weekData, getSlotPool, isRecipeSafe]);

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
        const favSet = new Set(prev.favoriteIds);
        const favIngredients = new Set(
          prev.favoriteIds.flatMap(
            (fid) => recipeMap.get(fid)?.ingredients.map((i) => i.canonical_id) ?? [],
          ),
        );

        const eligible = pool.filter(
          (r) => r.id !== currentId && !blockedSet.has(r.id) && isRecipeSafe(r),
        );
        const fallback = pool.filter(
          (r) => r.id !== currentId && !blockedSet.has(r.id),
        );
        const candidates =
          eligible.length > 0 ? eligible : fallback.length > 0 ? fallback : pool;

        const scored = [...candidates].sort((a, b) => {
          const scoreA =
            (favSet.has(a.id) ? 10 : 0) +
            a.ingredients.filter((i) => favIngredients.has(i.canonical_id)).length;
          const scoreB =
            (favSet.has(b.id) ? 10 : 0) +
            b.ingredients.filter((i) => favIngredients.has(i.canonical_id)).length;
          return scoreB - scoreA;
        });

        const currentIdx = scored.findIndex((r) => r.id === currentId);
        const picked = scored[(currentIdx + 1) % scored.length] ?? scored[0];

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
      const favSet = new Set(prev.favoriteIds);

      const pickWeighted = (slot: MealSlotType, dayIdx: number, currentId: string) => {
        // Lock Day protects ALL slots on locked days
        if (lockedSet.has(dayIdx)) return currentId;
        const pool = getSlotPool(slot);
        const nonBlocked = pool.filter(
          (r) => !blockedSet.has(r.id) && isRecipeSafe(r),
        );
        const safePool =
          nonBlocked.length > 0
            ? nonBlocked
            : pool.filter((r) => !blockedSet.has(r.id));
        const finalPool = safePool.length > 0 ? safePool : pool;
        if (finalPool.length === 0) return currentId;

        const weighted: Recipe[] = [];
        for (const r of finalPool) {
          const weight = favSet.has(r.id) ? 3 : 1;
          for (let w = 0; w < weight; w += 1) weighted.push(r);
        }
        return weighted[Math.floor(Math.random() * weighted.length)].id;
      };

      const nextGrid = prev.weekGrid.map((day, idx) => ({
        breakfast: pickWeighted('breakfast', idx, day.breakfast),
        lunch: pickWeighted('lunch', idx, day.lunch),
        snack: pickWeighted('snack', idx, day.snack),
        dinner: pickWeighted('dinner', idx, day.dinner),
      }));

      return {
        ...prev,
        weekGrid: nextGrid,
        plannedIds: nextGrid.map((d) => d.dinner),
      };
    });
  }, [weekData, getSlotPool, isRecipeSafe]);

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
