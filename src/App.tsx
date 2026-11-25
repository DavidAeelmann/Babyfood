import { useEffect, useMemo, useState } from 'react';
import { BottomNav, type TabKey } from './components/BottomNav';
import { CookView } from './components/CookView';
import { FirstFoodsView } from './components/FirstFoodsView';
import { HouseholdBar } from './components/HouseholdBar';
import { PlanView } from './components/PlanView';
import { ShopView } from './components/ShopView';
import { useMealPlanner } from './hooks/useMealPlanner';
import { FIRST_FOODS_CATALOG } from './lib/firstFoods';

export function App() {
  const {
    loading,
    error,
    weekData,
    state,
    plannedRecipes,
    groceryItems,
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
  } = useMealPlanner();

  const [activeTab, setActiveTab] = useState<TabKey>('plan');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRecipeId && plannedRecipes.length > 0) {
      setSelectedRecipeId(plannedRecipes[0].id);
    }
  }, [plannedRecipes, selectedRecipeId]);

  const activeCookRecipe = useMemo(() => {
    if (selectedRecipeId) {
      const found =
        plannedRecipes.find((r) => r.id === selectedRecipeId) ??
        weekData?.recipes.find((r) => r.id === selectedRecipeId);
      if (found) return found;
    }
    return plannedRecipes[0] ?? weekData?.recipes[0] ?? null;
  }, [selectedRecipeId, plannedRecipes, weekData]);

  const remainingShopCount = useMemo(() => {
    const visibleItems = state.hidePantryStaples
      ? groceryItems.filter((i) => !i.is_pantry_staple)
      : groceryItems;
    const uncheckedRecipe = visibleItems.filter(
      (i) => !state.checkedGroceries[i.key],
    ).length;
    const uncheckedCustom = state.customItems.filter((c) => !c.checked).length;
    return uncheckedRecipe + uncheckedCustom;
  }, [
    groceryItems,
    state.hidePantryStaples,
    state.checkedGroceries,
    state.customItems,
  ]);

  const untriedInPlanCount = useMemo(() => {
    const plannedCanonical = new Set(
      plannedRecipes.flatMap((r) => r.ingredients.map((i) => i.canonical_id)),
    );
    return FIRST_FOODS_CATALOG.filter(
      (food) =>
        !state.triedFoods[food.id] &&
        food.canonicalIds.some((cid) => plannedCanonical.has(cid)),
    ).length;
  }, [plannedRecipes, state.triedFoods]);

  const handleOpenCook = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setActiveTab('cook');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSelectTab = (tab: TabKey) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4">
        <div className="text-center">
          <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-3 border-[#E0DAD0] border-t-[#2F6F4E]" />
          <p className="text-sm font-semibold text-[#5C6862]">
            Loading this week&apos;s meal plan…
          </p>
        </div>
      </div>
    );
  }

  if (error || !weekData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4">
        <div className="max-w-sm rounded-2xl border border-[#E7E2D8] bg-white p-5 text-center shadow-xs">
          <h1 className="text-base font-bold text-[#1C2420]">
            Could not load meal plan
          </h1>
          <p className="mt-1 text-xs text-[#5C6862]">
            {error ?? 'Missing week-current.json'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C2420]">
      <HouseholdBar
        household={state.household}
        weekId={weekData.week_id}
        onSetAdults={setAdults}
        onToggleBracket={toggleBracket}
        onToggleAllergen={toggleAllergen}
      />

      <main>
        {activeTab === 'plan' && (
          <PlanView
            plannedRecipes={plannedRecipes}
            lockedIndices={state.lockedIndices}
            activeBrackets={state.household.activeBrackets}
            excludedAllergens={state.household.excludedAllergens}
            getUntriedFoodsInRecipe={getUntriedFoodsInRecipe}
            onOpenCook={handleOpenCook}
            onToggleLock={toggleLock}
            onSwapMeal={swapMeal}
            onShuffleUnlocked={shuffleUnlocked}
          />
        )}

        {activeTab === 'shop' && (
          <ShopView
            items={groceryItems}
            checkedGroceries={state.checkedGroceries}
            hidePantryStaples={state.hidePantryStaples}
            customItems={state.customItems}
            onToggleItem={toggleGroceryItem}
            onClearChecked={clearCheckedGroceries}
            onSetHidePantry={setHidePantryStaples}
            onAddCustomItem={addCustomItem}
            onToggleCustomItem={toggleCustomItem}
            onRemoveCustomItem={removeCustomItem}
          />
        )}

        {activeTab === 'cook' && activeCookRecipe && (
          <CookView
            recipe={activeCookRecipe}
            plannedRecipes={plannedRecipes}
            household={state.household}
            prepChecked={state.prepChecked[activeCookRecipe.id] ?? {}}
            onSelectRecipe={setSelectedRecipeId}
            onTogglePrepIngredient={(cid) =>
              togglePrepIngredient(activeCookRecipe.id, cid)
            }
            onBackToPlan={() => handleSelectTab('plan')}
          />
        )}

        {activeTab === 'intro' && (
          <FirstFoodsView
            plannedRecipes={plannedRecipes}
            triedFoods={state.triedFoods}
            customFirstFoods={state.customFirstFoods}
            onToggleFood={toggleFirstFood}
            onSetReaction={setFirstFoodReaction}
            onAddCustomFood={addCustomFirstFood}
            onRemoveCustomFood={removeCustomFirstFood}
            onOpenCook={handleOpenCook}
          />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        remainingShopCount={remainingShopCount}
        untriedInPlanCount={untriedInPlanCount}
      />
    </div>
  );
}

export default App;
