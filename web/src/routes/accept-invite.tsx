/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import {
  doc,
  getDoc,
  updateDoc,
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

type Status = 'loading' | 'accepting' | 'success' | 'error' | 'unauthenticated'

function AcceptInvitePage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const invitationId = search.id
  const { user, profile, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')

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
        // The async trigger hasn't landed yet — do NOT hard-fail; the user will get
        // access shortly. Guide them rather than showing a dead end.
        setStatus('error')
        setErrorMsg(
          "You're almost in — we're finalizing your access to this estate. Please refresh in a moment, or sign in again and you'll be taken straight to it.",
        )
        return
      }

      // 3. Point the invitee's OWN profile at this estate (allowed by rules: own doc)
      // so a future login lands them here. Non-fatal.
      if (!profile?.primaryEstateId) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            primaryEstateId: inv.estateId,
            updatedAt: serverTimestamp(),
          })
        } catch (e) {
          console.warn('[accept-invite] primaryEstateId update skipped (non-fatal):', e)
        }
      }

      setStatus('success')

      // 4. Redirect to estate dashboard
      setTimeout(() => {
        navigate({
          to: '/estates/$estateId/dashboard',
          params: { estateId: inv.estateId },
        })
      }, 1500)
    } catch (err) {
      console.error('[accept-invite] Error:', err)
      setStatus('error')
      setErrorMsg('Something went wrong accepting this invitation. Please try again.')
    }
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
            <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-slate-900 mb-2">
              Estate Invitation
            </h2>
            <p className="text-slate-500 text-sm font-medium">
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
              className="w-full py-4 h-auto rounded-2xl font-bold border-slate-200"
            >
              Create Account
            </Button>
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
            <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-slate-900 mb-2">
              Invitation Error
            </h2>
            <p className="text-slate-500 text-sm font-medium">{errorMsg}</p>
          </div>
          <Button
            onClick={() => navigate({ to: '/' })}
            variant="outline"
            className="py-4 h-auto rounded-2xl font-bold border-slate-200"
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
            <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-slate-900 mb-2">
              Welcome to the Estate
            </h2>
            <p className="text-slate-500 text-sm font-medium">
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
        <p className="text-slate-500 text-sm font-medium">
          {status === 'accepting' ? 'Accepting your invitation...' : 'Loading invitation...'}
        </p>
      </div>
    </InviteCard>
  )
}

function InviteCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
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
