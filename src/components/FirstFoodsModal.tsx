import { X } from 'lucide-react';
import { FirstFoodsView, type FirstFoodsViewProps } from './FirstFoodsView';

interface FirstFoodsModalProps extends FirstFoodsViewProps {
  onClose: () => void;
}

export function FirstFoodsModal({ onClose, ...viewProps }: FirstFoodsModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="100 First Foods & Top-9 Allergen Tracker"
      data-testid="first-foods-modal"
      className="fixed inset-0 z-50 flex flex-col bg-[#FAF8F5]"
    >
      <div className="flex items-center justify-between border-b border-[#E7E2D8] bg-white px-4 py-3">
        <span className="text-sm font-extrabold text-[#1C2420]">
          António&apos;s First Foods Tracker
        </span>
        <button
          type="button"
          data-testid="close-first-foods-modal"
          onClick={onClose}
          aria-label="Close First Foods tracker"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2EFE9] text-[#5C6862] hover:text-[#1C2420]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <FirstFoodsView
          {...viewProps}
          onOpenCook={(recipeId) => {
            onClose();
            viewProps.onOpenCook(recipeId);
          }}
        />
      </div>
    </div>
  );
}
