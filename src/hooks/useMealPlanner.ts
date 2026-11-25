import { useCallback, useEffect, useMemo, useState } from 'react';
import { FIRST_FOODS_CATALOG } from '../lib/firstFoods';
import { aggregateGroceries } from '../lib/groceryAggregator';
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

function buildInitialWeekGrid(data: WeekData): DayPlan[] {
  const bIds = data.breakfast_ids ?? [];
  const lIds = data.lunch_ids ?? [];
  const sIds = data.snack_ids ?? [];
  const dIds = data.planned_ids ?? [];

  return Array.from({ length: 7 }, (_, idx) => ({
    breakfast: bIds[idx % Math.max(1, bIds.length)] ?? dIds[idx] ?? '',
    lunch: lIds[idx % Math.max(1, lIds.length)] ?? dIds[idx] ?? '',
    snack: sIds[idx % Math.max(1, sIds.length)] ?? dIds[idx] ?? '',
    dinner: dIds[idx] ?? '',
  }));
}

export function useMealPlanner() {
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<PersistedState>(() => loadPersistedState());

  // Persist changes to localStorage
  useEffect(() => {
    savePersistedState(state);
  }, [state]);

  // Load week-current.json and handle week_id rollover safely
  useEffect(() => {
    let cancelled = false;
    async function fetchWeek() {
      try {
        const res = await fetch(resolveAssetUrl('data/week-current.json'));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as WeekData;
        if (cancelled) return;

        setWeekData(data);
        setState((prev) => {
          const validIds = new Set(data.recipes.map((r) => r.id));
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

          // Week rollover or first load: reset plan, locks, and recipe checkoffs,
          // while preserving householdConfig, hidePantryStaples, customItems, triedFoods, and favorite/blocked preferences.
          return {
            ...prev,
            weekId: data.week_id,
            plannedIds: [...data.planned_ids],
            weekGrid: buildInitialWeekGrid(data),
            includedBreakfastIds: [...(data.breakfast_ids ?? [])],
            includedSnackIds: [...(data.snack_ids ?? [])],
            lockedIndices: [],
            checkedGroceries: {},
            prepChecked: {},
          };
        });
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

  const nonDinnerIdSet = useMemo(() => {
    return new Set([
      ...(weekData?.breakfast_ids ?? []),
      ...(weekData?.lunch_ids ?? []),
      ...(weekData?.snack_ids ?? []),
    ]);
  }, [weekData]);

  const weeklyBreakfasts = useMemo(() => {
    return (weekData?.breakfast_ids ?? [])
      .map((id) => recipeMap.get(id))
      .filter((r): r is Recipe => Boolean(r));
  }, [weekData, recipeMap]);

  const includedBreakfasts = useMemo(() => {
    return weeklyBreakfasts.filter((b) =>
      state.includedBreakfastIds.includes(b.id),
    );
  }, [weeklyBreakfasts, state.includedBreakfastIds]);

  const weeklySnacks = useMemo(() => {
    return (weekData?.snack_ids ?? [])
      .map((id) => recipeMap.get(id))
      .filter((r): r is Recipe => Boolean(r));
  }, [weekData, recipeMap]);

  const includedSnacks = useMemo(() => {
    return weeklySnacks.filter((s) => state.includedSnackIds.includes(s.id));
  }, [weeklySnacks, state.includedSnackIds]);

  const plannedRecipes = useMemo(() => {
    return state.plannedIds
      .map((id) => recipeMap.get(id))
      .filter((r): r is Recipe => Boolean(r));
  }, [state.plannedIds, recipeMap]);

  const groceryItems = useMemo(() => {
    return aggregateGroceries(
      [...plannedRecipes, ...includedBreakfasts, ...includedSnacks],
      state.household,
    );
  }, [plannedRecipes, includedBreakfasts, includedSnacks, state.household]);

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

  const toggleLock = useCallback((dayIndex: number) => {
    setState((prev) => {
      const exists = prev.lockedIndices.includes(dayIndex);
      const next = exists
        ? prev.lockedIndices.filter((i) => i !== dayIndex)
        : [...prev.lockedIndices, dayIndex];
      return { ...prev, lockedIndices: next };
    });
  }, []);

  const swapMeal = useCallback(
    (dayIndex: number) => {
      if (!weekData) return;
      setState((prev) => {
        const currentId = prev.plannedIds[dayIndex];
        const inPlan = new Set(prev.plannedIds);
        const blockedSet = new Set(prev.blockedIds);
        const favSet = new Set(prev.favoriteIds);
        const dinnerPool = weekData.recipes.filter(
          (r) => !nonDinnerIdSet.has(r.id) && !blockedSet.has(r.id),
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
    [weekData, nonDinnerIdSet, isRecipeSafe],
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
      const dinnerPool = weekData.recipes.filter(
        (r) => !nonDinnerIdSet.has(r.id) && !blockedSet.has(r.id),
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
  }, [weekData, nonDinnerIdSet, isRecipeSafe]);

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
      const recipeCanonicalIds = new Set(
        recipe.ingredients.map((i) => i.canonical_id),
      );
      return FIRST_FOODS_CATALOG.filter(
        (food) =>
          !state.triedFoods[food.id] &&
          food.canonicalIds.some((cid) => recipeCanonicalIds.has(cid)),
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
        };
      }
      return { ...prev, triedFoods: next };
    });
  }, []);

  const setFirstFoodReaction = useCallback(
    (foodId: string, reaction: TriedFoodReaction) => {
      setState((prev) => {
        const existing = prev.triedFoods[foodId] ?? {
          triedAt: new Date().toISOString().slice(0, 10),
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

  const toggleBreakfastIncluded = useCallback((breakfastId: string) => {
    setState((prev) => {
      const exists = prev.includedBreakfastIds.includes(breakfastId);
      const next = exists
        ? prev.includedBreakfastIds.filter((id) => id !== breakfastId)
        : [...prev.includedBreakfastIds, breakfastId];
      return { ...prev, includedBreakfastIds: next };
    });
  }, []);

  const toggleSnackIncluded = useCallback((snackId: string) => {
    setState((prev) => {
      const exists = prev.includedSnackIds.includes(snackId);
      const next = exists
        ? prev.includedSnackIds.filter((id) => id !== snackId)
        : [...prev.includedSnackIds, snackId];
      return { ...prev, includedSnackIds: next };
    });
  }, []);

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

  const getSlotPool = useCallback(
    (slot: MealSlotType): Recipe[] => {
      if (!weekData) return [];
      if (slot === 'breakfast') {
        return (weekData.breakfast_ids ?? [])
          .map((id) => recipeMap.get(id))
          .filter((r): r is Recipe => Boolean(r));
      }
      if (slot === 'lunch') {
        return (weekData.lunch_ids ?? [])
          .map((id) => recipeMap.get(id))
          .filter((r): r is Recipe => Boolean(r));
      }
      if (slot === 'snack') {
        return (weekData.snack_ids ?? [])
          .map((id) => recipeMap.get(id))
          .filter((r): r is Recipe => Boolean(r));
      }
      return weekData.recipes.filter((r) => !nonDinnerIdSet.has(r.id));
    },
    [weekData, recipeMap, nonDinnerIdSet],
  );

  const reSimulateSlot = useCallback(
    (dayIndex: number, slot: MealSlotType) => {
      if (!weekData) return;
      setState((prev) => {
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
        const candidates = eligible.length > 0 ? eligible : fallback.length > 0 ? fallback : pool;

        // Sort by preference alignment: Favorites (+10), shared favorite ingredients (+1 each)
        const scored = [...candidates].sort((a, b) => {
          const scoreA =
            (favSet.has(a.id) ? 10 : 0) +
            a.ingredients.filter((i) => favIngredients.has(i.canonical_id)).length;
          const scoreB =
            (favSet.has(b.id) ? 10 : 0) +
            b.ingredients.filter((i) => favIngredients.has(i.canonical_id)).length;
          return scoreB - scoreA;
        });

        // Cycle deterministically among scored candidates
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
        if (lockedSet.has(dayIdx) && slot === 'dinner') return currentId;
        const pool = getSlotPool(slot);
        const nonBlocked = pool.filter((r) => !blockedSet.has(r.id) && isRecipeSafe(r));
        const safePool = nonBlocked.length > 0 ? nonBlocked : pool.filter((r) => !blockedSet.has(r.id));
        const finalPool = safePool.length > 0 ? safePool : pool;
        if (finalPool.length === 0) return currentId;

        // Weighted pool: Favorites appear 3x more often than neutral recipes
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

  return {
    loading,
    error,
    weekData,
    state,
    plannedRecipes,
    weeklyBreakfasts,
    weeklySnacks,
    groceryItems,
    recipeMap,
    isRecipeSafe,
    setAdults,
    toggleBracket,
    toggleAllergen,
    toggleLock,
    swapMeal,
    shuffleUnlocked,
    reSimulateSlot,
    reSimulateWeek,
    toggleFavorite,
    toggleBlocked,
    toggleBreakfastIncluded,
    toggleSnackIncluded,
    toggleGroceryItem,
    clearCheckedGroceries,
    setHidePantryStaples,
    addCustomItem,
    toggleCustomItem,
    removeCustomItem,
    togglePrepIngredient,
    getUntriedFoodsInRecipe,
    toggleFirstFood,
    setFirstFoodReaction,
    addCustomFirstFood,
    removeCustomFirstFood,
  };
}
