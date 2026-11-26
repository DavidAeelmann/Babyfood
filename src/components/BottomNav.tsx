export type TabKey = 'plan' | 'shop' | 'cook' | 'intro';

interface BottomNavProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  remainingShopCount: number;
}

function PlanIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        aria-hidden="true"
        data-icon-variant="filled"
      >
        <path
          d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Z"
          fill="currentColor"
        />
        <path
          d="M4 9.5h16"
          stroke="#FFFFFF"
          strokeWidth="1.6"
        />
        <rect x="6.5" y="12.5" width="3" height="2.6" rx="0.8" fill="#FFFFFF" />
        <rect x="10.5" y="12.5" width="3" height="2.6" rx="0.8" fill="#FFFFFF" />
        <rect x="14.5" y="12.5" width="3" height="2.6" rx="0.8" fill="#FFFFFF" />
        <rect x="6.5" y="16.4" width="3" height="2.6" rx="0.8" fill="#FFFFFF" />
        <rect x="10.5" y="16.4" width="3" height="2.6" rx="0.8" fill="#FFFFFF" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-icon-variant="outlined"
    >
      <rect x="3" y="4" width="18" height="17" rx="2.5" />
      <path d="M8 2.5v3M16 2.5v3M3 9.5h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" strokeWidth="2.2" />
    </svg>
  );
}

function ShopIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        aria-hidden="true"
        data-icon-variant="filled"
      >
        <path
          d="M9.4 4.2a1 1 0 0 1 .3 1.38L7.6 9h8.8l-2.1-3.42a1 1 0 1 1 1.7-1.05L18.75 9H20.5a1.5 1.5 0 0 1 1.46 1.85l-1.7 7.25A3 3 0 0 1 17.34 20.5H6.66a3 3 0 0 1-2.92-2.4l-1.7-7.25A1.5 1.5 0 0 1 3.5 9h1.75L8 4.53a1 1 0 0 1 1.4-.33Z"
          fill="currentColor"
        />
        <path
          d="M9 13.2v3.6M12 13.2v3.6M15 13.2v3.6"
          stroke="#FFFFFF"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-icon-variant="outlined"
    >
      <path d="M5 10h14l-1.5 8.2A2.2 2.2 0 0 1 15.3 20H8.7a2.2 2.2 0 0 1-2.2-1.8L5 10Z" />
      <path d="M3 10h18M9 5l-3 5M15 5l3 5" />
      <path d="M10 13.5v3M14 13.5v3" />
    </svg>
  );
}

function CookIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        aria-hidden="true"
        data-icon-variant="filled"
      >
        <path
          d="M12 3a4.6 4.6 0 0 0-4.2 2.75A3.8 3.8 0 0 0 3 9.45c0 1.85 1.32 3.4 3.07 3.74V19a2 2 0 0 0 2 2h7.86a2 2 0 0 0 2-2v-5.81A3.8 3.8 0 0 0 21 9.45a3.8 3.8 0 0 0-4.8-3.7A4.6 4.6 0 0 0 12 3Z"
          fill="currentColor"
        />
        <path
          d="M7.5 16.2h9"
          stroke="#FFFFFF"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-icon-variant="outlined"
    >
      <path d="M6.5 13.1A3.5 3.5 0 0 1 7.6 6.2a4.3 4.3 0 0 1 8.8 0 3.5 3.5 0 0 1 1.1 6.9V19a1.8 1.8 0 0 1-1.8 1.8H8.3A1.8 1.8 0 0 1 6.5 19v-5.9Z" />
      <path d="M7 16.2h10" />
    </svg>
  );
}

function IntroIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        aria-hidden="true"
        data-icon-variant="filled"
      >
        <path
          d="M12 10.5C12 6.8 15.1 4 19.5 4c0 4.4-2.8 7.5-6.5 7.5H12v-1Z"
          fill="currentColor"
        />
        <path
          d="M12 12.5C12 9 9.1 6.4 4.8 6.4c0 4.2 2.7 7.1 6.2 7.1H12v-1Z"
          fill="currentColor"
        />
        <path
          d="M12 10v10M7.5 20h9"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-icon-variant="outlined"
    >
      <path d="M12 20V10" />
      <path d="M7 20h10" />
      <path d="M12 11c0-4 3-7 8-7 0 4.5-3 7.5-8 7Z" />
      <path d="M12 13c0-3.5-2.7-6.2-7.2-6.2 0 4 2.7 6.7 7.2 6.2Z" />
    </svg>
  );
}

export function BottomNav({
  activeTab,
  onSelectTab,
  remainingShopCount,
}: BottomNavProps) {
  const tabs: Array<{
    key: TabKey;
    label: string;
    renderIcon: (active: boolean) => React.ReactNode;
    badge?: number;
  }> = [
    {
      key: 'plan',
      label: 'Ementa',
      renderIcon: (active) => <PlanIcon active={active} />,
    },
    {
      key: 'shop',
      label: 'Compras',
      renderIcon: (active) => <ShopIcon active={active} />,
      badge: remainingShopCount > 0 ? remainingShopCount : undefined,
    },
    {
      key: 'cook',
      label: 'Cozinhar',
      renderIcon: (active) => <CookIcon active={active} />,
    },
    {
      key: 'intro',
      label: 'Alimentos',
      renderIcon: (active) => <IntroIcon active={active} />,
    },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(28,36,32,0.06)] backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map(({ key, label, renderIcon, badge }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              data-testid={`tab-${key}`}
              onClick={() => onSelectTab(key)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                active
                  ? 'font-bold text-[#2F6F4E]'
                  : 'font-medium text-[#5C6862] hover:text-[#1C2420]'
              }`}
            >
              <div className="relative">
                {renderIcon(active)}
                {badge !== undefined && (
                  <span
                    data-testid={`nav-badge-${key}`}
                    className="tabular-nums absolute -top-1.5 -right-3 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#D96B43] px-1 text-[10px] font-bold text-white"
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
