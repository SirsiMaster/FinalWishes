/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useRef, useState } from 'react'
import { useAuth, type UserProfile } from '../lib/auth'
import { resolveTotpChallenge } from '../lib/mfa'
import { type MultiFactorResolver } from 'firebase/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from 'radix-ui'
import { ScrollVideoCanvas } from '@/components/landing/ScrollVideoCanvas'
import { ProductShowcase } from '@/components/landing/ProductShowcase'
import { ScrollReveal, AnimatedCounter, HoverCard, StaggerList, StaggerItem } from '@/lib/animations'

export const Route = createFileRoute('/')({
  component: Home,
  validateSearch: (search: Record<string, unknown>): { login?: string; invite?: string } => ({
    login: (search.login as string) ?? undefined,
    invite: (search.invite as string) ?? undefined,
  }),
})

function Home() {
  const search = Route.useSearch();
  const [loginOpen, setLoginOpen] = useState(search.login === 'true');

  // Sync with search param changes. This reacts to an EXTERNAL change (the URL
  // ?login=true param arriving/changing) by opening the modal. It can't be
  // derived during render: once open, the user may close the modal while the
  // param is still 'true', so re-deriving open from the param every render would
  // make the modal un-closable. Genuine external-system sync — kept as-is.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (search.login === 'true') setLoginOpen(true);
  }, [search.login]);

  const openLogin = () => setLoginOpen(true);

  useEffect(() => {
    document.body.classList.remove('royal-theme', 'dashboard-theme');
    document.body.style.backgroundColor = '#FFFFFF';
    return () => {
      document.body.style.backgroundColor = '';
    }
  }, []);

  return (
    <main className="min-h-screen relative bg-white">

      {/* ═══════════════════ NAVBAR ═══════════════════ */}
      <nav className="fixed top-0 w-full z-50 h-16 backdrop-blur-md" style={{ background: "rgba(11,29,58,0.9)" }}>
        <div className="max-w-7xl mx-auto px-5 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" className="w-7 h-7 fill-current text-gold">
              <path d="M50 20 C55 20 58 25 58 30 C58 35 55 38 50 38 C45 38 42 35 42 30 C42 25 45 20 50 20 M50 40 C60 40 70 30 80 15 C85 25 85 45 70 55 L60 60 L65 90 L50 85 L35 90 L40 60 L30 55 C15 45 15 25 20 15 C30 30 40 40 50 40 Z" />
            </svg>
            <span className="font-[family-name:var(--font-cinzel)] text-2xl tracking-[0.15em] font-black text-white">
              FINALWISHES
            </span>
          </div>
          <div className="hidden md:flex gap-8 text-xs font-bold tracking-[0.2em] uppercase text-white/70">
            <a href="#scenarios" className="hover:text-white transition-colors">Who It&apos;s For</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={openLogin} className="text-xs font-bold tracking-[0.15em] uppercase text-white/70 hover:text-white hover:bg-transparent transition-colors">
              Sign In
            </Button>
            <Button onClick={openLogin} className="bg-gold text-black px-5 py-2.5 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] hover:-translate-y-0.5 transition-all border-none">
              Start Free
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <HeroSection openLogin={openLogin} />

      {/* ═══════════════════ SCENARIO CARDS — "I'm here because..." ═══════════════════ */}
      <section id="scenarios" className="py-16 relative z-10 bg-[var(--royal)] text-white">
        <div className="max-w-6xl mx-auto px-5">
          <ScrollReveal className="text-center mb-12">
            <p className="text-gold text-xs font-bold uppercase tracking-[0.25em] mb-3">Whatever brought you here, we can help</p>
            <h2 className="text-3xl md:text-4xl text-white font-[family-name:var(--font-cinzel)] mb-4">
              Life Doesn&apos;t Wait. <span className="text-gold">Neither Should You.</span>
            </h2>
          </ScrollReveal>


          <StaggerList className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StaggerItem>
              <HoverCard className="h-full">
                <ScenarioCard
                  emoji="🕊"
                  title="I just lost someone"
                  description="Organize their estate, notify heirs, settle accounts, and distribute assets — guided step by step."
                  cta="Start settlement"
                  image="https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=400&h=250&fit=crop&crop=faces"
                  openLogin={openLogin}
                />
              </HoverCard>
            </StaggerItem>
            <StaggerItem>
              <HoverCard className="h-full">
                <ScenarioCard
                  emoji="🛡"
                  title="I'm planning ahead"
                  description="Secure your documents, record your wishes, designate beneficiaries, and give your family clarity."
                  cta="Create your vault"
                  image="https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=400&h=250&fit=crop&crop=faces"
                  openLogin={openLogin}
                />
              </HoverCard>
            </StaggerItem>
            <StaggerItem>
              <HoverCard className="h-full">
                <ScenarioCard
                  emoji="👴"
                  title="My parent is aging"
                  description="Help them organize while they can. Capture their voice, their values, and their instructions."
                  cta="Set up together"
                  image="https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=400&h=250&fit=crop&crop=faces"
                  openLogin={openLogin}
                />
              </HoverCard>
            </StaggerItem>
            <StaggerItem>
              <HoverCard className="h-full">
                <ScenarioCard
                  emoji="⚖"
                  title="Major life change"
                  description="Divorce, remarriage, new child — update beneficiaries, restructure assets, protect what matters."
                  cta="Update your plan"
                  image="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=250&fit=crop&crop=faces"
                  openLogin={openLogin}
                />
              </HoverCard>
            </StaggerItem>
          </StaggerList>
        </div>
      </section>

      {/* ═══════════════════ PROBLEM — The Numbers ═══════════════════ */}
      <section className="relative z-10 grid md:grid-cols-2 section-light">
        <div className="relative min-h-[300px] md:min-h-[400px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=800&fit=crop"
            alt="Stressed person with paperwork"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute bottom-6 left-6 bg-black/70 backdrop-blur-md rounded-xl p-5 border border-white/10">
            <div className="text-3xl font-bold text-danger font-[family-name:var(--font-cinzel)]"><AnimatedCounter value={72} prefix="$" suffix=" Billion" /></div>
            <div className="text-sm text-white/60 uppercase tracking-[0.1em] mt-1">In Unclaimed Assets Nationwide</div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-8 md:px-12 py-10">
          <ScrollReveal direction="right" className="max-w-lg mx-auto">
            <h2 className="text-3xl md:text-4xl text-royal mb-6 leading-tight font-[family-name:var(--font-cinzel)]">
              The Cost of <span className="text-[var(--gold)]">Not Being Ready</span>
            </h2>
            <p className="text-base md:text-lg text-ink-muted leading-relaxed mb-6">
              When someone passes without a plan, families face frozen accounts, lost passwords, missing documents, and legal battles that can last years. FinalWishes eliminates that chaos — before it starts.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-[var(--royal)] rounded-xl border-0 ring-0 py-0">
                <CardContent className="p-4 text-center">
                  <div className="text-xl font-bold text-white font-[family-name:var(--font-cinzel)]"><AnimatedCounter value={55} suffix="%" /></div>
                  <div className="text-[10px] text-gold uppercase tracking-wider mt-1 font-semibold">No Will</div>
                </CardContent>
              </Card>
              <Card className="bg-[var(--royal)] rounded-xl border-0 ring-0 py-0">
                <CardContent className="p-4 text-center">
                  <div className="text-xl font-bold text-white font-[family-name:var(--font-cinzel)]"><AnimatedCounter value={18} suffix=" mo" /></div>
                  <div className="text-[10px] text-gold uppercase tracking-wider mt-1 font-semibold">Avg Probate</div>
                </CardContent>
              </Card>
              <Card className="bg-[var(--royal)] rounded-xl border-0 ring-0 py-0">
                <CardContent className="p-4 text-center">
                  <div className="text-xl font-bold text-white font-[family-name:var(--font-cinzel)]"><AnimatedCounter value={2} prefix="$" suffix="B+" /></div>
                  <div className="text-[10px] text-gold uppercase tracking-wider mt-1 font-semibold">Court Costs</div>
                </CardContent>
              </Card>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════ WHAT YOU CAN DO — Product Capabilities ═══════════════════ */}
      <section id="how-it-works" className="py-16 relative z-10 overflow-hidden bg-[var(--royal)] text-white">
        <div className="max-w-6xl mx-auto px-5">
          <ScrollReveal className="text-center mb-14">
            <p className="text-gold text-xs font-bold uppercase tracking-[0.25em] mb-3">Everything in one place</p>
            <h2 className="text-3xl md:text-4xl text-white mb-4 font-[family-name:var(--font-cinzel)]">
              Here&apos;s What You Can Do <span className="text-gold">Today</span>
            </h2>
            <p className="text-white/60 text-lg max-w-xl mx-auto">No lawyer needed. No paperwork. Just answers.</p>
          </ScrollReveal>

          <StaggerList className="grid md:grid-cols-3 gap-6 mb-12">
            <StaggerItem>
              <HoverCard className="h-full">
                <CapabilityCard
                  icon="📋"
                  title="Organize Everything"
                  items={[
                    'Upload wills, trusts, deeds, policies',
                    'Track assets, debts, insurance',
                    'Store passwords and digital accounts',
                    'Record funeral and burial preferences',
                  ]}
                  image="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop"
                />
              </HoverCard>
            </StaggerItem>
            <StaggerItem>
              <HoverCard className="h-full" glowColor="rgba(200,169,81,0.2)">
                <CapabilityCard
                  icon="🎙"
                  title="Preserve Your Voice"
                  items={[
                    'Record video and audio memoirs',
                    'Write ethical wills and life stories',
                    'Create sealed letters for loved ones',
                    'Schedule time capsule deliveries',
                  ]}
                  accent
                  image="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=200&fit=crop"
                />
              </HoverCard>
            </StaggerItem>
            <StaggerItem>
              <HoverCard className="h-full">
                <CapabilityCard
                  icon="👥"
                  title="Protect Your People"
                  items={[
                    'Invite heirs and executors securely',
                    'Assign roles and access levels',
                    'Auto-notify when the time comes',
                    'Guide them through settlement',
                  ]}
                  image="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=200&fit=crop&crop=faces"
                />
              </HoverCard>
            </StaggerItem>
          </StaggerList>

        </div>
      </section>

      {/* ═══════════════════ THREE STEPS ═══════════════════ */}
      <section className="py-20 relative z-10 section-light">
        <div className="max-w-6xl mx-auto px-5">
          <ScrollReveal className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl lg:text-6xl text-royal mb-4 font-[family-name:var(--font-cinzel)]">
              Three Steps. <span className="text-[var(--gold)]">Fifteen Minutes.</span>
            </h2>
            <p className="text-ink-muted text-lg max-w-xl mx-auto">That&apos;s all it takes to protect everything you&apos;ve built.</p>
          </ScrollReveal>

          <StaggerList className="grid md:grid-cols-3 gap-6">
            <StaggerItem>
              <Card className="rounded-2xl bg-[var(--royal)] border-0 py-0 h-full shadow-[0_8px_30px_rgba(16,42,86,0.3)]">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-[var(--gold)] flex items-center justify-center mx-auto mb-5 text-[var(--royal)] font-bold text-xl font-[family-name:var(--font-cinzel)]">1</div>
                  <h4 className="text-white font-bold text-lg mb-3">Create Your Vault</h4>
                  <p className="text-white/70 text-[15px] leading-relaxed">Sign up free. Add your first document, asset, or memoir. Takes 2 minutes.</p>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="rounded-2xl bg-[var(--royal)] border-0 py-0 h-full shadow-[0_8px_30px_rgba(16,42,86,0.3)]">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-[var(--gold)] flex items-center justify-center mx-auto mb-5 text-[var(--royal)] font-bold text-xl font-[family-name:var(--font-cinzel)]">2</div>
                  <h4 className="text-white font-bold text-lg mb-3">Invite Your Circle</h4>
                  <p className="text-white/70 text-[15px] leading-relaxed">Add heirs, executors, or your attorney. They get access only to what you allow.</p>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="rounded-2xl bg-[var(--royal)] border-0 py-0 h-full shadow-[0_8px_30px_rgba(16,42,86,0.3)]">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-[var(--gold)] flex items-center justify-center mx-auto mb-5 text-[var(--royal)] font-bold text-xl font-[family-name:var(--font-cinzel)]">3</div>
                  <h4 className="text-white font-bold text-lg mb-3">Live in Peace</h4>
                  <p className="text-white/70 text-[15px] leading-relaxed">We stand watch. When the time comes, your people receive everything they need — automatically.</p>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerList>
        </div>
      </section>

      {/* ═══════════════════ PRODUCT SHOWCASE — See the Real App ═══════════════════ */}
      <section className="py-16 relative z-10 overflow-hidden bg-[var(--royal)] text-white">
        <div className="max-w-6xl mx-auto px-5">
          <ScrollReveal className="text-center mb-10">
            <p className="text-gold text-xs font-bold uppercase tracking-[0.25em] mb-3">See it in action</p>
            <h2 className="text-3xl md:text-4xl text-white mb-4 font-[family-name:var(--font-cinzel)]">
              This Is <span className="text-gold">Your Dashboard</span>
            </h2>
            <p className="text-white/60 max-w-lg mx-auto text-base">Not a mockup. This is the actual product. Click through to see every feature.</p>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <ProductShowcase />
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════ AI SHEPHERD — The Differentiator ═══════════════════ */}
      <section className="py-16 relative z-10 overflow-hidden section-light">
        <div className="max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-12 items-center relative z-10">
          <ScrollReveal direction="left">
            <p className="text-[var(--gold)] text-xs font-bold uppercase tracking-[0.25em] mb-3">AI-Powered Guidance</p>
            <h2 className="text-3xl md:text-4xl text-royal mb-6 font-[family-name:var(--font-cinzel)]">
              The Shepherd <span className="text-[var(--gold)]">Guides You</span>
            </h2>
            <p className="text-ink-muted text-base leading-relaxed mb-6">
              Not sure where to start? Our AI engine analyzes your estate and tells you exactly what&apos;s missing, what&apos;s urgent, and what to do next. It&apos;s like having a personal estate advisor — available 24/7.
            </p>
            <ul className="space-y-3 text-ink-muted text-sm">
              <li className="flex gap-3"><span className="text-[var(--gold)] text-lg">✓</span> Personalized completion checklist</li>
              <li className="flex gap-3"><span className="text-[var(--gold)] text-lg">✓</span> Daily prompts to capture your story</li>
              <li className="flex gap-3"><span className="text-[var(--gold)] text-lg">✓</span> Obituary drafting assistance</li>
              <li className="flex gap-3"><span className="text-[var(--gold)] text-lg">✓</span> Smart suggestions based on your situation</li>
            </ul>
          </ScrollReveal>
          <ScrollReveal direction="right">
            <div className="bg-[var(--royal)] rounded-2xl p-6 border-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <span className="text-gold text-lg">🧭</span>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">The Shepherd</div>
                  <div className="text-gold text-xs">AI Estate Advisor</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-white/5 rounded-xl px-4 py-3 text-white/80 text-sm">
                  Your estate is <strong className="text-gold">62% complete</strong>. You&apos;re missing funeral preferences and a beneficiary for your retirement account.
                </div>
                <div className="bg-white/5 rounded-xl px-4 py-3 text-white/80 text-sm">
                  <strong className="text-white">Today&apos;s prompt:</strong> What&apos;s one life lesson you&apos;d want your children to remember?
                </div>
                <div className="bg-white/5 rounded-xl px-4 py-3 text-white/80 text-sm">
                  <strong className="text-white">Action needed:</strong> You have 3 assets without designated beneficiaries. <button type="button" onClick={openLogin} className="text-gold underline cursor-pointer bg-transparent border-none p-0 font-inherit hover:text-gold-bright transition-colors">Fix now &rarr;</button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════ SECURITY — Condensed ═══════════════════ */}
      <section id="security" className="py-12 relative z-10 overflow-hidden bg-[var(--royal)] text-white">
        <div className="max-w-6xl mx-auto px-5">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl text-white mb-3 font-[family-name:var(--font-cinzel)]">
              Your Data. <span className="text-gold">Fort Knox Security.</span>
            </h2>
            <p className="text-white/60 max-w-lg mx-auto text-base">
              Estate documents are the most sensitive data a family owns. We encrypt everything with the same technology banks use.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'AES-256 Encryption', desc: 'Military-grade at rest' },
              { label: 'Cloud KMS', desc: 'Google-managed keys' },
              { label: 'MFA Required', desc: 'For all sensitive access' },
              { label: 'SOC 2 Architecture', desc: 'Enterprise audit trail' },
            ].map((item) => (
              <Card key={item.label} className="bg-white rounded-xl border-0 ring-0 py-0 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                <CardContent className="p-5 text-center">
                  <div className="status-dot mx-auto mb-3" />
                  <div className="text-ink font-bold text-xs uppercase tracking-widest mb-1">{item.label}</div>
                  <div className="text-ink-muted text-xs">{item.desc}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ SOCIAL PROOF ═══════════════════ */}
      <section className="py-16 relative z-10 section-light">
        <div className="max-w-6xl mx-auto px-5">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl text-royal mb-3 font-[family-name:var(--font-cinzel)]">
              Built for <span className="text-[var(--gold)]">Real Families</span>
            </h2>
          </ScrollReveal>

          <StaggerList className="grid md:grid-cols-3 gap-6">
            <StaggerItem>
              <HoverCard>
                <TestimonialCard
                  quote="After my father passed, we spent 14 months in probate. I set up FinalWishes so my children never have to go through that."
                  name="Margaret T."
                  affiliation="Estate Owner, Maryland"
                  avatar="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=96&h=96&fit=crop&crop=faces"
                />
              </HoverCard>
            </StaggerItem>
            <StaggerItem>
              <HoverCard glowColor="rgba(200,169,81,0.15)">
                <TestimonialCard
                  quote="I uploaded every document, recorded messages for my kids, and designated my executor — all in one Saturday afternoon."
                  name="David K."
                  affiliation="Estate Owner, Illinois"
                  avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces"
                />
              </HoverCard>
            </StaggerItem>
            <StaggerItem>
              <HoverCard>
                <TestimonialCard
                  quote="When my client's spouse passed suddenly, their FinalWishes vault had everything we needed. It saved months of discovery."
                  name="Patricia M., Esq."
                  affiliation="Estate Attorney, Minnesota"
                  avatar="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=96&h=96&fit=crop&crop=faces"
                />
              </HoverCard>
            </StaggerItem>
          </StaggerList>
        </div>
      </section>

      {/* ═══════════════════ PRICING ═══════════════════ */}
      <section id="pricing" className="py-16 relative overflow-hidden z-10 bg-[var(--royal)] text-white">
        <div className="max-w-6xl mx-auto px-5 relative z-10">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl text-white mb-3 font-[family-name:var(--font-cinzel)]">
              Start Free. <span className="text-gold">Upgrade When Ready.</span>
            </h2>
            <p className="text-white/60 text-sm max-w-lg mx-auto">No credit card required. Your vault is free forever. Upgrade for unlimited storage, video memoirs, and AI guidance.</p>
          </ScrollReveal>

          <StaggerList className="grid md:grid-cols-3 gap-5 items-stretch">
            <StaggerItem><HoverCard className="h-full"><Card className="rounded-2xl ring-0 bg-white py-0 h-full shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="status-dot" />
                  <div className="text-[0.6rem] tracking-[0.15em] text-ink-muted uppercase">Guardian</div>
                </div>
                <div className="text-3xl text-royal mb-1 font-[family-name:var(--font-cinzel)]">FREE</div>
                <div className="text-sm text-ink-muted uppercase tracking-widest mb-4">Forever</div>
                <ul className="space-y-2 text-sm text-ink-muted mb-5 flex-grow">
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> 1 estate plan</li>
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> 5 document uploads</li>
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> Basic asset inventory</li>
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> Heir invitations</li>
                </ul>
                <Button variant="outline" onClick={openLogin} className="w-full py-3 border-2 border-[var(--neutral-border)] bg-transparent text-ink hover:bg-[var(--neutral-faint)] text-[0.6rem] font-bold uppercase tracking-widest rounded-lg h-auto">
                  Start Free
                </Button>
              </CardContent>
            </Card></HoverCard></StaggerItem>

            <StaggerItem><HoverCard glowColor="rgba(200,169,81,0.25)" className="h-full md:-mt-3 md:mb-3"><Card className="rounded-2xl ring-0 border-2 !border-gold/40 bg-white relative py-0 h-full shadow-[0_8px_40px_rgba(200,169,81,0.15)]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gold rounded-t-2xl" />
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="status-dot" />
                    <div className="text-[0.6rem] tracking-[0.15em] text-gold uppercase font-bold">Concierge</div>
                  </div>
                  <Badge className="bg-gold text-black text-[0.55rem] font-bold uppercase rounded border-none">Popular</Badge>
                </div>
                <div className="text-3xl text-royal mb-1 font-[family-name:var(--font-cinzel)]">$29<span className="text-lg text-ink-muted">/mo</span></div>
                <div className="text-sm text-ink-muted uppercase tracking-widest mb-4">Cancel Anytime</div>
                <ul className="space-y-2 text-sm text-ink-muted mb-5 flex-grow">
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> Unlimited documents</li>
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> PII encryption vault</li>
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> Video &amp; audio memoirs</li>
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> Time capsules</li>
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> Digital lockbox</li>
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> Priority support</li>
                </ul>
                <Button onClick={openLogin} className="bg-gold text-black w-full py-3 font-bold text-[0.65rem] uppercase tracking-widest rounded-lg hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(200,169,81,0.5)] transition-all border-none h-auto">
                  Get Started
                </Button>
              </CardContent>
            </Card></HoverCard></StaggerItem>

            <StaggerItem><HoverCard className="h-full"><Card className="rounded-2xl ring-0 bg-white py-0 h-full shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="status-dot" />
                  <div className="text-[0.6rem] tracking-[0.15em] text-ink-muted uppercase">White Glove</div>
                </div>
                <div className="text-3xl text-royal mb-1 font-[family-name:var(--font-cinzel)]">$99<span className="text-lg text-ink-muted">/mo</span></div>
                <div className="text-sm text-ink-muted uppercase tracking-widest mb-4">Cancel Anytime</div>
                <ul className="space-y-2 text-sm text-ink-muted mb-5 flex-grow">
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> Everything in Concierge</li>
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> AI Shepherd guidance</li>
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> Legal document review</li>
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> Multi-executor coordination</li>
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> Probate preparation</li>
                  <li className="flex gap-2"><span className="text-[var(--gold)]">✓</span> Phone support</li>
                </ul>
                <Button variant="outline" onClick={openLogin} className="w-full py-3 border-2 border-[var(--neutral-border)] bg-transparent text-ink hover:bg-[var(--neutral-faint)] text-[0.6rem] font-bold uppercase tracking-widest rounded-lg h-auto">
                  Get Started
                </Button>
              </CardContent>
            </Card></HoverCard></StaggerItem>
          </StaggerList>
        </div>
      </section>

      {/* ═══════════════════ FAQ ═══════════════════ */}
      <section id="faq" className="py-16 relative z-10 section-light">
        <div className="max-w-4xl mx-auto px-5">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl text-royal mb-3 font-[family-name:var(--font-cinzel)]">
              Common <span className="text-[var(--gold)]">Questions</span>
            </h2>
          </ScrollReveal>

          <div className="space-y-4">
            <FaqItem
              q="Is FinalWishes a substitute for a will or trust?"
              a="No. FinalWishes is an organizational and communication platform — it helps you gather, secure, and share the information your family needs. We strongly recommend working with an attorney for legal documents. FinalWishes makes their job easier by having everything organized."
            />
            <FaqItem
              q="What happens to my data if FinalWishes shuts down?"
              a="You can export all your data at any time. Your documents, memoirs, and records are yours. We also use standard formats (PDF, JSON) so nothing is locked into our platform. Our infrastructure runs on Google Cloud with automatic backups."
            />
            <FaqItem
              q="How do my heirs get access when I pass?"
              a="You designate heirs and executors in advance. When the time comes, your designated executor reports the status change. After identity verification, they receive access to exactly what you authorized — documents, passwords, personal messages, and settlement instructions."
            />
            <FaqItem
              q="Is my data really secure?"
              a="Yes. We use AES-256 encryption (the same standard used by banks and government agencies) with Google Cloud KMS for key management. Every document is encrypted at rest and in transit. Access requires multi-factor authentication, and every action is logged for accountability."
            />
            <FaqItem
              q="Can I try it before paying?"
              a="Absolutely. The Guardian plan is free forever — no credit card required. You can create a vault, upload documents, invite heirs, and explore the platform. Upgrade to Concierge or White Glove when you need unlimited storage, video memoirs, or AI guidance."
            />
            <FaqItem
              q="What states do you support?"
              a="FinalWishes is available in all 50 states. Our initial focus markets are Maryland, Illinois, and Minnesota, where we have deep compliance knowledge. The platform works everywhere — estate organization is universal."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden z-10 bg-[var(--royal)] text-white">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1609220136736-443140cffec6?q=80&w=1200&auto=format&fit=crop" alt="Family together" className="w-full h-full object-cover" loading="lazy" style={{ objectPosition: "center 20%" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
        </div>

        <div className="deco-corner top-left" />
        <div className="deco-corner top-right" />
        <div className="deco-corner bottom-left" />
        <div className="deco-corner bottom-right" />

        <div className="relative z-10 text-center px-5 max-w-4xl mx-auto flex flex-col items-center justify-center py-10">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-gold" />
            <div className="w-2 h-2 bg-gold rotate-45" />
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-gold" />
          </div>

          <h2 className="text-2xl md:text-3xl lg:text-4xl text-white mb-4 leading-tight font-[family-name:var(--font-cinzel)] hero-text">
            Don&apos;t Wait for the Moment<br />
            <span className="text-gold hero-text-gold">You Wish You Had Started.</span>
          </h2>
          <p className="text-sm md:text-base text-white/90 mb-5 max-w-xl mx-auto hero-text">
            15 minutes today can save your family months of confusion tomorrow.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button onClick={openLogin} className="bg-gold text-black px-8 py-3.5 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all border-none h-auto">
              Create Your Free Vault
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-white text-[0.65rem] tracking-[0.12em] uppercase">
            <div className="flex items-center gap-2"><div className="status-dot" /><span>Free Forever Plan</span></div>
            <div className="flex items-center gap-2"><div className="status-dot" /><span>No Credit Card</span></div>
            <div className="flex items-center gap-2"><div className="status-dot" /><span>Setup in 15 Minutes</span></div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="bg-[var(--royal)] border-t border-gold/20 py-6 relative z-10 text-white">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-5 gap-6 mb-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <svg viewBox="0 0 100 100" className="w-6 h-6 fill-current text-gold">
                  <path d="M50 20 C55 20 58 25 58 30 C58 35 55 38 50 38 C45 38 42 35 42 30 C42 25 45 20 50 20 M50 40 C60 40 70 30 80 15 C85 25 85 45 70 55 L60 60 L65 90 L50 85 L35 90 L40 60 L30 55 C15 45 15 25 20 15 C30 30 40 40 50 40 Z" />
                </svg>
                <span className="text-sm font-bold text-white tracking-widest font-[family-name:var(--font-cinzel)]">FINALWISHES</span>
              </div>
              <p className="text-white/60 text-xs leading-relaxed">The estate operating system. Organize your assets, preserve your voice, and give your family clarity when it matters most.</p>
            </div>
            <FooterCol title="Product" links={[{ label: "Who It's For", href: "#scenarios" }, { label: "How It Works", href: "#how-it-works" }, { label: "Security", href: "#security" }, { label: "Pricing", href: "#pricing" }]} />
            <FooterCol title="Company" links={[{ label: "About Us", href: "/about" }, { label: "Contact", href: "mailto:support@sirsi.ai" }]} />
            <FooterCol title="Legal" links={[{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "FAQ", href: "#faq" }]} />
          </div>

          <Separator className="bg-gold/20 mb-3" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-[0.6rem] text-white/40">&copy; 2026 FinalWishes Inc. Powered by <strong>Sirsi Technologies</strong>.</div>
            <div className="flex items-center gap-3">
              <Badge className="bg-transparent text-white/50 text-[0.6rem] uppercase tracking-wider font-normal px-0 h-auto border-none gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />AES-256
              </Badge>
              <Badge className="bg-transparent text-white/50 text-[0.6rem] uppercase tracking-wider font-normal px-0 h-auto border-none gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />Cloud KMS
              </Badge>
              <Badge className="bg-transparent text-white/50 text-[0.6rem] uppercase tracking-wider font-normal px-0 h-auto border-none gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />SOC 2
              </Badge>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══════════════════ LOGIN MODAL ═══════════════════ */}
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} invite={search.invite} />
    </main>
  );
}

/* ─── Login Modal ─── */

function navigatePostLogin(
  nav: ReturnType<typeof useNavigate>,
  profile: UserProfile | null,
  inviteId?: string,
) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  if (inviteId) {
    nav({ to: '/accept-invite', search: { id: inviteId } } as any);
  } else if (profile?.primaryEstateId) {
    nav({ to: '/estates/$estateId/dashboard', params: { estateId: profile.primaryEstateId as string } } as any);
  } else {
    nav({ to: '/estates/create' } as any);
  }
}

function LoginModal({ open, onOpenChange, invite }: { open: boolean; onOpenChange: (v: boolean) => void; invite?: string }) {
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword, user, profile, profileResolved } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'mfa' | 'forgot'>('signin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const resetEmailRef = useRef<HTMLInputElement>(null);
  const mfaCodeRef = useRef<HTMLInputElement>(null);

  // Focus-on-mount for the reset-password and MFA inputs. These replace the
  // removed autoFocus props (jsx-a11y/no-autofocus): focus is managed explicitly
  // so it only fires when the relevant form actually appears.
  useEffect(() => {
    if (mode === 'forgot' && !resetSent) resetEmailRef.current?.focus();
    if (mode === 'mfa') mfaCodeRef.current?.focus();
  }, [mode, resetSent]);

  // If already authenticated, redirect — but ONLY once the profile has a
  // definitive answer (profileResolved). Gating on `!loading` was the bug:
  // `loading` tracks Firebase auth init, not the Firestore profile read, so
  // existing users could be routed while `profile` was still null and dumped on
  // /estates/create (the "redo your estate" bug), then the modal closed so it
  // never corrected.
  useEffect(() => {
    if (user && profileResolved && open) {
      onOpenChange(false);
      navigatePostLogin(navigate, profile, invite);
    }
  }, [user, profile, profileResolved, navigate, invite, open, onOpenChange]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await signIn(identifier, password);
    setIsSubmitting(false);

    if (result.success) {
      return; // useEffect handles navigation
    } else if (result.mfaRequired && result.mfaResolver) {
      setMfaResolver(result.mfaResolver);
      setMode('mfa');
      setError('');
    } else {
      setError(result.error || 'Sign in failed. Please try again.');
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaResolver) return;
    setError('');
    setIsSubmitting(true);

    const result = await resolveTotpChallenge(mfaResolver, totpCode);
    setIsSubmitting(false);

    if (result.success) {
      // Let the gated redirect effect (user && profileResolved && open) handle
      // navigation once the profile resolves — navigating inline here with a
      // still-null `profile` was the same race that dumped users on /estates/create.
      setError('');
    } else {
      setError(result.error || 'MFA verification failed.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      setIsSubmitting(false);
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      setIsSubmitting(false);
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError('Username can only contain letters, numbers, and underscores.');
      setIsSubmitting(false);
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsSubmitting(false);
      return;
    }

    const result = await signUp({
      email: email.trim(),
      username: username.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
    setIsSubmitting(false);

    if (result.success) {
      onOpenChange(false);
      if (invite) {
        navigate({ to: '/accept-invite', search: { id: invite } });
      } else {
        navigate({ to: '/estates/create' });
      }
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="max-w-md rounded-[2.5rem] p-0 border-[var(--royal)]/10 shadow-[0_20px_50px_rgba(19,51,120,0.15)] bg-white/95 backdrop-blur-2xl gap-0"
      >
        <VisuallyHidden.Root><DialogTitle>Sign In</DialogTitle></VisuallyHidden.Root>

        {/* Header */}
        <div className="text-center pt-10 px-10 pb-0">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white border border-[var(--royal)]/10 rounded-2xl flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-[var(--royal)]">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <path d="M2 17l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <path d="M2 12l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            </div>
            <span className="font-[family-name:var(--font-cinzel)] text-2xl tracking-[0.15em] font-bold text-[var(--royal)]">
              FINALWISHES
            </span>
          </div>
          <h2 aria-hidden="true" className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[var(--royal)] mb-2">
            {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Reset Password' : 'Verification Required'}
          </h2>
          <p className="text-ink-muted text-sm font-medium max-w-[260px] mx-auto leading-relaxed">
            {mode === 'signin'
              ? 'Secure access to the Estate Operating System'
              : mode === 'signup'
              ? 'Start preserving your legacy today'
              : mode === 'forgot'
              ? "Enter your email and we'll send a reset link"
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        {/* Forms */}
        <div className="px-10 pt-6 pb-0">
          {mode === 'signin' ? (
            <form className="space-y-6" onSubmit={handleSignIn}>
              <div className="space-y-2">
                <Label htmlFor="modal-identifier" className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest pl-1">Email or Username</Label>
                <Input id="modal-identifier" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. jane@example.com" autoComplete="username" className="h-auto bg-[var(--neutral-faint)] border-[var(--neutral-border)] hover:border-[var(--royal)]/30 rounded-2xl px-6 py-4 font-semibold text-[14px] text-ink placeholder:text-ink-muted focus-visible:bg-white focus-visible:border-[var(--royal)] focus-visible:ring-0 focus-visible:shadow-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-password" className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest pl-1">Password</Label>
                <div className="relative">
                  <Input id="modal-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" className="h-auto bg-[var(--neutral-faint)] border-[var(--neutral-border)] hover:border-[var(--royal)]/30 rounded-2xl px-6 py-4 pr-14 font-semibold text-[14px] text-ink placeholder:text-ink-muted focus-visible:bg-white focus-visible:border-[var(--royal)] focus-visible:ring-0 focus-visible:shadow-sm" />
                  <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-[var(--royal)] z-10 h-8 w-8">
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </Button>
                </div>
              </div>
              {error && <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}
              <Button id="modal-submit" type="submit" disabled={isSubmitting} className="w-full bg-[var(--royal)] hover:bg-[var(--royal-blue)] disabled:opacity-60 text-white py-4 h-auto rounded-2xl font-bold text-sm shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] transition-all active:scale-95 mt-8">
                {isSubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</span> : 'Sign In'}
              </Button>
              <div className="flex items-center justify-between text-xs px-1 pt-2">
                <Button type="button" variant="link" onClick={() => { setMode('forgot'); setError(''); setResetSent(false); setResetEmail(identifier.includes('@') ? identifier : ''); }} className="text-ink-muted hover:text-[var(--royal)] font-medium text-xs p-0 h-auto no-underline hover:no-underline">Forgot password?</Button>
                <Button type="button" variant="link" onClick={() => { setMode('signup'); setError(''); }} className="text-ink-muted hover:text-[var(--royal)] font-medium text-xs p-0 h-auto no-underline hover:no-underline">Create account</Button>
              </div>
            </form>
          ) : mode === 'signup' ? (
            <form className="space-y-4" onSubmit={handleSignUp}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="modal-firstname" className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest pl-1">First Name</Label>
                  <Input id="modal-firstname" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" autoComplete="given-name" className="h-auto bg-[var(--neutral-faint)] border-[var(--neutral-border)] hover:border-[var(--royal)]/30 rounded-2xl px-4 py-3.5 font-semibold text-[14px] text-ink placeholder:text-ink-muted focus-visible:bg-white focus-visible:border-[var(--royal)] focus-visible:ring-0 focus-visible:shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="modal-lastname" className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest pl-1">Last Name</Label>
                  <Input id="modal-lastname" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" autoComplete="family-name" className="h-auto bg-[var(--neutral-faint)] border-[var(--neutral-border)] hover:border-[var(--royal)]/30 rounded-2xl px-4 py-3.5 font-semibold text-[14px] text-ink placeholder:text-ink-muted focus-visible:bg-white focus-visible:border-[var(--royal)] focus-visible:ring-0 focus-visible:shadow-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modal-username" className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest pl-1">Username</Label>
                <Input id="modal-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. janedoe" autoComplete="username" className="h-auto bg-[var(--neutral-faint)] border-[var(--neutral-border)] hover:border-[var(--royal)]/30 rounded-2xl px-6 py-3.5 font-semibold text-[14px] text-ink placeholder:text-ink-muted focus-visible:bg-white focus-visible:border-[var(--royal)] focus-visible:ring-0 focus-visible:shadow-sm" />
                <p className="text-[10px] text-ink-muted pl-1">Letters, numbers, underscores only. Min 3 characters.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modal-email" className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest pl-1">Email</Label>
                <Input id="modal-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. jane@example.com" autoComplete="email" className="h-auto bg-[var(--neutral-faint)] border-[var(--neutral-border)] hover:border-[var(--royal)]/30 rounded-2xl px-6 py-3.5 font-semibold text-[14px] text-ink placeholder:text-ink-muted focus-visible:bg-white focus-visible:border-[var(--royal)] focus-visible:ring-0 focus-visible:shadow-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modal-signup-pw" className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest pl-1">Password</Label>
                <div className="relative">
                  <Input id="modal-signup-pw" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" className="h-auto bg-[var(--neutral-faint)] border-[var(--neutral-border)] hover:border-[var(--royal)]/30 rounded-2xl px-6 py-3.5 pr-14 font-semibold text-[14px] text-ink placeholder:text-ink-muted focus-visible:bg-white focus-visible:border-[var(--royal)] focus-visible:ring-0 focus-visible:shadow-sm" />
                  <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-[var(--royal)] z-10 h-8 w-8">
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </Button>
                </div>
              </div>
              {error && <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}
              <Button type="submit" disabled={isSubmitting} className="w-full bg-[var(--royal)] hover:bg-[var(--royal-blue)] disabled:opacity-60 text-white py-4 h-auto rounded-2xl font-bold text-sm shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] transition-all active:scale-95 mt-6">
                {isSubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</span> : 'Create Account'}
              </Button>
              <div className="text-center text-xs text-ink-muted pt-2">
                <span>Already have an account? </span>
                <Button type="button" variant="link" onClick={() => { setMode('signin'); setError(''); }} className="text-[var(--royal)] hover:text-[var(--royal)] font-bold text-xs p-0 h-auto">Sign in</Button>
              </div>
            </form>
          ) : mode === 'forgot' ? (
            <div className="space-y-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[var(--gold)]/10 rounded-2xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--gold)]" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" /></svg>
                </div>
              </div>
              {resetSent ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      <span className="text-green-700 font-bold text-sm">Check your email</span>
                    </div>
                    <p className="text-green-600/70 text-[13px] font-medium">If an account exists for that email, we've sent password reset instructions.</p>
                  </div>
                  <Button type="button" variant="link" onClick={() => { setMode('signin'); setError(''); setResetSent(false); }} className="text-[var(--royal)] font-bold text-sm p-0 h-auto">&larr; Back to sign in</Button>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={async (e) => {
                  e.preventDefault();
                  setError('');
                  setIsSubmitting(true);
                  await resetPassword(resetEmail.trim());
                  setIsSubmitting(false);
                  setResetSent(true);
                }}>
                  <div className="space-y-2">
                    <Label htmlFor="modal-reset-email" className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest pl-1">Email Address</Label>
                    <Input ref={resetEmailRef} id="modal-reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required className="h-auto bg-[var(--neutral-faint)] border-[var(--neutral-border)] hover:border-[var(--royal)]/30 rounded-2xl px-6 py-4 font-semibold text-[14px] text-ink placeholder:text-ink-muted focus-visible:bg-white focus-visible:border-[var(--royal)] focus-visible:ring-0 focus-visible:shadow-sm" />
                  </div>
                  {error && <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}
                  <Button type="submit" disabled={isSubmitting || !resetEmail.includes('@')} className="w-full bg-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60 text-white py-4 h-auto rounded-2xl font-bold text-sm shadow-[0_4px_16px_rgba(200,169,81,0.2)] hover:shadow-[0_12px_32px_rgba(200,169,81,0.3)] transition-all active:scale-95">
                    {isSubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</span> : 'Send Reset Link'}
                  </Button>
                  <div className="text-center text-xs pt-2">
                    <Button type="button" variant="link" onClick={() => { setMode('signin'); setError(''); }} className="text-ink-muted hover:text-[var(--royal)] font-medium text-xs p-0 h-auto no-underline hover:no-underline">&larr; Back to sign in</Button>
                  </div>
                </form>
              )}
            </div>
          ) : mode === 'mfa' ? (
            <form className="space-y-6" onSubmit={handleMfaVerify}>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[var(--royal)]/5 rounded-2xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--royal)]" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-mfa" className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest pl-1">Authenticator Code</Label>
                <Input ref={mfaCodeRef} id="modal-mfa" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" autoComplete="one-time-code" className="h-auto bg-[var(--neutral-faint)] border-[var(--neutral-border)] hover:border-[var(--royal)]/30 rounded-2xl px-6 py-4 font-mono font-bold text-[24px] text-center text-ink placeholder:text-ink-muted focus-visible:bg-white focus-visible:border-[var(--royal)] focus-visible:ring-0 focus-visible:shadow-sm tracking-[0.5em]" />
              </div>
              {error && <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}
              <Button type="submit" disabled={isSubmitting || totpCode.length !== 6} className="w-full bg-[var(--royal)] hover:bg-[var(--royal-blue)] disabled:opacity-60 text-white py-4 h-auto rounded-2xl font-bold text-sm shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] transition-all active:scale-95 mt-8">
                {isSubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</span> : 'Verify'}
              </Button>
              <div className="text-center text-xs pt-2">
                <Button type="button" variant="link" onClick={() => { setMode('signin'); setError(''); setTotpCode(''); setMfaResolver(null); }} className="text-ink-muted hover:text-[var(--royal)] font-medium text-xs p-0 h-auto no-underline hover:no-underline">&larr; Back to sign in</Button>
              </div>
            </form>
          ) : null}
        </div>

        {/* Footer */}
        <div className="mt-8 mx-10 px-0 pt-0 pb-10">
          <Separator className="mb-6 bg-[var(--neutral-border)]" />
          <div className="flex items-center justify-center gap-6 w-full">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[11px] text-[var(--royal)]/40 font-bold uppercase tracking-widest">AES-256</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[11px] text-[var(--royal)]/40 font-bold uppercase tracking-widest">SOC 2 Architecture</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Hero Section ─── */

function HeroSection({ openLogin }: { openLogin: () => void }) {
  const [frameCount, setFrameCount] = useState(0)

  useEffect(() => {
    const img = new Image()
    img.onload = () => { detectFrameCount().then(setFrameCount) }
    img.onerror = () => { setFrameCount(0) }
    img.src = '/frames/frame-0001.jpg'
  }, [])

  if (frameCount > 0) {
    return (
      <div className="relative">
        <ScrollVideoCanvas frameCount={frameCount} scrollHeight={400} />
        <div className="fixed top-0 left-0 w-full h-screen z-20 pointer-events-none flex flex-col items-center justify-center">
          <div className="text-center max-w-6xl px-6 pointer-events-auto">
            <HeroContent openLogin={openLogin} />
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce pointer-events-none">
            <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  return (
    <header className="relative min-h-[70vh] flex flex-col items-center justify-center pt-16 overflow-hidden bg-[var(--royal)] text-white">
      <div className="absolute inset-0 z-0">
        <img src="/assets/images/hero-family.jpg" alt="Multi-generational family" className="w-full h-full object-cover" fetchPriority="high" style={{ objectPosition: "center 30%" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      </div>
      <div className="deco-corner top-left" /><div className="deco-corner top-right" /><div className="deco-corner bottom-left" /><div className="deco-corner bottom-right" />
      <div className="relative z-10 text-center max-w-6xl px-6">
        <HeroContent openLogin={openLogin} />
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </header>
  )
}

function HeroContent({ openLogin }: { openLogin: () => void }) {
  return (
    <>
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="w-20 h-px bg-gradient-to-r from-transparent to-gold" />
        <div className="w-2 h-2 bg-gold rotate-45" />
        <div className="w-20 h-px bg-gradient-to-l from-transparent to-gold" />
      </div>
      <h1 className="font-[family-name:var(--font-cinzel)] text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-6 hero-text drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
        Your Family&apos;s Future<br />
        <span className="text-gold hero-text-gold">Starts With a Plan.</span>
      </h1>
      <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
        Organize your estate, preserve your voice, and protect the people you love — all in one secure vault. Free to start. Ready in 15 minutes.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button onClick={openLogin} className="bg-gold text-black px-8 py-4 rounded-lg font-bold text-[0.7rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,81,0.5)] hover:-translate-y-0.5 transition-all border-none h-auto">
          Create Your Free Vault
        </Button>
        <Button variant="outline" asChild className="border-2 border-white/40 bg-transparent text-white px-8 py-4 rounded-lg font-semibold text-[0.7rem] uppercase tracking-[0.12em] hover:bg-white/10 hover:border-white/60 transition-all h-auto">
          <a href="#scenarios">See Who It&apos;s For</a>
        </Button>
      </div>
    </>
  )
}

/* ─── Scenario Card ─── */

function ScenarioCard({ emoji, title, description, cta, image, openLogin }: { emoji: string; title: string; description: string; cta: string; image: string; openLogin: () => void }) {
  return (
    <Card className="rounded-2xl overflow-hidden bg-white shadow-[0_4px_30px_rgba(0,0,0,0.1)] border-0 py-0 h-full">
      {/* Photo header with emoji badge */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={image}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-3 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-lg">
          {emoji}
        </div>
      </div>
      <CardContent className="p-6 flex flex-col flex-grow">
        <h3 className="text-royal font-bold text-base mb-2">{title}</h3>
        <p className="text-ink-muted text-sm leading-relaxed flex-grow mb-4">{description}</p>
        <Button variant="ghost" onClick={openLogin} className="text-[var(--gold)] text-xs font-bold uppercase tracking-widest p-0 h-auto hover:text-[var(--gold)] hover:bg-transparent self-start">
          {cta} &rarr;
        </Button>
      </CardContent>
    </Card>
  )
}

/* ─── Capability Card ─── */

function CapabilityCard({ icon, title, items, accent, image }: { icon: string; title: string; items: string[]; accent?: boolean; image: string }) {
  return (
    <Card className={`rounded-2xl overflow-hidden bg-white py-0 h-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${accent ? 'ring-2 ring-[var(--gold)]/40' : 'ring-0'} border-0`}>
      <div className="relative h-[180px] overflow-hidden">
        <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
      <CardContent className="p-7 flex flex-col flex-grow">
        <div className="text-3xl mb-3">{icon}</div>
        <h3 className={`font-bold text-xl mb-4 ${accent ? 'text-[var(--gold)]' : 'text-royal'}`}>{title}</h3>
        <ul className="space-y-3 flex-grow">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-[15px] text-ink leading-snug">
              <span className="text-[var(--gold)] shrink-0 text-lg">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/* ─── Testimonial Card ─── */

function TestimonialCard({ quote, name, affiliation, avatar }: { quote: string; name: string; affiliation: string; avatar: string }) {
  return (
    <Card className="rounded-2xl ring-0 bg-[var(--royal)] border-0 py-0 h-full shadow-[0_8px_40px_rgba(0,0,0,0.15)] hover:shadow-[0_16px_60px_rgba(0,0,0,0.2)] transition-shadow duration-300">
      <CardContent className="p-6 flex flex-col h-full">
        <p className="text-white/90 text-sm leading-relaxed mb-4 italic flex-grow">&ldquo;{quote}&rdquo;</p>
        <div className="border-t border-white/10 pt-3 flex items-center gap-3">
          <img
            src={avatar}
            alt=""
            className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-gold/30"
            loading="lazy"
          />
          <div>
            <div className="text-white font-bold text-sm">{name}</div>
            <div className="text-gold text-xs">{affiliation}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── FAQ Item ─── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <ScrollReveal delay={0}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left bg-[var(--neutral-faint)] border border-[var(--neutral-border)] rounded-xl px-6 py-5 transition-all hover:bg-[var(--neutral-faint)] cursor-pointer"
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-royal font-bold text-sm">{q}</h3>
          <span className={`text-[var(--gold)] text-lg transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
        </div>
        {open && (
          <p className="text-ink-muted text-sm leading-relaxed mt-3 pr-8">{a}</p>
        )}
      </button>
    </ScrollReveal>
  )
}

/* ─── Footer Column ─── */

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-gold font-bold text-[0.6rem] uppercase tracking-widest mb-2">{title}</h4>
      <ul className="space-y-1.5 text-white/60 text-xs">
        {links.map(l => (
          <li key={l.label}><a href={l.href} className="hover:text-white transition-colors">{l.label}</a></li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Frame Detection ─── */

async function detectFrameCount(): Promise<number> {
  let low = 1, high = 1000
  while (high <= 1000) {
    if (!(await frameExists(high))) break
    high *= 2
  }
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2)
    if (await frameExists(mid)) low = mid
    else high = mid - 1
  }
  return low
}

function frameExists(index: number): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = `/frames/frame-${String(index).padStart(4, '0')}.jpg`
  })
}
