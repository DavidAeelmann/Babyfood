import {
  Ban,
  Cookie,
  Heart,
  Lock,
  RefreshCw,
  Sun,
  Sunrise,
  Unlock,
  UtensilsCrossed,
} from 'lucide-react';
import { DAY_LABELS } from '../lib/constants';
import type { DayPlan, EnabledSlots, MealSlotType, Recipe } from '../types/recipe';

interface WeekGridViewProps {
  weekGrid: DayPlan[];
  enabledSlots: EnabledSlots;
  recipeMap: Map<string, Recipe>;
  lockedIndices: number[];
  favoriteIds: string[];
  blockedIds: string[];
  onOpenCook: (recipeId: string) => void;
  onReSimulateSlot: (dayIndex: number, slot: MealSlotType) => void;
  onToggleLock: (dayIndex: number) => void;
  onToggleFavorite: (recipeId: string) => void;
  onToggleBlocked: (recipeId: string) => void;
}

const SLOT_META: Array<{
  slot: MealSlotType;
  label: string;
  icon: typeof Sunrise;
  pillClass: string;
}> = [
  {
    slot: 'breakfast',
    label: 'Breakfast',
    icon: Sunrise,
    pillClass: 'bg-[#E8F2EC] text-[#2F6F4E]',
  },
  {
    slot: 'lunch',
    label: 'Lunch',
    icon: Sun,
    pillClass: 'bg-[#FEF5E6] text-[#9C5C00]',
  },
  {
    slot: 'snack',
    label: 'Snack',
    icon: Cookie,
    pillClass: 'bg-[#FDF0EB] text-[#B84C27]',
  },
  {
    slot: 'dinner',
    label: 'Dinner',
    icon: UtensilsCrossed,
    pillClass: 'bg-[#1C2420]/10 text-[#1C2420]',
  },
];

export function WeekGridView({
  weekGrid,
  enabledSlots,
  recipeMap,
  lockedIndices,
  favoriteIds,
  blockedIds,
  onOpenCook,
  onReSimulateSlot,
  onToggleLock,
  onToggleFavorite,
  onToggleBlocked,
}: WeekGridViewProps) {
  const activeSlotMeta = SLOT_META.filter((s) => enabledSlots[s.slot]);

  return (
    <div data-testid="week-grid-view" className="space-y-3">
      {weekGrid.map((dayPlan, dayIdx) => {
        const dayLabel = DAY_LABELS[dayIdx] ?? `Day ${dayIdx + 1}`;
        const isLocked = lockedIndices.includes(dayIdx);

        return (
          <article
            key={dayIdx}
            data-testid={`week-day-card-${dayIdx}`}
            className="overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white shadow-xs"
          >
            {/* Compact Day Header — Lock Day locks all slots on this day */}
            <div className="flex items-center justify-between border-b border-[#F2EFE9] bg-[#FAF8F5] px-3.5 py-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#1C2420]">
                {dayLabel}
              </span>
              <button
                type="button"
                data-testid={`lock-day-btn-${dayIdx}`}
                onClick={() => onToggleLock(dayIdx)}
                aria-pressed={isLocked}
                aria-label={isLocked ? `Unlock ${dayLabel}` : `Lock ${dayLabel}`}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                  isLocked
                    ? 'bg-[#1C2420] text-white'
                    : 'border border-[#E0DAD0] bg-white text-[#5C6862]'
                }`}
              >
                {isLocked ? (
                  <>
                    <Lock className="h-3 w-3" />
                    Day Locked
                  </>
                ) : (
                  <>
                    <Unlock className="h-3 w-3" />
                    Lock Day
                  </>
                )}
              </button>
            </div>

            {/* Enabled Meal Slots */}
            <ul className="divide-y divide-[#F2EFE9]">
              {activeSlotMeta.map(({ slot, label, icon: Icon, pillClass }) => {
                const recipeId = dayPlan[slot];
                const recipe = recipeMap.get(recipeId);
                if (!recipe) return null;

                const isFav = favoriteIds.includes(recipe.id);
                const isBlocked = blockedIds.includes(recipe.id);

                return (
                  <li
                    key={slot}
                    data-testid={`week-slot-${dayIdx}-${slot}`}
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <span
                      title={label}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${pillClass}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>

                    <button
                      type="button"
                      onClick={() => onOpenCook(recipe.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-[#8A948E]">
                        {label}
                      </span>
                      <span
                        className={`block truncate text-xs font-semibold ${
                          isBlocked
                            ? 'text-[#B84C27] line-through'
                            : 'text-[#1C2420]'
                        }`}
                      >
                        {recipe.title}
                      </span>
                    </button>

                    {/* Favorite / Block / Re-simulate */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        data-testid={`fav-btn-${dayIdx}-${slot}`}
                        onClick={() => onToggleFavorite(recipe.id)}
                        aria-pressed={isFav}
                        aria-label={`Favorite ${recipe.title}`}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          isFav
                            ? 'bg-[#FDF0EB] text-[#D96B43]'
                            : 'text-[#8A948E] hover:bg-[#F2EFE9]'
                        }`}
                      >
                        <Heart
                          className="h-3.5 w-3.5"
                          fill={isFav ? 'currentColor' : 'none'}
                        />
                      </button>

                      <button
                        type="button"
                        data-testid={`block-btn-${dayIdx}-${slot}`}
                        onClick={() => onToggleBlocked(recipe.id)}
                        aria-pressed={isBlocked}
                        aria-label={`Block ${recipe.title}`}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          isBlocked
                            ? 'bg-[#B84C27] text-white'
                            : 'text-[#8A948E] hover:bg-[#F2EFE9]'
                        }`}
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        data-testid={`resim-btn-${dayIdx}-${slot}`}
                        onClick={() => onReSimulateSlot(dayIdx, slot)}
                        disabled={isLocked}
                        aria-label={`Re-simulate ${dayLabel} ${label}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E0DAD0] bg-white text-[#2F6F4E] hover:bg-[#F2EFE9] disabled:opacity-35"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
