import { type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  section: string;
  badge?: string;
  to: string;
}

const navItems: NavItem[] = [
  // MAIN
  {
    id: "dashboard",
    label: "Dashboard",
    section: "MAIN",
    to: "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "estates",
    label: "Estates",
    section: "MAIN",
    to: "/dashboard/estates",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "assets",
    label: "Assets",
    section: "MAIN",
    to: "/dashboard/assets",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: "memoirs",
    label: "Memoirs & Legacy",
    section: "MAIN",
    to: "/dashboard/memoirs",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  // MANAGEMENT
  {
    id: "vault",
    label: "Document Vault",
    section: "MANAGEMENT",
    to: "/dashboard/vault",
    badge: "3 NEW",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    id: "obituary",
    label: "The Final Record",
    section: "MANAGEMENT",
    to: "/dashboard/obituary",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: "beneficiaries",
    label: "Beneficiaries",
    section: "MANAGEMENT",
    to: "/dashboard/beneficiaries",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    section: "MANAGEMENT",
    to: "/dashboard/notifications",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  // SYSTEM
  {
    id: "settings",
    label: "Settings",
    section: "SYSTEM",
    to: "/dashboard/settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const location = useLocation();

  // Group by section
  const sections = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <aside
      className="fixed left-0 top-0 h-screen overflow-y-auto z-[100] flex flex-col"
      style={{
        width: "var(--sidebar-width)",
        background: "#1e3a5f",
        borderRight: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-3 px-4 py-6 no-underline"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-6 h-6 text-gold"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span className="text-white font-[family-name:var(--font-cinzel)] text-[1.15rem] font-semibold uppercase tracking-[0.08em]">
          FinalWishes
        </span>
      </Link>

      {/* Estate Switcher */}
      <div className="px-4 py-6 border-b border-white/5 bg-black/10">
        <label className="text-[0.6rem] font-bold text-gold opacity-60 uppercase tracking-widest mb-2 block">Current Estate Protocol</label>
        <div className="relative group">
          <button className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-left overflow-hidden">
            <div className="flex-1 truncate">
              <div className="text-white text-xs font-bold truncate">The Collymore Portfolio</div>
              <div className="text-white/40 text-[10px] uppercase font-bold tracking-tighter">Owner Authority</div>
            </div>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-gold shrink-0 opacity-50"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
          {/* Dropdown would go here - for demo it's a fixed button with hover state */}
          <div className="absolute top-full left-0 w-full mt-2 bg-navy border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all transform translate-y-2 group-hover:translate-y-0 z-50 p-1">
            <button className="w-full text-left p-2.5 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gold"></div>
              <div>
                <div className="text-white text-[11px] font-bold">The Dynasty Trust</div>
                <div className="text-white/30 text-[9px] uppercase font-bold tracking-tighter">Executor Access</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <div className="text-white/40 text-[0.7rem] font-semibold uppercase tracking-[0.15em] px-4 pt-6 pb-2">
              {section}
            </div>
            {items.map((item) => {
              const isActive = location.pathname === item.to || (item.to === '/dashboard' && location.pathname === '/dashboard/');
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-2.5 text-[0.9rem] cursor-pointer transition-all duration-200 border-l-[3px] no-underline ${
                    isActive
                      ? "text-gold bg-black/20 border-l-gold font-semibold"
                      : "text-white/75 border-l-transparent hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  <span
                    className={`w-[18px] h-[18px] shrink-0 ${
                      isActive ? "opacity-100 text-gold" : "opacity-70"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-gold text-black px-1.5 py-0.5 rounded text-[9px] font-bold tracking-[0.05em]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div
        className="flex items-center gap-3 p-4 mt-auto"
        style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-gold-bright flex items-center justify-center text-black font-bold text-xs shrink-0">
          CC
        </div>
        <div>
          <div className="text-white text-sm font-medium">Cylton C.</div>
          <div className="text-white/50 text-[0.625rem]">Principal</div>
        </div>
      </div>
    </aside>
  );
}
