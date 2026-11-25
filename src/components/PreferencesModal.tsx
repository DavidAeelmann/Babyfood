import { useMemo, useState } from 'react';
import { Ban, Check, Copy, Heart, RotateCcw, Sparkles, X } from 'lucide-react';
import { buildPreferencesProfile } from '../lib/preferences';
import { resolveAssetUrl } from '../lib/storage';
import type { Recipe } from '../types/recipe';

interface PreferencesModalProps {
  allRecipes: Recipe[];
  recipeMap: Map<string, Recipe>;
  favoriteIds: string[];
  blockedIds: string[];
  onToggleFavorite: (recipeId: string) => void;
  onToggleBlocked: (recipeId: string) => void;
  onOpenCook: (recipeId: string) => void;
  onClose: () => void;
}

const SLOT_BADGES: Record<string, string> = {
  dinner: 'Jantar',
  lunch: 'Almoço',
  breakfast: 'Peq.-almoço',
  snack: 'Lanche',
};

export function PreferencesModal({
  allRecipes,
  recipeMap,
  favoriteIds,
  blockedIds,
  onToggleFavorite,
  onToggleBlocked,
  onOpenCook,
  onClose,
}: PreferencesModalProps) {
  const [tab, setTab] = useState<'blocked' | 'favorites'>(
    blockedIds.length > 0 ? 'blocked' : 'favorites',
  );
  const [copiedJson, setCopiedJson] = useState(false);

  const favoriteRecipes = useMemo(
    () =>
      favoriteIds
        .map((id) => recipeMap.get(id))
        .filter((r): r is Recipe => Boolean(r)),
    [favoriteIds, recipeMap],
  );

  const blockedRecipes = useMemo(
    () =>
      blockedIds
        .map((id) => recipeMap.get(id))
        .filter((r): r is Recipe => Boolean(r)),
    [blockedIds, recipeMap],
  );

  const items = tab === 'blocked' ? blockedRecipes : favoriteRecipes;

  const handleExportPreferences = async () => {
    const profile = buildPreferencesProfile(favoriteIds, blockedIds, recipeMap);
    try {
      await navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
      setCopiedJson(true);
      window.setTimeout(() => setCopiedJson(false), 2500);
    } catch {
      setCopiedJson(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gerir receitas favoritas e bloqueadas"
      data-testid="preferences-modal"
      className="fixed inset-0 z-50 flex flex-col bg-[#FAF8F5]"
    >
      <div className="flex items-center justify-between border-b border-[#E7E2D8] bg-white px-4 py-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#2F6F4E]">
            Preferências da Família ({allRecipes.length} receitas)
          </p>
          <h2 className="text-sm font-extrabold text-[#1C2420]">
            Favoritas &amp; Bloqueadas
          </h2>
        </div>

        <button
          type="button"
          data-testid="close-preferences-modal"
          onClick={onClose}
          aria-label="Fechar preferências"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2EFE9] text-[#5C6862] hover:text-[#1C2420]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-auto w-full max-w-md px-4 pt-3">
        <div className="mb-3 rounded-2xl border border-[#CFE3D6] bg-[#E8F2EC]/70 p-3 text-xs text-[#2F6F4E]">
          <p className="flex items-start gap-2 font-medium leading-relaxed">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              As trocas e re-simulações dão prioridade às <strong>Favoritas</strong> e afastam receitas com ingredientes semelhantes às <strong>Bloqueadas</strong>.
            </span>
          </p>
          {(favoriteIds.length > 0 || blockedIds.length > 0) && (
            <button
              type="button"
              data-testid="export-preferences-btn"
              onClick={handleExportPreferences}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-[11px] font-bold text-[#2F6F4E] shadow-xs hover:bg-[#FAF8F5]"
            >
              {copiedJson ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Preferências copiadas para GitHub/IA!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar Preferências para Geração Semanal
                </>
              )}
            </button>
          )}
        </div>

        <div className="mb-3 grid grid-cols-2 rounded-xl border border-[#E7E2D8] bg-[#F2EFE9] p-1">
          <button
            type="button"
            data-testid="prefs-tab-blocked"
            onClick={() => setTab('blocked')}
            className={`flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
              tab === 'blocked'
                ? 'bg-white text-[#B84C27] shadow-xs'
                : 'text-[#5C6862]'
            }`}
          >
            <Ban className="h-3.5 w-3.5" />
            Bloqueadas ({blockedRecipes.length})
          </button>
          <button
            type="button"
            data-testid="prefs-tab-favorites"
            onClick={() => setTab('favorites')}
            className={`flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
              tab === 'favorites'
                ? 'bg-white text-[#D96B43] shadow-xs'
                : 'text-[#5C6862]'
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            Favoritas ({favoriteRecipes.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="mx-auto max-w-md space-y-2.5">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-[#E7E2D8] bg-white p-6 text-center text-xs text-[#5C6862]">
              {tab === 'blocked'
                ? 'Nenhuma receita bloqueada de momento. Pode bloquear pratos na Vista Semanal.'
                : 'Ainda sem favoritas. Abra uma receita em Cozinhar e toque em Favorito.'}
            </div>
          ) : (
            items.map((recipe) => (
              <div
                key={recipe.id}
                data-testid={`prefs-row-${recipe.id}`}
                className="flex items-center gap-3 rounded-2xl border border-[#E7E2D8] bg-white p-2.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCook(recipe.id);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <img
                    src={resolveAssetUrl(recipe.image_url)}
                    alt={recipe.title}
                    className="h-16 w-20 shrink-0 rounded-xl bg-[#F2EFE9] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-[#E8F2EC] px-2 py-0.5 text-[10px] font-bold text-[#2F6F4E]">
                      {SLOT_BADGES[recipe.meal_slot ?? 'dinner'] ?? 'Refeição'}
                    </span>
                    <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-[#1C2420]">
                      {recipe.title}
                    </h3>
                  </div>
                </button>

                {tab === 'blocked' ? (
                  <button
                    type="button"
                    data-testid={`unblock-btn-${recipe.id}`}
                    onClick={() => onToggleBlocked(recipe.id)}
                    className="inline-flex min-h-[38px] shrink-0 items-center gap-1 rounded-xl border border-[#CFE3D6] bg-[#E8F2EC] px-3 text-xs font-bold text-[#2F6F4E] hover:bg-[#D5E9DD]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Desbloquear
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid={`unfav-btn-${recipe.id}`}
                    onClick={() => onToggleFavorite(recipe.id)}
                    aria-label={`Remover ${recipe.title} das favoritas`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FDF0EB] text-[#D96B43]"
                  >
                    <Heart className="h-4 w-4" fill="currentColor" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
