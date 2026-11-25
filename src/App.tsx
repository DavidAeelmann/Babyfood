import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { BottomNav, type TabKey } from './components/BottomNav';
import { CookView } from './components/CookView';
import { FirstFoodsModal } from './components/FirstFoodsModal';
import { FirstFoodsView } from './components/FirstFoodsView';
import { HouseholdBar } from './components/HouseholdBar';
import { PlanView } from './components/PlanView';
import { ShareModal } from './components/ShareModal';
import { ShopView } from './components/ShopView';
import { useMealPlanner } from './hooks/useMealPlanner';
import {
  FIRST_FOODS_CATALOG,
  TOP_9_ALLERGENS,
  getTriedAllergenExposures,
} from './lib/firstFoods';
import { buildShareUrl } from './lib/shareSync';

export function App() {
  const {
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
  } = useMealPlanner();

  const [activeTab, setActiveTab] = useState<TabKey>('plan');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [firstFoodsModalOpen, setFirstFoodsModalOpen] = useState(false);

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
    const activeCanonical = new Set(
      activeSlotRecipes.flatMap((r) => r.ingredients.map((i) => i.canonical_id)),
    );
    return FIRST_FOODS_CATALOG.filter(
      (food) =>
        !state.triedFoods[food.id] &&
        food.canonicalIds.some((cid) => activeCanonical.has(cid)),
    ).length;
  }, [activeSlotRecipes, state.triedFoods]);

  const triedFoodsCount = useMemo(() => {
    return (
      FIRST_FOODS_CATALOG.filter((f) => Boolean(state.triedFoods[f.id])).length +
      state.customFirstFoods.filter((c) => Boolean(state.triedFoods[c.id])).length
    );
  }, [state.triedFoods, state.customFirstFoods]);

  const triedAllergensCount = useMemo(() => {
    const exposures = getTriedAllergenExposures(state.triedFoods);
    return TOP_9_ALLERGENS.filter((a) => exposures[a] > 0).length;
  }, [state.triedFoods]);

  const shareUrl = useMemo(() => {
    if (!shareModalOpen || !weekData || typeof window === 'undefined') return '';
    return buildShareUrl(window.location.href, {
      weekId: weekData.week_id,
      household: state.household,
      enabledSlots: state.enabledSlots,
      weekGrid: state.weekGrid,
      plannedIds: state.plannedIds,
      customItems: state.customItems,
      groceryItems,
      checkedGroceries: state.checkedGroceries,
    });
  }, [
    shareModalOpen,
    weekData,
    state.household,
    state.enabledSlots,
    state.weekGrid,
    state.plannedIds,
    state.customItems,
    groceryItems,
    state.checkedGroceries,
  ]);

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
        triedFoodsCount={triedFoodsCount}
        totalFoodsCount={totalCatalogFoodsCount}
        triedAllergensCount={triedAllergensCount}
        onOpenFirstFoods={() => setFirstFoodsModalOpen(true)}
        onSetAdults={setAdults}
        onToggleBracket={toggleBracket}
        onToggleAllergen={toggleAllergen}
      />

      {syncNotice && (
        <div
          data-testid="sync-notice-banner"
          className="mx-auto mt-2 max-w-md px-4"
        >
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#CFE3D6] bg-[#E8F2EC] px-3 py-2 text-xs font-semibold text-[#2F6F4E]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {syncNotice}
            </span>
            <button
              type="button"
              onClick={dismissSyncNotice}
              aria-label="Dismiss sync notice"
              className="rounded-md p-1 hover:bg-white/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <main>
        {activeTab === 'plan' && (
          <PlanView
            plannedRecipes={plannedRecipes}
            weekGrid={state.weekGrid}
            enabledSlots={state.enabledSlots}
            recipeMap={recipeMap}
            weeklyBreakfasts={weeklyBreakfasts}
            weeklyLunches={weeklyLunches}
            weeklySnacks={weeklySnacks}
            lockedIndices={state.lockedIndices}
            favoriteIds={state.favoriteIds}
            blockedIds={state.blockedIds}
            activeBrackets={state.household.activeBrackets}
            excludedAllergens={state.household.excludedAllergens}
            getUntriedFoodsInRecipe={getUntriedFoodsInRecipe}
            onOpenCook={handleOpenCook}
            onToggleLock={toggleLock}
            onSwapMeal={swapMeal}
            onShuffleUnlocked={shuffleUnlocked}
            onReSimulateSlot={reSimulateSlot}
            onReSimulateWeek={reSimulateWeek}
            onToggleFavorite={toggleFavorite}
            onToggleBlocked={toggleBlocked}
            onToggleSlotEnabled={toggleSlotEnabled}
            onOpenShare={() => setShareModalOpen(true)}
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
            onOpenShare={() => setShareModalOpen(true)}
          />
        )}

        {activeTab === 'cook' && activeCookRecipe && (
          <CookView
            recipe={activeCookRecipe}
            plannedRecipes={plannedRecipes}
            household={state.household}
            prepChecked={state.prepChecked[activeCookRecipe.id] ?? {}}
            untriedFoods={getUntriedFoodsInRecipe(activeCookRecipe)}
            onSelectRecipe={setSelectedRecipeId}
            onTogglePrepIngredient={(cid) =>
              togglePrepIngredient(activeCookRecipe.id, cid)
            }
            onMarkMealFoodsTried={markRecipeFoodsTried}
            onBackToPlan={() => handleSelectTab('plan')}
          />
        )}

        {activeTab === 'intro' && (
          <FirstFoodsView
            plannedRecipes={activeSlotRecipes}
            triedFoods={state.triedFoods}
            customFirstFoods={state.customFirstFoods}
            onToggleFood={toggleFirstFood}
            onIncrementExposure={incrementFoodExposure}
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

      {shareModalOpen && shareUrl && (
        <ShareModal
          shareUrl={shareUrl}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {firstFoodsModalOpen && (
        <FirstFoodsModal
          plannedRecipes={activeSlotRecipes}
          triedFoods={state.triedFoods}
          customFirstFoods={state.customFirstFoods}
          onToggleFood={toggleFirstFood}
          onIncrementExposure={incrementFoodExposure}
          onSetReaction={setFirstFoodReaction}
          onAddCustomFood={addCustomFirstFood}
          onRemoveCustomFood={removeCustomFirstFood}
          onOpenCook={handleOpenCook}
          onClose={() => setFirstFoodsModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
