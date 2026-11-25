import { useMemo, useState, type FormEvent } from 'react';
import {
  CalendarCheck,
  Check,
  Copy,
  Plus,
  ShieldAlert,
  Sparkles,
  Sprout,
  Trash2,
} from 'lucide-react';
import { ALLERGEN_LABELS, DAY_LABELS, FIRST_FOOD_CATEGORY_LABELS } from '../lib/constants';
import {
  FIRST_FOODS_CATALOG,
  FIRST_FOOD_CATEGORIES,
  TOP_9_ALLERGENS,
  getTriedAllergenExposures,
} from '../lib/firstFoods';
import type {
  CustomFirstFood,
  FirstFoodCategory,
  Recipe,
  TriedFoodEntry,
  TriedFoodReaction,
} from '../types/recipe';

type FilterMode = 'all' | 'to_try' | 'in_plan' | 'tried' | 'allergens';

export interface FirstFoodsViewProps {
  plannedRecipes: Recipe[];
  triedFoods: Record<string, TriedFoodEntry>;
  customFirstFoods: CustomFirstFood[];
  onToggleFood: (foodId: string) => void;
  onIncrementExposure: (foodId: string) => void;
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
  { key: 'loved', label: 'Adorou', activeClass: 'bg-[#2F6F4E] text-white' },
  { key: 'neutral', label: 'Aceitou', activeClass: 'bg-[#5C6862] text-white' },
  { key: 'watch', label: 'Vigiar', activeClass: 'bg-[#D96B43] text-white' },
];

export function FirstFoodsView({
  plannedRecipes,
  triedFoods,
  customFirstFoods,
  onToggleFood,
  onIncrementExposure,
  onSetReaction,
  onAddCustomFood,
  onRemoveCustomFood,
  onOpenCook,
}: FirstFoodsViewProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] =
    useState<FirstFoodCategory>('Fruits');
  const [exportedReport, setExportedReport] = useState(false);

  const foodPlanMatches = useMemo(() => {
    const map = new Map<string, Array<{ label: string; recipeId: string }>>();
    const uniqueRecipes: Array<{ recipe: Recipe; dayIdx: number }> = [];
    const seenRecipeIds = new Set<string>();

    plannedRecipes.forEach((recipe, idx) => {
      if (seenRecipeIds.has(recipe.id)) return;
      seenRecipeIds.add(recipe.id);
      uniqueRecipes.push({ recipe, dayIdx: idx });
    });

    for (const food of FIRST_FOODS_CATALOG) {
      const matches: Array<{ label: string; recipeId: string }> = [];
      for (const { recipe, dayIdx } of uniqueRecipes) {
        const hasMatch = recipe.ingredients.some((ing) =>
          food.canonicalIds.includes(ing.canonical_id),
        );
        if (hasMatch) {
          const label =
            dayIdx < 7
              ? DAY_LABELS[dayIdx]
              : recipe.meal_slot === 'breakfast'
                ? 'Peq.-almoço'
                : recipe.meal_slot === 'lunch'
                  ? 'Almoço'
                  : recipe.meal_slot === 'snack'
                    ? 'Lanche'
                    : 'Refeição';
          matches.push({ label, recipeId: recipe.id });
        }
      }
      if (matches.length > 0) {
        map.set(food.id, matches.slice(0, 4));
      }
    }
    return map;
  }, [plannedRecipes]);

  const allergenExposures = useMemo(
    () => getTriedAllergenExposures(triedFoods),
    [triedFoods],
  );
  const triedAllergensCount = TOP_9_ALLERGENS.filter(
    (a) => allergenExposures[a] > 0,
  ).length;
  const followUpAllergens = TOP_9_ALLERGENS.filter(
    (a) => allergenExposures[a] > 0 && allergenExposures[a] < 3,
  );

  const totalCount = FIRST_FOODS_CATALOG.length + customFirstFoods.length;
  const triedCount =
    FIRST_FOODS_CATALOG.filter((f) => Boolean(triedFoods[f.id])).length +
    customFirstFoods.filter((c) => Boolean(triedFoods[c.id])).length;

  const untriedInPlanCount = FIRST_FOODS_CATALOG.filter(
    (f) => !triedFoods[f.id] && foodPlanMatches.has(f.id),
  ).length;

  const progressPct = totalCount > 0 ? Math.round((triedCount / totalCount) * 100) : 0;

  const handleExportSummary = async () => {
    const triedNames = FIRST_FOODS_CATALOG.filter((f) => Boolean(triedFoods[f.id])).map(
      (f) => {
        const entry = triedFoods[f.id];
        const react =
          entry.reaction === 'loved'
            ? 'Adorou'
            : entry.reaction === 'watch'
              ? 'Vigiar'
              : entry.reaction === 'neutral'
                ? 'Aceitou'
                : '';
        return `- ${f.name} (${entry.triedAt}${react ? `, ${react}` : ''})`;
      },
    );
    const customNames = customFirstFoods
      .filter((c) => Boolean(triedFoods[c.id]))
      .map((c) => `- ${c.name} (${triedFoods[c.id].triedAt})`);
    const allergenLines = TOP_9_ALLERGENS.map(
      (a) => `- ${ALLERGEN_LABELS[a]}: ${allergenExposures[a]}/3 exposições`,
    );

    const summary = [
      `MesaPequena — Registo de Introdução Alimentar (${new Date().toISOString().slice(0, 10)})`,
      `Total provados: ${triedCount}/${totalCount}`,
      ``,
      `9 Principais Alergénios:`,
      ...allergenLines,
      ``,
      `Alimentos já provados:`,
      ...triedNames,
      ...customNames,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setExportedReport(true);
      window.setTimeout(() => setExportedReport(false), 2500);
    } catch {
      setExportedReport(false);
    }
  };

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
                100 Primeiros Alimentos &amp; Alergénios
              </h2>
              <p className="text-xs text-[#44594E]">
                Registo de introdução alimentar
              </p>
            </div>
          </div>

          <span
            data-testid="first-foods-progress"
            className="tabular-nums shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#2F6F4E]"
          >
            {triedCount}/{totalCount} provados
          </span>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/80">
          <div
            className="h-full rounded-full bg-[#2F6F4E] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Top-9 Allergen 3-Day Exposure Tracker */}
        <div className="mt-3 rounded-xl bg-white/85 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C2420]">
              9 Principais Alergénios ({triedAllergensCount}/9)
            </span>
            <span className="text-[10px] font-medium text-[#5C6862]">
              Objetivo: 3 exposições
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {TOP_9_ALLERGENS.map((allergen) => {
              const count = allergenExposures[allergen];
              return (
                <span
                  key={allergen}
                  data-testid={`allergen-exposure-${allergen}`}
                  className={`tabular-nums rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    count >= 3
                      ? 'bg-[#2F6F4E] text-white'
                      : count > 0
                        ? 'bg-[#FDF0EB] text-[#B84C27]'
                        : 'bg-[#F2EFE9] text-[#5C6862]'
                  }`}
                >
                  {ALLERGEN_LABELS[allergen].split(' ')[0]} {count}/3
                </span>
              );
            })}
          </div>

          {followUpAllergens.length > 0 && (
            <p
              data-testid="allergen-followup-reminder"
              className="mt-2 rounded-lg bg-[#FDF0EB] px-2.5 py-1.5 text-[11px] font-semibold text-[#B84C27]"
            >
              Repetição recomendada (2.ª/3.ª dose):{' '}
              {followUpAllergens
                .map((a) => `${ALLERGEN_LABELS[a].split(' ')[0]} (${allergenExposures[a]}/3)`)
                .join(' · ')}
            </p>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          {untriedInPlanCount > 0 ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#2F6F4E]">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>{untriedInPlanCount}</strong> novos na ementa desta semana
              </span>
            </p>
          ) : (
            <span />
          )}

          <button
            type="button"
            data-testid="export-first-foods-btn"
            onClick={handleExportSummary}
            className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#2F6F4E] shadow-xs hover:bg-[#FAF8F5]"
          >
            {exportedReport ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Resumo copiado!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Exportar Resumo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="no-scrollbar mb-3 flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { key: 'all', label: 'Todos (100)' },
            { key: 'to_try', label: 'Por Provar' },
            { key: 'in_plan', label: `Na Ementa (${untriedInPlanCount})` },
            { key: 'tried', label: 'Provados' },
            { key: 'allergens', label: 'Alergénios' },
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
          placeholder="Adicionar alimento (ex. Chuchu)"
          aria-label="Nome do alimento personalizado"
          className="min-h-[40px] min-w-0 flex-1 rounded-xl bg-[#FAF8F5] px-3 text-sm text-[#1C2420] placeholder:text-[#8A948E] focus:outline-2 focus:outline-[#2F6F4E]"
        />
        <select
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value as FirstFoodCategory)}
          aria-label="Categoria do alimento personalizado"
          className="min-h-[40px] rounded-xl bg-[#FAF8F5] px-2 text-xs font-semibold text-[#5C6862] focus:outline-2 focus:outline-[#2F6F4E]"
        >
          {FIRST_FOOD_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {FIRST_FOOD_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          aria-label="Adicionar alimento personalizado"
          className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl bg-[#2F6F4E] text-white hover:bg-[#25593E]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>

      {/* Category Lists */}
      {categoriesWithItems.length === 0 ? (
        <div className="rounded-2xl border border-[#E7E2D8] bg-white p-6 text-center text-xs text-[#5C6862]">
          Ainda não existem alimentos para este filtro.
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
                  {FIRST_FOOD_CATEGORY_LABELS[category]}
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
                  const exposures = entry?.exposures ?? (isTried ? 1 : 0);

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
                          aria-label={`Marcar ${food.name} como ${isTried ? 'não provado' : 'provado'}`}
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
                            {food.ptName && food.ptName !== food.name && (
                              <span className="text-xs text-[#8A948E]">
                                ({food.ptName})
                              </span>
                            )}
                            {food.allergen && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FDF0EB] px-2 py-0.5 text-[10px] font-semibold text-[#B84C27]">
                                <ShieldAlert className="h-2.5 w-2.5" />
                                {ALLERGEN_LABELS[food.allergen]}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs leading-relaxed text-[#5C6862]">
                            {food.prep6m}
                          </p>

                          {planDays && planDays.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2F6F4E]">
                                <CalendarCheck className="h-3 w-3" />
                                Na ementa:
                              </span>
                              {planDays.map((m, idx) => (
                                <button
                                  key={`${m.recipeId}-${idx}`}
                                  type="button"
                                  onClick={() => onOpenCook(m.recipeId)}
                                  className="rounded-full bg-[#E8F2EC] px-2 py-0.5 text-[11px] font-semibold text-[#2F6F4E] hover:bg-[#D5E9DD]"
                                >
                                  {m.label} →
                                </button>
                              ))}
                            </div>
                          )}

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

                              {food.allergen && (
                                <button
                                  type="button"
                                  data-testid={`exposure-btn-${food.id}`}
                                  onClick={() => onIncrementExposure(food.id)}
                                  className="tabular-nums rounded-full bg-[#E8F2EC] px-2.5 py-0.5 text-[11px] font-bold text-[#2F6F4E]"
                                >
                                  Dia {exposures}/3 +
                                </button>
                              )}

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
                        aria-label={`Remover ${item.name}`}
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
