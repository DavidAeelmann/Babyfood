import { Check, Clock, Cookie, Shuffle, Sprout } from 'lucide-react';
import { BRACKET_META } from '../lib/constants';
import { resolveAssetUrl } from '../lib/storage';
import { MealCard } from './MealCard';
import type { Allergen, BracketKey, FirstFoodItem, Recipe } from '../types/recipe';

interface PlanViewProps {
  plannedRecipes: Recipe[];
  weeklySnacks: Recipe[];
  includedSnackIds: string[];
  lockedIndices: number[];
  activeBrackets: BracketKey[];
  excludedAllergens: Allergen[];
  getUntriedFoodsInRecipe: (recipe: Recipe) => FirstFoodItem[];
  onOpenCook: (recipeId: string) => void;
  onToggleLock: (dayIndex: number) => void;
  onSwapMeal: (dayIndex: number) => void;
  onShuffleUnlocked: () => void;
  onToggleSnackIncluded: (snackId: string) => void;
}

export function PlanView({
  plannedRecipes,
  weeklySnacks,
  includedSnackIds,
  lockedIndices,
  activeBrackets,
  excludedAllergens,
  getUntriedFoodsInRecipe,
  onOpenCook,
  onToggleLock,
  onSwapMeal,
  onShuffleUnlocked,
  onToggleSnackIncluded,
}: PlanViewProps) {
  return (
    <section className="mx-auto max-w-md px-4 pt-4 pb-24">
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#1C2420]">
            This Week&apos;s Dinners
          </h2>
          <p className="text-xs text-[#5C6862]">
            Tap any meal for baby prep &amp; step-by-step cooking
          </p>
        </div>

        <button
          type="button"
          data-testid="shuffle-unlocked-btn"
          onClick={onShuffleUnlocked}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl bg-[#2F6F4E] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#25593E] active:scale-[0.98]"
        >
          <Shuffle className="h-3.5 w-3.5" />
          Shuffle Unlocked
        </button>
      </div>

      <div className="space-y-4">
        {plannedRecipes.map((recipe, idx) => (
          <MealCard
            key={`${idx}-${recipe.id}`}
            recipe={recipe}
            dayIndex={idx}
            isLocked={lockedIndices.includes(idx)}
            activeBrackets={activeBrackets}
            excludedAllergens={excludedAllergens}
            untriedFoods={getUntriedFoodsInRecipe(recipe)}
            onOpenCook={() => onOpenCook(recipe.id)}
            onToggleLock={() => onToggleLock(idx)}
            onSwap={() => onSwapMeal(idx)}
          />
        ))}
      </div>

      {/* Weekly Healthy Snacks on the Side */}
      {weeklySnacks.length > 0 && (
        <div className="mt-7" data-testid="weekly-snacks-section">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FEF5E6] text-[#9C5C00]">
              <Cookie className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-bold tracking-tight text-[#1C2420]">
                Healthy Weekly Snacks
              </h3>
              <p className="text-xs text-[#5C6862]">
                Batch-prep muffins &amp; soft cookies (zero added sugar)
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {weeklySnacks.map((snack) => {
              const included = includedSnackIds.includes(snack.id);
              const totalMinutes = snack.prep_minutes + snack.cook_minutes;
              const untried = getUntriedFoodsInRecipe(snack);
              const showBabyNewFoods =
                untried.length > 0 &&
                (activeBrackets.includes('6_9m') || activeBrackets.includes('9_12m'));

              return (
                <article
                  key={snack.id}
                  data-testid={`snack-card-${snack.id}`}
                  className="overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => onOpenCook(snack.id)}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F2EFE9]">
                      <img
                        src={resolveAssetUrl(snack.image_url)}
                        alt={snack.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5C6862]">
                        <span className="rounded-full bg-[#FEF5E6] px-2 py-0.5 text-[#9C5C00]">
                          Snack
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="h-3 w-3 text-[#2F6F4E]" />
                          {totalMinutes}m
                        </span>
                      </div>
                      <h4 className="mt-1 truncate text-sm font-bold text-[#1C2420]">
                        {snack.title}
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
                      onClick={() => onOpenCook(snack.id)}
                      className="min-h-[36px] text-xs font-semibold text-[#2F6F4E] hover:underline"
                    >
                      Open Recipe →
                    </button>

                    <button
                      type="button"
                      data-testid={`snack-shop-toggle-${snack.id}`}
                      onClick={() => onToggleSnackIncluded(snack.id)}
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
      )}
    </section>
  );
}
