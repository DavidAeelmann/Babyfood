import { Shuffle } from 'lucide-react';
import { MealCard } from './MealCard';
import type { Allergen, BracketKey, Recipe } from '../types/recipe';

interface PlanViewProps {
  plannedRecipes: Recipe[];
  lockedIndices: number[];
  activeBrackets: BracketKey[];
  excludedAllergens: Allergen[];
  onOpenCook: (recipeId: string) => void;
  onToggleLock: (dayIndex: number) => void;
  onSwapMeal: (dayIndex: number) => void;
  onShuffleUnlocked: () => void;
}

export function PlanView({
  plannedRecipes,
  lockedIndices,
  activeBrackets,
  excludedAllergens,
  onOpenCook,
  onToggleLock,
  onSwapMeal,
  onShuffleUnlocked,
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
            onOpenCook={() => onOpenCook(recipe.id)}
            onToggleLock={() => onToggleLock(idx)}
            onSwap={() => onSwapMeal(idx)}
          />
        ))}
      </div>
    </section>
  );
}
