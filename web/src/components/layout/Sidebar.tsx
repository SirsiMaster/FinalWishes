import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "@tanstack/react-router";

/* ─── Role-Based Permission Matrix ─── */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner:       ['dashboard', 'estates', 'assets', 'memoirs', 'obituary', 'vault', 'beneficiaries', 'notifications', 'settings'],
  admin:       ['dashboard', 'estates', 'assets', 'memoirs', 'obituary', 'vault', 'beneficiaries', 'notifications', 'settings'],
  beneficiary: ['dashboard', 'assets', 'memoirs', 'obituary', 'notifications'],
  executor:    ['dashboard', 'assets', 'beneficiaries', 'obituary', 'vault', 'notifications'],
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Estate Owner',
  admin: 'Administrator',
  beneficiary: 'Beneficiary',
  executor: 'Legal Executor',
};

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  section: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    section: "OVERVIEW",
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
  const navigate = useNavigate();
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
        role: 'owner',
        profilePhotoUrl: '/assets/tameeka/mom dance.jpg',
        primaryEstateName: 'Lockhart Estate'
      });
    }
  }, []);

  const userRole = user?.role || 'owner';
  const allowedIds = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.owner;

  // Filter nav items by role
  const visibleItems = NAV_ITEMS.filter((item) => allowedIds.includes(item.id));

  // Group by section
  const sections = visibleItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('') || 'TL';
  };

  const handleLogout = () => {
    localStorage.removeItem('finalwishes_user');
    navigate({ to: '/login' });
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen overflow-y-auto z-[100] flex flex-col"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--sidebar-bg)",
        borderRight: "1px solid rgba(19, 51, 120, 0.1)",
      }}
    >
      {/* Photo Modal */}
      {showPhotoModal && user?.profilePhotoUrl && (
        <div 
          className="fixed inset-0 z-[500] flex items-center justify-center bg-[#133378]/10 backdrop-blur-xl p-8 animate-in fade-in duration-500 pointer-events-auto"
          onClick={() => setShowPhotoModal(false)}
        >
          <div 
            className="relative bg-white overflow-hidden border border-[#133378]/20 shadow-2xl animate-in zoom-in duration-500 max-w-[90vw] max-h-[90vh] flex flex-col"
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
                className="w-10 h-10 bg-white border border-[#133378]/20 flex items-center justify-center text-[#133378] hover:bg-[#133378]/5 transition-all shadow-lg rounded-xl"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-3 px-5 py-6 no-underline"
        style={{ borderBottom: "1px solid rgba(19, 51, 120, 0.1)" }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="w-6 h-6 text-[#133378] drop-shadow-sm"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span className="text-[#133378] text-[1rem] font-bold uppercase tracking-[0.15em] font-[family-name:var(--font-cinzel)]">
          FinalWishes
        </span>
      </Link>

      {/* Estate Switcher */}
      <div className="px-4 py-5 border-b border-[#133378]/10 bg-[#133378]/[0.01]">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Active Estate</label>
        <div className="relative">
          <button className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-slate-200 hover:border-[#133378]/30 rounded-xl transition-all text-left overflow-hidden group">
            <div className="flex-1 truncate">
              <div className="text-[#0F172A] text-[0.8rem] font-bold truncate group-hover:text-[#133378] transition-colors">{user?.primaryEstateName || "Lockhart Estate"}</div>
              <div className="text-slate-400 text-[10px] font-medium mt-0.5">{ROLE_LABELS[userRole] || 'Member'}</div>
            </div>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-300 group-hover:text-[#133378] transition-all"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.5"/></svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="mb-6">
            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] px-5 py-2">
              {section}
            </div>
            {items.map((item) => {
              const to = item.id === 'dashboard'
                ? `/estates/${estateId}/dashboard`
                : `/estates/${estateId}/${item.id}`;
              const isActive = location.pathname.includes(`/${item.id}`);
              return (
                <Link
                  key={item.id}
                  to={to}
                  className={`flex items-center gap-3 px-5 py-2.5 text-[0.8rem] cursor-pointer transition-all border-l-[3px] no-underline ${
                    isActive
                      ? "text-[#133378] bg-[#133378]/5 border-l-[#133378] font-bold"
                      : "text-slate-400 border-l-transparent hover:text-[#0F172A] hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`w-[16px] h-[16px] shrink-0 transition-opacity ${
                      isActive ? "opacity-100 text-[#133378]" : "opacity-40"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-[0.75rem] font-semibold">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-green-50 border border-green-200 text-green-600 px-1.5 py-0.5 text-[8px] font-bold tracking-tight rounded">
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
      <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-3">
          {user?.profilePhotoUrl ? (
            <img 
              src={user.profilePhotoUrl} 
              onClick={() => setShowPhotoModal(true)}
              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-sm cursor-pointer hover:border-[#133378] transition-all" 
              alt="Profile" 
            />
          ) : (
            <div className="w-9 h-9 bg-[#133378] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm rounded-xl">
              {getInitials(user?.name || 'TL')}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[#0F172A] text-[0.8rem] font-bold truncate">{user?.name || "Tameeka Lockhart"}</div>
            <div className="text-slate-400 text-[10px] font-medium">{ROLE_LABELS[userRole] || 'Member'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all text-[11px] font-semibold"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
