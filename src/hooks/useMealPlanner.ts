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
  FirstFoodCategory,
  FirstFoodItem,
  Recipe,
  TriedFoodReaction,
  WeekData,
} from '../types/recipe';

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

          if (hasValidPlan) {
            return prev;
          }

          // Week rollover or first load: reset plan, locks, and recipe checkoffs,
          // while preserving householdConfig, hidePantryStaples, and customItems.
          return {
            ...prev,
            weekId: data.week_id,
            plannedIds: [...data.planned_ids],
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

  const plannedRecipes = useMemo(() => {
    return state.plannedIds
      .map((id) => recipeMap.get(id))
      .filter((r): r is Recipe => Boolean(r));
  }, [state.plannedIds, recipeMap]);

  const groceryItems = useMemo(() => {
    return aggregateGroceries(plannedRecipes, state.household);
  }, [plannedRecipes, state.household]);

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
        const safeBench = weekData.recipes.filter(
          (r) => !inPlan.has(r.id) && isRecipeSafe(r),
        );
        const anyBench = weekData.recipes.filter((r) => !inPlan.has(r.id));
        const pool = safeBench.length > 0 ? safeBench : anyBench;

        if (pool.length === 0) return prev;

        // Deterministic rotation through bench so repeated taps cycle predictably
        const currentIdxInAll = weekData.recipes.findIndex((r) => r.id === currentId);
        const candidate =
          pool.find((r) => weekData.recipes.indexOf(r) > currentIdxInAll) ?? pool[0];

        const nextPlanned = [...prev.plannedIds];
        nextPlanned[dayIndex] = candidate.id;
        return { ...prev, plannedIds: nextPlanned };
      });
    },
    [weekData, isRecipeSafe],
  );

  const shuffleUnlocked = useCallback(() => {
    if (!weekData) return;
    setState((prev) => {
      const lockedSet = new Set(prev.lockedIndices);
      const lockedIds = new Set(
        prev.plannedIds.filter((_, idx) => lockedSet.has(idx)),
      );

      const safeCandidates = weekData.recipes.filter(
        (r) => !lockedIds.has(r.id) && isRecipeSafe(r),
      );
      const fallbackCandidates = weekData.recipes.filter(
        (r) => !lockedIds.has(r.id) && !safeCandidates.includes(r),
      );

      const shuffledSafe = [...safeCandidates].sort(() => Math.random() - 0.5);
      const pool = [...shuffledSafe, ...fallbackCandidates];

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

      return { ...prev, plannedIds: nextPlanned };
    });
  }, [weekData, isRecipeSafe]);

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

  return {
    loading,
    error,
    weekData,
    state,
    plannedRecipes,
    groceryItems,
    isRecipeSafe,
    setAdults,
    toggleBracket,
    toggleAllergen,
    toggleLock,
    swapMeal,
    shuffleUnlocked,
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
