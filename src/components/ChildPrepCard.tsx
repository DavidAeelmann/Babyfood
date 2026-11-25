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
      className="rounded-2xl border border-[#CFE3D6] bg-[#E8F2EC]/65 p-3.5"
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2F6F4E] text-white">
          <Baby className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-[#1C2420]">
            Child Texture &amp; Serving Prep
          </h3>
          <p className="text-[11px] text-[#44594E]">
            Showing only your selected household age brackets
          </p>
        </div>
      </div>

      {orderedActive.length === 0 ? (
        <p className="rounded-xl bg-white/80 p-3 text-xs text-[#5C6862]">
          No child age brackets selected. Tap a bracket pill above (e.g. 6–9m or 2–4y) to view tailored cut &amp; texture instructions.
        </p>
      ) : (
        <div className="space-y-2.5">
          {orderedActive.map((key) => {
            const ad = adaptations[key];
            const cutShape = inferCutShape(ad, key);

            return (
              <div
                key={key}
                data-testid={`child-prep-bracket-${key}`}
                className="rounded-xl border border-[#DCEADF] bg-white p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[#2F6F4E] px-2.5 py-0.5 text-[11px] font-bold text-white">
                    {BRACKET_META[key].label}
                  </span>
                  <span className="text-[11px] font-medium text-[#5C6862]">
                    {BRACKET_META[key].weight}× portion
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <CutShapeDiagram shape={cutShape} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-relaxed text-[#1C2420]">
                      {ad.cut_and_texture}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#5C6862]">
                      <strong className="font-semibold text-[#2F6F4E]">Note:</strong>{' '}
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
