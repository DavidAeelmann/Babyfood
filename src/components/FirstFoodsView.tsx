import { useMemo, useState, type FormEvent } from 'react';
import {
  CalendarCheck,
  Check,
  Plus,
  ShieldAlert,
  Sparkles,
  Sprout,
  Trash2,
} from 'lucide-react';
import { DAY_LABELS } from '../lib/constants';
import { FIRST_FOODS_CATALOG, FIRST_FOOD_CATEGORIES } from '../lib/firstFoods';
import type {
  CustomFirstFood,
  FirstFoodCategory,
  Recipe,
  TriedFoodEntry,
  TriedFoodReaction,
} from '../types/recipe';

type FilterMode = 'all' | 'to_try' | 'in_plan' | 'tried' | 'allergens';

interface FirstFoodsViewProps {
  plannedRecipes: Recipe[];
  triedFoods: Record<string, TriedFoodEntry>;
  customFirstFoods: CustomFirstFood[];
  onToggleFood: (foodId: string) => void;
  onSetReaction: (foodId: string, reaction: TriedFoodReaction) => void;
  onAddCustomFood: (name: string, category: FirstFoodCategory) => void;
  onRemoveCustomFood: (id: string) => void;
  onOpenCook: (recipeId: string) => void;
}

const REACTION_OPTIONS: Array<{
  key: TriedFoodReaction;
  label: string;
  activeClass: string;
}> = [
  { key: 'loved', label: 'Loved', activeClass: 'bg-[#2F6F4E] text-white' },
  { key: 'neutral', label: 'Okay', activeClass: 'bg-[#5C6862] text-white' },
  { key: 'watch', label: 'Watch', activeClass: 'bg-[#D96B43] text-white' },
];

export function FirstFoodsView({
  plannedRecipes,
  triedFoods,
  customFirstFoods,
  onToggleFood,
  onSetReaction,
  onAddCustomFood,
  onRemoveCustomFood,
  onOpenCook,
}: FirstFoodsViewProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] =
    useState<FirstFoodCategory>('Fruits');

  // Map each catalog food to which planned days feature it
  const foodPlanMatches = useMemo(() => {
    const map = new Map<string, Array<{ day: string; recipeId: string }>>();
    for (const food of FIRST_FOODS_CATALOG) {
      const matches: Array<{ day: string; recipeId: string }> = [];
      plannedRecipes.forEach((recipe, idx) => {
        const hasMatch = recipe.ingredients.some((ing) =>
          food.canonicalIds.includes(ing.canonical_id),
        );
        if (hasMatch) {
          matches.push({
            day: DAY_LABELS[idx] ?? `D${idx + 1}`,
            recipeId: recipe.id,
          });
        }
      });
      if (matches.length > 0) {
        map.set(food.id, matches);
      }
    }
    return map;
  }, [plannedRecipes]);

  const totalCount = FIRST_FOODS_CATALOG.length + customFirstFoods.length;
  const triedCount =
    FIRST_FOODS_CATALOG.filter((f) => Boolean(triedFoods[f.id])).length +
    customFirstFoods.filter((c) => Boolean(triedFoods[c.id])).length;

  const untriedInPlanCount = FIRST_FOODS_CATALOG.filter(
    (f) => !triedFoods[f.id] && foodPlanMatches.has(f.id),
  ).length;

  const progressPct = totalCount > 0 ? Math.round((triedCount / totalCount) * 100) : 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    onAddCustomFood(customName, customCategory);
    setCustomName('');
  };

  const categoriesWithItems = useMemo(() => {
    return FIRST_FOOD_CATEGORIES.map((category) => {
      const catalogItems = FIRST_FOODS_CATALOG.filter((food) => {
        if (food.category !== category) return false;
        const isTried = Boolean(triedFoods[food.id]);
        if (filter === 'to_try') return !isTried;
        if (filter === 'tried') return isTried;
        if (filter === 'in_plan') return foodPlanMatches.has(food.id) && !isTried;
        if (filter === 'allergens') return Boolean(food.allergen);
        return true;
      });

      const customItems = customFirstFoods.filter((c) => {
        if (c.category !== category) return false;
        const isTried = Boolean(triedFoods[c.id]);
        if (filter === 'to_try') return !isTried;
        if (filter === 'tried') return isTried;
        if (filter === 'in_plan' || filter === 'allergens') return false;
        return true;
      });

      return { category, catalogItems, customItems };
    }).filter((g) => g.catalogItems.length > 0 || g.customItems.length > 0);
  }, [filter, triedFoods, customFirstFoods, foodPlanMatches]);

  return (
    <section className="mx-auto max-w-md px-4 pt-4 pb-24">
      {/* Progress Card */}
      <div className="mb-4 rounded-2xl border border-[#CFE3D6] bg-[#E8F2EC]/70 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2F6F4E] text-white">
              <Sprout className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#1C2420]">
                António&apos;s First Foods
              </h2>
              <p className="text-xs text-[#44594E]">
                Introdução alimentar tracker
              </p>
            </div>
          </div>

          <span
            data-testid="first-foods-progress"
            className="tabular-nums rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#2F6F4E]"
          >
            {triedCount}/{totalCount} tried
          </span>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/80">
          <div
            className="h-full rounded-full bg-[#2F6F4E] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {untriedInPlanCount > 0 && (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-[#2F6F4E]">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>{untriedInPlanCount}</strong> untried foods are already in
              this week&apos;s dinners!
            </span>
          </p>
        )}
      </div>

      {/* Filter Pills */}
      <div className="no-scrollbar mb-3 flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'to_try', label: 'To Try' },
            { key: 'in_plan', label: `In This Week's Plan (${untriedInPlanCount})` },
            { key: 'tried', label: 'Tried' },
            { key: 'allergens', label: 'Allergens' },
          ] as Array<{ key: FilterMode; label: string }>
        ).map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              data-testid={`first-foods-filter-${tab.key}`}
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-[#1C2420] text-white'
                  : 'border border-[#E0DAD0] bg-white text-[#5C6862] hover:bg-[#F2EFE9]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Add Custom Food */}
      <form
        onSubmit={handleSubmit}
        className="mb-4 flex items-center gap-1.5 rounded-2xl border border-[#E7E2D8] bg-white p-2 shadow-xs"
      >
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Add food (e.g. Papaia, Chuchu)"
          aria-label="Custom first food name"
          className="min-h-[40px] min-w-0 flex-1 rounded-xl bg-[#FAF8F5] px-3 text-sm text-[#1C2420] placeholder:text-[#8A948E] focus:outline-2 focus:outline-[#2F6F4E]"
        />
        <select
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value as FirstFoodCategory)}
          aria-label="Custom first food category"
          className="min-h-[40px] rounded-xl bg-[#FAF8F5] px-2 text-xs font-semibold text-[#5C6862] focus:outline-2 focus:outline-[#2F6F4E]"
        >
          {FIRST_FOOD_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button
          type="submit"
          aria-label="Add custom first food"
          className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl bg-[#2F6F4E] text-white hover:bg-[#25593E]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>

      {/* Category Lists */}
      {categoriesWithItems.length === 0 ? (
        <div className="rounded-2xl border border-[#E7E2D8] bg-white p-6 text-center text-xs text-[#5C6862]">
          No foods match this filter yet.
        </div>
      ) : (
        <div className="space-y-4">
          {categoriesWithItems.map(({ category, catalogItems, customItems }) => (
            <div
              key={category}
              className="overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-[#F2EFE9] bg-[#FAF8F5] px-3.5 py-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C6862]">
                  {category}
                </h3>
                <span className="tabular-nums text-[11px] font-semibold text-[#8A948E]">
                  {catalogItems.length + customItems.length}
                </span>
              </div>

              <ul className="divide-y divide-[#F2EFE9]">
                {catalogItems.map((food) => {
                  const entry = triedFoods[food.id];
                  const isTried = Boolean(entry);
                  const planDays = foodPlanMatches.get(food.id);

                  return (
                    <li
                      key={food.id}
                      data-testid={`first-food-row-${food.id}`}
                      className="p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          data-testid={`first-food-toggle-${food.id}`}
                          onClick={() => onToggleFood(food.id)}
                          aria-pressed={isTried}
                          aria-label={`Mark ${food.name} as ${isTried ? 'not tried' : 'tried'}`}
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
                            isTried
                              ? 'border-[#2F6F4E] bg-[#2F6F4E] text-white'
                              : 'border-[#C7C0B4] bg-white'
                          }`}
                        >
                          {isTried && <Check className="h-4 w-4" strokeWidth={3} />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`text-sm font-bold ${
                                isTried ? 'text-[#2F6F4E]' : 'text-[#1C2420]'
                              }`}
                            >
                              {food.name}
                            </span>
                            <span className="text-xs text-[#8A948E]">
                              ({food.ptName})
                            </span>
                            {food.allergen && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FDF0EB] px-2 py-0.5 text-[10px] font-semibold text-[#B84C27]">
                                <ShieldAlert className="h-2.5 w-2.5" />
                                Allergen
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs leading-relaxed text-[#5C6862]">
                            {food.prep6m}
                          </p>

                          {/* On this week's menu */}
                          {planDays && planDays.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2F6F4E]">
                                <CalendarCheck className="h-3 w-3" />
                                In plan:
                              </span>
                              {planDays.map((m, idx) => (
                                <button
                                  key={`${m.recipeId}-${idx}`}
                                  type="button"
                                  onClick={() => onOpenCook(m.recipeId)}
                                  className="rounded-full bg-[#E8F2EC] px-2 py-0.5 text-[11px] font-semibold text-[#2F6F4E] hover:bg-[#D5E9DD]"
                                >
                                  {m.day} →
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Reaction selector when tried */}
                          {isTried && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {REACTION_OPTIONS.map((opt) => (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => onSetReaction(food.id, opt.key)}
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                                    entry?.reaction === opt.key
                                      ? opt.activeClass
                                      : 'bg-[#F2EFE9] text-[#5C6862]'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                              <span className="ml-auto text-[10px] text-[#8A948E]">
                                {entry?.triedAt}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}

                {customItems.map((item) => {
                  const entry = triedFoods[item.id];
                  const isTried = Boolean(entry);
                  return (
                    <li key={item.id} className="flex items-center gap-3 p-3.5">
                      <button
                        type="button"
                        onClick={() => onToggleFood(item.id)}
                        aria-pressed={isTried}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${
                          isTried
                            ? 'border-[#2F6F4E] bg-[#2F6F4E] text-white'
                            : 'border-[#C7C0B4] bg-white'
                        }`}
                      >
                        {isTried && <Check className="h-4 w-4" strokeWidth={3} />}
                      </button>
                      <span className="flex-1 text-sm font-bold text-[#1C2420]">
                        {item.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveCustomFood(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8A948E] hover:bg-[#F2EFE9] hover:text-[#B84C27]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
