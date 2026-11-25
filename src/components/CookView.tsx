import { ArrowLeft, Check, Clock, ShieldAlert, Sun, Utensils } from 'lucide-react';
import { DAY_LABELS } from '../lib/constants';
import {
  formatQuantity,
  getRecipeScaleFactor,
  roundMetricQuantity,
} from '../lib/groceryAggregator';
import { resolveAssetUrl } from '../lib/storage';
import { useWakeLock } from '../hooks/useWakeLock';
import { ChildPrepCard } from './ChildPrepCard';
import type { HouseholdConfig, Recipe } from '../types/recipe';

interface CookViewProps {
  recipe: Recipe;
  plannedRecipes: Recipe[];
  household: HouseholdConfig;
  prepChecked: Record<string, boolean>;
  onSelectRecipe: (recipeId: string) => void;
  onTogglePrepIngredient: (canonicalId: string) => void;
  onBackToPlan: () => void;
}

export function CookView({
  recipe,
  plannedRecipes,
  household,
  prepChecked,
  onSelectRecipe,
  onTogglePrepIngredient,
  onBackToPlan,
}: CookViewProps) {
  const wakeLock = useWakeLock();
  const scaleFactor = getRecipeScaleFactor(household, recipe.base_servings);

  return (
    <section className="mx-auto max-w-md pb-24">
      {/* Compact meal switcher strip */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-[#E7E2D8] bg-white px-4 py-2">
        <button
          type="button"
          onClick={onBackToPlan}
          aria-label="Back to Plan"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#F2EFE9] px-2.5 text-xs font-semibold text-[#1C2420]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Plan
        </button>
        {plannedRecipes.map((r, idx) => {
          const active = r.id === recipe.id;
          return (
            <button
              key={`${idx}-${r.id}`}
              type="button"
              onClick={() => onSelectRecipe(r.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-[#2F6F4E] text-white'
                  : 'bg-[#FAF8F5] text-[#5C6862] hover:bg-[#F2EFE9]'
              }`}
            >
              {DAY_LABELS[idx] ?? `D${idx + 1}`}
            </button>
          );
        })}
      </div>

      {/* Full-bleed meal photo header */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F2EFE9]">
        <img
          src={resolveAssetUrl(recipe.image_url)}
          alt={recipe.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C2420]/75 via-transparent to-transparent" />

        {/* Screen Wake Lock Toggle */}
        <button
          type="button"
          data-testid="wake-lock-btn"
          onClick={wakeLock.toggle}
          disabled={!wakeLock.isSupported}
          aria-pressed={wakeLock.isActive}
          className={`absolute top-3 right-3 inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold backdrop-blur-md transition-colors ${
            wakeLock.isActive
              ? 'bg-[#2F6F4E] text-white'
              : 'bg-white/90 text-[#1C2420]'
          } disabled:opacity-75`}
        >
          <Sun className="h-3.5 w-3.5" />
          {wakeLock.isActive ? 'Screen Awake: ON' : 'Keep Screen On'}
        </button>

        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-white/90">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {recipe.prep_minutes + recipe.cook_minutes} min total
            </span>
            <span>•</span>
            <span>
              Prep {recipe.prep_minutes}m / Cook {recipe.cook_minutes}m
            </span>
          </div>
          <h2 className="text-xl font-extrabold leading-tight">{recipe.title}</h2>
        </div>
      </div>

      <div className="space-y-5 px-4 pt-4">
        {/* Dynamic Child Prep Card */}
        <ChildPrepCard
          activeBrackets={household.activeBrackets}
          adaptations={recipe.age_adaptations}
        />

        {/* Scaled Ingredients */}
        <div className="rounded-2xl border border-[#E7E2D8] bg-white p-3.5 shadow-xs">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#1C2420]">
              <Utensils className="h-4 w-4 text-[#2F6F4E]" />
              Scaled Ingredients
            </h3>
            <span className="tabular-nums rounded-full bg-[#F2EFE9] px-2.5 py-0.5 text-[11px] font-semibold text-[#5C6862]">
              {scaleFactor.toFixed(2)}× recipe
            </span>
          </div>

          <ul className="divide-y divide-[#F2EFE9]">
            {recipe.ingredients.map((ing) => {
              const checked = Boolean(prepChecked[ing.canonical_id]);
              const scaledQty = roundMetricQuantity(
                ing.quantity * scaleFactor,
                ing.unit,
              );
              return (
                <li key={ing.canonical_id}>
                  <button
                    type="button"
                    onClick={() => onTogglePrepIngredient(ing.canonical_id)}
                    aria-pressed={checked}
                    className="flex min-h-[44px] w-full items-center justify-between gap-3 py-2 text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                          checked
                            ? 'border-[#2F6F4E] bg-[#2F6F4E] text-white'
                            : 'border-[#C7C0B4] bg-white'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span
                        className={`truncate text-sm font-medium ${
                          checked ? 'text-[#8A948E] line-through' : 'text-[#1C2420]'
                        }`}
                      >
                        {ing.name}
                      </span>
                    </div>
                    <span
                      className={`tabular-nums shrink-0 text-xs font-bold ${
                        checked ? 'text-[#8A948E] line-through' : 'text-[#2F6F4E]'
                      }`}
                    >
                      {formatQuantity(scaledQty, ing.unit)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Cooking Steps with High-Contrast Seasoning Split Banner */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[#1C2420]">Cooking Steps</h3>

          {recipe.steps.map((step) => {
            if (step.is_seasoning_split_point) {
              return (
                <div
                  key={step.order}
                  data-testid="seasoning-split-banner"
                  className="rounded-2xl border-2 border-[#D96B43] bg-[#FDF0EB] p-4 shadow-xs"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#D96B43] text-xs font-extrabold text-white">
                      {step.order}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#D96B43] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
                      <ShieldAlert className="h-3 w-3" />
                      Seasoning Split Point
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-relaxed text-[#7A2A10]">
                    {step.text}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={step.order}
                className="rounded-2xl border border-[#E7E2D8] bg-white p-3.5 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2EFE9] text-xs font-bold text-[#1C2420]">
                    {step.order}
                  </span>
                  <p className="text-sm leading-relaxed text-[#1C2420]">{step.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
