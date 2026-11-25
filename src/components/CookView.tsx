import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Heart,
  PlayCircle,
  ShieldAlert,
  Sprout,
  Sun,
  Utensils,
  Zap,
} from 'lucide-react';
import {
  APPLIANCE_META,
  getAppliancePrepTip,
  getRecipeAppliances,
} from '../lib/appliances';
import { DAY_LABELS } from '../lib/constants';
import {
  formatQuantity,
  getRecipeScaleFactor,
  roundMetricQuantity,
} from '../lib/groceryAggregator';
import { resolveAssetUrl } from '../lib/storage';
import { useWakeLock } from '../hooks/useWakeLock';
import { ChildPrepCard } from './ChildPrepCard';
import { HandsFreeCookModal } from './HandsFreeCookModal';
import type { FirstFoodItem, HouseholdConfig, Recipe } from '../types/recipe';

interface CookViewProps {
  recipe: Recipe;
  plannedRecipes: Recipe[];
  household: HouseholdConfig;
  prepChecked: Record<string, boolean>;
  untriedFoods: FirstFoodItem[];
  isFavorite: boolean;
  onToggleFavorite: (recipeId: string) => void;
  onSelectRecipe: (recipeId: string) => void;
  onTogglePrepIngredient: (canonicalId: string) => void;
  onMarkMealFoodsTried: (recipe: Recipe) => void;
  onBackToPlan: () => void;
}

export function CookView({
  recipe,
  plannedRecipes,
  household,
  prepChecked,
  untriedFoods,
  isFavorite,
  onToggleFavorite,
  onSelectRecipe,
  onTogglePrepIngredient,
  onMarkMealFoodsTried,
  onBackToPlan,
}: CookViewProps) {
  const wakeLock = useWakeLock();
  const [handsFreeOpen, setHandsFreeOpen] = useState(false);
  const scaleFactor = getRecipeScaleFactor(household, recipe.base_servings);
  const showBabyNewFoods =
    untriedFoods.length > 0 &&
    (household.activeBrackets.includes('6_9m') ||
      household.activeBrackets.includes('9_12m'));

  return (
    <section className="mx-auto max-w-md pb-24">
      {/* Compact meal switcher strip */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-[#E7E2D8] bg-white px-4 py-2">
        <button
          type="button"
          onClick={onBackToPlan}
          aria-label="Voltar à Ementa"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#F2EFE9] px-2.5 text-xs font-semibold text-[#1C2420]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Ementa
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

        {/* Top Header Controls: Favorite + Screen Wake Lock */}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <button
            type="button"
            data-testid="cook-favorite-btn"
            onClick={() => onToggleFavorite(recipe.id)}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold backdrop-blur-md transition-colors ${
              isFavorite
                ? 'bg-[#D96B43] text-white'
                : 'bg-white/90 text-[#1C2420]'
            }`}
          >
            <Heart className="h-3.5 w-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
            {isFavorite ? 'Favorito' : 'Favorito'}
          </button>

          <button
            type="button"
            data-testid="wake-lock-btn"
            onClick={wakeLock.toggle}
            disabled={!wakeLock.isSupported}
            aria-pressed={wakeLock.isActive}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold backdrop-blur-md transition-colors ${
              wakeLock.isActive
                ? 'bg-[#2F6F4E] text-white'
                : 'bg-white/90 text-[#1C2420]'
            } disabled:opacity-75`}
          >
            <Sun className="h-3.5 w-3.5" />
            {wakeLock.isActive ? 'Ecrã Ligado' : 'Manter Ecrã Ligado'}
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-white/90">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {recipe.prep_minutes + recipe.cook_minutes} min total
            </span>
            <span>•</span>
            <span>
              Prep. {recipe.prep_minutes}m / Cozedura {recipe.cook_minutes}m
            </span>
          </div>
          <h2 className="text-xl font-extrabold leading-tight">{recipe.title}</h2>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* Hands-Free Cook Mode CTA */}
        <button
          type="button"
          data-testid="hands-free-launch-btn"
          onClick={() => setHandsFreeOpen(true)}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1C2420] px-4 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#2C3731]"
        >
          <PlayCircle className="h-4 w-4 text-[#90CFA9]" />
          Modo Mãos Livres (Temporizadores &amp; Voz)
        </button>

        {/* Ninja Foodi Power / Crispi Pro XL Prep Card */}
        {getRecipeAppliances(recipe).length > 0 && (
          <div
            data-testid="cook-appliance-tips"
            className="rounded-2xl border border-[#DCE6DF] bg-[#F5F9F6] p-3.5 space-y-2"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#2F6F4E]">
                <Zap className="h-3.5 w-3.5" />
                Preparação Ninja:
              </span>
              {getRecipeAppliances(recipe).map((appId) => (
                <span
                  key={appId}
                  className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#1C2420] border border-[#CFE3D6]"
                >
                  {APPLIANCE_META[appId].label}
                </span>
              ))}
            </div>
            <div className="space-y-1.5">
              {getRecipeAppliances(recipe).map((appId) => (
                <p key={appId} className="text-xs leading-relaxed text-[#425048]">
                  <span className="font-bold text-[#1C2420]">
                    {APPLIANCE_META[appId].shortLabel}:{' '}
                  </span>
                  {getAppliancePrepTip(recipe, appId)}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* New First Foods Pill & One-Tap Mark Meal Tried */}
        {showBabyNewFoods && (
          <div
            data-testid="cook-new-foods-banner"
            className="flex items-center justify-between gap-2 rounded-2xl border border-[#F5DFB8] bg-[#FEF5E6] p-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-xs font-bold text-[#9C5C00]">
                <Sprout className="h-3.5 w-3.5 shrink-0" />
                Novos alimentos nesta refeição:
              </p>
              <p className="truncate text-xs text-[#6F4300]">
                {untriedFoods.map((f) => f.name).join(', ')}
              </p>
            </div>
            <button
              type="button"
              data-testid="mark-meal-foods-tried-btn"
              onClick={() => onMarkMealFoodsTried(recipe)}
              className="shrink-0 rounded-xl bg-[#2F6F4E] px-3 py-2 text-xs font-bold text-white hover:bg-[#25593E]"
            >
              Marcar Provados
            </button>
          </div>
        )}

        {/* Dynamic Child Prep Card with SVG Cut-Shape Diagrams */}
        <ChildPrepCard
          activeBrackets={household.activeBrackets}
          adaptations={recipe.age_adaptations}
        />

        {/* Scaled Ingredients */}
        <div className="rounded-2xl border border-[#E7E2D8] bg-white p-3.5 shadow-xs">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#1C2420]">
              <Utensils className="h-4 w-4 text-[#2F6F4E]" />
              Ingredientes Ajustados
            </h3>
            <span className="tabular-nums rounded-full bg-[#F2EFE9] px-2.5 py-0.5 text-[11px] font-semibold text-[#5C6862]">
              {scaleFactor.toFixed(2)}× receita
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
          <h3 className="text-sm font-bold text-[#1C2420]">Passo a Passo</h3>

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
                      Ponto de Separação do Sal
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

      {handsFreeOpen && (
        <HandsFreeCookModal
          recipe={recipe}
          onClose={() => setHandsFreeOpen(false)}
        />
      )}
    </section>
  );
}
