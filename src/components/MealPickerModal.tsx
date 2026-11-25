import { useMemo, useState, type FormEvent } from 'react';
import { Clock, Heart, Plus, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { APPLIANCE_META, getRecipeAppliances } from '../lib/appliances';
import { DAY_LABELS } from '../lib/constants';
import { resolveAssetUrl } from '../lib/storage';
import type { Allergen, ApplianceId, MealSlotType, Recipe } from '../types/recipe';

interface MealPickerModalProps {
  dayIndex: number;
  slot: MealSlotType;
  recipes: Recipe[];
  favoriteIds: string[];
  excludedAllergens: Allergen[];
  currentRecipeId?: string;
  onSelectRecipe: (recipeId: string) => void;
  onAddCustomRecipe: (input: {
    title: string;
    slot: MealSlotType;
    prepMinutes: number;
    cookMinutes: number;
    ingredientsText: string;
    toddlerNote: string;
  }) => Recipe;
  onClose: () => void;
}

type PickerFilter =
  | 'all'
  | 'favorites'
  | 'quick'
  | 'allergen_safe'
  | ApplianceId;

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
  excludedAllergens,
  currentRecipeId,
  onSelectRecipe,
  onAddCustomRecipe,
  onClose,
}: MealPickerModalProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PickerFilter>('all');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const [customTitle, setCustomTitle] = useState('');
  const [customPrepMins, setCustomPrepMins] = useState('10');
  const [customCookMins, setCustomCookMins] = useState('15');
  const [customIngredients, setCustomIngredients] = useState('');
  const [customNote, setCustomNote] = useState('');

  const dayLabel = DAY_LABELS[dayIndex] ?? `Dia ${dayIndex + 1}`;
  const favSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const filteredRecipes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      if (q) {
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesIng = r.ingredients.some((i) =>
          i.name.toLowerCase().includes(q),
        );
        if (!matchesTitle && !matchesIng) return false;
      }
      if (filter === 'favorites' && !favSet.has(r.id)) return false;
      if (filter === 'quick' && r.prep_minutes + r.cook_minutes > 20) return false;
      if (filter === 'allergen_safe') {
        if (excludedAllergens.length > 0) {
          if (r.allergens.some((a) => excludedAllergens.includes(a))) return false;
        } else if (r.allergens.length > 0) {
          return false;
        }
      }
      if (
        (filter === 'ninja-foodi-power' || filter === 'ninja-crispi-pro-xl') &&
        !getRecipeAppliances(r).includes(filter)
      ) {
        return false;
      }
      return true;
    });
  }, [recipes, query, filter, favSet, excludedAllergens]);

  const handleCreateCustom = (e: FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    const created = onAddCustomRecipe({
      title: customTitle,
      slot,
      prepMinutes: Number(customPrepMins) || 10,
      cookMinutes: Number(customCookMins) || 15,
      ingredientsText: customIngredients,
      toddlerNote: customNote,
    });
    onSelectRecipe(created.id);
  };

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

      {/* Search + Quick Filters + Add Custom Recipe button */}
      <div className="border-b border-[#E7E2D8] bg-white px-4 py-2.5">
        <div className="mx-auto max-w-md space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8A948E]" />
              <input
                type="search"
                data-testid="picker-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar prato ou ingrediente…"
                aria-label="Pesquisar receitas"
                className="min-h-[38px] w-full rounded-xl bg-[#FAF8F5] pr-3 pl-9 text-xs font-medium text-[#1C2420] placeholder:text-[#8A948E] focus:outline-2 focus:outline-[#2F6F4E]"
              />
            </div>

            <button
              type="button"
              data-testid="toggle-custom-recipe-form-btn"
              onClick={() => setShowCustomForm((v) => !v)}
              className={`inline-flex min-h-[38px] shrink-0 items-center gap-1 rounded-xl px-2.5 text-xs font-bold transition-colors ${
                showCustomForm
                  ? 'bg-[#1C2420] text-white'
                  : 'border border-[#CFE3D6] bg-[#E8F2EC] text-[#2F6F4E]'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Própria
            </button>
          </div>

          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {(
              [
                { key: 'all', label: `Todas (${recipes.length})` },
                { key: 'favorites', label: 'Favoritas' },
                { key: 'ninja-crispi-pro-xl', label: 'Crispi Pro XL' },
                { key: 'ninja-foodi-power', label: 'Foodi Power' },
                { key: 'quick', label: '≤ 20 min' },
                { key: 'allergen_safe', label: 'Sem Alergénios' },
              ] as Array<{ key: PickerFilter; label: string }>
            ).map((chip) => {
              const active = filter === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  data-testid={`picker-filter-${chip.key}`}
                  onClick={() => setFilter(chip.key)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    active
                      ? 'bg-[#2F6F4E] text-white'
                      : 'border border-[#E0DAD0] bg-[#FAF8F5] text-[#5C6862]'
                  }`}
                >
                  {chip.key === 'allergen_safe' && <ShieldCheck className="h-3 w-3" />}
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mx-auto max-w-md space-y-2.5">
          {showCustomForm && (
            <form
              onSubmit={handleCreateCustom}
              data-testid="custom-recipe-form"
              className="rounded-2xl border border-[#CFE3D6] bg-white p-3.5 shadow-xs space-y-2.5"
            >
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2F6F4E]">
                Nova Receita da Família
              </h3>
              <input
                type="text"
                required
                data-testid="custom-recipe-title-input"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Nome do prato (ex. Sopa de Feijão Verde da Avó)"
                className="min-h-[40px] w-full rounded-xl bg-[#FAF8F5] px-3 text-sm text-[#1C2420] placeholder:text-[#8A948E] focus:outline-2 focus:outline-[#2F6F4E]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={customPrepMins}
                  onChange={(e) => setCustomPrepMins(e.target.value)}
                  placeholder="Prep (min)"
                  aria-label="Minutos de preparação"
                  className="min-h-[38px] rounded-xl bg-[#FAF8F5] px-3 text-xs text-[#1C2420]"
                />
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={customCookMins}
                  onChange={(e) => setCustomCookMins(e.target.value)}
                  placeholder="Cozedura (min)"
                  aria-label="Minutos de cozedura"
                  className="min-h-[38px] rounded-xl bg-[#FAF8F5] px-3 text-xs text-[#1C2420]"
                />
              </div>
              <input
                type="text"
                value={customIngredients}
                onChange={(e) => setCustomIngredients(e.target.value)}
                placeholder="Ingredientes separados por vírgula (ex. Feijão-verde, Batata, Azeite)"
                className="min-h-[40px] w-full rounded-xl bg-[#FAF8F5] px-3 text-xs text-[#1C2420] placeholder:text-[#8A948E]"
              />
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Nota de corte para bebé/criança (opcional)"
                className="min-h-[40px] w-full rounded-xl bg-[#FAF8F5] px-3 text-xs text-[#1C2420] placeholder:text-[#8A948E]"
              />
              <button
                type="submit"
                data-testid="submit-custom-recipe-btn"
                className="flex min-h-[42px] w-full items-center justify-center rounded-xl bg-[#2F6F4E] text-xs font-bold text-white hover:bg-[#25593E]"
              >
                Guardar e Usar Neste Dia
              </button>
            </form>
          )}

          {filteredRecipes.length === 0 ? (
            <div className="rounded-2xl border border-[#E7E2D8] bg-white p-6 text-center text-xs text-[#5C6862]">
              {recipes.length === 0
                ? 'Todas as receitas deste tipo de refeição estão bloqueadas. Desbloqueie uma receita em Favoritas & Bloqueadas.'
                : 'Nenhuma receita corresponde à pesquisa ou filtro selecionado.'}
            </div>
          ) : (
            filteredRecipes.map((recipe) => {
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
                      {recipe.id.startsWith('custom-') && (
                        <span className="rounded-full bg-[#E8F2EC] px-2 py-0.5 text-[10px] font-bold text-[#2F6F4E]">
                          Própria
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
                    {getRecipeAppliances(recipe).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {getRecipeAppliances(recipe).map((appId) => (
                          <span
                            key={appId}
                            className="rounded-full bg-[#F2EFE9] px-2 py-0.5 text-[10px] font-semibold text-[#5C6862]"
                          >
                            {APPLIANCE_META[appId].shortLabel}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
