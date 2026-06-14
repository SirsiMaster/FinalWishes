import { type ReactNode, useState, useMemo } from "react";
import { Link, useLocation, useParams, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../../lib/auth";
import { useUserEstates, useEstate, type EstateUser } from "../../lib/firestore";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "radix-ui";
import {
  canAccess,
  personaLabel,
  type PersonaRole,
  type SectionId,
} from "../../lib/persona";
import {
  Mic,
  Sparkles,
  Camera,
  PenLine,
  Users,
  Shield,
  Scale,
  ChevronRight,
  Bell,
  Star,
  Settings,
  Landmark,
  Check,
} from "lucide-react";

/* ─── Navigation Group Types ─── */
interface NavChild {
  label: string;
  id: string;
  route: string;
  badge?: string;
}

interface NavGroup {
  label: string;
  icon: ReactNode;
  id: string;
  route: string;
  description?: string;
  badge?: string;
  children?: NavChild[];
}

interface UtilityItem {
  label: string;
  icon: ReactNode;
  id: string;
  route: string;
}

const UTILITY_ITEMS: UtilityItem[] = [
  { label: 'Notifications', icon: <Bell className="w-full h-full" />, id: 'notifications', route: 'notifications' },
  { label: 'Upgrade Plan', icon: <Star className="w-full h-full" />, id: 'pricing', route: 'pricing' },
  { label: 'Settings', icon: <Settings className="w-full h-full" />, id: 'settings', route: 'settings' },
];

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Soul Log',
    icon: <Mic className="w-full h-full" />,
    id: 'soul-log',
    route: 'soul-log',
    description: 'Your diary — thoughts, feelings, experiences',
    badge: 'New',
  },
  {
    label: 'My Legacy',
    icon: <Sparkles className="w-full h-full" />,
    id: 'dashboard',
    route: 'dashboard',
    description: 'Your life story',
    children: [
      { label: 'Legacy Timeline', id: 'dashboard', route: 'dashboard' },
      { label: 'Life Chapters', id: 'life-chapters', route: 'life-chapters', badge: 'New' },
    ],
  },
  {
    label: 'Memories',
    icon: <Camera className="w-full h-full" />,
    id: 'memories',
    route: 'memoirs',
    children: [
      { label: 'Photos & Videos', id: 'memoirs', route: 'memoirs' },
      { label: 'Heirlooms', id: 'heirlooms', route: 'heirlooms' },
    ],
  },
  {
    label: 'Letters',
    icon: <PenLine className="w-full h-full" />,
    id: 'letters',
    route: 'directives',
    children: [
      { label: 'Directives', id: 'directives', route: 'directives' },
      { label: 'Time Capsules', id: 'timecapsule', route: 'timecapsule' },
      { label: 'Final Record', id: 'obituary', route: 'obituary' },
      { label: 'Events', id: 'events', route: 'events' },
    ],
  },
  {
    label: 'My People',
    icon: <Users className="w-full h-full" />,
    id: 'people',
    route: 'beneficiaries',
    description: 'Beneficiaries, executors, advisors',
  },
  {
    label: 'The Vault',
    icon: <Shield className="w-full h-full" />,
    id: 'vault-group',
    route: 'vault',
    children: [
      { label: 'Documents', id: 'vault', route: 'vault', badge: 'SOC 2' },
      { label: 'Assets', id: 'assets', route: 'assets' },
      { label: 'Lockbox', id: 'lockbox', route: 'lockbox', badge: 'KMS' },
    ],
  },
  {
    label: 'Estate Settlement',
    icon: <Scale className="w-full h-full" />,
    id: 'probate',
    route: 'probate',
    description: 'Illinois probate & deadlines',
  },
];

/** Check if a route segment is active in the current path */
function isRouteActive(pathname: string, route: string): boolean {
  return pathname.includes(`/${route}`);
}

/** Check if any child of a group (or the group itself) is active */
function isGroupActive(pathname: string, group: NavGroup): boolean {
  if (group.children) {
    return group.children.some((child) => isRouteActive(pathname, child.route));
  }
  return isRouteActive(pathname, group.route);
}

/** Filter nav groups by persona permissions — hide groups with no visible children */
function filterGroupsByRole(groups: NavGroup[], role: PersonaRole): NavGroup[] {
  return groups
    .map((group) => {
      if (!group.children) {
        // Soul Log -> 'soul-log', My People -> 'beneficiaries', My Legacy -> 'dashboard'
        const checkId = group.id === 'people' ? 'beneficiaries' : group.id;
        if (!canAccess(role, checkId as SectionId)) return null;
        return group;
      }
      const visibleChildren = group.children.filter((child) => canAccess(role, child.id as SectionId));
      if (visibleChildren.length === 0) return null;
      return { ...group, children: visibleChildren, route: visibleChildren[0].route };
    })
    .filter(Boolean) as NavGroup[];
}

function filterUtilityByRole(items: UtilityItem[], role: PersonaRole): UtilityItem[] {
  return items.filter((item) => canAccess(role, item.id as SectionId));
}

/* ─── Shared Nav Content ─── */
function SidebarNavContent({
  groups,
  utilityItems,
  estateId,
  location,
  onNavClick,
}: {
  groups: NavGroup[];
  utilityItems: UtilityItem[];
  estateId: string;
  location: { pathname: string };
  onNavClick?: () => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of groups) {
      if (group.children && isGroupActive(location.pathname, group)) {
        initial[group.id] = true;
      }
    }
    return initial;
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <nav className="py-4">
      {/* Main nav groups */}
      <div className="mb-4">
        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.2em] px-5 py-2">
          Your Legacy
        </div>
        {groups.map((group) => {
          const hasChildren = group.children && group.children.length > 0;
          const groupActive = isGroupActive(location.pathname, group);
          const isExpanded = expandedGroups[group.id] || groupActive;

          if (hasChildren) {
            return (
              <div key={group.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-[0.8rem] cursor-pointer transition-all border-l-[3px] ${
                    groupActive
                      ? "text-[var(--royal)] bg-[var(--royal)]/5 border-l-[var(--royal)] font-bold"
                      : "text-[var(--ink-muted)] border-l-transparent hover:text-[var(--royal)] hover:bg-[var(--neutral-faint)]"
                  }`}
                >
                  <span
                    className={`w-[16px] h-[16px] shrink-0 transition-opacity ${
                      groupActive ? "opacity-100 text-[var(--royal)]" : "opacity-40"
                    }`}
                  >
                    {group.icon}
                  </span>
                  <span className="text-[0.75rem] font-semibold flex-1 text-left">{group.label}</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isExpanded ? "rotate-90" : ""
                    } ${groupActive ? "text-[var(--royal)]" : "text-ink-muted"}`}
                  />
                </button>
                {isExpanded && (
                  <div className="ml-4">
                    {group.children!.map((child) => {
                      const childTo = `/estates/${estateId}/${child.route}`;
                      const childActive = isRouteActive(location.pathname, child.route);
                      return (
                        <Link
                          key={child.id}
                          to={childTo}
                          onClick={onNavClick}
                          className={`flex items-center gap-3 pl-7 pr-5 py-2 text-[0.73rem] cursor-pointer transition-all border-l-[3px] no-underline ${
                            childActive
                              ? "text-[var(--royal)] bg-[var(--royal)]/5 border-l-[var(--royal)] font-bold"
                              : "text-[var(--ink-muted)] border-l-transparent hover:text-[var(--royal)] hover:bg-[var(--neutral-faint)]"
                          }`}
                        >
                          <span className="text-[0.73rem] font-medium">{child.label}</span>
                          {child.badge && (
                            <Badge
                              variant="outline"
                              className="ml-auto bg-green-50 border-green-200 text-green-600 px-1.5 py-0.5 text-[8px] font-bold tracking-tight h-auto rounded"
                            >
                              {child.badge}
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Simple nav item — navigates directly
          const to = group.id === 'dashboard'
            ? `/estates/${estateId}/dashboard`
            : `/estates/${estateId}/${group.route}`;
          const isActive = isGroupActive(location.pathname, group);

          return (
            <Link
              key={group.id}
              to={to}
              onClick={onNavClick}
              className={`flex items-center gap-3 px-5 py-2.5 text-[0.8rem] cursor-pointer transition-all border-l-[3px] no-underline ${
                isActive
                  ? "text-[var(--royal)] bg-[var(--royal)]/5 border-l-[var(--royal)] font-bold"
                  : "text-[var(--ink-muted)] border-l-transparent hover:text-[var(--royal)] hover:bg-[var(--neutral-faint)]"
              }`}
            >
              <span
                className={`w-[16px] h-[16px] shrink-0 transition-opacity ${
                  isActive ? "opacity-100 text-[var(--royal)]" : "opacity-40"
                }`}
              >
                {group.icon}
              </span>
              <span className="text-[0.75rem] font-semibold">{group.label}</span>
              {group.badge && (
                <Badge
                  variant="outline"
                  className="ml-auto bg-amber-50 border-amber-200 text-amber-600 px-1.5 py-0.5 text-[8px] font-bold tracking-tight h-auto rounded"
                >
                  {group.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>

      {/* Utility items */}
      {utilityItems.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.2em] px-5 py-2">
            Manage
          </div>
          {utilityItems.map((item) => {
            const to = `/estates/${estateId}/${item.route}`;
            const isActive = isRouteActive(location.pathname, item.route);
            return (
              <Link
                key={item.id}
                to={to}
                onClick={onNavClick}
                className={`flex items-center gap-3 px-5 py-2.5 text-[0.8rem] cursor-pointer transition-all border-l-[3px] no-underline ${
                  isActive
                    ? "text-[var(--royal)] bg-[var(--royal)]/5 border-l-[var(--royal)] font-bold"
                    : "text-[var(--ink-muted)] border-l-transparent hover:text-[var(--royal)] hover:bg-[var(--neutral-faint)]"
                }`}
              >
                <span
                  className={`w-[16px] h-[16px] shrink-0 transition-opacity ${
                    isActive ? "opacity-100 text-[var(--royal)]" : "opacity-40"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="text-[0.75rem] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}

/* ─── Estate Switcher ─────────────────────────────────────────────────────────
 * The ONLY in-app affordance for moving between estates a user belongs to, and
 * the entry point to the (previously orphaned) estate registry. Lists every
 * estate from useUserEstates(); selecting one navigates to that estate's
 * dashboard. "Manage estates" deep-links the full registry route.
 * ──────────────────────────────────────────────────────────────────────────── */

/** One row in the switcher — resolves the estate's real name from Firestore. */
function EstateSwitcherItem({
  estateUser,
  currentEstateId,
  onSelect,
}: {
  estateUser: EstateUser;
  currentEstateId: string;
  onSelect: (estateId: string) => void;
}) {
  const { data: estate } = useEstate(estateUser.estateId);
  const isCurrent = estateUser.estateId === currentEstateId;
  const displayName = estate?.name || 'Estate';

  return (
    <DropdownMenuItem
      onClick={() => onSelect(estateUser.estateId)}
      className={`flex items-center gap-3 cursor-pointer ${isCurrent ? 'bg-[var(--royal)]/5' : ''}`}
    >
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isCurrent ? 'bg-[var(--royal)] text-white' : 'bg-[var(--neutral-faint)] text-[var(--royal)]'}`}>
        <Landmark className="w-3.5 h-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.8rem] font-bold text-ink truncate">{displayName}</span>
        <span className="block text-[10px] font-medium text-ink-muted">{personaLabel(estateUser.role)}</span>
      </span>
      {isCurrent && <Check className="w-4 h-4 text-[var(--royal)] shrink-0" />}
    </DropdownMenuItem>
  );
}

function EstateSwitcher({
  estateId,
  estateName,
  role,
}: {
  estateId: string;
  estateName: string;
  role: PersonaRole;
}) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: estateUsers } = useUserEstates(profile?.uid || null);

  return (
    <div className="px-4 py-5 bg-[var(--royal)]/[0.01]">
      <label className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-2 block">Active Estate</label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 h-auto bg-white border-[var(--neutral-border)] hover:border-[var(--royal)]/30 rounded-xl text-left overflow-hidden group/button"
          >
            <div className="flex-1 truncate text-left">
              <div className="text-ink text-[0.8rem] font-bold truncate group-hover/button:text-[var(--royal)] transition-colors">{estateName}</div>
              <div className="text-ink-muted text-[10px] font-medium mt-0.5">{personaLabel(role)}</div>
            </div>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink-muted group-hover/button:text-[var(--royal)] transition-all"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.5"/></svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[15rem]">
          <DropdownMenuLabel className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.2em]">
            Your Estates
          </DropdownMenuLabel>
          {(estateUsers || []).map((eu) => (
            <EstateSwitcherItem
              key={eu.estateId}
              estateUser={eu}
              currentEstateId={estateId}
              onSelect={(nextId) => {
                if (nextId !== estateId) navigate({ to: `/estates/${nextId}/dashboard` });
              }}
            />
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate({ to: `/estates/${estateId}/estates` })}
            className="flex items-center gap-3 cursor-pointer text-[var(--royal)] font-bold"
          >
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[var(--royal)]/10">
              <Settings className="w-3.5 h-3.5" />
            </span>
            <span className="text-[0.8rem]">Manage estates</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Shared hook to compute filtered nav groups and utility items */
function useFilteredNav(userRole: PersonaRole) {
  return useMemo(() => {
    const groups = filterGroupsByRole(NAV_GROUPS, userRole);
    const utilityItems = filterUtilityByRole(UTILITY_ITEMS, userRole);
    return { groups, utilityItems };
  }, [userRole]);
}

/** Mobile sidebar sheet — controlled externally via open/onOpenChange */
export function MobileSidebar({
  open,
  onOpenChange,
  effectiveRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  effectiveRole?: PersonaRole;
}) {
  const location = useLocation();
  const params = useParams({ strict: false }) as { estateId?: string };
  const estateId = params.estateId || "";
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const user = profile ? {
    name: profile.displayName || `${profile.firstName} ${profile.lastName}`.trim(),
    role: profile.role,
    profilePhotoUrl: profile.profilePhotoUrl || '',
    primaryEstateName: profile.primaryEstateName || 'My Estate',
  } : {
    name: 'Guest',
    role: 'principal' as const,
    profilePhotoUrl: '',
    primaryEstateName: 'My Estate',
  };

  const userRole = effectiveRole || user.role || 'principal';
  const { groups, utilityItems } = useFilteredNav(userRole);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]?.toUpperCase()).join('') || 'FW';
  };

  const handleLogout = async () => {
    await signOut();
    navigate({ to: '/login', search: {} });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={true}
        className="w-[280px] p-0 flex flex-col"
        style={{ background: "var(--sidebar-bg, #FFFFFF)" }}
      >
        <VisuallyHidden.Root>
          <SheetTitle>Navigation</SheetTitle>
        </VisuallyHidden.Root>

        {/* Logo */}
        <Link
          to="/"
          onClick={() => onOpenChange(false)}
          className="flex items-center gap-3 px-5 py-6 no-underline"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-[var(--royal)] drop-shadow-sm">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="text-[var(--royal)] text-[1rem] font-bold uppercase tracking-[0.15em] font-[family-name:var(--font-cinzel)]">
            FinalWishes
          </span>
        </Link>

        <Separator className="bg-[var(--royal)]/10" />

        {/* Estate Switcher */}
        <EstateSwitcher
          estateId={estateId}
          estateName={user?.primaryEstateName || "My Estate"}
          role={userRole}
        />

        <Separator className="bg-[var(--royal)]/10" />

        {/* Navigation */}
        <ScrollArea className="flex-1 overflow-hidden">
          <SidebarNavContent
            groups={groups}
            utilityItems={utilityItems}
            estateId={estateId}
            location={location}
            onNavClick={() => onOpenChange(false)}
          />
        </ScrollArea>

        {/* User Footer */}
        <Separator className="bg-[var(--neutral-faint)]" />
        <div className="p-4 mt-auto bg-[color-mix(in_srgb,var(--neutral-faint)_50%,transparent)]">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-9 h-9 rounded-xl">
              <AvatarImage src={user?.profilePhotoUrl || undefined} alt="Profile" className="rounded-xl object-cover" />
              <AvatarFallback className="rounded-xl bg-[var(--royal)] text-white font-bold text-xs">
                {getInitials(user?.name || 'FW')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-ink text-[0.8rem] font-bold truncate">{user?.name || "User"}</div>
              <div className="text-ink-muted text-[10px] font-medium">{personaLabel(userRole)}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 h-auto bg-white border border-[var(--neutral-border)] rounded-xl text-ink-muted hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all text-[11px] font-semibold"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar({ effectiveRole }: { effectiveRole?: PersonaRole }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { estateId?: string };
  const estateId = params.estateId || "";
  const { profile, signOut } = useAuth();

  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const user = profile ? {
    name: profile.displayName || `${profile.firstName} ${profile.lastName}`.trim(),
    role: profile.role,
    profilePhotoUrl: profile.profilePhotoUrl || '',
    primaryEstateName: profile.primaryEstateName || 'My Estate',
  } : {
    name: 'Guest',
    role: 'principal' as const,
    profilePhotoUrl: '',
    primaryEstateName: 'My Estate',
  };

  const userRole = effectiveRole || user.role || 'principal';
  const { groups, utilityItems } = useFilteredNav(userRole);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]?.toUpperCase()).join('') || 'FW';
  };

  const handleLogout = async () => {
    await signOut();
    navigate({ to: '/login', search: {} });
  };

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 h-screen z-[100] flex-col"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--sidebar-bg)",
        borderRight: "1px solid rgba(19, 51, 120, 0.1)",
      }}
    >
      {/* Photo Modal */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent
          showCloseButton={true}
          className="max-w-[90vw] max-h-[90vh] sm:max-w-[90vw] p-0 bg-white border border-[var(--royal)]/20 shadow-2xl overflow-hidden"
        >
          <VisuallyHidden.Root>
            <DialogTitle>Profile Photo</DialogTitle>
          </VisuallyHidden.Root>
          {user?.profilePhotoUrl && (
            <img
              src={user.profilePhotoUrl}
              className="max-w-full max-h-[80vh] object-contain block mx-auto"
              alt="Full Fidelity Portrait"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-3 px-5 py-6 no-underline"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="w-6 h-6 text-[var(--royal)] drop-shadow-sm"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span className="text-[var(--royal)] text-[1rem] font-bold uppercase tracking-[0.15em] font-[family-name:var(--font-cinzel)]">
          FinalWishes
        </span>
      </Link>

      <Separator className="bg-[var(--royal)]/10" />

      {/* Estate Switcher */}
      <EstateSwitcher
        estateId={estateId}
        estateName={user?.primaryEstateName || "My Estate"}
        role={userRole}
      />

      <Separator className="bg-[var(--royal)]/10" />

      {/* Navigation */}
      <ScrollArea className="flex-1 overflow-hidden">
        <SidebarNavContent
          groups={groups}
          utilityItems={utilityItems}
          estateId={estateId}
          location={location}
        />
      </ScrollArea>

      {/* User Footer */}
      <Separator className="bg-[var(--neutral-faint)]" />
      <div className="p-4 mt-auto bg-[color-mix(in_srgb,var(--neutral-faint)_50%,transparent)]">
        <div className="flex items-center gap-3 mb-3">
          {user?.profilePhotoUrl ? (
            <button
              type="button"
              aria-label="View profile photo"
              onClick={() => setShowPhotoModal(true)}
              className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--royal)]"
            >
              <Avatar className="w-9 h-9 rounded-xl cursor-pointer hover:ring-2 hover:ring-[var(--royal)] transition-all">
                <AvatarImage
                  src={user.profilePhotoUrl}
                  alt="Profile"
                  className="rounded-xl object-cover"
                />
                <AvatarFallback className="rounded-xl bg-[var(--royal)] text-white font-bold text-xs">
                  {getInitials(user?.name || 'User')}
                </AvatarFallback>
              </Avatar>
            </button>
          ) : (
            <Avatar className="w-9 h-9 rounded-xl">
              <AvatarFallback className="rounded-xl bg-[var(--royal)] text-white font-bold text-xs">
                {getInitials(user?.name || 'User')}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0">
            <div className="text-ink text-[0.8rem] font-bold truncate">{user?.name || "User"}</div>
            <div className="text-ink-muted text-[10px] font-medium">{personaLabel(userRole)}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 h-auto bg-white border border-[var(--neutral-border)] rounded-xl text-ink-muted hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all text-[11px] font-semibold"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
