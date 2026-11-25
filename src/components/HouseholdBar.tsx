import { useState } from 'react';
import { Minus, Plus, ShieldAlert, Sprout, Users } from 'lucide-react';
import {
  ALLERGEN_KEYS,
  ALLERGEN_LABELS,
  BRACKET_KEYS,
  BRACKET_META,
} from '../lib/constants';
import { getTotalHouseholdWeight } from '../lib/groceryAggregator';
import type { Allergen, BracketKey, HouseholdConfig } from '../types/recipe';

interface HouseholdBarProps {
  household: HouseholdConfig;
  weekId?: string;
  triedFoodsCount: number;
  totalFoodsCount: number;
  triedAllergensCount: number;
  onOpenFirstFoods: () => void;
  onSetAdults: (count: number) => void;
  onToggleBracket: (bracket: BracketKey) => void;
  onToggleAllergen: (allergen: Allergen) => void;
}

export function HouseholdBar({
  household,
  weekId,
  triedFoodsCount,
  totalFoodsCount,
  triedAllergensCount,
  onOpenFirstFoods,
  onSetAdults,
  onToggleBracket,
  onToggleAllergen,
}: HouseholdBarProps) {
  const [showAllergens, setShowAllergens] = useState(false);
  const totalWeight = getTotalHouseholdWeight(household);
  const excludedCount = household.excludedAllergens.length;

  return (
    <header className="sticky top-0 z-30 border-b border-[#E7E2D8] bg-[#FAF8F5]/95 backdrop-blur-md">
      <div className="mx-auto max-w-md px-4 pt-3 pb-2.5">
        {/* Top row: Brand + Multiplier + Allergens button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2F6F4E] text-xs font-extrabold text-white">
              MP
            </span>
            <div className="flex items-center gap-1.5">
              <h1 className="whitespace-nowrap text-[15px] font-bold tracking-tight text-[#1C2420]">
                MesaPequena
              </h1>
              {weekId && (
                <span className="whitespace-nowrap rounded-md bg-[#F2EFE9] px-1.5 py-0.5 text-[10px] font-semibold text-[#5C6862]">
                  {weekId}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              data-testid="household-multiplier"
              className="tabular-nums whitespace-nowrap rounded-full bg-[#E8F2EC] px-2 py-1 text-[11px] font-semibold text-[#2F6F4E]"
            >
              {totalWeight.toFixed(2)}×
            </span>
            <button
              type="button"
              onClick={() => setShowAllergens((v) => !v)}
              aria-expanded={showAllergens}
              aria-label="Filtrar alergénios"
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                excludedCount > 0
                  ? 'border-[#D96B43] bg-[#FDF0EB] text-[#B84C27]'
                  : 'border-[#E0DAD0] bg-white text-[#5C6862] hover:bg-[#F2EFE9]'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{excludedCount > 0 ? `${excludedCount} excl.` : 'Alergénios'}</span>
            </button>
          </div>
        </div>

        {/* Second row: Adults stepper + Child bracket pills */}
        <div className="mt-2 flex items-center gap-2">
          <div className="inline-flex shrink-0 items-center rounded-full border border-[#E0DAD0] bg-white p-0.5">
            <span className="flex items-center gap-1 pl-2 pr-1 text-[11px] font-semibold text-[#5C6862]">
              <Users className="h-3 w-3" />
              Adultos
            </span>
            <button
              type="button"
              onClick={() => onSetAdults(household.adults - 1)}
              disabled={household.adults <= 1}
              aria-label="Diminuir adultos"
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#1C2420] hover:bg-[#F2EFE9] disabled:opacity-35"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span
              data-testid="adults-count"
              className="tabular-nums w-4 text-center text-xs font-bold text-[#1C2420]"
            >
              {household.adults}
            </span>
            <button
              type="button"
              onClick={() => onSetAdults(household.adults + 1)}
              disabled={household.adults >= 4}
              aria-label="Aumentar adultos"
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#1C2420] hover:bg-[#F2EFE9] disabled:opacity-35"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div
            className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto py-0.5"
            role="group"
            aria-label="Faixas etárias das crianças"
          >
            {BRACKET_KEYS.map((key) => {
              const active = household.activeBrackets.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  data-testid={`bracket-pill-${key}`}
                  aria-pressed={active}
                  onClick={() => onToggleBracket(key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-[#2F6F4E] text-white shadow-xs'
                      : 'border border-[#E0DAD0] bg-white text-[#5C6862] hover:bg-[#F2EFE9]'
                  }`}
                >
                  {BRACKET_META[key].shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Third row: Compact First Foods & Top-9 Allergen Progress Badge */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            data-testid="household-first-foods-badge"
            onClick={onOpenFirstFoods}
            className="tabular-nums inline-flex items-center gap-1.5 rounded-full border border-[#CFE3D6] bg-[#E8F2EC]/80 px-2.5 py-1 text-[11px] font-bold text-[#2F6F4E] transition-colors hover:bg-[#DCEADF]"
          >
            <Sprout className="h-3.5 w-3.5 shrink-0" />
            <span>
              Alimentos: {triedFoodsCount}/{totalFoodsCount} · Alergénios:{' '}
              {triedAllergensCount}/9
            </span>
          </button>
        </div>

        {/* Collapsible Allergen Exclusions */}
        {showAllergens && (
          <div className="mt-2.5 rounded-xl border border-[#E7E2D8] bg-white p-2.5">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5C6862]">
              Excluir Alergénios (filtra trocas automaticamente)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGEN_KEYS.map((allergen) => {
                const excluded = household.excludedAllergens.includes(allergen);
                return (
                  <button
                    key={allergen}
                    type="button"
                    aria-pressed={excluded}
                    onClick={() => onToggleAllergen(allergen)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      excluded
                        ? 'bg-[#D96B43] text-white'
                        : 'bg-[#F2EFE9] text-[#5C6862] hover:bg-[#E7E2D8]'
                    }`}
                  >
                    {ALLERGEN_LABELS[allergen]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
