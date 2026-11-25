import { useRef, useState, type PointerEvent } from 'react';
import {
  Ban,
  Cookie,
  Dices,
  Lock,
  Plus,
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
  blockedIds: string[];
  onOpenCook: (recipeId: string) => void;
  onReSimulateSlot: (dayIndex: number, slot: MealSlotType) => void;
  onClearSlot: (dayIndex: number, slot: MealSlotType) => void;
  onAddRandomSlot: (dayIndex: number, slot: MealSlotType) => void;
  onOpenPicker: (dayIndex: number, slot: MealSlotType) => void;
  onToggleLock: (dayIndex: number) => void;
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

const SWIPE_THRESHOLD_PX = 56;

interface SwipeableSlotRowProps {
  dayIdx: number;
  dayLabel: string;
  slot: MealSlotType;
  label: string;
  icon: typeof Sunrise;
  pillClass: string;
  recipe: Recipe | undefined;
  isLocked: boolean;
  isBlocked: boolean;
  onOpenCook: (recipeId: string) => void;
  onClearSlot: () => void;
  onAddRandomSlot: () => void;
  onOpenPicker: () => void;
  onReSimulateSlot: () => void;
  onToggleBlocked: (recipeId: string) => void;
}

function SwipeableSlotRow({
  dayIdx,
  dayLabel,
  slot,
  label,
  icon: Icon,
  pillClass,
  recipe,
  isLocked,
  isBlocked,
  onOpenCook,
  onClearSlot,
  onAddRandomSlot,
  onOpenPicker,
  onReSimulateSlot,
  onToggleBlocked,
}: SwipeableSlotRowProps) {
  const [dragX, setDragX] = useState(0);
  const startXRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  const handlePointerDown = (e: PointerEvent<HTMLLIElement>) => {
    if (isLocked || !recipe) return;
    // Do not start swipe when pressing action buttons
    if ((e.target as HTMLElement).closest('button[data-slot-action="true"]')) {
      return;
    }
    startXRef.current = e.clientX;
    draggingRef.current = true;
  };

  const handlePointerMove = (e: PointerEvent<HTMLLIElement>) => {
    if (!draggingRef.current || startXRef.current === null || isLocked) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 6) {
      setDragX(Math.max(-110, Math.min(110, dx)));
    }
  };

  const finishSwipe = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    startXRef.current = null;
    if (Math.abs(dragX) >= SWIPE_THRESHOLD_PX && !isLocked && recipe) {
      setDragX(0);
      onClearSlot();
    } else {
      setDragX(0);
    }
  };

  if (!recipe) {
    return (
      <li
        data-testid={`empty-slot-${dayIdx}-${slot}`}
        className="flex items-center gap-2 bg-[#FAF8F5]/70 px-3 py-2"
      >
        <span
          title={label}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg opacity-60 ${pillClass}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>

        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-[#8A948E]">
            {label}
          </span>
          <span className="block text-xs italic text-[#8A948E]">
            Blank — swipe cleared
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-testid={`choose-btn-${dayIdx}-${slot}`}
            onClick={onOpenPicker}
            disabled={isLocked}
            aria-label={`Choose ${dayLabel} ${label}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E0DAD0] bg-white text-[#2F6F4E] hover:bg-[#E8F2EC] disabled:opacity-35"
          >
            <Plus className="h-4 w-4" />
          </button>

          <button
            type="button"
            data-testid={`add-random-btn-${dayIdx}-${slot}`}
            onClick={onAddRandomSlot}
            disabled={isLocked}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#2F6F4E] px-2.5 text-[11px] font-semibold text-white hover:bg-[#25593E] disabled:opacity-35"
          >
            <Dices className="h-3.5 w-3.5" />
            Add Random
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      data-testid={`week-slot-${dayIdx}-${slot}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishSwipe}
      onPointerCancel={finishSwipe}
      style={{ touchAction: 'pan-y' }}
      className="relative overflow-hidden select-none"
    >
      {/* Subtle swipe-to-clear reveal background */}
      {Math.abs(dragX) > 10 && (
        <div className="absolute inset-0 flex items-center justify-between bg-[#FDF0EB] px-4 text-[11px] font-bold text-[#B84C27]">
          <span>Release to clear</span>
          <span>Release to clear</span>
        </div>
      )}

      <div
        style={{
          transform: dragX !== 0 ? `translateX(${dragX}px)` : undefined,
          transition: dragX === 0 ? 'transform 160ms ease-out' : undefined,
        }}
        className="relative flex items-center gap-2 bg-white px-3 py-2"
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
              isBlocked ? 'text-[#B84C27] line-through' : 'text-[#1C2420]'
            }`}
          >
            {recipe.title}
          </span>
        </button>

        {/* + Choose / Block / Re-simulate */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-slot-action="true"
            data-testid={`choose-btn-${dayIdx}-${slot}`}
            onClick={onOpenPicker}
            disabled={isLocked}
            aria-label={`Choose ${dayLabel} ${label}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E0DAD0] bg-[#FAF8F5] text-[#2F6F4E] hover:bg-[#E8F2EC] disabled:opacity-35"
          >
            <Plus className="h-4 w-4" />
          </button>

          <button
            type="button"
            data-slot-action="true"
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
            data-slot-action="true"
            data-testid={`resim-btn-${dayIdx}-${slot}`}
            onClick={onReSimulateSlot}
            disabled={isLocked}
            aria-label={`Re-simulate ${dayLabel} ${label}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E0DAD0] bg-white text-[#2F6F4E] hover:bg-[#F2EFE9] disabled:opacity-35"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

export function WeekGridView({
  weekGrid,
  enabledSlots,
  recipeMap,
  lockedIndices,
  blockedIds,
  onOpenCook,
  onReSimulateSlot,
  onClearSlot,
  onAddRandomSlot,
  onOpenPicker,
  onToggleLock,
  onToggleBlocked,
}: WeekGridViewProps) {
  const activeSlotMeta = SLOT_META.filter((s) => enabledSlots[s.slot]);

  return (
    <div data-testid="week-grid-view" className="space-y-3">
      <p className="text-[11px] text-[#5C6862]">
        Swipe a meal left or right to clear it · Tap <strong className="text-[#2F6F4E]">+</strong> to choose options
      </p>

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
              {activeSlotMeta.map(({ slot, label, icon, pillClass }) => {
                const recipeId = dayPlan[slot];
                const recipe = recipeId ? recipeMap.get(recipeId) : undefined;
                const isBlocked = recipe ? blockedIds.includes(recipe.id) : false;

                return (
                  <SwipeableSlotRow
                    key={slot}
                    dayIdx={dayIdx}
                    dayLabel={dayLabel}
                    slot={slot}
                    label={label}
                    icon={icon}
                    pillClass={pillClass}
                    recipe={recipe}
                    isLocked={isLocked}
                    isBlocked={isBlocked}
                    onOpenCook={onOpenCook}
                    onClearSlot={() => onClearSlot(dayIdx, slot)}
                    onAddRandomSlot={() => onAddRandomSlot(dayIdx, slot)}
                    onOpenPicker={() => onOpenPicker(dayIdx, slot)}
                    onReSimulateSlot={() => onReSimulateSlot(dayIdx, slot)}
                    onToggleBlocked={onToggleBlocked}
                  />
                );
              })}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
