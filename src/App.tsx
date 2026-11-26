import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { BottomNav, type TabKey } from './components/BottomNav';
import { CookView } from './components/CookView';
import { FirstFoodsView } from './components/FirstFoodsView';
import { HouseholdBar } from './components/HouseholdBar';
import { MealPickerModal } from './components/MealPickerModal';
import { PlanView } from './components/PlanView';
import { PreferencesModal } from './components/PreferencesModal';
import { ShareModal } from './components/ShareModal';
import { ShopView } from './components/ShopView';
import { useMealPlanner } from './hooks/useMealPlanner';
import { buildShareUrl } from './lib/shareSync';
import type { MealSlotType } from './types/recipe';

export function App() {
  const {
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
    toggleCookStep,
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
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{
    dayIndex: number;
    slot: MealSlotType;
  } | null>(null);

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
            A carregar a ementa desta semana…
          </p>
        </div>
      </div>
    );
  }

  if (error || !weekData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4">
        <div className="max-w-sm rounded-2xl bg-white p-5 text-center shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <h1 className="text-base font-bold text-[#1C2420]">
            Não foi possível carregar a ementa
          </h1>
          <p className="mt-1 text-xs text-[#5C6862]">
            {error ?? 'Ficheiro week-current.json em falta'}
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

      {syncNotice && (
        <div
          data-testid="sync-notice-banner"
          className="mx-auto mt-2 max-w-md px-4"
        >
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#E8F2EC] px-3.5 py-2.5 text-xs font-semibold text-[#2F6F4E]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {syncNotice}
            </span>
            <button
              type="button"
              onClick={dismissSyncNotice}
              aria-label="Fechar aviso de sincronização"
              className="rounded-lg p-1 hover:bg-white/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <main>
        {activeTab === 'plan' && (
          <PlanView
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
            onClearSlot={clearSlot}
            onAddRandomSlot={addRandomSlotMeal}
            onOpenPicker={(dayIndex, slot) => setPickerTarget({ dayIndex, slot })}
            onToggleBlocked={toggleBlocked}
            onToggleSlotEnabled={toggleSlotEnabled}
            onOpenShare={() => setShareModalOpen(true)}
            onOpenPreferences={() => setPreferencesModalOpen(true)}
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
            stepsChecked={state.stepsChecked[activeCookRecipe.id] ?? {}}
            untriedFoods={getUntriedFoodsInRecipe(activeCookRecipe)}
            isFavorite={state.favoriteIds.includes(activeCookRecipe.id)}
            onToggleFavorite={toggleFavorite}
            onSelectRecipe={setSelectedRecipeId}
            onTogglePrepIngredient={(cid) =>
              togglePrepIngredient(activeCookRecipe.id, cid)
            }
            onToggleCookStep={(stepOrder) =>
              toggleCookStep(activeCookRecipe.id, stepOrder)
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
      />

      {pickerTarget && (
        <MealPickerModal
          dayIndex={pickerTarget.dayIndex}
          slot={pickerTarget.slot}
          recipes={getPickerOptionsForSlot(pickerTarget.slot)}
          favoriteIds={state.favoriteIds}
          excludedAllergens={state.household.excludedAllergens}
          currentRecipeId={
            state.weekGrid[pickerTarget.dayIndex]?.[pickerTarget.slot]
          }
          onSelectRecipe={(recipeId) => {
            assignSlotMeal(pickerTarget.dayIndex, pickerTarget.slot, recipeId);
            setPickerTarget(null);
          }}
          onAddCustomRecipe={addCustomRecipe}
          onClose={() => setPickerTarget(null)}
        />
      )}

      {preferencesModalOpen && (
        <PreferencesModal
          allRecipes={allRecipes}
          recipeMap={recipeMap}
          favoriteIds={state.favoriteIds}
          blockedIds={state.blockedIds}
          onToggleFavorite={toggleFavorite}
          onToggleBlocked={toggleBlocked}
          onOpenCook={handleOpenCook}
          onClose={() => setPreferencesModalOpen(false)}
        />
      )}

      {shareModalOpen && shareUrl && (
        <ShareModal
          shareUrl={shareUrl}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
