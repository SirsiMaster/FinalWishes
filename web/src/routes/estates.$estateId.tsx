/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Outlet, useParams } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { Sidebar, MobileSidebar } from '../components/layout/Sidebar'
import { AdminHeader } from '../components/layout/AdminHeader'
import { AuthGuard } from '../components/guards/AuthGuard'
import { IdentityGate } from '../components/guards/IdentityGate'
import { HeirWelcome, shouldShowHeirWelcome, markWelcomeSeen } from '../components/guards/HeirWelcome'
import { EmailVerificationBanner } from '../components/identity/EmailVerificationBanner'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useAuth } from '../lib/auth'
import { useEstate } from '../lib/firestore'
import { useEffect, useRef } from 'react'
import { auth as firebaseAuth } from '../lib/firebase'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Estate Owner',
  principal: 'Estate Owner',
  admin: 'Administrator',
  beneficiary: 'Beneficiary',
  heir: 'Beneficiary',
  executor: 'Legal Executor',
  legal: 'Legal Counsel',
  cpa: 'CPA Advisor',
};

export const Route = createFileRoute('/estates/$estateId')({
  component: EstateLayout,
})

function EstateLayout() {
  const { estateId } = useParams({ from: '/estates/$estateId' });
  const { profile } = useAuth();
  const { data: estate } = useEstate(estateId);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

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
    const isPrincipalOrAdmin = profile?.role === 'principal' || profile?.role === 'admin';
    if (!isPrincipalOrAdmin || !estateId) return;
    checkedIn.current = true;
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
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
  }, [profile?.role, estateId]);

  const handleWelcomeContinue = useCallback(() => {
    if (profile?.uid) {
      markWelcomeSeen(estateId, profile.uid);
    }
    setWelcomeDismissed(true);
  }, [estateId, profile]);

  // Show the Heir Welcome Screen when conditions are met
  const showWelcome = !welcomeDismissed && shouldShowHeirWelcome(profile, estate?.status, estateId);

  if (showWelcome) {
    return (
      <AuthGuard>
        <HeirWelcome estateId={estateId} onContinue={handleWelcomeContinue} />
      </AuthGuard>
    );
  }

  const userRole = profile?.role || 'principal';
  const estateName = profile?.primaryEstateName || 'My Estate';

  const displayEstateName = estateName;

  const roleLabel = ROLE_LABELS[userRole] || 'Member';

  return (
    <AuthGuard>
      <div className="dashboard-shell dashboard-theme themed-layout-bg min-h-screen">
        <Sidebar />
        <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
        <div
          className="transition-all duration-300 min-h-screen flex flex-col md:ml-[var(--sidebar-width)]"
        >
          <AdminHeader
            title={displayEstateName}
            subtitle={`${roleLabel} · Vault Secured · Active`}
            onMenuClick={() => setMobileMenuOpen(true)}
          />
          <EmailVerificationBanner />
          <main className="flex-1 p-4 md:p-8">
            <ErrorBoundary>
              <IdentityGate estateId={estateId}>
                <Outlet />
              </IdentityGate>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
