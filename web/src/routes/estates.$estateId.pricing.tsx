/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { useEstate } from '../lib/firestore'
import {
  Crown,
  Shield,
  Star,
  Check,
  Loader2,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { trackCheckoutStarted, trackPaymentSuccess } from '../lib/analytics'

export const Route = createFileRoute('/estates/$estateId/pricing')({
  component: PricingPage,
})

// ─── Types ──────────────────────────────────────────────────────────────────

interface Tier {
  id: string
  name: string
  description: string
  priceCents: number
  interval: string
  features: string[]
}

const TIER_ICONS: Record<string, typeof Crown> = {
  free: Shield,
  concierge: Star,
  white_glove: Crown,
}

const TIER_COLORS: Record<string, string> = {
  free: '#64748B',
  concierge: '#133378',
  white_glove: '#C8A951',
}

// ─── API Client ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function fetchTiers(): Promise<{ tiers: Tier[]; publishableKey: string }> {
  const res = await fetch(`${API_BASE}/api/v1/payments/tiers`)
  if (!res.ok) throw new Error('Failed to fetch pricing')
  return res.json()
}

async function createCheckout(params: {
  tierId: string
  estateId: string
  userId: string
  email: string
  token: string
}): Promise<{ sessionId: string; checkoutUrl: string }> {
  const res = await fetch(`${API_BASE}/api/v1/payments/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      tierId: params.tierId,
      estateId: params.estateId,
      userId: params.userId,
      email: params.email,
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Checkout failed')
  }
  return res.json()
}

// ─── Main Page ──────────────────────────────────────────────────────────────

function PricingPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/pricing' })
  const estateId = useMemo(() => (routeId === 'lockhart' ? 'estate_lockhart' : routeId), [routeId])
  const { user } = useAuth()
  const { data: estate } = useEstate(estateId)

  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check URL params for payment result
  const paymentResult = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('payment')
  }, [])

  const currentTier = estate?.tier || 'free'

  // Track successful payment on return from Stripe
  useEffect(() => {
    if (paymentResult === 'success' && currentTier !== 'free') {
      trackPaymentSuccess(currentTier)
    }
  }, [paymentResult, currentTier])

  useEffect(() => {
    fetchTiers()
      .then((data) => {
        setTiers(data.tiers || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch tiers:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleSelectTier = useCallback(
    async (tierId: string) => {
      if (!user || tierId === 'free' || tierId === currentTier) return
      setCheckoutLoading(tierId)
      setError(null)
      try {
        trackCheckoutStarted(tierId)
        const token = await user.getIdToken()
        const result = await createCheckout({
          tierId,
          estateId,
          userId: user.uid,
          email: user.email || '',
          token,
        })
        // Redirect to Stripe Checkout
        window.location.href = result.checkoutUrl
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Checkout failed')
        setCheckoutLoading(null)
      }
    },
    [user, estateId, currentTier]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto p-12 space-y-16 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* ── Payment Result Banner ── */}
      {paymentResult === 'success' && (
        <div className="bg-[#059669]/10 border border-[#059669]/20 rounded-2xl p-6 flex items-center gap-4">
          <Sparkles className="w-6 h-6 text-[#059669]" />
          <div>
            <p className="text-[#059669] font-bold text-[15px]">Payment successful!</p>
            <p className="text-[#059669]/70 text-[13px]">Your estate plan has been upgraded. All premium features are now active.</p>
          </div>
        </div>
      )}
      {paymentResult === 'cancelled' && (
        <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-2xl p-6 flex items-center gap-4">
          <Shield className="w-6 h-6 text-[#F59E0B]" />
          <p className="text-[#F59E0B] font-bold text-[15px]">Payment cancelled. You can try again anytime.</p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-[#133378]/40 uppercase tracking-[0.2em]">
          <div className="w-10 h-px bg-[#133378]/20" />
          <span>Estate Protection Plans</span>
          <div className="w-10 h-px bg-[#133378]/20" />
        </div>
        <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] tracking-tight">
          Choose Your Plan
        </h2>
        <p className="text-[#64748B] text-lg font-medium max-w-2xl mx-auto leading-relaxed">
          Protect your legacy with the right level of coverage. Upgrade or downgrade anytime.
        </p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <p className="text-red-600 font-medium text-[14px]">{error}</p>
        </div>
      )}

      {/* ── Tier Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {tiers.map((tier) => {
          const Icon = TIER_ICONS[tier.id] || Shield
          const color = TIER_COLORS[tier.id] || '#64748B'
          const isCurrent = tier.id === currentTier
          const isPopular = tier.id === 'concierge'
          const isLoading = checkoutLoading === tier.id

          return (
            <div
              key={tier.id}
              className={`relative bg-white rounded-3xl border-2 p-10 transition-all ${
                isCurrent
                  ? 'border-[#133378] shadow-[0_20px_60px_rgba(19,51,120,0.15)]'
                  : isPopular
                    ? 'border-[#C8A951]/50 shadow-lg hover:border-[#C8A951]'
                    : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
              }`}
            >
              {/* Popular Badge */}
              {isPopular && !isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#C8A951] text-white text-[10px] font-bold uppercase tracking-widest px-5 py-1.5 rounded-full">
                  Most Popular
                </div>
              )}

              {/* Current Badge */}
              {isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#133378] text-white text-[10px] font-bold uppercase tracking-widest px-5 py-1.5 rounded-full">
                  Current Plan
                </div>
              )}

              {/* Icon + Name */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0F172A]">{tier.name}</h3>
                  <p className="text-[13px] text-[#64748B]">{tier.description}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#0F172A]">
                    {tier.priceCents === 0 ? 'Free' : `$${(tier.priceCents / 100).toFixed(0)}`}
                  </span>
                  {tier.priceCents > 0 && (
                    <span className="text-[14px] text-[#64748B] font-medium">/{tier.interval}</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-10">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
                    <span className="text-[14px] text-[#334155]">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSelectTier(tier.id)}
                disabled={isCurrent || tier.id === 'free' || isLoading}
                className={`w-full py-4 rounded-2xl font-bold text-[14px] transition-all flex items-center justify-center gap-2 ${
                  isCurrent
                    ? 'bg-[#F1F5F9] text-[#64748B] cursor-default'
                    : tier.id === 'free'
                      ? 'bg-[#F1F5F9] text-[#64748B] cursor-default'
                      : isPopular
                        ? 'bg-[#C8A951] hover:bg-[#B8993E] text-white shadow-lg'
                        : 'bg-[#133378] hover:bg-[#1E3A5F] text-white'
                }`}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Stripe...</>
                ) : isCurrent ? (
                  'Current Plan'
                ) : tier.id === 'free' ? (
                  'Free Forever'
                ) : (
                  <><ExternalLink className="w-4 h-4" /> Upgrade Now</>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Footer Note ── */}
      <div className="text-center space-y-2">
        <p className="text-[13px] text-[#64748B]">
          Payments processed securely by <span className="font-bold">Stripe</span>. Cancel anytime.
        </p>
        <p className="text-[12px] text-[#94A3B8]">
          All plans include SOC 2 compliant infrastructure, Cloud KMS encryption, and 99.9% uptime SLA.
        </p>
      </div>
    </div>
  )
}
