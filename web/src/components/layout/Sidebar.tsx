import { type ReactNode, useEffect, useState } from "react";
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
    label: "Governance",
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
    label: "Asset Inventory",
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
    label: "Legacy Tapes",
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
    label: "Evidence Vault",
    section: "MANAGEMENT",
    to: "/dashboard/vault",
    badge: "SOC 2",
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
    label: "Heirs Registry",
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
    label: "Protocol Ledger",
    section: "MANAGEMENT",
    to: "/dashboard/notifications",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      setUser(JSON.parse(session));
    } else {
      setUser({
        name: 'Tameeka Lockhart',
        profilePhotoUrl: '/assets/tameeka/mom dance.jpg',
        primaryEstateName: 'Lockhart Estate'
      });
    }
  }, []);

  // Group by section
  const sections = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('') || 'TL';
  };

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
        <span className="text-white font-[family-name:var(--font-cinzel)] text-[1.15rem] font-black uppercase tracking-[0.1em]">
          FinalWishes
        </span>
      </Link>

      {/* Estate Switcher */}
      <div className="px-4 py-8 border-b border-white/5 bg-black/10">
        <label className="text-[0.6rem] font-black text-gold opacity-60 uppercase tracking-[0.2em] mb-3 block">Governance Domain</label>
        <div className="relative group">
          <button className="w-full flex items-center justify-between gap-2 px-3.5 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left overflow-hidden shadow-inner">
            <div className="flex-1 truncate">
              <div className="text-white text-[0.8rem] font-black truncate uppercase tracking-tight">{user?.primaryEstateName || "Lockhart Estate"}</div>
              <div className="text-gold/40 text-[9px] font-black uppercase tracking-widest mt-0.5">Focus: {user?.primaryEstateName || "Lockhart Estate"}</div>
            </div>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-gold shrink-0 opacity-40"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="mb-6">
            <div className="text-white/30 text-[0.6rem] font-black italic uppercase tracking-[0.25em] px-5 py-2">
              {section}
            </div>
            {items.map((item) => {
              const isActive = location.pathname === item.to || (item.to === '/dashboard' && location.pathname === '/dashboard/');
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`flex items-center gap-3 px-5 py-3 text-[0.85rem] cursor-pointer transition-all duration-300 border-l-[4px] no-underline ${
                    isActive
                      ? "text-gold bg-gradient-to-r from-black/30 to-transparent border-l-gold font-bold"
                      : "text-white/60 border-l-transparent hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <span
                    className={`w-[16px] h-[16px] shrink-0 ${
                      isActive ? "opacity-100 text-gold" : "opacity-40"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="uppercase tracking-widest text-[0.7rem] font-bold">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-royal-bright/20 border border-royal-bright/40 text-royal-bright px-1.5 py-0.5 rounded text-[8px] font-black tracking-tighter shadow-sm">
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
        className="flex items-center gap-3 p-5 mt-auto bg-black/20"
        style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}
      >
        {user?.profilePhotoUrl ? (
          <img src={user.profilePhotoUrl} className="w-10 h-10 rounded-xl object-cover border-2 border-gold/40 shadow-lg" alt="Profile" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-bright flex items-center justify-center text-black font-black text-xs shrink-0 shadow-lg">
            {getInitials(user?.name || 'TL')}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-white text-[0.85rem] font-black uppercase tracking-tight truncate">{user?.name || "Tameeka Lockhart"}</div>
          <div className="text-gold/50 text-[0.6rem] font-black uppercase tracking-widest">Owner of FinalWishes</div>
        </div>
      </div>
    </aside>
  );
}
