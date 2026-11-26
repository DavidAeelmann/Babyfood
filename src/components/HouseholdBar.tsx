import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ChevronDown, Minus, Plus, ShieldAlert, Users, X } from 'lucide-react';
import {
  ALLERGEN_KEYS,
  ALLERGEN_LABELS,
  BRACKET_KEYS,
  BRACKET_META,
} from '../lib/constants';
import { formatIsoWeekRangePt } from '../lib/formatters';
import type { Allergen, BracketKey, HouseholdConfig } from '../types/recipe';

interface HouseholdBarProps {
  household: HouseholdConfig;
  weekId?: string;
  onSetAdults: (count: number) => void;
  onToggleBracket: (bracket: BracketKey) => void;
  onToggleAllergen: (allergen: Allergen) => void;
}

export function HouseholdBar({
  household,
  weekId,
  onSetAdults,
  onToggleBracket,
  onToggleAllergen,
}: HouseholdBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartYRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSheetOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sheetOpen]);

  const orderedActiveBrackets = BRACKET_KEYS.filter((k) =>
    household.activeBrackets.includes(k),
  );
  const excludedCount = household.excludedAllergens.length;
  const weekLabel = formatIsoWeekRangePt(weekId);

  const summaryBracketText =
    orderedActiveBrackets.length === 0
      ? 'Adultos'
      : orderedActiveBrackets.length === 1
        ? BRACKET_META[orderedActiveBrackets[0]].shortLabel
        : `${BRACKET_META[orderedActiveBrackets[0]].shortLabel} +${orderedActiveBrackets.length - 1}`;

  const handleSheetPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = e.clientY;
  };

  const handleSheetPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;
    const dy = e.clientY - dragStartYRef.current;
    if (dy > 0) {
      setDragY(dy);
    }
  };

  const handleSheetPointerUp = () => {
    if (dragY > 64) {
      setSheetOpen(false);
    }
    setDragY(0);
    dragStartYRef.current = null;
  };

  return (
    <>
      <header
        data-testid="app-sticky-header"
        className={`sticky top-0 z-30 h-14 bg-[#FAF8F5]/95 backdrop-blur-md transition-shadow duration-200 ${
          scrolled
            ? 'border-b border-[#E7E2D8]/80 shadow-[0_4px_16px_rgba(28,36,32,0.08)]'
            : ''
        }`}
      >
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-2 px-4">
          {/* Left: Brand mark + Name + Humanized week range */}
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2F6F4E] text-[11px] font-extrabold text-white">
              MP
            </span>
            <h1 className="whitespace-nowrap text-[15px] font-extrabold tracking-tight text-[#1C2420]">
              MesaPequena
            </h1>
            {weekLabel && (
              <span
                data-testid="header-week-range"
                className="whitespace-nowrap rounded-full bg-[#F2EFE9] px-2 py-0.5 text-[11px] font-semibold text-[#5C6862]"
              >
                {weekLabel}
              </span>
            )}
          </div>

          {/* Right: Single compact household & allergens trigger pill */}
          <button
            type="button"
            data-testid="household-sheet-trigger"
            onClick={() => setSheetOpen(true)}
            aria-expanded={sheetOpen}
            aria-label="Configurar agregado familiar e alergénios"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#F2EFE9] px-3 text-xs font-semibold text-[#1C2420] transition-colors hover:bg-[#E7E2D8] active:scale-[0.98]"
          >
            {excludedCount > 0 && (
              <span
                aria-label={`${excludedCount} alergénios excluídos`}
                className="h-2 w-2 shrink-0 rounded-full bg-[#D96B43]"
              />
            )}
            <span className="tabular-nums whitespace-nowrap">
              {household.adults}A · {summaryBracketText}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[#5C6862]" />
          </button>
        </div>
      </header>

      {/* Household & Allergens Bottom Sheet */}
      {sheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Configuração do Agregado Familiar e Alergénios"
          data-testid="household-bottom-sheet"
          onClick={() => setSheetOpen(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#1C2420]/45 backdrop-blur-[2px] transition-opacity"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
              transition: dragY === 0 ? 'transform 180ms ease-out' : undefined,
            }}
            className="w-full max-w-md rounded-t-3xl bg-white px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(28,36,32,0.16)]"
          >
            {/* Drag Handle */}
            <div
              onPointerDown={handleSheetPointerDown}
              onPointerMove={handleSheetPointerMove}
              onPointerUp={handleSheetPointerUp}
              onPointerCancel={handleSheetPointerUp}
              className="mx-auto mb-3 flex w-full cursor-grab justify-center py-1 touch-none"
            >
              <span className="h-1 w-10 rounded-full bg-[#D6CFC2]" />
            </div>

            {/* Sheet Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-[#1C2420]">
                  Agregado &amp; Alergénios
                </h2>
                <p className="mt-0.5 text-xs text-[#5C6862]">
                  Ajusta doses, adaptações por idade e exclusões
                </p>
              </div>
              <button
                type="button"
                data-testid="close-household-sheet-btn"
                onClick={() => setSheetOpen(false)}
                aria-label="Fechar painel do agregado"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2EFE9] text-[#5C6862] hover:bg-[#E7E2D8] hover:text-[#1C2420]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Adults Stepper */}
              <div className="flex items-center justify-between rounded-2xl bg-[#FAF8F5] p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F2EC] text-[#2F6F4E]">
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#1C2420]">Adultos</p>
                    <p className="text-[11px] text-[#5C6862]">
                      Porções de adulto na ementa e compras
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                  <button
                    type="button"
                    onClick={() => onSetAdults(household.adults - 1)}
                    disabled={household.adults <= 1}
                    aria-label="Diminuir adultos"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#1C2420] transition-colors hover:bg-[#F2EFE9] disabled:opacity-30"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span
                    data-testid="adults-count"
                    className="tabular-nums w-6 text-center text-sm font-extrabold text-[#1C2420]"
                  >
                    {household.adults}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetAdults(household.adults + 1)}
                    disabled={household.adults >= 4}
                    aria-label="Aumentar adultos"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#1C2420] transition-colors hover:bg-[#F2EFE9] disabled:opacity-30"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Child Age Brackets */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#5C6862]">
                  Faixas Etárias das Crianças
                </p>
                <div
                  className="flex flex-wrap gap-2"
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
                        className={`rounded-full px-3.5 py-2 text-xs font-bold transition-all ${
                          active
                            ? 'bg-[#2F6F4E] text-white shadow-[0_2px_8px_rgba(47,111,78,0.28)]'
                            : 'bg-[#F2EFE9] text-[#5C6862] hover:bg-[#E7E2D8]'
                        }`}
                      >
                        {BRACKET_META[key].shortLabel}
                      </button>
                    );
                  })}
                </div>
                {orderedActiveBrackets.length > 0 && (
                  <div className="mt-2.5 space-y-1 rounded-xl bg-[#E8F2EC]/60 px-3 py-2">
                    {orderedActiveBrackets.map((key) => (
                      <p key={key} className="text-[11px] leading-snug text-[#355443]">
                        <strong className="font-bold text-[#2F6F4E]">
                          {BRACKET_META[key].label}:
                        </strong>{' '}
                        {BRACKET_META[key].summary}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Allergen Exclusions */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5C6862]">
                    <ShieldAlert className="h-3.5 w-3.5 text-[#D96B43]" />
                    Excluir Alergénios
                  </p>
                  {excludedCount > 0 && (
                    <span className="rounded-full bg-[#FDF0EB] px-2 py-0.5 text-[11px] font-bold text-[#B84C27]">
                      {excludedCount} {excludedCount === 1 ? 'ativo' : 'ativos'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALLERGEN_KEYS.map((allergen) => {
                    const excluded = household.excludedAllergens.includes(allergen);
                    return (
                      <button
                        key={allergen}
                        type="button"
                        data-testid={`allergen-toggle-${allergen}`}
                        aria-pressed={excluded}
                        onClick={() => onToggleAllergen(allergen)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          excluded
                            ? 'bg-[#D96B43] text-white shadow-[0_2px_8px_rgba(217,107,67,0.25)]'
                            : 'bg-[#F2EFE9] text-[#5C6862] hover:bg-[#E7E2D8]'
                        }`}
                      >
                        {ALLERGEN_LABELS[allergen]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-6 flex min-h-[46px] w-full items-center justify-center rounded-2xl bg-[#2F6F4E] text-sm font-bold text-white shadow-[0_2px_8px_rgba(47,111,78,0.22)] transition-colors hover:bg-[#25593E] active:scale-[0.99]"
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </>
  );
}
