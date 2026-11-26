import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  Clock,
  Cookie,
  Dices,
  LayoutGrid,
  List,
  Plus,
  Share2,
  Shuffle,
  SlidersHorizontal,
  Sprout,
  Sun,
  Sunrise,
  UtensilsCrossed,
} from 'lucide-react';
import { BRACKET_META, DAY_LABELS } from '../lib/constants';
import { resolveAssetUrl } from '../lib/storage';
import { MealCard } from './MealCard';
import { WeekGridView } from './WeekGridView';
import type {
  Allergen,
  BracketKey,
  DayPlan,
  EnabledSlots,
  FirstFoodItem,
  MealSlotType,
  Recipe,
} from '../types/recipe';

interface PlanViewProps {
  weekGrid: DayPlan[];
  enabledSlots: EnabledSlots;
  recipeMap: Map<string, Recipe>;
  weeklyBreakfasts: Recipe[];
  weeklyLunches: Recipe[];
  weeklySnacks: Recipe[];
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
  onClearSlot: (dayIndex: number, slot: MealSlotType) => void;
  onAddRandomSlot: (dayIndex: number, slot: MealSlotType) => void;
  onOpenPicker: (dayIndex: number, slot: MealSlotType) => void;
  onToggleBlocked: (recipeId: string) => void;
  onToggleSlotEnabled: (slot: MealSlotType) => void;
  onOpenShare: () => void;
  onOpenPreferences: () => void;
}

const SLOT_PILLS: Array<{
  slot: MealSlotType;
  label: string;
  icon: typeof Sunrise;
}> = [
  { slot: 'breakfast', label: 'Peq.-almoços', icon: Sunrise },
  { slot: 'lunch', label: 'Almoços', icon: Sun },
  { slot: 'snack', label: 'Lanches', icon: Cookie },
  { slot: 'dinner', label: 'Jantares', icon: UtensilsCrossed },
];

interface CompactSideSectionProps {
  title: string;
  subtitle: string;
  badgeLabel: string;
  testId: string;
  icon: 'breakfast' | 'lunch' | 'snack';
  items: Recipe[];
  activeBrackets: BracketKey[];
  getUntriedFoodsInRecipe: (recipe: Recipe) => FirstFoodItem[];
  onOpenCook: (recipeId: string) => void;
}

function CompactSideSection({
  title,
  subtitle,
  badgeLabel,
  testId,
  icon,
  items,
  activeBrackets,
  getUntriedFoodsInRecipe,
  onOpenCook,
}: CompactSideSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-6" data-testid={testId}>
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-xl ${
            icon === 'breakfast'
              ? 'bg-[#E8F2EC] text-[#2F6F4E]'
              : 'bg-[#FEF5E6] text-[#9C5C00]'
          }`}
        >
          {icon === 'breakfast' ? (
            <Sunrise className="h-4 w-4" />
          ) : icon === 'lunch' ? (
            <Sun className="h-4 w-4" />
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

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const totalMinutes = item.prep_minutes + item.cook_minutes;
          const untried = getUntriedFoodsInRecipe(item);
          const showBabyNewFoods =
            untried.length > 0 &&
            (activeBrackets.includes('6_9m') || activeBrackets.includes('9_12m'));

          return (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
            >
              <button
                type="button"
                onClick={() => onOpenCook(item.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
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
                    <span className="rounded-full bg-[#E8F2EC] px-2 py-0.5 text-[#2F6F4E]">
                      {badgeLabel}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="h-3 w-3 text-[#2F6F4E]" />
                      {totalMinutes}m
                    </span>
                  </div>
                  <h4 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-[#1C2420]">
                    {item.title}
                  </h4>
                  <div className="mt-1.5 flex flex-wrap gap-1">
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
                        Novo: {untried[0].name}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function PlanView({
  weekGrid,
  enabledSlots,
  recipeMap,
  weeklyBreakfasts,
  weeklyLunches,
  weeklySnacks,
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
  onClearSlot,
  onAddRandomSlot,
  onOpenPicker,
  onToggleBlocked,
  onToggleSlotEnabled,
  onOpenShare,
  onOpenPreferences,
}: PlanViewProps) {
  const [viewMode, setViewMode] = useState<'week' | 'cards'>('week');
  const [slotsMenuOpen, setSlotsMenuOpen] = useState(false);

  const activeSlotsCount = Object.values(enabledSlots).filter(Boolean).length;
  const prefsCount = favoriteIds.length + blockedIds.length;

  useEffect(() => {
    if (!slotsMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSlotsMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [slotsMenuOpen]);

  return (
    <section className="mx-auto max-w-md px-4 pt-3 pb-24">
      {/* Page Header Row: Unbroken title + Share icon + Primary Re-simular pill */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="whitespace-nowrap text-xl font-extrabold tracking-tight text-[#1C2420]">
          Ementa Semanal
        </h2>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            data-testid="plan-share-btn"
            onClick={onOpenShare}
            aria-label="Partilhar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2EFE9] text-[#1C2420] transition-colors hover:bg-[#E7E2D8] active:scale-95"
          >
            <Share2 className="h-4 w-4 text-[#2F6F4E]" />
          </button>

          <button
            type="button"
            data-testid="shuffle-unlocked-btn"
            onClick={viewMode === 'week' ? onReSimulateWeek : onShuffleUnlocked}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#2F6F4E] px-3.5 text-xs font-bold text-white shadow-[0_2px_8px_rgba(47,111,78,0.24)] transition-colors hover:bg-[#25593E] active:scale-[0.98]"
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span>{viewMode === 'week' ? 'Re-simular' : 'Baralhar'}</span>
          </button>
        </div>
      </div>

      {/* Consolidated Single-Row Filter Controls */}
      <div className="relative mb-3 flex items-center gap-2">
        <button
          type="button"
          data-testid="open-preferences-btn"
          onClick={onOpenPreferences}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#F2EFE9] px-3 text-xs font-semibold text-[#5C6862] transition-colors hover:bg-[#E7E2D8] hover:text-[#1C2420]"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Preferências</span>
          {prefsCount > 0 && (
            <span className="tabular-nums rounded-full bg-white px-1.5 py-0.2 text-[10px] font-bold text-[#2F6F4E]">
              {prefsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          data-testid="meal-slots-toggle-bar"
          onClick={() => setSlotsMenuOpen((v) => !v)}
          aria-expanded={slotsMenuOpen}
          className={`relative z-30 inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors ${
            activeSlotsCount > 1
              ? 'bg-[#E8F2EC] text-[#2F6F4E] hover:bg-[#DCEADF]'
              : 'bg-[#F2EFE9] text-[#1C2420] hover:bg-[#E7E2D8]'
          }`}
        >
          <span className="tabular-nums whitespace-nowrap">
            {activeSlotsCount === 4
              ? 'Refeições: Todas (4/4)'
              : `Refeições: ${activeSlotsCount}/4`}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-150 ${
              slotsMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {slotsMenuOpen && (
          <>
            <div
              onClick={() => setSlotsMenuOpen(false)}
              className="fixed inset-0 z-20"
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-label="Selecionar refeições visíveis"
              data-testid="meal-slots-popover"
              className="absolute top-full right-0 left-0 z-30 mt-2 rounded-2xl bg-white p-3.5 shadow-[0_10px_28px_rgba(28,36,32,0.14)]"
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6862]">
                  Refeições na ementa
                </span>
                <span className="text-[11px] font-semibold text-[#8A948E]">
                  Mínimo 1 ativa
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SLOT_PILLS.map(({ slot, label, icon: Icon }) => {
                  const active = enabledSlots[slot];
                  return (
                    <button
                      key={slot}
                      type="button"
                      data-testid={`slot-toggle-${slot}`}
                      aria-pressed={active}
                      onClick={() => onToggleSlotEnabled(slot)}
                      className={`flex min-h-[40px] items-center justify-between rounded-xl px-3 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-[#2F6F4E] text-white shadow-[0_2px_6px_rgba(47,111,78,0.22)]'
                          : 'bg-[#F2EFE9] text-[#5C6862] hover:bg-[#E7E2D8]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </span>
                      {active && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Segmented Toggle: Compact Week View vs Photo Cards */}
      <div className="mb-3 grid grid-cols-2 rounded-xl bg-[#F2EFE9] p-1">
        <button
          type="button"
          data-testid="view-mode-week"
          onClick={() => setViewMode('week')}
          className={`flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
            viewMode === 'week'
              ? 'bg-white text-[#1C2420] shadow-[0_1px_4px_rgba(0,0,0,0.06)]'
              : 'text-[#5C6862]'
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Vista Semanal
        </button>
        <button
          type="button"
          data-testid="view-mode-cards"
          onClick={() => setViewMode('cards')}
          className={`flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
            viewMode === 'cards'
              ? 'bg-white text-[#1C2420] shadow-[0_1px_4px_rgba(0,0,0,0.06)]'
              : 'text-[#5C6862]'
          }`}
        >
          <List className="h-3.5 w-3.5" />
          Cartões
        </button>
      </div>

      {viewMode === 'week' ? (
        <WeekGridView
          weekGrid={weekGrid}
          enabledSlots={enabledSlots}
          recipeMap={recipeMap}
          lockedIndices={lockedIndices}
          blockedIds={blockedIds}
          onOpenCook={onOpenCook}
          onReSimulateSlot={onReSimulateSlot}
          onClearSlot={onClearSlot}
          onAddRandomSlot={onAddRandomSlot}
          onOpenPicker={onOpenPicker}
          onToggleLock={onToggleLock}
          onToggleBlocked={onToggleBlocked}
        />
      ) : (
        <>
          {enabledSlots.dinner && (
            <div className="flex flex-col gap-3">
              {weekGrid.map((day, idx) => {
                const recipe = day.dinner ? recipeMap.get(day.dinner) : undefined;
                if (!recipe) {
                  return (
                    <div
                      key={`empty-card-${idx}`}
                      className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
                    >
                      <div>
                        <span className="text-xs font-bold uppercase text-[#8A948E]">
                          {DAY_LABELS[idx]}
                        </span>
                        <p className="text-sm font-semibold text-[#5C6862]">
                          Sem jantar planeado
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenPicker(idx, 'dinner')}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2EFE9] text-[#2F6F4E]"
                          aria-label={`Escolher jantar de ${DAY_LABELS[idx]}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddRandomSlot(idx, 'dinner')}
                          className="inline-flex h-9 items-center gap-1 rounded-xl bg-[#2F6F4E] px-3 text-xs font-semibold text-white"
                        >
                          <Dices className="h-3.5 w-3.5" />
                          Aleatório
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <MealCard
                    key={`${idx}-${recipe.id}`}
                    recipe={recipe}
                    dayIndex={idx}
                    isLocked={lockedIndices.includes(idx)}
                    isBlocked={blockedIds.includes(recipe.id)}
                    activeBrackets={activeBrackets}
                    excludedAllergens={excludedAllergens}
                    untriedFoods={getUntriedFoodsInRecipe(recipe)}
                    onOpenCook={() => onOpenCook(recipe.id)}
                    onToggleLock={() => onToggleLock(idx)}
                    onSwap={() => onSwapMeal(idx)}
                    onOpenPicker={() => onOpenPicker(idx, 'dinner')}
                    onToggleBlocked={() => onToggleBlocked(recipe.id)}
                  />
                );
              })}
            </div>
          )}

          {enabledSlots.breakfast && (
            <CompactSideSection
              title="Pequenos-almoços Saudáveis"
              subtitle="Manhãs rápidas ricas em ferro e sem açúcar adicionado"
              badgeLabel="Peq.-almoço"
              testId="weekly-breakfasts-section"
              icon="breakfast"
              items={weeklyBreakfasts}
              activeBrackets={activeBrackets}
              getUntriedFoodsInRecipe={getUntriedFoodsInRecipe}
              onOpenCook={onOpenCook}
            />
          )}

          {enabledSlots.lunch && (
            <CompactSideSection
              title="Almoços Rápidos & Sopas"
              subtitle="Refeições práticas para bebés, crianças e família"
              badgeLabel="Almoço"
              testId="weekly-lunches-section"
              icon="lunch"
              items={weeklyLunches}
              activeBrackets={activeBrackets}
              getUntriedFoodsInRecipe={getUntriedFoodsInRecipe}
              onOpenCook={onOpenCook}
            />
          )}

          {enabledSlots.snack && (
            <CompactSideSection
              title="Lanches & Biscoitos Saudáveis"
              subtitle="Queques e snacks sem açúcar adicionado ou mel"
              badgeLabel="Lanche"
              testId="weekly-snacks-section"
              icon="snack"
              items={weeklySnacks}
              activeBrackets={activeBrackets}
              getUntriedFoodsInRecipe={getUntriedFoodsInRecipe}
              onOpenCook={onOpenCook}
            />
          )}
        </>
      )}
    </section>
  );
}
