import { useState } from 'react';
import {
  Check,
  Clock,
  Cookie,
  LayoutGrid,
  List,
  Shuffle,
  Sprout,
  Sunrise,
} from 'lucide-react';
import { BRACKET_META } from '../lib/constants';
import { resolveAssetUrl } from '../lib/storage';
import { MealCard } from './MealCard';
import { WeekGridView } from './WeekGridView';
import type {
  Allergen,
  BracketKey,
  DayPlan,
  FirstFoodItem,
  MealSlotType,
  Recipe,
} from '../types/recipe';

interface PlanViewProps {
  plannedRecipes: Recipe[];
  weekGrid: DayPlan[];
  recipeMap: Map<string, Recipe>;
  weeklyBreakfasts: Recipe[];
  includedBreakfastIds: string[];
  weeklySnacks: Recipe[];
  includedSnackIds: string[];
  lockedIndices: number[];
  favoriteIds: string[];
  blockedIds: string[];
  activeBrackets: BracketKey[];
  excludedAllergens: Allergen[];
  getUntriedFoodsInRecipe: (recipe: Recipe) => FirstFoodItem[];
  onOpenCook: (recipeId: string) => void;
  onToggleLock: (dayIndex: number) => void;
  onSwapMeal: (dayIndex: number) => void;
  onShuffleUnlocked: () => void;
  onReSimulateSlot: (dayIndex: number, slot: MealSlotType) => void;
  onReSimulateWeek: () => void;
  onToggleFavorite: (recipeId: string) => void;
  onToggleBlocked: (recipeId: string) => void;
  onToggleBreakfastIncluded: (breakfastId: string) => void;
  onToggleSnackIncluded: (snackId: string) => void;
}

interface CompactSideSectionProps {
  title: string;
  subtitle: string;
  badgeLabel: string;
  testId: string;
  togglePrefix: string;
  icon: 'breakfast' | 'snack';
  items: Recipe[];
  includedIds: string[];
  activeBrackets: BracketKey[];
  getUntriedFoodsInRecipe: (recipe: Recipe) => FirstFoodItem[];
  onOpenCook: (recipeId: string) => void;
  onToggleIncluded: (id: string) => void;
}

function CompactSideSection({
  title,
  subtitle,
  badgeLabel,
  testId,
  togglePrefix,
  icon,
  items,
  includedIds,
  activeBrackets,
  getUntriedFoodsInRecipe,
  onOpenCook,
  onToggleIncluded,
}: CompactSideSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-7" data-testid={testId}>
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            icon === 'breakfast'
              ? 'bg-[#E8F2EC] text-[#2F6F4E]'
              : 'bg-[#FEF5E6] text-[#9C5C00]'
          }`}
        >
          {icon === 'breakfast' ? (
            <Sunrise className="h-4 w-4" />
          ) : (
            <Cookie className="h-4 w-4" />
          )}
        </span>
        <div>
          <h3 className="text-base font-bold tracking-tight text-[#1C2420]">
            {title}
          </h3>
          <p className="text-xs text-[#5C6862]">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const included = includedIds.includes(item.id);
          const totalMinutes = item.prep_minutes + item.cook_minutes;
          const untried = getUntriedFoodsInRecipe(item);
          const showBabyNewFoods =
            untried.length > 0 &&
            (activeBrackets.includes('6_9m') || activeBrackets.includes('9_12m'));

          return (
            <article
              key={item.id}
              data-testid={`${togglePrefix}-card-${item.id}`}
              className="overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white shadow-xs"
            >
              <button
                type="button"
                onClick={() => onOpenCook(item.id)}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F2EFE9]">
                  <img
                    src={resolveAssetUrl(item.image_url)}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5C6862]">
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        icon === 'breakfast'
                          ? 'bg-[#E8F2EC] text-[#2F6F4E]'
                          : 'bg-[#FEF5E6] text-[#9C5C00]'
                      }`}
                    >
                      {badgeLabel}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="h-3 w-3 text-[#2F6F4E]" />
                      {totalMinutes}m
                    </span>
                  </div>
                  <h4 className="mt-1 truncate text-sm font-bold text-[#1C2420]">
                    {item.title}
                  </h4>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {activeBrackets.slice(0, 2).map((key) => (
                      <span
                        key={key}
                        className="rounded-full bg-[#E8F2EC] px-2 py-0.5 text-[10px] font-semibold text-[#2F6F4E]"
                      >
                        {BRACKET_META[key].shortLabel}
                      </span>
                    ))}
                    {showBabyNewFoods && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FEF5E6] px-2 py-0.5 text-[10px] font-semibold text-[#9C5C00]">
                        <Sprout className="h-2.5 w-2.5" />
                        New: {untried[0].name}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              <div className="flex items-center justify-between border-t border-[#F2EFE9] px-3 py-2">
                <button
                  type="button"
                  onClick={() => onOpenCook(item.id)}
                  className="min-h-[36px] text-xs font-semibold text-[#2F6F4E] hover:underline"
                >
                  Open Recipe →
                </button>

                <button
                  type="button"
                  data-testid={`${togglePrefix}-shop-toggle-${item.id}`}
                  onClick={() => onToggleIncluded(item.id)}
                  aria-pressed={included}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors ${
                    included
                      ? 'bg-[#2F6F4E] text-white'
                      : 'bg-[#F2EFE9] text-[#5C6862]'
                  }`}
                >
                  {included && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  {included ? 'In Shop List' : 'Add to Shop'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function PlanView({
  plannedRecipes,
  weekGrid,
  recipeMap,
  weeklyBreakfasts,
  includedBreakfastIds,
  weeklySnacks,
  includedSnackIds,
  lockedIndices,
  favoriteIds,
  blockedIds,
  activeBrackets,
  excludedAllergens,
  getUntriedFoodsInRecipe,
  onOpenCook,
  onToggleLock,
  onSwapMeal,
  onShuffleUnlocked,
  onReSimulateSlot,
  onReSimulateWeek,
  onToggleFavorite,
  onToggleBlocked,
  onToggleBreakfastIncluded,
  onToggleSnackIncluded,
}: PlanViewProps) {
  const [viewMode, setViewMode] = useState<'week' | 'cards'>('week');

  return (
    <section className="mx-auto max-w-md px-4 pt-4 pb-24">
      {/* Header + View Mode Switcher */}
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#1C2420]">
            Weekly Plan
          </h2>
          <p className="text-xs text-[#5C6862]">
            {favoriteIds.length > 0 || blockedIds.length > 0
              ? `${favoriteIds.length} fav · ${blockedIds.length} blocked`
              : 'Tap ❤️ or 🚫 to tune future options'}
          </p>
        </div>

        <button
          type="button"
          data-testid="shuffle-unlocked-btn"
          onClick={viewMode === 'week' ? onReSimulateWeek : onShuffleUnlocked}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl bg-[#2F6F4E] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#25593E] active:scale-[0.98]"
        >
          <Shuffle className="h-3.5 w-3.5" />
          {viewMode === 'week' ? 'Re-simulate Week' : 'Shuffle Unlocked'}
        </button>
      </div>

      {/* Segmented Toggle: Compact Week View vs Photo Cards */}
      <div className="mb-4 grid grid-cols-2 rounded-xl border border-[#E7E2D8] bg-[#F2EFE9] p-1">
        <button
          type="button"
          data-testid="view-mode-week"
          onClick={() => setViewMode('week')}
          className={`flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
            viewMode === 'week'
              ? 'bg-white text-[#1C2420] shadow-xs'
              : 'text-[#5C6862]'
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Week View
        </button>
        <button
          type="button"
          data-testid="view-mode-cards"
          onClick={() => setViewMode('cards')}
          className={`flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
            viewMode === 'cards'
              ? 'bg-white text-[#1C2420] shadow-xs'
              : 'text-[#5C6862]'
          }`}
        >
          <List className="h-3.5 w-3.5" />
          Photo Cards
        </button>
      </div>

      {viewMode === 'week' ? (
        <WeekGridView
          weekGrid={weekGrid}
          recipeMap={recipeMap}
          lockedIndices={lockedIndices}
          favoriteIds={favoriteIds}
          blockedIds={blockedIds}
          onOpenCook={onOpenCook}
          onReSimulateSlot={onReSimulateSlot}
          onToggleLock={onToggleLock}
          onToggleFavorite={onToggleFavorite}
          onToggleBlocked={onToggleBlocked}
        />
      ) : (
        <>
          <div className="space-y-4">
            {plannedRecipes.map((recipe, idx) => (
              <MealCard
                key={`${idx}-${recipe.id}`}
                recipe={recipe}
                dayIndex={idx}
                isLocked={lockedIndices.includes(idx)}
                isFavorite={favoriteIds.includes(recipe.id)}
                isBlocked={blockedIds.includes(recipe.id)}
                activeBrackets={activeBrackets}
                excludedAllergens={excludedAllergens}
                untriedFoods={getUntriedFoodsInRecipe(recipe)}
                onOpenCook={() => onOpenCook(recipe.id)}
                onToggleLock={() => onToggleLock(idx)}
                onSwap={() => onSwapMeal(idx)}
                onToggleFavorite={() => onToggleFavorite(recipe.id)}
                onToggleBlocked={() => onToggleBlocked(recipe.id)}
              />
            ))}
          </div>

          <CompactSideSection
            title="Healthy Weekly Breakfasts"
            subtitle="Quick iron-rich & low-sugar mornings for baby & family"
            badgeLabel="Breakfast"
            testId="weekly-breakfasts-section"
            togglePrefix="breakfast"
            icon="breakfast"
            items={weeklyBreakfasts}
            includedIds={includedBreakfastIds}
            activeBrackets={activeBrackets}
            getUntriedFoodsInRecipe={getUntriedFoodsInRecipe}
            onOpenCook={onOpenCook}
            onToggleIncluded={onToggleBreakfastIncluded}
          />

          <CompactSideSection
            title="Healthy Weekly Snacks"
            subtitle="Batch-prep muffins & soft cookies (zero added sugar)"
            badgeLabel="Snack"
            testId="weekly-snacks-section"
            togglePrefix="snack"
            icon="snack"
            items={weeklySnacks}
            includedIds={includedSnackIds}
            activeBrackets={activeBrackets}
            getUntriedFoodsInRecipe={getUntriedFoodsInRecipe}
            onOpenCook={onOpenCook}
            onToggleIncluded={onToggleSnackIncluded}
          />
        </>
      )}
    </section>
  );
}
