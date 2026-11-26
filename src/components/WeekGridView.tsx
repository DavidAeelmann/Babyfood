import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  Ban,
  Cookie,
  Dices,
  Eraser,
  ListPlus,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Sun,
  Sunrise,
  Unlock,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { DAY_LABELS } from '../lib/constants';
import { resolveAssetUrl } from '../lib/storage';
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
    label: 'Pequeno-almoço',
    icon: Sunrise,
    pillClass: 'bg-[#E8F2EC] text-[#2F6F4E]',
  },
  {
    slot: 'lunch',
    label: 'Almoço',
    icon: Sun,
    pillClass: 'bg-[#FEF5E6] text-[#9C5C00]',
  },
  {
    slot: 'snack',
    label: 'Lanche',
    icon: Cookie,
    pillClass: 'bg-[#FDF0EB] text-[#B84C27]',
  },
  {
    slot: 'dinner',
    label: 'Jantar',
    icon: UtensilsCrossed,
    pillClass: 'bg-[#F2EFE9] text-[#1C2420]',
  },
];

const SWIPE_THRESHOLD_PX = 56;

interface ActiveMenuTarget {
  dayIdx: number;
  dayLabel: string;
  slot: MealSlotType;
  slotLabel: string;
  recipe: Recipe;
  isLocked: boolean;
  isBlocked: boolean;
}

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
  onOpenMenu: () => void;
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
  onOpenMenu,
}: SwipeableSlotRowProps) {
  const [dragX, setDragX] = useState(0);
  const startXRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  const handlePointerDown = (e: PointerEvent<HTMLLIElement>) => {
    if (isLocked || !recipe) return;
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
        className="flex items-center gap-3 bg-[#FAF8F5]/65 px-4 py-3"
      >
        <span
          title={label}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl opacity-75 ${pillClass}`}
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8A948E]">
            {label}
          </span>
          <span className="block text-xs text-[#8A948E]">
            Sem refeição planeada
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            data-testid={`choose-btn-${dayIdx}-${slot}`}
            onClick={onOpenPicker}
            disabled={isLocked}
            aria-label={`Escolher ${label} de ${dayLabel}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F2EFE9] text-[#2F6F4E] transition-colors hover:bg-[#E8F2EC] disabled:opacity-35"
          >
            <Plus className="h-4 w-4" />
          </button>

          <button
            type="button"
            data-testid={`add-random-btn-${dayIdx}-${slot}`}
            onClick={onAddRandomSlot}
            disabled={isLocked}
            className="inline-flex h-8 items-center gap-1 rounded-xl bg-[#2F6F4E] px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#25593E] disabled:opacity-35"
          >
            <Dices className="h-3.5 w-3.5" />
            Aleatório
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
          <span>Largue para limpar</span>
          <span>Largue para limpar</span>
        </div>
      )}

      <div
        style={{
          transform: dragX !== 0 ? `translateX(${dragX}px)` : undefined,
          transition: dragX === 0 ? 'transform 160ms ease-out' : undefined,
        }}
        className="relative flex items-center gap-3 bg-white px-4 py-2.5"
      >
        <button
          type="button"
          onClick={() => onOpenCook(recipe.id)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#F2EFE9]">
            <img
              src={resolveAssetUrl(recipe.image_url)}
              alt={recipe.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8A948E]">
              {label}
            </span>
            <span
              data-testid={`week-slot-title-${dayIdx}-${slot}`}
              className={`mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug ${
                isBlocked ? 'text-[#B84C27] line-through' : 'text-[#1C2420]'
              }`}
            >
              {recipe.title}
            </span>
          </div>
        </button>

        {/* Clean 2-button action cluster: Quick-Swap + Overflow Menu */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            data-slot-action="true"
            data-testid={`resim-btn-${dayIdx}-${slot}`}
            onClick={onReSimulateSlot}
            disabled={isLocked}
            aria-label={`Trocar ${label} de ${dayLabel}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F2EFE9]/80 text-[#2F6F4E] transition-colors hover:bg-[#E8F2EC] disabled:opacity-35"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            data-slot-action="true"
            data-testid={`menu-btn-${dayIdx}-${slot}`}
            onClick={onOpenMenu}
            aria-label={`Opções para ${recipe.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F2EFE9]/80 text-[#5C6862] transition-colors hover:bg-[#E7E2D8] hover:text-[#1C2420]"
          >
            <MoreHorizontal className="h-4 w-4" />
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
  const [menuTarget, setMenuTarget] = useState<ActiveMenuTarget | null>(null);

  useEffect(() => {
    if (!menuTarget) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuTarget(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuTarget]);

  return (
    <>
      <div data-testid="week-grid-view" className="flex flex-col gap-3">
        {weekGrid.map((dayPlan, dayIdx) => {
          const dayLabel = DAY_LABELS[dayIdx] ?? `Dia ${dayIdx + 1}`;
          const isLocked = lockedIndices.includes(dayIdx);

          return (
            <article
              key={dayIdx}
              data-testid={`week-day-card-${dayIdx}`}
              className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
            >
              {/* Compact Day Header — Lock Day locks all slots on this day */}
              <div className="flex items-center justify-between bg-[#FAF8F5]/65 px-4 py-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#1C2420]">
                  {dayLabel}
                </span>
                <button
                  type="button"
                  data-testid={`lock-day-btn-${dayIdx}`}
                  onClick={() => onToggleLock(dayIdx)}
                  aria-pressed={isLocked}
                  aria-label={isLocked ? `Desbloquear ${dayLabel}` : `Bloquear ${dayLabel}`}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    isLocked
                      ? 'bg-[#1C2420] text-white'
                      : 'bg-[#F2EFE9] text-[#5C6862] hover:bg-[#E7E2D8]'
                  }`}
                >
                  {isLocked ? (
                    <>
                      <Lock className="h-3 w-3" />
                      Bloqueado
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3 w-3" />
                      Bloquear Dia
                    </>
                  )}
                </button>
              </div>

              {/* Enabled Meal Slots */}
              <ul className="divide-y divide-[#F2EFE9]/80">
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
                      onOpenMenu={() => {
                        if (!recipe) return;
                        setMenuTarget({
                          dayIdx,
                          dayLabel,
                          slot,
                          slotLabel: label,
                          recipe,
                          isLocked,
                          isBlocked,
                        });
                      }}
                    />
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>

      {/* Meal Slot Action Sheet */}
      {menuTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ações para ${menuTarget.recipe.title}`}
          data-testid="meal-action-sheet"
          onClick={() => setMenuTarget(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#1C2420]/45 backdrop-blur-[2px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(28,36,32,0.16)]"
          >
            <div className="mb-4 flex items-center gap-3">
              <img
                src={resolveAssetUrl(menuTarget.recipe.image_url)}
                alt={menuTarget.recipe.title}
                className="h-12 w-12 shrink-0 rounded-xl bg-[#F2EFE9] object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#2F6F4E]">
                  {menuTarget.dayLabel} · {menuTarget.slotLabel}
                </p>
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[#1C2420]">
                  {menuTarget.recipe.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMenuTarget(null)}
                aria-label="Fechar ações"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2EFE9] text-[#5C6862]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                data-testid={`choose-btn-${menuTarget.dayIdx}-${menuTarget.slot}`}
                disabled={menuTarget.isLocked}
                onClick={() => {
                  const { dayIdx, slot } = menuTarget;
                  setMenuTarget(null);
                  onOpenPicker(dayIdx, slot);
                }}
                className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl bg-[#FAF8F5] px-4 text-sm font-semibold text-[#1C2420] transition-colors hover:bg-[#F2EFE9] disabled:opacity-40"
              >
                <ListPlus className="h-4 w-4 text-[#2F6F4E]" />
                <span>Escolher outra opção</span>
              </button>

              <button
                type="button"
                data-testid={`block-btn-${menuTarget.dayIdx}-${menuTarget.slot}`}
                onClick={() => {
                  const { recipe } = menuTarget;
                  setMenuTarget(null);
                  onToggleBlocked(recipe.id);
                }}
                className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl bg-[#FAF8F5] px-4 text-sm font-semibold text-[#1C2420] transition-colors hover:bg-[#F2EFE9]"
              >
                <Ban className="h-4 w-4 text-[#B84C27]" />
                <span>
                  {menuTarget.isBlocked ? 'Desbloquear receita' : 'Bloquear receita'}
                </span>
              </button>

              <button
                type="button"
                data-testid={`clear-btn-${menuTarget.dayIdx}-${menuTarget.slot}`}
                disabled={menuTarget.isLocked}
                onClick={() => {
                  const { dayIdx, slot } = menuTarget;
                  setMenuTarget(null);
                  onClearSlot(dayIdx, slot);
                }}
                className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl bg-[#FDF0EB]/70 px-4 text-sm font-semibold text-[#B84C27] transition-colors hover:bg-[#FDF0EB] disabled:opacity-40"
              >
                <Eraser className="h-4 w-4" />
                <span>Limpar refeição</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
