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

const getNavItems = (): NavItem[] => [
  // MAIN
  {
    id: "dashboard",
    label: "Dashboard",
    section: "OVERVIEW",
    to: `/dashboard`,
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
    label: "My Estates",
    section: "OVERVIEW",
    to: `/dashboard/estates`,
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
    section: "OVERVIEW",
    to: `/dashboard/assets`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: "memoirs",
    label: "Memories",
    section: "OVERVIEW",
    to: `/dashboard/memoirs`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    id: "obituary",
    label: "Final Record",
    section: "MANAGE",
    to: `/dashboard/obituary`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: "vault",
    label: "Documents",
    section: "MANAGE",
    to: `/dashboard/vault`,
    badge: "SOC 2",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    id: "beneficiaries",
    label: "Beneficiaries",
    section: "MANAGE",
    to: `/dashboard/beneficiaries`,
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
    section: "MANAGE",
    to: `/dashboard/notifications`,
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
    section: "MANAGE",
    to: `/dashboard/settings`,
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

  const navItems = getNavItems();

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
        background: "var(--sidebar-bg)",
        borderRight: "1px solid #E2E8F0",
      }}
    >
      {/* Photo Modal */}
      {showPhotoModal && user?.profilePhotoUrl && (
        <div 
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/20 backdrop-blur-xl p-8 animate-in fade-in duration-500 pointer-events-auto"
          onClick={() => setShowPhotoModal(false)}
        >
          <div 
            className="relative bg-white overflow-hidden border border-[#E2E8F0] shadow-2xl animate-in zoom-in duration-500 max-w-[90vw] max-h-[90vh] flex flex-col"
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
                className="w-10 h-10 bg-white border border-[#E2E8F0] flex items-center justify-center text-[#0F172A] hover:bg-[#F1F5F9] transition-all shadow-lg"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-8 bg-white border-t border-[#E2E8F0]">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-2xl font-bold text-[#0F172A] uppercase tracking-wider mb-2">{user?.name || "Tameeka Lockhart"}</h3>
                  <p className="text-royal font-bold text-xs uppercase tracking-[0.2em]">Identity Verification Shard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-3 px-5 py-5 no-underline"
        style={{ borderBottom: "1px solid #E2E8F0" }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-6 h-6 text-royal"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span className="text-[#0F172A] text-[1rem] font-bold uppercase tracking-[0.15em]">
          FinalWishes
        </span>
      </Link>

      {/* Estate Switcher */}
      <div className="px-4 py-5 border-b border-[#E2E8F0]">
        <label className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] mb-2 block">Governance Domain</label>
        <div className="relative">
          <button className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all text-left overflow-hidden">
            <div className="flex-1 truncate">
              <div className="text-[#0F172A] text-[0.8rem] font-bold truncate uppercase tracking-tight">{user?.primaryEstateName || "Lockhart Estate"}</div>
              <div className="text-[#94A3B8] text-[9px] font-bold uppercase tracking-widest mt-0.5">Focus: {estateId}</div>
            </div>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#94A3B8] shrink-0"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="mb-6">
            <div className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] px-5 py-2">
              {section}
            </div>
            {items.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`flex items-center gap-3 px-5 py-2.5 text-[0.8rem] cursor-pointer transition-all border-l-[3px] no-underline ${
                    isActive
                      ? "text-royal bg-royal/5 border-l-royal font-bold"
                      : "text-[#64748B] border-l-transparent hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <span
                    className={`w-[16px] h-[16px] shrink-0 ${
                      isActive ? "opacity-100 text-royal" : "opacity-40"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="uppercase tracking-widest text-[0.65rem] font-bold">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-royal/10 border border-royal/20 text-royal px-1.5 py-0.5 text-[8px] font-bold tracking-tighter">
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
        className="flex items-center gap-3 p-4 mt-auto border-t border-[#E2E8F0]"
      >
        {user?.profilePhotoUrl ? (
          <img 
            src={user.profilePhotoUrl} 
            onClick={() => setShowPhotoModal(true)}
            className="w-9 h-9 object-cover border border-[#E2E8F0] shadow-sm cursor-pointer hover:opacity-80 transition-all" 
            alt="Profile" 
          />
        ) : (
          <div className="w-9 h-9 bg-royal flex items-center justify-center text-white font-bold text-xs shrink-0">
            {getInitials(user?.name || 'TL')}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[#0F172A] text-[0.8rem] font-bold uppercase tracking-tight truncate">{user?.name || "Tameeka Lockhart"}</div>
          <div className="text-[#94A3B8] text-[9px] font-bold uppercase tracking-widest">Owner</div>
        </div>
      </div>
    </aside>
  );
}
