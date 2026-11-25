import { Ban, Clock, Lock, Plus, RefreshCw, ShieldAlert, Sprout, Unlock } from 'lucide-react';
import { ALLERGEN_LABELS, BRACKET_META, DAY_LABELS } from '../lib/constants';
import { resolveAssetUrl } from '../lib/storage';
import type { Allergen, BracketKey, FirstFoodItem, Recipe } from '../types/recipe';

interface MealCardProps {
  recipe: Recipe;
  dayIndex: number;
  isLocked: boolean;
  isBlocked?: boolean;
  activeBrackets: BracketKey[];
  excludedAllergens: Allergen[];
  untriedFoods?: FirstFoodItem[];
  onOpenCook: () => void;
  onToggleLock: () => void;
  onSwap: () => void;
  onOpenPicker?: () => void;
  onToggleBlocked?: () => void;
}

export function MealCard({
  recipe,
  dayIndex,
  isLocked,
  isBlocked = false,
  activeBrackets,
  excludedAllergens,
  untriedFoods = [],
  onOpenCook,
  onToggleLock,
  onSwap,
  onOpenPicker,
  onToggleBlocked,
}: MealCardProps) {
  const totalMinutes = recipe.prep_minutes + recipe.cook_minutes;
  const matchingAllergens = recipe.allergens.filter((a) =>
    excludedAllergens.includes(a),
  );
  const dayLabel = DAY_LABELS[dayIndex] ?? `Day ${dayIndex + 1}`;
  const showBabyNewFoods =
    untriedFoods.length > 0 &&
    (activeBrackets.includes('6_9m') || activeBrackets.includes('9_12m'));

  return (
    <article
      data-testid={`meal-card-${dayIndex}`}
      className="overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white shadow-xs transition-shadow hover:shadow-sm"
    >
      {/* Tappable Photo + Header area */}
      <button
        type="button"
        onClick={onOpenCook}
        className="group block w-full text-left focus:outline-none"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F2EFE9]">
          <img
            src={resolveAssetUrl(recipe.image_url)}
            alt={recipe.title}
            loading={dayIndex < 2 ? 'eager' : 'lazy'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-2.5">
            <span className="rounded-full bg-[#1C2420]/80 px-2.5 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-xs">
              {dayLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#1C2420] backdrop-blur-xs">
              <Clock className="h-3.5 w-3.5 text-[#2F6F4E]" />
              {totalMinutes}m
            </span>
          </div>
        </div>

        <div className="px-3.5 pt-3 pb-2">
          <h2 className="text-[16px] font-bold leading-snug text-[#1C2420]">
            {recipe.title}
          </h2>

          {/* Active child bracket badges + allergen warning + new first foods */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {activeBrackets.map((key) => (
              <span
                key={key}
                className="rounded-full bg-[#E8F2EC] px-2 py-0.5 text-[11px] font-semibold text-[#2F6F4E]"
              >
                {BRACKET_META[key].shortLabel} adapted
              </span>
            ))}
            {showBabyNewFoods && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF5E6] px-2 py-0.5 text-[11px] font-semibold text-[#9C5C00]">
                <Sprout className="h-3 w-3" />
                New:{' '}
                {untriedFoods
                  .slice(0, 2)
                  .map((f) => f.name)
                  .join(', ')}
                {untriedFoods.length > 2 ? ` +${untriedFoods.length - 2}` : ''}
              </span>
            )}
            {matchingAllergens.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF0EB] px-2 py-0.5 text-[11px] font-semibold text-[#B84C27]">
                <ShieldAlert className="h-3 w-3" />
                Contains {matchingAllergens.map((a) => ALLERGEN_LABELS[a]).join(', ')}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-[#F2EFE9] px-3.5 py-2">
        <div className="flex items-center gap-1">
          {onOpenPicker && (
            <button
              type="button"
              onClick={onOpenPicker}
              disabled={isLocked}
              aria-label={`Choose ${dayLabel} dinner`}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E0DAD0] bg-[#FAF8F5] text-[#2F6F4E] hover:bg-[#E8F2EC] disabled:opacity-35"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          {onToggleBlocked && (
            <button
              type="button"
              onClick={onToggleBlocked}
              aria-pressed={isBlocked}
              aria-label={`Block ${recipe.title}`}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                isBlocked
                  ? 'bg-[#B84C27] text-white'
                  : 'bg-[#F2EFE9] text-[#5C6862]'
              }`}
            >
              <Ban className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid={`lock-btn-${dayIndex}`}
            onClick={onToggleLock}
            aria-pressed={isLocked}
            aria-label={isLocked ? `Unlock ${dayLabel}` : `Lock ${dayLabel}`}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors ${
              isLocked
                ? 'bg-[#1C2420] text-white'
                : 'bg-[#F2EFE9] text-[#5C6862] hover:bg-[#E7E2D8]'
            }`}
          >
            {isLocked ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                Locked
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" />
                Lock Day
              </>
            )}
          </button>

          <button
            type="button"
            data-testid={`swap-btn-${dayIndex}`}
            onClick={onSwap}
            disabled={isLocked}
            aria-label={`Swap ${dayLabel} meal`}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#E0DAD0] bg-white px-3 text-xs font-semibold text-[#1C2420] transition-colors hover:bg-[#F2EFE9] disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#2F6F4E]" />
            Swap
          </button>
        </div>
      </div>
    </article>
  );
}
