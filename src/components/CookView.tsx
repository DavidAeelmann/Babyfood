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
import { formatStepText } from '../lib/formatters';
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
  stepsChecked: Record<number, boolean>;
  untriedFoods: FirstFoodItem[];
  isFavorite: boolean;
  onToggleFavorite: (recipeId: string) => void;
  onSelectRecipe: (recipeId: string) => void;
  onTogglePrepIngredient: (canonicalId: string) => void;
  onToggleCookStep: (stepOrder: number) => void;
  onMarkMealFoodsTried: (recipe: Recipe) => void;
  onBackToPlan: () => void;
}

export function CookView({
  recipe,
  plannedRecipes,
  household,
  prepChecked,
  stepsChecked,
  untriedFoods,
  isFavorite,
  onToggleFavorite,
  onSelectRecipe,
  onTogglePrepIngredient,
  onToggleCookStep,
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
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto bg-white/80 px-4 py-2.5">
        <button
          type="button"
          onClick={onBackToPlan}
          aria-label="Voltar à Ementa"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#F2EFE9] px-3 text-xs font-semibold text-[#1C2420] transition-colors hover:bg-[#E7E2D8]"
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
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-[#2F6F4E] text-white shadow-[0_2px_6px_rgba(47,111,78,0.22)]'
                  : 'bg-[#F2EFE9]/70 text-[#5C6862] hover:bg-[#F2EFE9]'
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C2420]/78 via-transparent to-transparent" />

        {/* Top Header Controls: Favorite + Screen Wake Lock */}
        <div className="absolute inset-x-4 top-3 flex items-center justify-between gap-2">
          <button
            type="button"
            data-testid="cook-favorite-btn"
            onClick={() => onToggleFavorite(recipe.id)}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold backdrop-blur-md transition-colors ${
              isFavorite
                ? 'bg-[#D96B43] text-white'
                : 'bg-white/90 text-[#1C2420]'
            }`}
          >
            <Heart className="h-3.5 w-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
            Favorito
          </button>

          <button
            type="button"
            data-testid="wake-lock-btn"
            onClick={wakeLock.toggle}
            disabled={!wakeLock.isSupported}
            aria-pressed={wakeLock.isActive}
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold backdrop-blur-md transition-colors ${
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

      <div className="flex flex-col gap-3 px-4 pt-4">
        {/* Hands-Free Cook Mode CTA */}
        <button
          type="button"
          data-testid="hands-free-launch-btn"
          onClick={() => setHandsFreeOpen(true)}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1C2420] px-4 text-sm font-bold text-white shadow-[0_2px_10px_rgba(28,36,32,0.12)] transition-colors hover:bg-[#2C3731] active:scale-[0.99]"
        >
          <PlayCircle className="h-4 w-4 text-[#90CFA9]" />
          Modo Mãos Livres (Temporizadores &amp; Voz)
        </button>

        {/* Ninja Foodi Power / Crispi Pro XL Prep Card */}
        {getRecipeAppliances(recipe).length > 0 && (
          <div
            data-testid="cook-appliance-tips"
            className="space-y-2 rounded-2xl bg-[#E8F2EC]/65 p-4"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#2F6F4E]">
                <Zap className="h-3.5 w-3.5" />
                Preparação Ninja:
              </span>
              {getRecipeAppliances(recipe).map((appId) => (
                <span
                  key={appId}
                  className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#1C2420]"
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
            className="flex items-center justify-between gap-3 rounded-2xl bg-[#FEF5E6] p-4"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-xs font-bold text-[#9C5C00]">
                <Sprout className="h-3.5 w-3.5 shrink-0" />
                Novos alimentos nesta refeição:
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-[#6F4300]">
                {untriedFoods.map((f) => f.name).join(', ')}
              </p>
            </div>
            <button
              type="button"
              data-testid="mark-meal-foods-tried-btn"
              onClick={() => onMarkMealFoodsTried(recipe)}
              className="shrink-0 rounded-xl bg-[#2F6F4E] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#25593E]"
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
        <div className="rounded-2xl bg-white py-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <div className="mb-2 flex items-center justify-between px-4">
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
                <li
                  key={ing.canonical_id}
                  data-testid={`cook-ingredient-${ing.canonical_id}`}
                >
                  <button
                    type="button"
                    onClick={() => onTogglePrepIngredient(ing.canonical_id)}
                    aria-pressed={checked}
                    className={`flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-all hover:bg-[#FAF8F5] ${
                      checked ? 'opacity-55' : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${
                          checked
                            ? 'bg-[#2F6F4E] text-white'
                            : 'bg-[#F2EFE9] ring-1 ring-[#D6CFC2]'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span
                        className={`text-sm font-medium leading-snug ${
                          checked ? 'text-[#8A948E] line-through' : 'text-[#1C2420]'
                        }`}
                      >
                        {ing.name}
                      </span>
                    </div>
                    <span
                      className={`tabular-nums shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        checked
                          ? 'bg-[#F2EFE9] text-[#8A948E] line-through'
                          : 'bg-[#E8F2EC] text-[#2F6F4E]'
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
        <div className="flex flex-col gap-3 pt-1">
          <h3 className="text-sm font-bold text-[#1C2420]">Passo a Passo</h3>

          {recipe.steps.map((step) => {
            const done = Boolean(stepsChecked[step.order]);
            const displayText = formatStepText(step);

            if (step.is_seasoning_split_point) {
              return (
                <button
                  key={step.order}
                  type="button"
                  data-testid="seasoning-split-banner"
                  onClick={() => onToggleCookStep(step.order)}
                  aria-pressed={done}
                  className={`w-full rounded-2xl p-4 text-left transition-all ${
                    done
                      ? 'bg-[#FDF0EB]/65 opacity-60 shadow-[0_2px_10px_rgba(0,0,0,0.03)]'
                      : 'bg-[#FDF0EB] shadow-[0_2px_12px_rgba(217,107,67,0.14)]'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white transition-colors ${
                        done ? 'bg-[#2F6F4E]' : 'bg-[#D96B43]'
                      }`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : step.order}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#D96B43] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
                      <ShieldAlert className="h-3 w-3" />
                      Ponto de Separação do Sal
                    </span>
                  </div>
                  <p
                    className={`text-sm font-semibold leading-relaxed text-[#7A2A10] ${
                      done ? 'line-through' : ''
                    }`}
                  >
                    {displayText}
                  </p>
                </button>
              );
            }

            return (
              <button
                key={step.order}
                type="button"
                data-testid={`cook-step-${step.order}`}
                onClick={() => onToggleCookStep(step.order)}
                aria-pressed={done}
                className={`w-full rounded-2xl bg-white p-4 text-left shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all ${
                  done ? 'opacity-55' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      done
                        ? 'bg-[#2F6F4E] text-white'
                        : 'bg-[#F2EFE9] text-[#1C2420]'
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : step.order}
                  </span>
                  <p
                    className={`text-sm leading-relaxed ${
                      done ? 'text-[#5C6862] line-through' : 'text-[#1C2420]'
                    }`}
                  >
                    {displayText}
                  </p>
                </div>
              </button>
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
