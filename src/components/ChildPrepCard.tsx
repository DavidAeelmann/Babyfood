import { Baby } from 'lucide-react';
import { BRACKET_KEYS, BRACKET_META } from '../lib/constants';
import { inferCutShape } from '../lib/cutShape';
import { CutShapeDiagram } from './CutShapeDiagram';
import type { AgeAdaptation, BracketKey } from '../types/recipe';

interface ChildPrepCardProps {
  activeBrackets: BracketKey[];
  adaptations: Record<BracketKey, AgeAdaptation>;
}

export function ChildPrepCard({ activeBrackets, adaptations }: ChildPrepCardProps) {
  const orderedActive = BRACKET_KEYS.filter((k) => activeBrackets.includes(k));

  return (
    <div
      data-testid="dynamic-child-prep-card"
      className="rounded-2xl bg-[#E8F2EC]/70 p-4"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#2F6F4E] text-white">
          <Baby className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-[#1C2420]">
            Preparação &amp; Corte por Idade
          </h3>
          <p className="text-[11px] text-[#44594E]">
            Adaptado às faixas etárias selecionadas
          </p>
        </div>
      </div>

      {orderedActive.length === 0 ? (
        <p className="rounded-xl bg-white/85 p-3.5 text-xs text-[#5C6862]">
          Nenhuma idade selecionada. Toque no agregado familiar no topo para escolher as faixas etárias (ex. 6–9m ou 2–4a).
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {orderedActive.map((key) => {
            const ad = adaptations[key];
            const cutShape = inferCutShape(ad, key);

            return (
              <div
                key={key}
                data-testid={`child-prep-bracket-${key}`}
                className="rounded-xl bg-white p-3.5 shadow-[0_1px_6px_rgba(0,0,0,0.03)]"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[#2F6F4E] px-2.5 py-0.5 text-[11px] font-bold text-white">
                    {BRACKET_META[key].label}
                  </span>
                  <span className="text-[11px] font-medium text-[#5C6862]">
                    {BRACKET_META[key].weight}× dose
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <CutShapeDiagram shape={cutShape} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-relaxed text-[#1C2420]">
                      {ad.cut_and_texture}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#5C6862]">
                      <strong className="font-semibold text-[#2F6F4E]">Nota:</strong>{' '}
                      {ad.serving_note}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
