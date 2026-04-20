/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollVideoCanvas } from '@/components/landing/ScrollVideoCanvas'
import { ProductShowcase } from '@/components/landing/ProductShowcase'
import { ScrollReveal, AnimatedCounter, HoverCard, StaggerList, StaggerItem } from '@/lib/animations'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
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
            <Button variant="ghost" asChild className="text-xs font-bold tracking-[0.15em] uppercase text-white/70 hover:text-white hover:bg-transparent transition-colors">
              <Link to="/login" search={{}}>Sign In</Link>
            </Button>
            <Button asChild className="bg-gold text-black px-5 py-2.5 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] hover:-translate-y-0.5 transition-all border-none">
              <Link to="/login" search={{}}>Start Free</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <HeroSection />

      {/* ═══════════════════ SCENARIO CARDS — "I'm here because..." ═══════════════════ */}
      <section id="scenarios" className="py-16 relative z-10 bg-[#152B65] text-white">
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
            <h2 className="text-3xl md:text-4xl text-[#1A1A1A] mb-6 leading-tight font-[family-name:var(--font-cinzel)]">
              The Cost of <span className="text-[#C8A951]">Not Being Ready</span>
            </h2>
            <p className="text-base md:text-lg text-[#4B5563] leading-relaxed mb-6">
              When someone passes without a plan, families face frozen accounts, lost passwords, missing documents, and legal battles that can last years. FinalWishes eliminates that chaos — before it starts.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-[#152B65] rounded-xl border-0 ring-0 py-0">
                <CardContent className="p-4 text-center">
                  <div className="text-xl font-bold text-white font-[family-name:var(--font-cinzel)]"><AnimatedCounter value={55} suffix="%" /></div>
                  <div className="text-[10px] text-gold uppercase tracking-wider mt-1 font-semibold">No Will</div>
                </CardContent>
              </Card>
              <Card className="bg-[#152B65] rounded-xl border-0 ring-0 py-0">
                <CardContent className="p-4 text-center">
                  <div className="text-xl font-bold text-white font-[family-name:var(--font-cinzel)]"><AnimatedCounter value={18} suffix=" mo" /></div>
                  <div className="text-[10px] text-gold uppercase tracking-wider mt-1 font-semibold">Avg Probate</div>
                </CardContent>
              </Card>
              <Card className="bg-[#152B65] rounded-xl border-0 ring-0 py-0">
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
      <section id="how-it-works" className="py-16 relative z-10 overflow-hidden bg-[#152B65] text-white">
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
            <h2 className="text-4xl md:text-5xl lg:text-6xl text-[#1A1A1A] mb-4 font-[family-name:var(--font-cinzel)]">
              Three Steps. <span className="text-[#C8A951]">Fifteen Minutes.</span>
            </h2>
            <p className="text-[#6B7280] text-lg max-w-xl mx-auto">That&apos;s all it takes to protect everything you&apos;ve built.</p>
          </ScrollReveal>

          <StaggerList className="grid md:grid-cols-3 gap-6">
            <StaggerItem>
              <Card className="rounded-2xl bg-[#152B65] border-0 py-0 h-full shadow-[0_8px_30px_rgba(16,42,86,0.3)]">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#C8A951] flex items-center justify-center mx-auto mb-5 text-[#152B65] font-bold text-xl font-[family-name:var(--font-cinzel)]">1</div>
                  <h4 className="text-white font-bold text-lg mb-3">Create Your Vault</h4>
                  <p className="text-white/70 text-[15px] leading-relaxed">Sign up free. Add your first document, asset, or memoir. Takes 2 minutes.</p>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="rounded-2xl bg-[#152B65] border-0 py-0 h-full shadow-[0_8px_30px_rgba(16,42,86,0.3)]">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#C8A951] flex items-center justify-center mx-auto mb-5 text-[#152B65] font-bold text-xl font-[family-name:var(--font-cinzel)]">2</div>
                  <h4 className="text-white font-bold text-lg mb-3">Invite Your Circle</h4>
                  <p className="text-white/70 text-[15px] leading-relaxed">Add heirs, executors, or your attorney. They get access only to what you allow.</p>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="rounded-2xl bg-[#152B65] border-0 py-0 h-full shadow-[0_8px_30px_rgba(16,42,86,0.3)]">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#C8A951] flex items-center justify-center mx-auto mb-5 text-[#152B65] font-bold text-xl font-[family-name:var(--font-cinzel)]">3</div>
                  <h4 className="text-white font-bold text-lg mb-3">Live in Peace</h4>
                  <p className="text-white/70 text-[15px] leading-relaxed">We stand watch. When the time comes, your people receive everything they need — automatically.</p>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerList>
        </div>
      </section>

      {/* ═══════════════════ PRODUCT SHOWCASE — See the Real App ═══════════════════ */}
      <section className="py-16 relative z-10 overflow-hidden bg-[#152B65] text-white">
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
            <p className="text-[#C8A951] text-xs font-bold uppercase tracking-[0.25em] mb-3">AI-Powered Guidance</p>
            <h2 className="text-3xl md:text-4xl text-[#1A1A1A] mb-6 font-[family-name:var(--font-cinzel)]">
              The Shepherd <span className="text-[#C8A951]">Guides You</span>
            </h2>
            <p className="text-[#4B5563] text-base leading-relaxed mb-6">
              Not sure where to start? Our AI engine analyzes your estate and tells you exactly what&apos;s missing, what&apos;s urgent, and what to do next. It&apos;s like having a personal estate advisor — available 24/7.
            </p>
            <ul className="space-y-3 text-[#4B5563] text-sm">
              <li className="flex gap-3"><span className="text-[#C8A951] text-lg">✓</span> Personalized completion checklist</li>
              <li className="flex gap-3"><span className="text-[#C8A951] text-lg">✓</span> Daily prompts to capture your story</li>
              <li className="flex gap-3"><span className="text-[#C8A951] text-lg">✓</span> Obituary drafting assistance</li>
              <li className="flex gap-3"><span className="text-[#C8A951] text-lg">✓</span> Smart suggestions based on your situation</li>
            </ul>
          </ScrollReveal>
          <ScrollReveal direction="right">
            <div className="bg-[#152B65] rounded-2xl p-6 border-0">
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
                  <strong className="text-white">Action needed:</strong> You have 3 assets without designated beneficiaries. <span className="text-gold underline cursor-pointer">Fix now &rarr;</span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════ SECURITY — Condensed ═══════════════════ */}
      <section id="security" className="py-12 relative z-10 overflow-hidden bg-[#152B65] text-white">
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
                  <div className="text-[#1A1A1A] font-bold text-xs uppercase tracking-widest mb-1">{item.label}</div>
                  <div className="text-[#6B7280] text-xs">{item.desc}</div>
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
            <h2 className="text-2xl md:text-3xl text-[#1A1A1A] mb-3 font-[family-name:var(--font-cinzel)]">
              Built for <span className="text-[#C8A951]">Real Families</span>
            </h2>
          </ScrollReveal>

          <StaggerList className="grid md:grid-cols-3 gap-6">
            <StaggerItem>
              <HoverCard>
                <TestimonialCard
                  quote="After my father passed, we spent 14 months in probate. I set up FinalWishes so my children never have to go through that."
                  name="Margaret T."
                  role="Estate Owner, Maryland"
                  avatar="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=96&h=96&fit=crop&crop=faces"
                />
              </HoverCard>
            </StaggerItem>
            <StaggerItem>
              <HoverCard glowColor="rgba(200,169,81,0.15)">
                <TestimonialCard
                  quote="I uploaded every document, recorded messages for my kids, and designated my executor — all in one Saturday afternoon."
                  name="David K."
                  role="Estate Owner, Illinois"
                  avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces"
                />
              </HoverCard>
            </StaggerItem>
            <StaggerItem>
              <HoverCard>
                <TestimonialCard
                  quote="When my client's spouse passed suddenly, their FinalWishes vault had everything we needed. It saved months of discovery."
                  name="Patricia M., Esq."
                  role="Estate Attorney, Minnesota"
                  avatar="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=96&h=96&fit=crop&crop=faces"
                />
              </HoverCard>
            </StaggerItem>
          </StaggerList>
        </div>
      </section>

      {/* ═══════════════════ PRICING ═══════════════════ */}
      <section id="pricing" className="py-16 relative overflow-hidden z-10 bg-[#152B65] text-white">
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
                  <div className="text-[0.6rem] tracking-[0.15em] text-[#9CA3AF] uppercase">Guardian</div>
                </div>
                <div className="text-3xl text-[#1A1A1A] mb-1 font-[family-name:var(--font-cinzel)]">FREE</div>
                <div className="text-sm text-[#9CA3AF] uppercase tracking-widest mb-4">Forever</div>
                <ul className="space-y-2 text-sm text-[#4B5563] mb-5 flex-grow">
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> 1 estate plan</li>
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> 5 document uploads</li>
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> Basic asset inventory</li>
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> Heir invitations</li>
                </ul>
                <Button variant="outline" asChild className="w-full py-3 border-2 border-[#D1D5DB] bg-transparent text-[#374151] hover:bg-[#F3F4F6] text-[0.6rem] font-bold uppercase tracking-widest rounded-lg h-auto">
                  <Link to="/login" search={{}}>Start Free</Link>
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
                <div className="text-3xl text-[#1A1A1A] mb-1 font-[family-name:var(--font-cinzel)]">$29<span className="text-lg text-[#9CA3AF]">/mo</span></div>
                <div className="text-sm text-[#9CA3AF] uppercase tracking-widest mb-4">Cancel Anytime</div>
                <ul className="space-y-2 text-sm text-[#4B5563] mb-5 flex-grow">
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> Unlimited documents</li>
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> PII encryption vault</li>
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> Video &amp; audio memoirs</li>
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> Time capsules</li>
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> Digital lockbox</li>
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> Priority support</li>
                </ul>
                <Button asChild className="bg-gold text-black w-full py-3 font-bold text-[0.65rem] uppercase tracking-widest rounded-lg hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(200,169,81,0.5)] transition-all border-none h-auto">
                  <Link to="/login" search={{}}>Get Started</Link>
                </Button>
              </CardContent>
            </Card></HoverCard></StaggerItem>

            <StaggerItem><HoverCard className="h-full"><Card className="rounded-2xl ring-0 bg-white py-0 h-full shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="status-dot" />
                  <div className="text-[0.6rem] tracking-[0.15em] text-[#9CA3AF] uppercase">White Glove</div>
                </div>
                <div className="text-3xl text-[#1A1A1A] mb-1 font-[family-name:var(--font-cinzel)]">$99<span className="text-lg text-[#9CA3AF]">/mo</span></div>
                <div className="text-sm text-[#9CA3AF] uppercase tracking-widest mb-4">Cancel Anytime</div>
                <ul className="space-y-2 text-sm text-[#4B5563] mb-5 flex-grow">
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> Everything in Concierge</li>
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> AI Shepherd guidance</li>
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> Legal document review</li>
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> Multi-executor coordination</li>
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> Probate preparation</li>
                  <li className="flex gap-2"><span className="text-[#C8A951]">✓</span> Phone support</li>
                </ul>
                <Button variant="outline" asChild className="w-full py-3 border-2 border-[#D1D5DB] bg-transparent text-[#374151] hover:bg-[#F3F4F6] text-[0.6rem] font-bold uppercase tracking-widest rounded-lg h-auto">
                  <Link to="/login" search={{}}>Get Started</Link>
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
            <h2 className="text-2xl md:text-3xl text-[#1A1A1A] mb-3 font-[family-name:var(--font-cinzel)]">
              Common <span className="text-[#C8A951]">Questions</span>
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
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden z-10 bg-[#152B65] text-white">
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
            <Button asChild className="bg-gold text-black px-8 py-3.5 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all border-none h-auto">
              <Link to="/login" search={{}}>Create Your Free Vault</Link>
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
      <footer className="bg-[#152B65] border-t border-gold/20 py-6 relative z-10 text-white">
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
            <FooterCol title="Company" links={[{ label: "About Us", href: "#scenarios" }, { label: "Contact", href: "mailto:support@sirsi.ai" }]} />
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
    </main>
  );
}

/* ─── Hero Section ─── */

function HeroSection() {
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
            <HeroContent />
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
    <header className="relative min-h-[70vh] flex flex-col items-center justify-center pt-16 overflow-hidden bg-[#152B65] text-white">
      <div className="absolute inset-0 z-0">
        <img src="/assets/images/hero-family.jpg" alt="Multi-generational family" className="w-full h-full object-cover" fetchPriority="high" style={{ objectPosition: "center 30%" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      </div>
      <div className="deco-corner top-left" /><div className="deco-corner top-right" /><div className="deco-corner bottom-left" /><div className="deco-corner bottom-right" />
      <div className="relative z-10 text-center max-w-6xl px-6">
        <HeroContent />
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </header>
  )
}

function HeroContent() {
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
        <Button asChild className="bg-gold text-black px-8 py-4 rounded-lg font-bold text-[0.7rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,81,0.5)] hover:-translate-y-0.5 transition-all border-none h-auto">
          <Link to="/login" search={{}}>Create Your Free Vault</Link>
        </Button>
        <Button variant="outline" asChild className="border-2 border-white/40 bg-transparent text-white px-8 py-4 rounded-lg font-semibold text-[0.7rem] uppercase tracking-[0.12em] hover:bg-white/10 hover:border-white/60 transition-all h-auto">
          <a href="#scenarios">See Who It&apos;s For</a>
        </Button>
      </div>
    </>
  )
}

/* ─── Scenario Card ─── */

function ScenarioCard({ emoji, title, description, cta, image }: { emoji: string; title: string; description: string; cta: string; image: string }) {
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
        <h3 className="text-[#1A1A1A] font-bold text-base mb-2">{title}</h3>
        <p className="text-[#4B5563] text-sm leading-relaxed flex-grow mb-4">{description}</p>
        <Button asChild variant="ghost" className="text-[#C8A951] text-xs font-bold uppercase tracking-widest p-0 h-auto hover:text-[#B8993F] hover:bg-transparent self-start">
          <Link to="/login" search={{}}>{cta} &rarr;</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

/* ─── Capability Card ─── */

function CapabilityCard({ icon, title, items, accent, image }: { icon: string; title: string; items: string[]; accent?: boolean; image: string }) {
  return (
    <Card className={`rounded-2xl overflow-hidden bg-white py-0 h-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${accent ? 'ring-2 ring-[#C8A951]/40' : 'ring-0'} border-0`}>
      <div className="relative h-[180px] overflow-hidden">
        <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
      <CardContent className="p-7 flex flex-col flex-grow">
        <div className="text-3xl mb-3">{icon}</div>
        <h3 className={`font-bold text-xl mb-4 ${accent ? 'text-[#C8A951]' : 'text-[#1A1A1A]'}`}>{title}</h3>
        <ul className="space-y-3 flex-grow">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-[15px] text-[#374151] leading-snug">
              <span className="text-[#C8A951] shrink-0 text-lg">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/* ─── Testimonial Card ─── */

function TestimonialCard({ quote, name, role, avatar }: { quote: string; name: string; role: string; avatar: string }) {
  return (
    <Card className="rounded-2xl ring-0 bg-[#152B65] border-0 py-0 h-full shadow-[0_8px_40px_rgba(0,0,0,0.15)] hover:shadow-[0_16px_60px_rgba(0,0,0,0.2)] transition-shadow duration-300">
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
            <div className="text-gold text-xs">{role}</div>
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
        className="w-full text-left bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl px-6 py-5 transition-all hover:bg-[#F3F4F6] cursor-pointer"
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-[#1A1A1A] font-bold text-sm">{q}</h3>
          <span className={`text-[#C8A951] text-lg transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
        </div>
        {open && (
          <p className="text-[#4B5563] text-sm leading-relaxed mt-3 pr-8">{a}</p>
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
