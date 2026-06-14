/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Outlet, useParams, useLocation } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar, MobileSidebar } from '../components/layout/Sidebar'
import { AdminHeader } from '../components/layout/AdminHeader'
import { AuthGuard } from '../components/guards/AuthGuard'
import { IdentityGate } from '../components/guards/IdentityGate'
import { RoleGuard } from '../components/guards/RoleGuard'
import { HeirWelcome, shouldShowHeirWelcome, markWelcomeSeen } from '../components/guards/HeirWelcome'
import { OwnerWelcome, shouldShowOwnerWelcome, markOwnerWelcomeSeen } from '../components/guards/OwnerWelcome'
import { ShepherdCompanion } from '../components/estate/ShepherdCompanion'
import { EmailVerificationBanner } from '../components/identity/EmailVerificationBanner'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useAuth } from '../lib/auth'
import { useEstate, useDocument, type EstateUser } from '../lib/firestore'
import { API_BASE } from '../lib/client'
import { useEffect, useRef } from 'react'
import { auth as firebaseAuth } from '../lib/firebase'
import { personaLabel, resolveEffectiveRole } from '../lib/persona'

export const Route = createFileRoute('/estates/$estateId')({
  component: EstateLayout,
})

function EstateLayout() {
  const { estateId } = useParams({ from: '/estates/$estateId' });
  const { profile } = useAuth();
  const { data: estate } = useEstate(estateId);
  const location = useLocation();

  // Fetch estate-specific role from the estate_users junction record.
  // This is critical: a user's global profile.role may be 'principal' (for their own estate)
  // but they may be an 'heir' or 'executor' on THIS estate.
  const estateUserPath = profile?.uid ? `estate_users/${profile.uid}_${estateId}` : null;
  const { data: estateUser } = useDocument<EstateUser>(estateUserPath);
  const effectiveRole = resolveEffectiveRole(estateUser?.role, profile?.role);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [ownerWelcomeDismissed, setOwnerWelcomeDismissed] = useState(false);
  // Shepherd companion open state (device preference; not PII). Lifted here so
  // the content column can reserve space for the docked panel on desktop.
  const [shepherdOpen, setShepherdOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('fw_shepherd_collapsed') !== 'true'; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem('fw_shepherd_collapsed', shepherdOpen ? 'false' : 'true'); } catch { /* ignore */ }
  }, [shepherdOpen]);

  useEffect(() => {
    document.body.classList.add('dashboard-theme');
    document.body.classList.remove('royal-theme');
    return () => {
      document.body.classList.remove('dashboard-theme');
    }
  }, []);

  // Guardian Protocol: check-in on mount for principal/admin
  const checkedIn = useRef(false);
  useEffect(() => {
    if (checkedIn.current) return;
    const isPrincipalOrAdmin = effectiveRole === 'principal' || effectiveRole === 'admin';
    if (!isPrincipalOrAdmin || !estateId) return;
    checkedIn.current = true;
    (async () => {
      try {
        const token = await firebaseAuth.currentUser?.getIdToken();
        if (!token) return;
        await fetch(`${API_BASE}/api/v1/guardian/check-in`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ estateId }),
        });
      } catch {
        // Non-blocking — check-in failure is silent
      }
    })();
  }, [effectiveRole, estateId]);

  const handleWelcomeContinue = useCallback(() => {
    if (profile?.uid) {
      markWelcomeSeen(estateId, profile.uid);
    }
    setWelcomeDismissed(true);
  }, [estateId, profile]);

  // Owner Welcome — shows once after estate creation for the principal
  const handleOwnerWelcomeContinue = useCallback(() => {
    if (profile?.uid) {
      markOwnerWelcomeSeen(estateId, profile.uid);
    }
    setOwnerWelcomeDismissed(true);
  }, [estateId, profile]);

  const showOwnerWelcome = !ownerWelcomeDismissed && shouldShowOwnerWelcome(effectiveRole, estateId, profile?.uid);

  if (showOwnerWelcome) {
    return (
      <AuthGuard>
        <OwnerWelcome
          estateId={estateId}
          estateName={estate?.name || profile?.primaryEstateName || 'Your Estate'}
          onContinue={handleOwnerWelcomeContinue}
        />
      </AuthGuard>
    );
  }

  // Show the Heir Welcome Screen when conditions are met
  const showWelcome = !welcomeDismissed && shouldShowHeirWelcome(profile, estate?.status, estateId, estateUser?.role);

  if (showWelcome) {
    return (
      <AuthGuard>
        <HeirWelcome estateId={estateId} onContinue={handleWelcomeContinue} />
      </AuthGuard>
    );
  }

  const userRole = effectiveRole;
  const estateName = profile?.primaryEstateName || 'My Estate';

  const displayEstateName = estateName;

  const roleLabel = personaLabel(userRole);

  return (
    <AuthGuard>
      <div className="dashboard-shell dashboard-theme themed-layout-bg min-h-screen">
        <Sidebar effectiveRole={effectiveRole} />
        <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} effectiveRole={effectiveRole} />
        <div
          className={`transition-all duration-300 min-h-screen flex flex-col md:ml-[var(--sidebar-width)] ${shepherdOpen ? 'lg:pr-[360px]' : ''}`}
        >
          <AdminHeader
            title={displayEstateName}
            subtitle={`${roleLabel} · Vault Secured · Active`}
            onMenuClick={() => setMobileMenuOpen(true)}
          />
          <EmailVerificationBanner />
          <main className="flex-1 p-4 md:p-8 overflow-hidden">
            <ErrorBoundary>
              <IdentityGate estateId={estateId}>
                <RoleGuard estateId={estateId}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={location.pathname}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                      <Outlet />
                    </motion.div>
                  </AnimatePresence>
                </RoleGuard>
              </IdentityGate>
            </ErrorBoundary>
          </main>
        </div>
        <ShepherdCompanion
          estateId={estateId}
          open={shepherdOpen}
          onToggle={() => setShepherdOpen((v) => !v)}
          effectiveRole={effectiveRole}
        />
      </div>
    </AuthGuard>
  )
}
