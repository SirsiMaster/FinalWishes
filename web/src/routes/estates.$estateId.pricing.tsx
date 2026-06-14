/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { toast } from 'sonner'
import { trackCheckoutStarted } from '../lib/analytics'
import { useEstate } from '../lib/firestore'
import { API_BASE } from '../lib/client'
import {
  Crown,
  Shield,
  Star,
  Check,
  Loader2,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
  const estateId = routeId
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

  // Show toast for payment result (once)
  const toastShownRef = useRef(false)
  useEffect(() => {
    if (toastShownRef.current) return
    if (paymentResult === 'success') {
      toast.success('Payment successful! Your estate plan has been upgraded.')
      toastShownRef.current = true
    } else if (paymentResult === 'cancelled') {
      toast.info('Payment cancelled. You can try again anytime.')
      toastShownRef.current = true
    }
  }, [paymentResult])

  const currentTier = estate?.tier || 'free'

  useEffect(() => {
    fetchTiers()
      .then((data) => {
        setTiers(data.tiers || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch tiers:', err)
        setError(err.message)
        toast.error('Failed to load pricing plans')
        setLoading(false)
      })
  }, [])

  const handleSelectTier = useCallback(
    async (tierId: string) => {
      if (!user || tierId === 'free' || tierId === currentTier) return
      setCheckoutLoading(tierId)
      setError(null)
      try {
        const token = await user.getIdToken()
        const result = await createCheckout({
          tierId,
          estateId,
          userId: user.uid,
          email: user.email || '',
          token,
        })
        // Track conversion + redirect to Stripe Checkout
        trackCheckoutStarted(tierId)
        window.location.href = result.checkoutUrl
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Checkout failed'
        setError(message)
        toast.error(message)
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
        <Card className="border-[#059669]/20 bg-[#059669]/10 rounded-2xl ring-0">
          <CardContent className="flex items-center gap-4 py-2">
            <Sparkles className="w-6 h-6 text-[#059669]" />
            <div>
              <p className="text-[#059669] font-bold text-[15px]">Payment successful!</p>
              <p className="text-[#059669]/70 text-[13px]">Your estate plan has been upgraded. All premium features are now active.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {paymentResult === 'cancelled' && (
        <Card className="border-[#F59E0B]/20 bg-[#F59E0B]/10 rounded-2xl ring-0">
          <CardContent className="flex items-center gap-4 py-2">
            <Shield className="w-6 h-6 text-[#F59E0B]" />
            <p className="text-[#F59E0B] font-bold text-[15px]">Payment cancelled. You can try again anytime.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Header ── */}
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-[0.2em]">
          <div className="w-10 h-px bg-[var(--royal)]/20" />
          <span>Estate Protection Plans</span>
          <div className="w-10 h-px bg-[var(--royal)]/20" />
        </div>
        <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-royal tracking-tight">
          Choose Your Plan
        </h2>
        <p className="text-ink-muted text-lg font-medium max-w-2xl mx-auto leading-relaxed">
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
            <Card
              key={tier.id}
              className={`relative rounded-3xl border-2 p-10 transition-all ring-0 gap-0 ${
                isCurrent
                  ? 'border-[var(--royal)] shadow-[0_20px_60px_rgba(19,51,120,0.15)]'
                  : isPopular
                    ? 'border-[var(--gold)]/50 shadow-lg hover:border-[var(--gold)]'
                    : 'border-neutral-border hover:border-gold/40 hover:shadow-md'
              }`}
            >
              {/* Popular Badge */}
              {isPopular && !isCurrent && (
                <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[var(--gold)] text-white text-[10px] font-bold uppercase tracking-widest px-5 py-1.5 rounded-full h-auto border-0 hover:bg-[var(--gold)]">
                  Most Popular
                </Badge>
              )}

              {/* Current Badge */}
              {isCurrent && (
                <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[var(--royal)] text-white text-[10px] font-bold uppercase tracking-widest px-5 py-1.5 rounded-full h-auto border-0 hover:bg-[var(--royal)]">
                  Current Plan
                </Badge>
              )}

              {/* Icon + Name */}
              <CardHeader className="p-0 mb-6 gap-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-royal">{tier.name}</h3>
                    <p className="text-[13px] text-ink-muted">{tier.description}</p>
                  </div>
                </div>
              </CardHeader>

              {/* Price + Features */}
              <CardContent className="p-0">
                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-ink">
                      {tier.priceCents === 0 ? 'Free' : `$${(tier.priceCents / 100).toFixed(0)}`}
                    </span>
                    {tier.priceCents > 0 && (
                      <span className="text-[14px] text-ink-muted font-medium">/{tier.interval}</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-10">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
                      <span className="text-[14px] text-ink">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              {/* CTA Button */}
              <CardFooter className="p-0 border-0 bg-transparent">
                <Button
                  onClick={() => handleSelectTier(tier.id)}
                  disabled={isCurrent || tier.id === 'free' || isLoading}
                  className={`w-full py-4 h-auto rounded-2xl font-bold text-[14px] transition-all flex items-center justify-center gap-2 border-0 ${
                    isCurrent
                      ? 'bg-neutral-faint text-ink-muted cursor-default hover:bg-neutral-faint'
                      : tier.id === 'free'
                        ? 'bg-neutral-faint text-ink-muted cursor-default hover:bg-neutral-faint'
                        : isPopular
                          ? 'bg-[var(--gold)] hover:bg-[var(--gold)] text-white shadow-lg'
                          : 'bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white'
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
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* ── Footer Note ── */}
      <div className="text-center space-y-2">
        <p className="text-[13px] text-ink-muted">
          Payments processed securely by <span className="font-bold">Stripe</span>. Cancel anytime.
        </p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <Badge variant="outline" className="text-[12px] text-ink-muted font-normal">SOC 2 Compliant</Badge>
          <Badge variant="outline" className="text-[12px] text-ink-muted font-normal">Cloud KMS Encryption</Badge>
          <Badge variant="outline" className="text-[12px] text-ink-muted font-normal">99.9% Uptime SLA</Badge>
        </div>
      </div>
    </div>
  )
}
