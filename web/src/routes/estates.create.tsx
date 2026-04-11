/* eslint-disable react-refresh/only-export-components */
/**
 * Create Estate — First-Time User Onboarding
 *
 * Premium onboarding flow for new users who don't have an estate yet.
 * Creates the Firestore estate document + estate_users junction.
 * Then redirects to the new estate's dashboard.
 *
 * Route: /estates/create
 *
 * @version 1.1.0 — shadcn/ui refactor
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { AuthGuard } from '../components/guards/AuthGuard'
import { createEstate } from '../lib/estate-actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/estates/create')({
  component: CreateEstatePage,
})

function CreateEstatePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [estateName, setEstateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstName = profile?.firstName || user?.displayName?.split(' ')[0] || '';

  const handleCreate = async () => {
    if (!estateName.trim() || !user) return;

    setSaving(true);
    setError(null);

    const result = await createEstate({
      name: estateName.trim(),
      principalId: user.uid,
    });

    if (result.success && result.id) {
      // Navigate to the new estate's dashboard
      navigate({ to: '/estates/$estateId/dashboard', params: { estateId: result.id } });
    } else {
      setError(result.error || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#EEF2FF] flex items-center justify-center p-6 font-[family-name:var(--font-inter)]">

        {/* Background decoration */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-[#133378]/[0.03] blur-3xl" />
          <div className="absolute bottom-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-[#C8A951]/[0.03] blur-3xl" />
        </div>

        <div className="relative w-full max-w-2xl">

          {/* Step 0: Welcome */}
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

              <div className="grid grid-cols-3 gap-6 mb-16">
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
                Your data is encrypted and protected under SOC 2 + HIPAA compliance.
              </p>
            </div>
          )}

          {/* Step 1: Name your estate */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Button
                variant="ghost"
                onClick={() => setStep(0)}
                className="flex items-center gap-2 text-[#64748B] hover:text-[#133378] font-semibold text-sm mb-12 transition-colors px-0 hover:bg-transparent"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5m7-7-7 7 7 7" />
                </svg>
                Back
              </Button>

              <Card className="rounded-[3rem] p-16 border-slate-100 shadow-[0_20px_80px_rgba(15,23,42,0.04)] bg-white ring-0">
                <CardHeader className="p-0 mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-px bg-[#133378]/20" />
                    <Badge variant="secondary" className="text-[11px] font-bold text-[#133378]/30 uppercase tracking-[0.3em] bg-transparent px-0 h-auto border-0">
                      Step 1 of 1
                    </Badge>
                  </div>
                  <CardTitle className="text-4xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] mb-4 tracking-tight">
                    Name Your Estate
                  </CardTitle>
                  <CardDescription className="text-lg text-[#64748B] font-medium leading-relaxed">
                    This is how your estate plan will be identified. You can change this later.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-0 mb-12">
                  <div className="space-y-3">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                      Estate Name
                    </Label>
                    <Input
                      type="text"
                      value={estateName}
                      onChange={(e) => setEstateName(e.target.value)}
                      placeholder={`${firstName ? `The ${profile?.lastName || firstName} Family Estate` : 'e.g. The Johnson Family Estate'}`}
                      className="w-full px-8 py-6 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus:bg-white focus-visible:border-[#133378] focus-visible:ring-8 focus-visible:ring-[#133378]/5 font-bold text-[#0F172A] text-xl transition-all placeholder:text-slate-300 placeholder:font-medium"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && estateName.trim()) handleCreate();
                      }}
                    />
                  </div>

                  {error && (
                    <div className="mt-8 px-6 py-4 bg-red-50 border border-red-200 rounded-2xl">
                      <p className="text-red-600 font-semibold text-sm">{error}</p>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="p-0 flex gap-4 border-0 bg-transparent">
                  <Button
                    variant="outline"
                    onClick={() => setStep(0)}
                    className="flex-1 py-5 h-auto rounded-2xl border-slate-200 font-bold text-[#64748B] hover:bg-slate-50 transition-all active:scale-[0.98]"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!estateName.trim() || saving}
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

              <div className="flex items-center justify-center gap-6 mt-12">
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
                  SOC 2 Compliant
                </Badge>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <Badge variant="outline" className="text-[13px] text-[#94A3B8] font-medium border-0 bg-transparent gap-2 h-auto">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  HIPAA Ready
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

// -- Feature Card Component (shadcn Card) --

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
  );
}
