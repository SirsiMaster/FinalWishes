/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/accept-invite')({
  component: AcceptInvitePage,
  validateSearch: (search: Record<string, unknown>) => ({
    id: (search.id as string) ?? '',
  }),
})

/* eslint-disable @typescript-eslint/no-explicit-any */

type Status =
  | 'loading'
  | 'accepting'
  | 'success'
  | 'pending-grant'
  | 'error'
  | 'unauthenticated'

function AcceptInvitePage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const invitationId = search.id
  const { user, profile, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  // The estate whose server-side access grant we're waiting on. Captured when the
  // poll times out so the live listener and the "Try Again" action know which doc
  // to watch without re-fetching the invitation.
  const [pendingEstateId, setPendingEstateId] = useState('')

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setStatus('unauthenticated')
      return
    }

    if (!invitationId) {
      setStatus('error')
      setErrorMsg('No invitation ID provided.')
      return
    }

    acceptInvitation()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, invitationId])

  // While we're in the pending-grant holding state, attach a live listener to the
  // estate_users junction doc so the instant the autoMatch Cloud Function lands the
  // grant — even after the fixed poll window expired — the user is taken straight in.
  // This turns a cold-start race from a dead end into a self-healing wait.
  useEffect(() => {
    if (status !== 'pending-grant' || !user || !pendingEstateId) return

    const euRef = doc(db, 'estate_users', `${user.uid}_${pendingEstateId}`)
    const unsub = onSnapshot(
      euRef,
      (snap) => {
        if (snap.exists() && snap.data()?.accessGranted) {
          finalizeAccess(pendingEstateId)
        }
      },
      (err) => {
        // Listener errors (e.g. transient rules/network) are non-fatal — the user can
        // still use the manual "Try Again" action. Just log and keep the holding state.
        console.warn('[accept-invite] grant listener error (non-fatal):', err)
      },
    )
    return () => unsub()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user, pendingEstateId])

  async function acceptInvitation() {
    if (!user || !invitationId) return
    setStatus('accepting')

    try {
      // 1. Fetch the invitation
      const invRef = doc(db, 'estate_invitations', invitationId)
      const invSnap = await getDoc(invRef)

      if (!invSnap.exists()) {
        setStatus('error')
        setErrorMsg('This invitation was not found. It may have been revoked.')
        return
      }

      const inv = invSnap.data()

      if (inv.status === 'accepted') {
        // Already accepted — just navigate to the estate
        navigate({
          to: '/estates/$estateId/dashboard',
          params: { estateId: inv.estateId },
        })
        return
      }

      if (inv.status !== 'pending') {
        setStatus('error')
        setErrorMsg(`This invitation has been ${inv.status}. Please contact the estate owner.`)
        return
      }

      // 2. Wait for the SERVER-SIDE access grant.
      // Estate access is granted by the autoMatch Cloud Functions (admin SDK,
      // functions/index.js): autoMatchOnInvitation links existing accounts the moment
      // the invite is created, and autoMatchInvitation links the account on signup —
      // both create the estates_users junction (accessGranted) and flip the invitation
      // to 'accepted'. The client MUST NOT (and per security rules CANNOT) grant itself
      // estate access — doing so here previously made every accept fail with
      // "Missing or insufficient permissions" even though the server had already
      // granted access. So we simply wait for the server grant to land.
      const euRef = doc(db, 'estate_users', `${user.uid}_${inv.estateId}`)
      let granted = false
      for (let i = 0; i < 12; i++) {
        const euSnap = await getDoc(euRef)
        if (euSnap.exists() && euSnap.data()?.accessGranted) {
          granted = true
          break
        }
        await new Promise((r) => setTimeout(r, 1000))
      }

      if (!granted) {
        // The async trigger hasn't landed yet — do NOT hard-fail. This is a timing
        // race on a Cloud Function cold start, not a genuine error. Drop into the
        // dedicated pending-grant holding state: a live onSnapshot listener (above)
        // takes the user in the instant the grant lands, and the UI offers an explicit
        // "Try Again" affordance so they're never stranded.
        setPendingEstateId(inv.estateId)
        setStatus('pending-grant')
        return
      }

      finalizeAccess(inv.estateId)
    } catch (err) {
      console.error('[accept-invite] Error:', err)
      setStatus('error')
      setErrorMsg('Something went wrong accepting this invitation. Please try again.')
    }
  }

  // Commits the local side of a successful grant and routes the user into their estate.
  // Idempotent-safe: guarded so the live listener and the poll path can't double-fire.
  async function finalizeAccess(estateId: string) {
    if (!user) return
    setStatus('success')

    // Point the invitee's OWN profile at this estate (allowed by rules: own doc) so a
    // future login lands them here. Non-fatal.
    if (!profile?.primaryEstateId) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          primaryEstateId: estateId,
          updatedAt: serverTimestamp(),
        })
      } catch (e) {
        console.warn('[accept-invite] primaryEstateId update skipped (non-fatal):', e)
      }
    }

    // Redirect to estate dashboard.
    setTimeout(() => {
      navigate({
        to: '/estates/$estateId/dashboard',
        params: { estateId },
      })
    }, 1500)
  }

  // Not logged in — redirect to login with invite param
  if (status === 'unauthenticated') {
    return (
      <InviteCard>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-[var(--royal)]/5 rounded-2xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--royal)]" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-royal mb-2">
              Estate Invitation
            </h2>
            <p className="text-ink-muted text-sm font-medium">
              You've been invited to join an estate. Sign in or create an account to continue.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate({ to: '/login', search: { invite: invitationId } } as any)}
              className="w-full bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white py-4 h-auto rounded-2xl font-bold"
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/login', search: { invite: invitationId } } as any)}
              className="w-full py-4 h-auto rounded-2xl font-bold border-[var(--neutral-border)]"
            >
              Create Account
            </Button>
          </div>
        </div>
      </InviteCard>
    )
  }

  // Server-side access grant hasn't landed within the poll window. This is a Cloud
  // Function cold-start race, NOT an error — a live listener is still watching, and we
  // give the user explicit recovery actions instead of a dead end.
  if (status === 'pending-grant') {
    return (
      <InviteCard>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-[var(--gold)]/10 rounded-2xl flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[var(--gold)]/30 border-t-[var(--gold)] rounded-full animate-spin" />
          </div>
          <div>
            <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-royal mb-2">
              Almost There
            </h2>
            <p className="text-ink-muted text-sm font-medium">
              We're finalizing your access to this estate. This usually takes just a
              moment — we'll take you in automatically the instant it's ready.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => acceptInvitation()}
              className="w-full bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white py-4 h-auto rounded-2xl font-bold"
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full py-4 h-auto rounded-2xl font-bold border-[var(--neutral-border)]"
            >
              Refresh
            </Button>
            <button
              type="button"
              onClick={() => navigate({ to: '/' })}
              className="text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </InviteCard>
    )
  }

  if (status === 'error') {
    return (
      <InviteCard>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-red-50 rounded-2xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-royal mb-2">
              Invitation Error
            </h2>
            <p className="text-ink-muted text-sm font-medium">{errorMsg}</p>
          </div>
          <Button
            onClick={() => navigate({ to: '/' })}
            variant="outline"
            className="py-4 h-auto rounded-2xl font-bold border-[var(--neutral-border)]"
          >
            Go to Home
          </Button>
        </div>
      </InviteCard>
    )
  }

  if (status === 'success') {
    return (
      <InviteCard>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-green-50 rounded-2xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-royal mb-2">
              Welcome to the Estate
            </h2>
            <p className="text-ink-muted text-sm font-medium">
              Your invitation has been accepted. Redirecting to your dashboard...
            </p>
          </div>
        </div>
      </InviteCard>
    )
  }

  // Loading / Accepting
  return (
    <InviteCard>
      <div className="text-center space-y-6">
        <div className="w-10 h-10 mx-auto border-2 border-[var(--royal)]/20 border-t-[var(--royal)] rounded-full animate-spin" />
        <p className="text-ink-muted text-sm font-medium">
          {status === 'accepting' ? 'Accepting your invitation...' : 'Loading invitation...'}
        </p>
      </div>
    </InviteCard>
  )
}

function InviteCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--neutral-faint)]">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[var(--royal)]/[0.03] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[var(--royal)]/[0.05] blur-[120px] rounded-full" />
      </div>
      <Card className="bg-white/80 backdrop-blur-2xl w-full max-w-md rounded-[2.5rem] relative z-10 border-[var(--royal)]/10 shadow-[0_20px_50px_rgba(19,51,120,0.08)]">
        <CardContent className="p-10">
          {children}
        </CardContent>
      </Card>
    </div>
  )
}
