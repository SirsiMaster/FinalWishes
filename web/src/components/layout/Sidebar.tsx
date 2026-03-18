import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "@tanstack/react-router";

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  section: string;
  badge?: string;
  to: string;
}

const getNavItems = (estateId: string): NavItem[] => [
  // MAIN
  {
    id: "dashboard",
    label: "Dashboard",
    section: "MAIN",
    to: `/estates/${estateId}/dashboard`,
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
    to: `/estates/${estateId}/estates`,
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
    to: `/estates/${estateId}/assets`,
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
    to: `/estates/${estateId}/memoirs`,
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
    to: `/estates/${estateId}/vault`,
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
    to: `/estates/${estateId}/obituary`,
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
    to: `/estates/${estateId}/beneficiaries`,
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
    to: `/estates/${estateId}/notifications`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    section: "MANAGEMENT",
    to: `/estates/${estateId}/settings`,
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
  const params = useParams({ strict: false }) as any;
  const estateId = params.estateId || "lockhart";
  
  const [user, setUser] = useState<any>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

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

  const navItems = getNavItems(estateId);

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
      className="fixed left-0 top-0 h-screen overflow-y-auto z-[100] flex flex-col shadow-2xl"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border-light)",
      }}
    >
      {/* Photo Modal */}
      {showPhotoModal && user?.profilePhotoUrl && (
        <div 
          className="fixed inset-0 z-[500] flex items-center justify-center bg-navy/20 backdrop-blur-xl p-8 animate-in fade-in duration-500 pointer-events-auto"
          onClick={() => setShowPhotoModal(false)}
        >
          <div 
            className="relative bg-black rounded-[3rem] overflow-hidden border-4 border-gold shadow-2xl animate-in zoom-in duration-500 max-w-[90vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={user.profilePhotoUrl} 
              className="max-w-full max-h-[80vh] object-contain block mx-auto" 
              alt="Full Fidelity Portrait" 
            />
            <div className="absolute top-8 right-8">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowPhotoModal(false); }}
                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-2xl"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-10 bg-white border-t border-border-light">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-navy uppercase tracking-wider mb-2">Heritage Shard Portrait</h3>
                  <p className="text-gold font-black text-xs uppercase tracking-[0.2em]">{user?.name || "Tameeka Lockhart"} · Identity Verification Shard</p>
                </div>
                <div className="px-5 py-2 bg-gold text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">4K Protocol</div>
              </div>
            </div>
          </div>
        </div>
      )}
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
              <div className="text-gold/40 text-[9px] font-black uppercase tracking-widest mt-0.5">Focus: {estateId}</div>
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
              const isActive = location.pathname === item.to || (item.to === `/estates/${estateId}/dashboard` && location.pathname.endsWith('/dashboard'));
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`flex items-center gap-3 px-5 py-3 text-[0.85rem] cursor-pointer transition-all duration-300 border-l-[4px] no-underline ${
                    isActive
                      ? "text-gold bg-white/5 border-l-gold font-bold"
                      : "text-white/40 border-l-transparent hover:text-white hover:bg-white/[0.05]"
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
        className="flex items-center gap-3 p-5 mt-auto bg-black/10 border-t border-white/5"
      >
        {user?.profilePhotoUrl ? (
          <img 
            src={user.profilePhotoUrl} 
            onClick={() => setShowPhotoModal(true)}
            className="w-10 h-10 rounded-xl object-cover border-2 border-gold/40 shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all" 
            alt="Profile" 
          />
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
