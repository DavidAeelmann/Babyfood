import { CalendarDays, ChefHat, ShoppingBasket, Sprout } from 'lucide-react';

export type TabKey = 'plan' | 'shop' | 'cook' | 'intro';

interface BottomNavProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  remainingShopCount: number;
  untriedInPlanCount?: number;
}

export function BottomNav({
  activeTab,
  onSelectTab,
  remainingShopCount,
  untriedInPlanCount = 0,
}: BottomNavProps) {
  const tabs: Array<{
    key: TabKey;
    label: string;
    icon: typeof CalendarDays;
    badge?: number;
    badgeTone?: 'terracotta' | 'sage';
  }> = [
    { key: 'plan', label: 'Plan', icon: CalendarDays },
    {
      key: 'shop',
      label: 'Shop',
      icon: ShoppingBasket,
      badge: remainingShopCount > 0 ? remainingShopCount : undefined,
      badgeTone: 'terracotta',
    },
    { key: 'cook', label: 'Cook', icon: ChefHat },
    {
      key: 'intro',
      label: 'First Foods',
      icon: Sprout,
      badge: untriedInPlanCount > 0 ? untriedInPlanCount : undefined,
      badgeTone: 'sage',
    },
  ];

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E7E2D8] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map(({ key, label, icon: Icon, badge, badgeTone }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              data-testid={`tab-${key}`}
              onClick={() => onSelectTab(key)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                active ? 'text-[#2F6F4E]' : 'text-[#5C6862] hover:text-[#1C2420]'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
                {badge !== undefined && (
                  <span
                    className={`tabular-nums absolute -top-1.5 -right-3 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                      badgeTone === 'sage' ? 'bg-[#2F6F4E]' : 'bg-[#D96B43]'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </div>
              <span>{label}</span>
              {active && (
                <span className="absolute top-0 h-0.5 w-10 rounded-full bg-[#2F6F4E]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
