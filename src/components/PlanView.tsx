import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Cookie,
  Dices,
  LayoutGrid,
  List,
  Plus,
  Share2,
  Shuffle,
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
  { slot: 'dinner', label: 'Jantares', icon: UtensilsCrossed },
  { slot: 'lunch', label: 'Almoços', icon: Sun },
  { slot: 'breakfast', label: 'Peq.-almoços', icon: Sunrise },
  { slot: 'snack', label: 'Lanches', icon: Cookie },
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

      <div className="space-y-3">
        {items.map((item) => {
          const totalMinutes = item.prep_minutes + item.cook_minutes;
          const untried = getUntriedFoodsInRecipe(item);
          const showBabyNewFoods =
            untried.length > 0 &&
            (activeBrackets.includes('6_9m') || activeBrackets.includes('9_12m'));

          return (
            <article
              key={item.id}
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
                    <span className="rounded-full bg-[#E8F2EC] px-2 py-0.5 text-[#2F6F4E]">
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
  const [slotsExpanded, setSlotsExpanded] = useState(false);

  const activeSlotsCount = Object.values(enabledSlots).filter(Boolean).length;

  return (
    <section className="mx-auto max-w-md px-4 pt-3.5 pb-24">
      {/* Header + Actions */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-[#1C2420]">
            Ementa Semanal
          </h2>
          <button
            type="button"
            data-testid="open-preferences-btn"
            onClick={onOpenPreferences}
            className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-[#F2EFE9] px-2.5 py-0.5 text-[11px] font-semibold text-[#5C6862] transition-colors hover:bg-[#E7E2D8] hover:text-[#1C2420]"
          >
            <span>
              {favoriteIds.length > 0 || blockedIds.length > 0
                ? `${favoriteIds.length} fav · ${blockedIds.length} bloq. (Gerir)`
                : 'Preferências · + Escolher'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="plan-share-btn"
            onClick={onOpenShare}
            aria-label="Partilhar com Parceiro"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E0DAD0] bg-white px-3 text-xs font-semibold text-[#1C2420] hover:bg-[#F2EFE9]"
          >
            <Share2 className="h-3.5 w-3.5 text-[#2F6F4E]" />
            Partilhar
          </button>

          <button
            type="button"
            data-testid="shuffle-unlocked-btn"
            onClick={viewMode === 'week' ? onReSimulateWeek : onShuffleUnlocked}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#2F6F4E] px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#25593E] active:scale-[0.98]"
          >
            <Shuffle className="h-3.5 w-3.5" />
            {viewMode === 'week' ? 'Re-simular' : 'Baralhar'}
          </button>
        </div>
      </div>

      {/* Collapsible Meal Slots Bar (Dinners on by default) */}
      <div className="mb-3 rounded-xl border border-[#E7E2D8] bg-white px-3 py-2">
        <button
          type="button"
          data-testid="meal-slots-toggle-bar"
          onClick={() => setSlotsExpanded((v) => !v)}
          aria-expanded={slotsExpanded}
          className="flex w-full items-center justify-between text-xs font-semibold text-[#1C2420]"
        >
          <span>
            Refeições:{' '}
            <strong className="text-[#2F6F4E]">
              {SLOT_PILLS.filter((p) => enabledSlots[p.slot])
                .map((p) => p.label)
                .join(' + ')}
            </strong>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-[#5C6862]">
            {activeSlotsCount}/4 ativas
            {slotsExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </span>
        </button>

        {slotsExpanded && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[#F2EFE9] pt-2.5">
            {SLOT_PILLS.map(({ slot, label, icon: Icon }) => {
              const active = enabledSlots[slot];
              return (
                <button
                  key={slot}
                  type="button"
                  data-testid={`slot-toggle-${slot}`}
                  aria-pressed={active}
                  onClick={() => onToggleSlotEnabled(slot)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#2F6F4E] text-white'
                      : 'border border-[#E0DAD0] bg-[#FAF8F5] text-[#5C6862]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        )}
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
          Vista Semanal
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
            <div className="space-y-4">
              {weekGrid.map((day, idx) => {
                const recipe = day.dinner ? recipeMap.get(day.dinner) : undefined;
                if (!recipe) {
                  return (
                    <div
                      key={`empty-card-${idx}`}
                      className="flex items-center justify-between rounded-2xl border border-dashed border-[#D6CFC2] bg-white p-4"
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
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E0DAD0] bg-[#FAF8F5] text-[#2F6F4E]"
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
