import { CUT_SHAPE_META } from '../lib/cutShape';
import type { CutShape } from '../types/recipe';

interface CutShapeDiagramProps {
  shape: CutShape;
}

export function CutShapeDiagram({ shape }: CutShapeDiagramProps) {
  const meta = CUT_SHAPE_META[shape];

  return (
    <div
      data-testid={`cut-shape-svg-${shape}`}
      title={`${meta.label}: ${meta.shortHint}`}
      className="flex shrink-0 flex-col items-center gap-1"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#DCEADF] bg-[#FAF8F5]">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={`${meta.label} cut diagram`}
        >
          {shape === 'finger-strip' && (
            <>
              <rect x="8" y="13" width="32" height="9" rx="4.5" fill="#D96B43" fillOpacity="0.22" stroke="#D96B43" strokeWidth="2" />
              <rect x="8" y="26" width="32" height="9" rx="4.5" fill="#2F6F4E" fillOpacity="0.2" stroke="#2F6F4E" strokeWidth="2" />
              <path d="M14 17.5H24" stroke="#D96B43" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M14 30.5H28" stroke="#2F6F4E" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}

          {shape === 'pincer-dice' && (
            <>
              <rect x="11" y="11" width="11" height="11" rx="3" fill="#2F6F4E" fillOpacity="0.2" stroke="#2F6F4E" strokeWidth="2" />
              <rect x="26" y="11" width="11" height="11" rx="3" fill="#D96B43" fillOpacity="0.2" stroke="#D96B43" strokeWidth="2" />
              <rect x="11" y="26" width="11" height="11" rx="3" fill="#D96B43" fillOpacity="0.2" stroke="#D96B43" strokeWidth="2" />
              <rect x="26" y="26" width="11" height="11" rx="3" fill="#2F6F4E" fillOpacity="0.2" stroke="#2F6F4E" strokeWidth="2" />
            </>
          )}

          {shape === 'quartered-lengthwise' && (
            <>
              <path d="M22 22V10C15.37 10 10 15.37 10 22H22Z" fill="#D96B43" fillOpacity="0.25" stroke="#D96B43" strokeWidth="2" strokeLinejoin="round" />
              <path d="M26 22V10C32.63 10 38 15.37 38 22H26Z" fill="#D96B43" fillOpacity="0.25" stroke="#D96B43" strokeWidth="2" strokeLinejoin="round" />
              <path d="M22 26V38C15.37 38 10 32.63 10 26H22Z" fill="#2F6F4E" fillOpacity="0.2" stroke="#2F6F4E" strokeWidth="2" strokeLinejoin="round" />
              <path d="M26 26V38C32.63 38 38 32.63 38 26H26Z" fill="#2F6F4E" fillOpacity="0.2" stroke="#2F6F4E" strokeWidth="2" strokeLinejoin="round" />
            </>
          )}

          {shape === 'smashed-flat' && (
            <>
              <path d="M24 7V15M24 15L20 11.5M24 15L28 11.5" stroke="#2F6F4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <ellipse cx="16" cy="29" rx="7.5" ry="4" fill="#D96B43" fillOpacity="0.24" stroke="#D96B43" strokeWidth="2" />
              <ellipse cx="32" cy="29" rx="7.5" ry="4" fill="#2F6F4E" fillOpacity="0.22" stroke="#2F6F4E" strokeWidth="2" />
              <path d="M10 37H38" stroke="#8A948E" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
            </>
          )}

          {shape === 'flaked-fine' && (
            <>
              <path d="M10 18C14 14 20 14 23 18C19 21 13 21 10 18Z" fill="#D96B43" fillOpacity="0.26" stroke="#D96B43" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M25 16C29 12 35 12 38 16C34 19 28 19 25 16Z" fill="#2F6F4E" fillOpacity="0.24" stroke="#2F6F4E" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M12 30C16 26 22 26 25 30C21 33 15 33 12 30Z" fill="#2F6F4E" fillOpacity="0.24" stroke="#2F6F4E" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M26 32C30 28 36 28 39 32C35 35 29 35 26 32Z" fill="#D96B43" fillOpacity="0.26" stroke="#D96B43" strokeWidth="1.8" strokeLinejoin="round" />
            </>
          )}

          {shape === 'fork-mash' && (
            <>
              <path d="M10 30C10 23.5 16 19 24 19C32 19 38 23.5 38 30C38 33.5 32 35 24 35C16 35 10 33.5 10 30Z" fill="#D96B43" fillOpacity="0.22" stroke="#D96B43" strokeWidth="2" />
              <path d="M24 9V22M20 9V16M28 9V16" stroke="#2F6F4E" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 28C19 26.5 22 28.5 25 27C28 25.5 31 27.5 33 27" stroke="#D96B43" strokeWidth="1.6" strokeLinecap="round" />
            </>
          )}
        </svg>
      </div>
      <span className="max-w-[58px] text-center text-[9px] font-bold leading-tight text-[#44594E]">
        {meta.label}
      </span>
    </div>
  );
}
