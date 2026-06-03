/* eslint-disable react-refresh/only-export-components */
/**
 * Create Estate — 5-Step Intake Wizard
 *
 * Premium onboarding flow that collects intake information to personalize
 * the estate experience. Creates Firestore estate document + metadata.
 *
 * Route: /estates/create
 *
 * @version 2.0.0 — 5-step intake wizard
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { AuthGuard } from '../components/guards/AuthGuard'
import { createEstate } from '../lib/estate-actions'
import { US_STATES } from '../lib/us-states'
import { trackEstateCreated } from '../lib/analytics'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'

export const Route = createFileRoute('/estates/create')({
  component: CreateEstatePage,
})

// ─── Types ───────────────────────────────────────────────────────────────────

interface WizardData {
  // Step 1
  situation: 'planning' | 'after-loss' | null
  // Step 2
  fullName: string
  stateOfResidence: string
  maritalStatus: string
  // Step 3
  hasSpouse: boolean
  hasChildren: boolean
  numberOfChildren: number
  hasMinorChildren: boolean
  // Step 4
  assets: string[]
  // Step 5
  estateName: string
}

const ASSET_OPTIONS = [
  { id: 'primary-residence', label: 'Primary residence', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1' },
  { id: 'bank-accounts', label: 'Bank accounts', icon: 'M12 1v22m5-18H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
  { id: 'retirement-accounts', label: 'Retirement accounts (401k, IRA)', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { id: 'life-insurance', label: 'Life insurance', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { id: 'investments', label: 'Investment / brokerage accounts', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'business', label: 'Business or business interest', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'vehicles', label: 'Vehicles', icon: 'M8 17h.01M16 17h.01M3 11l1.5-5.5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.5L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6' },
  { id: 'real-estate', label: 'Real estate (other properties)', icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z' },
  { id: 'digital-assets', label: 'Digital assets (crypto, domain names)', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9' },
] as const

const STEP_LABELS = ['Situation', 'About You', 'Family', 'Assets', 'Name']

// ─── Main Component ──────────────────────────────────────────────────────────

function CreateEstatePage() {
  const { user, profile, profileResolved } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // GUARD: never show the intake wizard to someone who already has an estate.
  // The post-login redirect can land here transiently before the profile
  // resolves; without this, returning users were forced to "re-personalize"
  // their estate on every login. Gate on profileResolved (not `!loading`) so we
  // only bounce once the profile read has a definitive answer — `loading`
  // tracks Firebase auth init, not the Firestore profile fetch.
  useEffect(() => {
    if (profileResolved && profile?.primaryEstateId) {
      navigate({
        to: '/estates/$estateId/dashboard',
        params: { estateId: profile.primaryEstateId },
        replace: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }
  }, [profileResolved, profile?.primaryEstateId, navigate])

  const firstName = profile?.firstName || user?.displayName?.split(' ')[0] || ''
  const fullNameDefault = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : user?.displayName || ''

  const [wizardData, setWizardData] = useState<WizardData>({
    situation: null,
    fullName: fullNameDefault,
    stateOfResidence: '',
    maritalStatus: '',
    hasSpouse: false,
    hasChildren: false,
    numberOfChildren: 0,
    hasMinorChildren: false,
    assets: [],
    estateName: '',
  })

  const update = (patch: Partial<WizardData>) =>
    setWizardData((prev) => ({ ...prev, ...patch }))

  const toggleAsset = (id: string) => {
    setWizardData((prev) => ({
      ...prev,
      assets: prev.assets.includes(id)
        ? prev.assets.filter((a) => a !== id)
        : [...prev.assets, id],
    }))
  }

  // Derive default estate name suggestion
  const suggestedEstateName = (() => {
    if (wizardData.fullName) {
      const parts = wizardData.fullName.trim().split(' ')
      const last = parts[parts.length - 1]
      return `The ${last} Family Estate`
    }
    if (firstName) return `The ${profile?.lastName || firstName} Family Estate`
    return 'e.g. The Johnson Family Estate'
  })()

  // Step validation
  const canProceed = (s: number): boolean => {
    switch (s) {
      case 1: return wizardData.situation !== null
      case 2: return wizardData.fullName.trim().length > 0 && wizardData.stateOfResidence !== '' && wizardData.maritalStatus !== ''
      case 3: return true // all optional toggles
      case 4: return true // checkboxes are optional
      case 5: return wizardData.estateName.trim().length > 0
      default: return true
    }
  }

  const handleCreate = async () => {
    if (!wizardData.estateName.trim() || !user) return

    setSaving(true)
    setError(null)

    const result = await createEstate({
      name: wizardData.estateName.trim(),
      principalId: user.uid,
    })

    if (result.success && result.id) {
      // Write wizard intake metadata
      try {
        await setDoc(doc(db, `estates/${result.id}/metadata`, 'intake'), {
          situation: wizardData.situation,
          fullName: wizardData.fullName.trim(),
          stateOfResidence: wizardData.stateOfResidence,
          maritalStatus: wizardData.maritalStatus,
          hasSpouse: wizardData.hasSpouse,
          hasChildren: wizardData.hasChildren,
          numberOfChildren: wizardData.hasChildren ? wizardData.numberOfChildren : 0,
          hasMinorChildren: wizardData.hasChildren ? wizardData.hasMinorChildren : false,
          assets: wizardData.assets,
          completedAt: serverTimestamp(),
        })
      } catch (metaErr) {
        console.error('[CreateEstate] Metadata write failed (non-blocking):', metaErr)
      }

      trackEstateCreated(result.id)
      navigate({ to: '/estates/$estateId/dashboard', params: { estateId: result.id } })
    } else {
      setError(result.error || 'Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#EEF2FF] flex items-center justify-center p-6 font-[family-name:var(--font-inter)]">
        {/* Background decoration */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-[#133378]/[0.03] blur-3xl" />
          <div className="absolute bottom-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-[#C8A951]/[0.03] blur-3xl" />
        </div>

        <div className="relative w-full max-w-2xl">
          {/* ─── Step 0: Welcome ─── */}
          {step === 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center mb-16">
                <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-[#133378] flex items-center justify-center shadow-[0_20px_60px_rgba(19,51,120,0.2)]">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h1 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] mb-6 tracking-tight leading-tight">
                  Welcome{firstName ? `, ${firstName}` : ''}.
                </h1>
                <p className="text-xl text-[#64748B] font-medium max-w-lg mx-auto leading-relaxed">
                  Let's set up your estate plan. This is the first step toward protecting
                  everything you've worked for — and the people who matter most.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-16">
                <FeatureCard
                  icon={<path d="M12 1v22m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />}
                  title="Assets"
                  desc="Track your financial, real estate, and personal property"
                />
                <FeatureCard
                  icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>}
                  title="Vault"
                  desc="Store wills, trusts, and legal documents securely"
                />
                <FeatureCard
                  icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /></>}
                  title="Family"
                  desc="Designate heirs, executors, and their roles"
                />
              </div>

              <Button
                onClick={() => setStep(1)}
                className="w-full py-6 h-auto bg-[#133378] hover:bg-[#1E3A5F] text-white rounded-2xl font-bold text-lg transition-all shadow-[0_20px_60px_rgba(19,51,120,0.15)] hover:shadow-[0_25px_70px_rgba(19,51,120,0.25)] hover:-translate-y-0.5 active:scale-[0.99]"
              >
                Create My Estate Plan
              </Button>

              <p className="text-center mt-8 text-sm text-[#94A3B8] font-medium">
                Your data is protected with AES-256 encryption and enterprise-grade security infrastructure.
              </p>
            </div>
          )}

          {/* ─── Steps 1-5: Wizard ─── */}
          {step >= 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Back button */}
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 text-[#64748B] hover:text-[#133378] font-semibold text-sm mb-8 transition-colors px-0 hover:bg-transparent"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5m7-7-7 7 7 7" />
                </svg>
                Back
              </Button>

              {/* Progress indicator */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  {STEP_LABELS.map((label, i) => (
                    <div key={label} className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          i + 1 < step
                            ? 'bg-[#C8A951] text-white'
                            : i + 1 === step
                              ? 'bg-[#133378] text-white shadow-lg shadow-[#133378]/20'
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {i + 1 < step ? (
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold tracking-wide ${
                        i + 1 === step ? 'text-[#133378]' : 'text-slate-400'
                      }`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <Progress value={(step / 5) * 100} className="h-1.5 bg-slate-100 [&>[data-slot=progress-indicator]]:bg-[#133378]" />
              </div>

              {/* ─── Step 1: Your Situation ─── */}
              {step === 1 && (
                <Card className="rounded-[2.5rem] p-12 border-slate-100 shadow-[0_20px_80px_rgba(15,23,42,0.04)] bg-white">
                  <CardHeader className="p-0 mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-px bg-[#133378]/20" />
                      <Badge variant="secondary" className="text-[11px] font-bold text-[#133378]/30 uppercase tracking-[0.3em] bg-transparent px-0 h-auto border-0">
                        Step 1 of 5
                      </Badge>
                    </div>
                    <CardTitle className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] mb-3 tracking-tight">
                      What brings you here?
                    </CardTitle>
                    <CardDescription className="text-lg text-[#64748B] font-medium leading-relaxed">
                      There's no wrong answer. We'll tailor your experience based on where you are right now.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0 space-y-4">
                    {/* Planning Ahead */}
                    <button
                      type="button"
                      onClick={() => update({ situation: 'planning' })}
                      className={`w-full text-left p-6 rounded-[2rem] border-2 transition-all ${
                        wizardData.situation === 'planning'
                          ? 'border-[#133378] bg-[#133378]/[0.03] shadow-lg shadow-[#133378]/10'
                          : 'border-slate-200 hover:border-[#133378]/30 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                          wizardData.situation === 'planning'
                            ? 'bg-[#133378] text-white'
                            : 'bg-[#133378]/10 text-[#133378]'
                        }`}>
                          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-[#0F172A] mb-1">Planning Ahead</h3>
                          <p className="text-[#64748B] font-medium leading-relaxed">
                            I want to organize my estate while I'm able — so my family is protected no matter what.
                          </p>
                        </div>
                        {wizardData.situation === 'planning' && (
                          <div className="ml-auto flex-shrink-0">
                            <div className="w-6 h-6 rounded-full bg-[#133378] flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>

                    {/* After a Loss */}
                    <button
                      type="button"
                      onClick={() => update({ situation: 'after-loss' })}
                      className={`w-full text-left p-6 rounded-[2rem] border-2 transition-all ${
                        wizardData.situation === 'after-loss'
                          ? 'border-[#C8A951] bg-[#C8A951]/[0.03] shadow-lg shadow-[#C8A951]/10'
                          : 'border-slate-200 hover:border-[#C8A951]/30 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                          wizardData.situation === 'after-loss'
                            ? 'bg-[#C8A951] text-white'
                            : 'bg-[#C8A951]/10 text-[#C8A951]'
                        }`}>
                          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-[#0F172A] mb-1">After a Loss</h3>
                          <p className="text-[#64748B] font-medium leading-relaxed">
                            I'm settling the estate of someone who has passed. I need help organizing and managing everything.
                          </p>
                        </div>
                        {wizardData.situation === 'after-loss' && (
                          <div className="ml-auto flex-shrink-0">
                            <div className="w-6 h-6 rounded-full bg-[#C8A951] flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  </CardContent>

                  <CardFooter className="p-0 pt-8 border-0 bg-transparent">
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!canProceed(1)}
                      className="w-full py-5 h-auto rounded-2xl bg-[#133378] hover:bg-[#1E3A5F] text-white font-bold text-lg transition-all shadow-xl hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      Continue
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14m-7-7 7 7-7 7" />
                      </svg>
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* ─── Step 2: About You ─── */}
              {step === 2 && (
                <Card className="rounded-[2.5rem] p-12 border-slate-100 shadow-[0_20px_80px_rgba(15,23,42,0.04)] bg-white">
                  <CardHeader className="p-0 mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-px bg-[#133378]/20" />
                      <Badge variant="secondary" className="text-[11px] font-bold text-[#133378]/30 uppercase tracking-[0.3em] bg-transparent px-0 h-auto border-0">
                        Step 2 of 5
                      </Badge>
                    </div>
                    <CardTitle className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] mb-3 tracking-tight">
                      About You
                    </CardTitle>
                    <CardDescription className="text-lg text-[#64748B] font-medium leading-relaxed">
                      A few basics help us personalize your estate plan and ensure it meets your state's requirements.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0 space-y-6">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                        Full Legal Name
                      </Label>
                      <Input
                        type="text"
                        value={wizardData.fullName}
                        onChange={(e) => update({ fullName: e.target.value })}
                        placeholder="Your full name"
                        className="w-full px-6 py-4 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus:bg-white focus-visible:border-[#133378] focus-visible:ring-8 focus-visible:ring-[#133378]/5 font-semibold text-[#0F172A] text-base transition-all placeholder:text-slate-300 placeholder:font-medium"
                        autoFocus
                      />
                    </div>

                    {/* State of Residence */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                        State of Residence
                      </Label>
                      <Select
                        value={wizardData.stateOfResidence}
                        onValueChange={(val) => update({ stateOfResidence: val })}
                      >
                        <SelectTrigger className="w-full px-6 py-4 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] font-semibold text-base text-[#0F172A] [&>span]:text-slate-300 data-[state=open]:border-[#133378] data-[state=open]:ring-8 data-[state=open]:ring-[#133378]/5">
                          <SelectValue placeholder="Select your state" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-72">
                          {US_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Marital Status */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                        Marital Status
                      </Label>
                      <Select
                        value={wizardData.maritalStatus}
                        onValueChange={(val) => {
                          const hasSpouse = val === 'married'
                          update({ maritalStatus: val, hasSpouse })
                        }}
                      >
                        <SelectTrigger className="w-full px-6 py-4 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] font-semibold text-base text-[#0F172A] [&>span]:text-slate-300 data-[state=open]:border-[#133378] data-[state=open]:ring-8 data-[state=open]:ring-[#133378]/5">
                          <SelectValue placeholder="Select marital status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married">Married</SelectItem>
                          <SelectItem value="divorced">Divorced</SelectItem>
                          <SelectItem value="widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>

                  <CardFooter className="p-0 pt-8 flex gap-4 border-0 bg-transparent">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1 py-5 h-auto rounded-2xl border-slate-200 font-bold text-[#64748B] hover:bg-slate-50 transition-all active:scale-[0.98]"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!canProceed(2)}
                      className="flex-[2] py-5 h-auto rounded-2xl bg-[#133378] hover:bg-[#1E3A5F] text-white font-bold text-lg transition-all shadow-xl hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      Continue
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14m-7-7 7 7-7 7" />
                      </svg>
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* ─── Step 3: Family ─── */}
              {step === 3 && (
                <Card className="rounded-[2.5rem] p-12 border-slate-100 shadow-[0_20px_80px_rgba(15,23,42,0.04)] bg-white">
                  <CardHeader className="p-0 mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-px bg-[#133378]/20" />
                      <Badge variant="secondary" className="text-[11px] font-bold text-[#133378]/30 uppercase tracking-[0.3em] bg-transparent px-0 h-auto border-0">
                        Step 3 of 5
                      </Badge>
                    </div>
                    <CardTitle className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] mb-3 tracking-tight">
                      Your Family
                    </CardTitle>
                    <CardDescription className="text-lg text-[#64748B] font-medium leading-relaxed">
                      Understanding your family helps us suggest the right protections and designations.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0 space-y-6">
                    {/* Spouse/Partner */}
                    <div className="flex items-center justify-between p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100">
                      <div>
                        <p className="font-bold text-[#0F172A]">Spouse or partner?</p>
                        <p className="text-sm text-[#64748B] mt-0.5">Do you currently have a spouse or domestic partner?</p>
                      </div>
                      <Switch
                        checked={wizardData.hasSpouse}
                        onCheckedChange={(checked) => update({ hasSpouse: !!checked })}
                        className="data-[state=checked]:bg-[#133378]"
                      />
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Children */}
                    <div className="flex items-center justify-between p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100">
                      <div>
                        <p className="font-bold text-[#0F172A]">Children?</p>
                        <p className="text-sm text-[#64748B] mt-0.5">Do you have any children or dependents?</p>
                      </div>
                      <Switch
                        checked={wizardData.hasChildren}
                        onCheckedChange={(checked) => {
                          const has = !!checked
                          update({
                            hasChildren: has,
                            numberOfChildren: has ? Math.max(wizardData.numberOfChildren, 1) : 0,
                            hasMinorChildren: has ? wizardData.hasMinorChildren : false,
                          })
                        }}
                        className="data-[state=checked]:bg-[#133378]"
                      />
                    </div>

                    {/* Number of children */}
                    {wizardData.hasChildren && (
                      <div className="pl-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-2">
                          <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                            How many children?
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            value={wizardData.numberOfChildren}
                            onChange={(e) => update({ numberOfChildren: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-32 px-6 py-3 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus:bg-white focus-visible:border-[#133378] focus-visible:ring-8 focus-visible:ring-[#133378]/5 font-semibold text-[#0F172A] text-base transition-all"
                          />
                        </div>

                        {/* Minor children */}
                        <div className="flex items-center justify-between p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100">
                          <div>
                            <p className="font-bold text-[#0F172A]">Any minor children?</p>
                            <p className="text-sm text-[#64748B] mt-0.5">Children under 18 may need a guardian designation.</p>
                          </div>
                          <Switch
                            checked={wizardData.hasMinorChildren}
                            onCheckedChange={(checked) => update({ hasMinorChildren: !!checked })}
                            className="data-[state=checked]:bg-[#C8A951]"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-0 pt-8 flex gap-4 border-0 bg-transparent">
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="flex-1 py-5 h-auto rounded-2xl border-slate-200 font-bold text-[#64748B] hover:bg-slate-50 transition-all active:scale-[0.98]"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(4)}
                      className="flex-[2] py-5 h-auto rounded-2xl bg-[#133378] hover:bg-[#1E3A5F] text-white font-bold text-lg transition-all shadow-xl hover:-translate-y-0.5 active:scale-[0.99] flex items-center justify-center gap-3"
                    >
                      Continue
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14m-7-7 7 7-7 7" />
                      </svg>
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* ─── Step 4: Key Assets ─── */}
              {step === 4 && (
                <Card className="rounded-[2.5rem] p-12 border-slate-100 shadow-[0_20px_80px_rgba(15,23,42,0.04)] bg-white">
                  <CardHeader className="p-0 mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-px bg-[#133378]/20" />
                      <Badge variant="secondary" className="text-[11px] font-bold text-[#133378]/30 uppercase tracking-[0.3em] bg-transparent px-0 h-auto border-0">
                        Step 4 of 5
                      </Badge>
                    </div>
                    <CardTitle className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] mb-3 tracking-tight">
                      Key Assets
                    </CardTitle>
                    <CardDescription className="text-lg text-[#64748B] font-medium leading-relaxed">
                      Select any that apply — this helps us set up the right categories in your estate. You can always add more later.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 gap-3">
                      {ASSET_OPTIONS.map((asset) => {
                        const selected = wizardData.assets.includes(asset.id)
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => toggleAsset(asset.id)}
                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                              selected
                                ? 'border-[#133378] bg-[#133378]/[0.03]'
                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                              selected ? 'bg-[#133378] text-white' : 'bg-slate-100 text-slate-400'
                            }`}>
                              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d={asset.icon} />
                              </svg>
                            </div>
                            <span className={`font-semibold transition-colors ${selected ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>
                              {asset.label}
                            </span>
                            {selected && (
                              <div className="ml-auto flex-shrink-0">
                                <div className="w-6 h-6 rounded-full bg-[#133378] flex items-center justify-center">
                                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </CardContent>

                  <CardFooter className="p-0 pt-8 flex gap-4 border-0 bg-transparent">
                    <Button
                      variant="outline"
                      onClick={() => setStep(3)}
                      className="flex-1 py-5 h-auto rounded-2xl border-slate-200 font-bold text-[#64748B] hover:bg-slate-50 transition-all active:scale-[0.98]"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => {
                        // Auto-populate estate name if empty
                        if (!wizardData.estateName) {
                          update({ estateName: suggestedEstateName.startsWith('e.g.') ? '' : suggestedEstateName })
                        }
                        setStep(5)
                      }}
                      className="flex-[2] py-5 h-auto rounded-2xl bg-[#133378] hover:bg-[#1E3A5F] text-white font-bold text-lg transition-all shadow-xl hover:-translate-y-0.5 active:scale-[0.99] flex items-center justify-center gap-3"
                    >
                      Continue
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14m-7-7 7 7-7 7" />
                      </svg>
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* ─── Step 5: Name Your Estate ─── */}
              {step === 5 && (
                <Card className="rounded-[2.5rem] p-12 border-slate-100 shadow-[0_20px_80px_rgba(15,23,42,0.04)] bg-white">
                  <CardHeader className="p-0 mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-px bg-[#133378]/20" />
                      <Badge variant="secondary" className="text-[11px] font-bold text-[#133378]/30 uppercase tracking-[0.3em] bg-transparent px-0 h-auto border-0">
                        Step 5 of 5
                      </Badge>
                    </div>
                    <CardTitle className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] mb-3 tracking-tight">
                      Name Your Estate
                    </CardTitle>
                    <CardDescription className="text-lg text-[#64748B] font-medium leading-relaxed">
                      Almost there. Give your estate a name — you can always change this later.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0 space-y-8">
                    {/* Estate Name */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                        Estate Name
                      </Label>
                      <Input
                        type="text"
                        value={wizardData.estateName}
                        onChange={(e) => update({ estateName: e.target.value })}
                        placeholder={suggestedEstateName}
                        className="w-full px-8 py-6 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus:bg-white focus-visible:border-[#133378] focus-visible:ring-8 focus-visible:ring-[#133378]/5 font-bold text-[#0F172A] text-xl transition-all placeholder:text-slate-300 placeholder:font-medium"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && wizardData.estateName.trim()) handleCreate()
                        }}
                      />
                    </div>

                    {/* Summary */}
                    <div className="rounded-2xl bg-[#F8FAFC] border border-slate-100 p-6 space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Intake Summary</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <SummaryItem
                          label="Situation"
                          value={wizardData.situation === 'planning' ? 'Planning Ahead' : wizardData.situation === 'after-loss' ? 'After a Loss' : '--'}
                        />
                        <SummaryItem label="Name" value={wizardData.fullName || '--'} />
                        <SummaryItem
                          label="State"
                          value={wizardData.stateOfResidence ? wizardData.stateOfResidence.charAt(0).toUpperCase() + wizardData.stateOfResidence.slice(1) : '--'}
                        />
                        <SummaryItem
                          label="Marital Status"
                          value={wizardData.maritalStatus ? wizardData.maritalStatus.charAt(0).toUpperCase() + wizardData.maritalStatus.slice(1) : '--'}
                        />
                        <SummaryItem
                          label="Family"
                          value={[
                            wizardData.hasSpouse ? 'Spouse' : null,
                            wizardData.hasChildren ? `${wizardData.numberOfChildren} child${wizardData.numberOfChildren !== 1 ? 'ren' : ''}` : null,
                            wizardData.hasMinorChildren ? '(minors)' : null,
                          ].filter(Boolean).join(', ') || 'No family entered'}
                        />
                        <SummaryItem
                          label="Assets"
                          value={wizardData.assets.length > 0 ? `${wizardData.assets.length} selected` : 'None selected'}
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="px-6 py-4 bg-red-50 border border-red-200 rounded-2xl">
                        <p className="text-red-600 font-semibold text-sm">{error}</p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-0 pt-8 flex gap-4 border-0 bg-transparent">
                    <Button
                      variant="outline"
                      onClick={() => setStep(4)}
                      className="flex-1 py-5 h-auto rounded-2xl border-slate-200 font-bold text-[#64748B] hover:bg-slate-50 transition-all active:scale-[0.98]"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={!canProceed(5) || saving}
                      className="flex-[2] py-5 h-auto rounded-2xl bg-[#133378] hover:bg-[#1E3A5F] text-white font-bold text-lg transition-all shadow-xl hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {saving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Create Estate
                          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14m-7-7 7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* Security badges */}
              <div className="flex items-center justify-center gap-6 mt-10">
                <Badge variant="outline" className="text-[13px] text-[#94A3B8] font-medium border-0 bg-transparent gap-2 h-auto">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  AES-256 Encrypted
                </Badge>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <Badge variant="outline" className="text-[13px] text-[#94A3B8] font-medium border-0 bg-transparent gap-2 h-auto">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  SOC 2 Architecture
                </Badge>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <Badge variant="outline" className="text-[13px] text-[#94A3B8] font-medium border-0 bg-transparent gap-2 h-auto">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Cloud KMS
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="rounded-[2rem] p-8 border-slate-100 shadow-[0_2px_30px_rgba(15,23,42,0.02)] text-center group hover:border-[#133378]/20 hover:shadow-lg transition-all hover:-translate-y-1 bg-white ring-0">
      <CardContent className="p-0">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-center text-[#133378] mb-5 group-hover:bg-[#133378] group-hover:text-white transition-all duration-500">
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
            {icon}
          </svg>
        </div>
        <h3 className="font-bold text-[#0F172A] text-lg mb-2 group-hover:text-[#133378] transition-colors">{title}</h3>
        <p className="text-sm text-[#64748B] font-medium leading-relaxed">{desc}</p>
      </CardContent>
    </Card>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="font-semibold text-[#0F172A]">{value}</p>
    </div>
  )
}
