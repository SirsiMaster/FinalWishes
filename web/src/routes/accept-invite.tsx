/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
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

      // 2. Accept: update invitation
      await updateDoc(invRef, {
        status: 'accepted',
        userId: user.uid,
        invitationAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // 3. Create estate_users junction record
      const euDocId = `${user.uid}_${inv.estateId}`
      await setDoc(doc(db, 'estate_users', euDocId), {
        estateId: inv.estateId,
        userId: user.uid,
        role: inv.role || 'heir',
        accessGranted: true,
        accessGrantedAt: serverTimestamp(),
        invitationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // 4. Set primaryEstateId if user doesn't have one yet
      if (!profile?.primaryEstateId) {
        await updateDoc(doc(db, 'users', user.uid), {
          primaryEstateId: inv.estateId,
          updatedAt: serverTimestamp(),
        })
      }

      setStatus('success')

      // 5. Redirect to estate dashboard
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
          <div className="w-16 h-16 mx-auto bg-[#133378]/5 rounded-2xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#133378]" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] mb-2">
              Estate Invitation
            </h2>
            <p className="text-[#64748B] text-sm font-medium">
              You've been invited to join an estate. Sign in or create an account to continue.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate({ to: '/login', search: { invite: invitationId } } as any)}
              className="w-full bg-[#133378] hover:bg-[#1E3A5F] text-white py-4 h-auto rounded-2xl font-bold"
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
            <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] mb-2">
              Invitation Error
            </h2>
            <p className="text-[#64748B] text-sm font-medium">{errorMsg}</p>
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
            <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] mb-2">
              Welcome to the Estate
            </h2>
            <p className="text-[#64748B] text-sm font-medium">
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
        <div className="w-10 h-10 mx-auto border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
        <p className="text-[#64748B] text-sm font-medium">
          {status === 'accepting' ? 'Accepting your invitation...' : 'Loading invitation...'}
        </p>
      </div>
    </InviteCard>
  )
}

function InviteCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC]">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#133378]/[0.03] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#133378]/[0.05] blur-[120px] rounded-full" />
      </div>
      <Card className="bg-white/80 backdrop-blur-2xl w-full max-w-md rounded-[2.5rem] relative z-10 border-[#133378]/10 shadow-[0_20px_50px_rgba(19,51,120,0.08)]">
        <CardContent className="p-10">
          {children}
        </CardContent>
      </Card>
    </div>
  )
}
