import { useMemo, useState, type FormEvent } from 'react';
import { Check, Eye, EyeOff, Plus, Share2, Trash2 } from 'lucide-react';
import { AISLE_ORDER } from '../lib/constants';
import { formatQuantity, groupGroceriesByAisle } from '../lib/groceryAggregator';
import type { Aisle, CustomGroceryItem, GroceryItem } from '../types/recipe';

interface ShopViewProps {
  items: GroceryItem[];
  checkedGroceries: Record<string, boolean>;
  hidePantryStaples: boolean;
  customItems: CustomGroceryItem[];
  onToggleItem: (key: string) => void;
  onClearChecked: () => void;
  onSetHidePantry: (hide: boolean) => void;
  onAddCustomItem: (name: string, aisle: Aisle) => void;
  onToggleCustomItem: (id: string) => void;
  onRemoveCustomItem: (id: string) => void;
  onOpenShare: () => void;
}

export function ShopView({
  items,
  checkedGroceries,
  hidePantryStaples,
  customItems,
  onToggleItem,
  onClearChecked,
  onSetHidePantry,
  onAddCustomItem,
  onToggleCustomItem,
  onRemoveCustomItem,
  onOpenShare,
}: ShopViewProps) {
  const [customName, setCustomName] = useState('');
  const [customAisle, setCustomAisle] = useState<Aisle>('Produce');

  const pantryCount = useMemo(
    () => items.filter((i) => i.is_pantry_staple).length,
    [items],
  );

  const visibleItems = useMemo(
    () => (hidePantryStaples ? items.filter((i) => !i.is_pantry_staple) : items),
    [items, hidePantryStaples],
  );

  const aisleGroups = useMemo(() => {
    const baseGroups = groupGroceriesByAisle(visibleItems);
    const byAisle = new Map(baseGroups.map((g) => [g.aisle, g.items]));

    return AISLE_ORDER.map((aisle) => {
      const recipeItems = [...(byAisle.get(aisle) ?? [])].sort((a, b) => {
        const aChecked = Boolean(checkedGroceries[a.key]);
        const bChecked = Boolean(checkedGroceries[b.key]);
        if (aChecked !== bChecked) return aChecked ? 1 : -1;
        return a.name.localeCompare(b.name);
      });

      const aisleCustom = customItems
        .filter((c) => c.aisle === aisle)
        .sort((a, b) => Number(a.checked) - Number(b.checked));

      return { aisle, recipeItems, aisleCustom };
    }).filter((g) => g.recipeItems.length > 0 || g.aisleCustom.length > 0);
  }, [visibleItems, customItems, checkedGroceries]);

  const checkedCount =
    visibleItems.filter((i) => checkedGroceries[i.key]).length +
    customItems.filter((c) => c.checked).length;

  const totalCount = visibleItems.length + customItems.length;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    onAddCustomItem(customName, customAisle);
    setCustomName('');
  };

  return (
    <section className="mx-auto max-w-md px-4 pt-4 pb-24">
      <div className="mb-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#1C2420]">
              Grocery List
            </h2>
            <p className="tabular-nums text-xs text-[#5C6862]">
              {totalCount - checkedCount} of {totalCount} items left
            </p>
          </div>

          <button
            type="button"
            data-testid="shop-share-btn"
            onClick={onOpenShare}
            className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#2F6F4E] px-3 text-xs font-semibold text-white shadow-xs hover:bg-[#25593E]"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share with Partner</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="toggle-pantry-btn"
            onClick={() => onSetHidePantry(!hidePantryStaples)}
            className={`inline-flex min-h-[34px] items-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 text-xs font-semibold transition-colors ${
              hidePantryStaples
                ? 'border-[#2F6F4E] bg-[#E8F2EC] text-[#2F6F4E]'
                : 'border-[#E0DAD0] bg-white text-[#5C6862]'
            }`}
          >
            {hidePantryStaples ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            <span>
              {hidePantryStaples ? `Show Pantry (${pantryCount})` : 'Hide Pantry'}
            </span>
          </button>

          {checkedCount > 0 && (
            <button
              type="button"
              onClick={onClearChecked}
              className="min-h-[34px] whitespace-nowrap rounded-xl border border-[#E0DAD0] bg-white px-2.5 text-xs font-semibold text-[#5C6862] hover:bg-[#F2EFE9]"
            >
              Uncheck ({checkedCount})
            </button>
          )}
        </div>
      </div>

      {/* Add custom item form */}
      <form
        onSubmit={handleSubmit}
        className="mb-4 flex items-center gap-1.5 rounded-2xl border border-[#E7E2D8] bg-white p-2 shadow-xs"
      >
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Add custom item (e.g. Bananas)"
          aria-label="Custom grocery item name"
          className="min-h-[40px] min-w-0 flex-1 rounded-xl bg-[#FAF8F5] px-3 text-sm text-[#1C2420] placeholder:text-[#8A948E] focus:outline-2 focus:outline-[#2F6F4E]"
        />
        <select
          value={customAisle}
          onChange={(e) => setCustomAisle(e.target.value as Aisle)}
          aria-label="Custom item aisle"
          className="min-h-[40px] rounded-xl bg-[#FAF8F5] px-2 text-xs font-semibold text-[#5C6862] focus:outline-2 focus:outline-[#2F6F4E]"
        >
          {AISLE_ORDER.map((aisle) => (
            <option key={aisle} value={aisle}>
              {aisle}
            </option>
          ))}
        </select>
        <button
          type="submit"
          aria-label="Add custom item"
          className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl bg-[#2F6F4E] text-white hover:bg-[#25593E]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>

      {/* Aisle groups */}
      <div className="space-y-4">
        {aisleGroups.map(({ aisle, recipeItems, aisleCustom }) => (
          <div
            key={aisle}
            className="overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-[#F2EFE9] bg-[#FAF8F5] px-3.5 py-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C6862]">
                {aisle}
              </h3>
              <span className="tabular-nums text-[11px] font-semibold text-[#8A948E]">
                {recipeItems.length + aisleCustom.length}
              </span>
            </div>

            <ul className="divide-y divide-[#F2EFE9]">
              {recipeItems.map((item) => {
                const checked = Boolean(checkedGroceries[item.key]);
                return (
                  <li key={item.key} data-testid={`grocery-row-${item.canonical_id}`}>
                    <button
                      type="button"
                      onClick={() => onToggleItem(item.key)}
                      aria-pressed={checked}
                      className="flex min-h-[48px] w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[#FAF8F5]"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
                          checked
                            ? 'border-[#2F6F4E] bg-[#2F6F4E] text-white'
                            : 'border-[#C7C0B4] bg-white'
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`truncate text-sm font-semibold ${
                              checked
                                ? 'text-[#8A948E] line-through'
                                : 'text-[#1C2420]'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.is_pantry_staple && (
                            <span className="shrink-0 rounded bg-[#F2EFE9] px-1.5 py-0.5 text-[10px] font-medium text-[#5C6862]">
                              Pantry
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-[#8A948E]">
                          {item.meals.length} {item.meals.length === 1 ? 'meal' : 'meals'}
                        </p>
                      </div>

                      <span
                        data-testid={`grocery-qty-${item.canonical_id}`}
                        className={`tabular-nums shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${
                          checked
                            ? 'bg-[#F2EFE9] text-[#8A948E] line-through'
                            : 'bg-[#E8F2EC] text-[#2F6F4E]'
                        }`}
                      >
                        {formatQuantity(item.quantity, item.unit)}
                      </span>
                    </button>
                  </li>
                );
              })}

              {aisleCustom.map((item) => (
                <li key={item.id} className="flex min-h-[48px] items-center">
                  <button
                    type="button"
                    onClick={() => onToggleCustomItem(item.id)}
                    aria-pressed={item.checked}
                    className="flex min-h-[48px] flex-1 items-center gap-3 px-3.5 py-2.5 text-left hover:bg-[#FAF8F5]"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
                        item.checked
                          ? 'border-[#2F6F4E] bg-[#2F6F4E] text-white'
                          : 'border-[#C7C0B4] bg-white'
                      }`}
                    >
                      {item.checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        item.checked ? 'text-[#8A948E] line-through' : 'text-[#1C2420]'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="rounded bg-[#FDF0EB] px-1.5 py-0.5 text-[10px] font-medium text-[#B84C27]">
                      Custom
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveCustomItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-[#8A948E] hover:bg-[#F2EFE9] hover:text-[#B84C27]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
