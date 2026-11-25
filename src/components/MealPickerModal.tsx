import { Clock, Heart, Sparkles, X } from 'lucide-react';
import { DAY_LABELS } from '../lib/constants';
import { resolveAssetUrl } from '../lib/storage';
import type { MealSlotType, Recipe } from '../types/recipe';

interface MealPickerModalProps {
  dayIndex: number;
  slot: MealSlotType;
  recipes: Recipe[];
  favoriteIds: string[];
  currentRecipeId?: string;
  onSelectRecipe: (recipeId: string) => void;
  onClose: () => void;
}

const SLOT_LABELS: Record<MealSlotType, string> = {
  breakfast: 'Pequeno-almoço (Pequenos-almoços e Lanches)',
  snack: 'Lanche (Pequenos-almoços e Lanches)',
  lunch: 'Almoço (Refeições principais)',
  dinner: 'Jantar (Refeições principais)',
};

export function MealPickerModal({
  dayIndex,
  slot,
  recipes,
  favoriteIds,
  currentRecipeId,
  onSelectRecipe,
  onClose,
}: MealPickerModalProps) {
  const dayLabel = DAY_LABELS[dayIndex] ?? `Dia ${dayIndex + 1}`;
  const favSet = new Set(favoriteIds);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Escolher ${slot} para ${dayLabel}`}
      data-testid="meal-picker-modal"
      className="fixed inset-0 z-50 flex flex-col bg-[#FAF8F5]"
    >
      <div className="flex items-center justify-between border-b border-[#E7E2D8] bg-white px-4 py-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#2F6F4E]">
            {dayLabel}
          </p>
          <h2 className="text-sm font-extrabold text-[#1C2420]">
            Escolher {SLOT_LABELS[slot]}
          </h2>
        </div>

        <button
          type="button"
          data-testid="close-meal-picker-btn"
          onClick={onClose}
          aria-label="Fechar seletor de refeição"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2EFE9] text-[#5C6862] hover:text-[#1C2420]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {recipes.length === 0 ? (
          <div className="rounded-2xl border border-[#E7E2D8] bg-white p-6 text-center text-xs text-[#5C6862]">
            Todas as receitas deste tipo de refeição estão bloqueadas. Desbloqueie uma receita para a poder escolher aqui.
          </div>
        ) : (
          <div className="mx-auto max-w-md space-y-2.5">
            {recipes.map((recipe) => {
              const isFav = favSet.has(recipe.id);
              const isCurrent = recipe.id === currentRecipeId;
              const totalMins = recipe.prep_minutes + recipe.cook_minutes;

              return (
                <button
                  key={recipe.id}
                  type="button"
                  data-testid={`picker-option-${recipe.id}`}
                  onClick={() => onSelectRecipe(recipe.id)}
                  className={`flex w-full items-center gap-3 overflow-hidden rounded-2xl border p-2.5 text-left transition-colors ${
                    isCurrent
                      ? 'border-[#2F6F4E] bg-[#E8F2EC]/50'
                      : 'border-[#E7E2D8] bg-white hover:bg-[#FAF8F5]'
                  }`}
                >
                  {/* Medium-sized 4:3 meal photo */}
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-[#F2EFE9]">
                    <img
                      src={resolveAssetUrl(recipe.image_url)}
                      alt={recipe.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      {isFav && (
                        <span
                          data-testid={`picker-fav-badge-${recipe.id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-[#FDF0EB] px-2 py-0.5 text-[10px] font-bold text-[#D96B43]"
                        >
                          <Heart className="h-2.5 w-2.5" fill="currentColor" />
                          Favorito
                        </span>
                      )}
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#2F6F4E] px-2 py-0.5 text-[10px] font-bold text-white">
                          <Sparkles className="h-2.5 w-2.5" />
                          Atual
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#5C6862]">
                        <Clock className="h-3 w-3 text-[#2F6F4E]" />
                        {totalMins}m
                      </span>
                    </div>

                    <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[#1C2420]">
                      {recipe.title}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
