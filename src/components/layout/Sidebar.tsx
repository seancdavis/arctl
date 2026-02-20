import { useState, type JSX } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { COPY } from "../../copy";

interface NavItem {
  path: string;
  label: string;
  icon: JSX.Element;
}

const navItems: NavItem[] = [
  {
    path: "/",
    label: COPY.nav.board,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
        />
      </svg>
    ),
  },
  {
    path: "/archive",
    label: COPY.nav.archive,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
  },
  {
    path: "/api-keys",
    label: COPY.nav.keys,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        />
      </svg>
    ),
  },
  {
    path: "/settings",
    label: COPY.nav.settings,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

function Tooltip({ label, visible }: { label: string; visible: boolean }) {
  return (
    <span
      className={`absolute left-full ml-3 px-2.5 py-1 text-xs font-mono font-medium whitespace-nowrap
        bg-[var(--surface-4)] text-[var(--text-primary)] border border-[var(--border)]
        shadow-lg shadow-black/40
        pointer-events-none transition-all duration-150
        ${visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1"}`}
    >
      {label}
    </span>
  );
}

function NavButton({
  item,
  isActive,
  expanded,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  expanded: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex items-center gap-3 transition-colors
        ${expanded ? "w-full px-3 h-10" : "w-10 h-10 justify-center"}
        ${
          isActive
            ? "bg-[var(--surface-3)] text-[var(--accent-blue)]"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
        }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[var(--accent-blue)] shadow-[0_0_8px_var(--accent-blue-glow)]" />
      )}
      {item.icon}
      {expanded && (
        <span className="text-sm font-mono font-medium truncate">{item.label}</span>
      )}
      {!expanded && <Tooltip label={item.label} visible={hovered} />}
    </button>
  );
}

/* Toggle button — hamburger when collapsed, X-close when expanded */
function ToggleButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex items-center gap-3 transition-colors h-10
        text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]
        ${expanded ? "w-full px-3" : "w-10 justify-center"}`}
    >
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {expanded ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
      {expanded && (
        <span className="text-sm font-mono font-medium">{COPY.nav.collapse}</span>
      )}
      {!expanded && <Tooltip label={COPY.nav.expand} visible={hovered} />}
    </button>
  );
}

/* ── Desktop sidebar ── */
function DesktopSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState(
    () => localStorage.getItem("sidebarExpanded") === "true"
  );

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarExpanded", String(next));
      return next;
    });
  };

  return (
    <aside
      className={`hidden md:flex shrink-0 flex-col bg-[var(--surface-1)] border-r border-[var(--border)] transition-[width] duration-200 ease-in-out
        ${expanded ? "w-[var(--sidebar-width-expanded)]" : "w-[var(--sidebar-width-collapsed)]"}`}
    >
      {/* Expand / collapse toggle at top */}
      <div className={`pt-3 pb-1 ${expanded ? "px-3" : "flex justify-center"}`}>
        <ToggleButton expanded={expanded} onClick={toggleExpanded} />
      </div>

      {/* Nav items */}
      <nav className={`flex flex-col gap-1 ${expanded ? "px-3" : "items-center"}`}>
        {navItems.map((item) => (
          <NavButton
            key={item.path}
            item={item}
            isActive={pathname === item.path}
            expanded={expanded}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>
    </aside>
  );
}

/* ── Mobile bottom nav ── */
function MobileBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--surface-1)] border-t border-[var(--border)] flex items-center justify-around h-14 safe-bottom">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors
              ${isActive ? "text-[var(--accent-blue)]" : "text-[var(--text-tertiary)]"}`}
          >
            {item.icon}
            <span className="text-[10px] font-mono font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ── Public export ── */
export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileBottomNav />
    </>
  );
}
