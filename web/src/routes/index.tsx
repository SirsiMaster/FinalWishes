/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  useEffect(() => {
    document.body.classList.add('royal-theme');
    document.body.classList.remove('dashboard-theme');
    return () => {
      document.body.classList.remove('royal-theme');
    }
  }, []);

  return (
    <main className="min-h-screen text-white relative">
      {/* ── Floating Orbs (ambient depth) ── */}
      <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full opacity-20"
          style={{
            width: 500,
            height: 500,
            top: "-10%",
            right: "-5%",
            background: "radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "float-1 15s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full opacity-15"
          style={{
            width: 400,
            height: 400,
            bottom: "10%",
            left: "-5%",
            background: "radial-gradient(circle, rgba(200,169,81,0.3) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "float-2 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full opacity-10"
          style={{
            width: 300,
            height: 300,
            top: "50%",
            left: "40%",
            background: "radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)",
            filter: "blur(60px)",
            animation: "float-3 18s ease-in-out infinite",
          }}
        />
      </div>

      {/* ═══════════════════ NAVBAR ═══════════════════ */}
      <nav className="fixed top-0 w-full z-50 h-16 backdrop-blur-md" style={{ background: "rgba(0,0,0,0.2)" }}>
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
            <a href="#problem" className="hover:text-white transition-colors">Problem</a>
            <a href="#protocol" className="hover:text-white transition-colors">Protocol</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <a href="#stories" className="hover:text-white transition-colors">Stories</a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild className="text-xs font-bold tracking-[0.15em] uppercase text-white/70 hover:text-white hover:bg-transparent transition-colors">
              <Link to="/login" search={{}}>Sign In</Link>
            </Button>
            <Button asChild className="bg-gold text-black px-5 py-2.5 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] hover:-translate-y-0.5 transition-all border-none">
              <Link to="/login" search={{}}>Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <header className="relative min-h-[65vh] flex flex-col items-center justify-center pt-16 overflow-hidden">
        {/* Hero background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/images/hero-family.jpg"
            alt="Happy African American multi-generational family portrait"
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 30%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        {/* Art Deco corners */}
        <div className="deco-corner top-left" />
        <div className="deco-corner top-right" />
        <div className="deco-corner bottom-left" />
        <div className="deco-corner bottom-right" />

        <div className="relative z-10 text-center max-w-5xl px-6">
          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-20 h-px bg-gradient-to-r from-transparent to-gold" />
            <div className="w-2 h-2 bg-gold rotate-45" />
            <div className="w-20 h-px bg-gradient-to-l from-transparent to-gold" />
          </div>

          <p className="font-[family-name:var(--font-cinzel)] text-xl md:text-2xl tracking-[0.25em] uppercase text-white hero-text mb-6 font-bold">
            The Operating System for Your Life&apos;s Work
          </p>

          <h1 className="font-[family-name:var(--font-cinzel)] text-5xl md:text-6xl lg:text-7xl leading-[1.1] mb-8 hero-text">
            Preserve Your Story.
            <br />
            <span className="text-gold hero-text-gold">Protect Your People.</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            The first platform that bridges <strong className="text-white">Life</strong> and{" "}
            <strong className="text-white">Legacy</strong>. Secure your memoirs, guide your heirs,
            and automate the chaos of estate settlement.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Button asChild className="bg-gold text-black px-8 py-4 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] hover:-translate-y-0.5 transition-all border-none h-auto">
              <Link to="/login" search={{}}>Create Your Vault</Link>
            </Button>
            <Button variant="outline" asChild className="border-2 border-white/40 bg-transparent text-white px-8 py-4 rounded-lg font-semibold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-white/10 hover:border-white/60 transition-all h-auto">
              <a href="#protocol">See How It Works</a>
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </header>

      <Separator className="bg-gold/20" />

      {/* ═══════════════════ PROBLEM SECTION ═══════════════════ */}
      <section id="problem" className="relative z-10 grid md:grid-cols-2">
        <div className="relative min-h-[300px] md:min-h-[400px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1516307365426-bea591f05011?q=80&w=3840&auto=format&fit=crop"
            alt="Old photographs and letters"
            className="w-full h-full object-cover"
          />
          {/* Stat overlay */}
          <div className="absolute bottom-6 left-6 bg-black/70 backdrop-blur-md rounded-xl p-5 border border-white/10">
            <div className="text-3xl font-bold text-danger font-[family-name:var(--font-cinzel)]">$72 Billion</div>
            <div className="text-sm text-white/60 uppercase tracking-[0.1em] mt-1">In Unclaimed Assets Nationwide</div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-8 md:px-12 py-10 glass-panel">
          <div className="max-w-lg mx-auto">
            <h2 className="text-3xl md:text-5xl text-white mb-6 leading-tight font-[family-name:var(--font-cinzel)]">
              Two Tragedies:<br />
              <span className="text-gold">Chaos &amp; Silence</span>
            </h2>
            <p className="text-base md:text-lg text-white/80 leading-relaxed mb-6">
              Death brings two tragedies. First, the <strong className="text-white">Silence</strong>—the extinguishing of a unique voice,
              wisdom, and history. Second, the <strong className="text-white">Chaos</strong>—the wreckage of frozen assets, legal battles,
              and family confusion that can last for years. FinalWishes is the bridge that prevents both.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-black/30 backdrop-blur-md rounded-xl border-white/10 ring-0 py-0">
                <CardContent className="p-5">
                  <div className="text-2xl font-bold text-white font-[family-name:var(--font-cinzel)]">$2B+</div>
                  <div className="text-xs text-gold uppercase tracking-[0.1em] mt-1 font-semibold">Annual Probate Costs</div>
                </CardContent>
              </Card>
              <Card className="bg-black/30 backdrop-blur-md rounded-xl border-white/10 ring-0 py-0">
                <CardContent className="p-5">
                  <div className="text-2xl font-bold text-white font-[family-name:var(--font-cinzel)]">55%</div>
                  <div className="text-xs text-gold uppercase tracking-[0.1em] mt-1 font-semibold">Adults Without a Will</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Separator className="bg-gold/20" />

      {/* ═══════════════════ VALUE PROPOSITION ═══════════════════ */}
      <section id="value" className="py-10 relative z-10 overflow-hidden">
        <div className="max-w-4xl mx-auto px-5 relative z-10 text-center">
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
            We automate the chaotic administration of loss—so your family can grieve in peace, not paperwork.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
            <Button asChild className="bg-gold text-black px-6 py-3 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all border-none h-auto">
              <Link to="/login" search={{}}>Begin Your Legacy</Link>
            </Button>
            <Button variant="outline" asChild className="border-2 border-white/30 bg-transparent text-white px-6 py-3 rounded-lg font-semibold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-white/10 transition-all h-auto">
              <a href="#protocol">See How It Works</a>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-white text-[0.65rem] tracking-[0.12em] uppercase font-semibold">
            <div className="flex items-center gap-2">
              <div className="status-dot" />
              <span>AES-256 Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="status-dot" />
              <span>Designed for SOC 2 Compliance</span>
            </div>
          </div>
        </div>
      </section>

      <Separator className="bg-gold/20" />

      {/* ═══════════════════ PROTOCOL — 4 Steps ═══════════════════ */}
      <section id="protocol" className="py-12 relative z-10 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl text-white mb-4 font-[family-name:var(--font-cinzel)]">
              The <span className="text-gold">Living</span> Protocol
            </h2>
            <p className="text-white/60 max-w-xl mx-auto">A unified workflow for your life and your legacy.</p>
          </div>

          <div className="space-y-0">
            {/* Step 1: BUILD LEGACY */}
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative h-[280px] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop" alt="Family planning together" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/40" />
                <div className="absolute top-5 left-5 flex items-center gap-3">
                  <div className="status-dot" />
                  <span className="text-5xl font-bold text-white/30 font-[family-name:var(--font-cinzel)]">01</span>
                </div>
              </div>
              <div className="flex flex-col justify-center p-8 glass-panel border-l-2 border-gold/20">
                <h3 className="text-3xl text-gold mb-3 font-[family-name:var(--font-cinzel)]">LIVING LEGACY</h3>
                <p className="text-base text-white/80 leading-relaxed mb-4">
                  Wealth is transient. Wisdom is eternal. Capture your voice, your values, and your vision while you are vibrant. Create a vault of truth that outlasts you.
                </p>
                <ul className="space-y-2 text-base text-white/60">
                  <li className="flex items-center gap-2"><span className="text-gold">✓</span> Video &amp; Audio Memoirs</li>
                  <li className="flex items-center gap-2"><span className="text-gold">✓</span> Asset Distribution Wishlist</li>
                  <li className="flex items-center gap-2"><span className="text-gold">✓</span> Secure Password Vault</li>
                </ul>
              </div>
            </div>

            {/* Step 2: VERIFY */}
            <div className="grid md:grid-cols-2 gap-0">
              <div className="flex flex-col justify-center p-8 glass-panel border-r-2 border-gold/20 order-2 md:order-1">
                <h3 className="text-3xl text-white mb-3 font-[family-name:var(--font-cinzel)]">VERIFY &amp; LOCK</h3>
                <p className="text-base text-white/80 leading-relaxed mb-4">
                  We stand watch. When the time comes, designated contacts initiate the verification process. Your estate enters a secure state, protecting digital assets against unauthorized access.
                </p>
                <ul className="space-y-2 text-base text-white/60">
                  <li className="flex items-center gap-2"><span className="text-royal-bright">✓</span> Multi-Factor Authentication</li>
                  <li className="flex items-center gap-2"><span className="text-royal-bright">✓</span> Executor Identity Verification</li>
                </ul>
              </div>
              <div className="relative h-[280px] overflow-hidden order-1 md:order-2">
                <img src="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=600&fit=crop&auto=format" alt="Digital security verification" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/40" />
                <div className="absolute top-5 right-5 flex items-center gap-3">
                  <span className="text-5xl font-bold text-white/30 font-[family-name:var(--font-cinzel)]">02</span>
                  <div className="status-dot" />
                </div>
              </div>
            </div>

            {/* Step 3: NOTIFY */}
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative h-[280px] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop" alt="Legal documents and notifications" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/40" />
                <div className="absolute top-5 left-5 flex items-center gap-3">
                  <div className="status-dot" />
                  <span className="text-5xl font-bold text-white/30 font-[family-name:var(--font-cinzel)]">03</span>
                </div>
              </div>
              <div className="flex flex-col justify-center p-8 glass-panel border-l-2 border-gold/20">
                <h3 className="text-3xl text-gold mb-3 font-[family-name:var(--font-cinzel)]">AUTOMATED NOTIFICATION</h3>
                <p className="text-base text-white/80 leading-relaxed mb-4">
                  The silence is broken on your terms. Your pre-recorded messages and legal directives are dispatched instantly to heirs, attorneys, and loved ones. No delays. No secrets.
                </p>
                <ul className="space-y-2 text-base text-white/60">
                  <li className="flex items-center gap-2"><span className="text-gold">✓</span> Legal Notifications</li>
                  <li className="flex items-center gap-2"><span className="text-gold">✓</span> Personal Letters</li>
                  <li className="flex items-center gap-2"><span className="text-gold">✓</span> Funeral Instructions</li>
                </ul>
              </div>
            </div>

            {/* Step 4: DISTRIBUTE */}
            <div className="grid md:grid-cols-2 gap-0">
              <div className="flex flex-col justify-center p-8 glass-panel border-r-2 border-gold/20 order-2 md:order-1">
                <h3 className="text-3xl text-white mb-3 font-[family-name:var(--font-cinzel)]">DISTRIBUTE</h3>
                <p className="text-base text-white/80 leading-relaxed mb-4">
                  The final transfer. Your documented wishes—accounts, credentials, and keepsakes—are shared with designated beneficiaries according to your instructions. Clear guidance replaces confusion.
                </p>
                <ul className="space-y-2 text-base text-white/60">
                  <li className="flex items-center gap-2"><span className="text-gold">✓</span> Digital Account Access</li>
                  <li className="flex items-center gap-2"><span className="text-gold">✓</span> Passwords &amp; Keys</li>
                  <li className="flex items-center gap-2"><span className="text-gold">✓</span> Sentimental Items</li>
                </ul>
                <Button asChild className="bg-gold text-black px-6 py-3 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all mt-6 self-start border-none h-auto">
                  <Link to="/login" search={{}}>Start Your Protocol</Link>
                </Button>
              </div>
              <div className="relative min-h-[280px] md:h-auto overflow-hidden order-1 md:order-2">
                <img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=600&fit=crop&crop=faces" alt="Family embracing together" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/40" />
                <div className="absolute top-5 right-5 flex items-center gap-3">
                  <span className="text-5xl font-bold text-gold/30 font-[family-name:var(--font-cinzel)]">04</span>
                  <div className="status-dot" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Separator className="bg-gold/20" />

      {/* ═══════════════════ SECURITY — Swiss Vault ═══════════════════ */}
      <section id="security" className="relative min-h-[45vh] flex items-center overflow-hidden z-10">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=3840&auto=format&fit=crop" alt="Secure data center vault" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/80" />
        </div>

        {/* Animated Shield (desktop) */}
        <div className="absolute right-10 md:right-1/4 top-1/2 -translate-y-1/2 z-[3] hidden md:block">
          <div className="relative">
            <div className="w-48 h-48 border-2 border-gold/30 rounded-full absolute -inset-6" style={{ animation: "spin 30s linear infinite" }} />
            <svg viewBox="0 0 24 24" className="w-36 h-36 text-gold fill-current opacity-30">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
            <div className="absolute -top-3 -right-3 glass-card rounded-lg px-3 py-1 flex items-center gap-2">
              <div className="status-dot" />
              <Badge className="bg-transparent text-royal-bright text-[0.6rem] uppercase tracking-widest font-bold px-0 h-auto border-none">AES-256</Badge>
            </div>
            <div className="absolute -bottom-3 -left-3 glass-card rounded-lg px-3 py-1 flex items-center gap-2">
              <div className="status-dot" />
              <Badge className="bg-transparent text-gold text-[0.6rem] uppercase tracking-widest font-bold px-0 h-auto border-none">KMS</Badge>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-10 items-center w-full py-16">
          <div>
            <h2 className="text-3xl md:text-5xl text-white mb-5 leading-tight font-[family-name:var(--font-cinzel)]">
              Built Like a <span className="text-gold">Swiss Vault</span>
            </h2>
            <p className="text-base md:text-lg text-white/90 leading-relaxed mb-6">
              Your family&apos;s data is more valuable than gold. We treat it that way.
              FinalWishes uses AES-256 encryption with Cloud KMS envelope keys to protect your estate data{" "}
              <strong className="text-gold">at every layer</strong>—at rest and in transit.
            </p>

            <div className="space-y-4">
              <Card className="glass-card rounded-xl ring-0 border-0 bg-transparent py-0">
                <CardContent className="p-4 flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-royal/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-royal-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-1">AES-256 Encryption at Rest</h4>
                    <p className="text-sm text-white/70">Your data is encrypted at rest, secured by Cloud KMS envelope encryption.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card rounded-xl ring-0 border-0 bg-transparent py-0">
                <CardContent className="p-4 flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-1">Multi-Party Verification</h4>
                    <p className="text-sm text-white/70">Requires identity verification from designated executors before any estate data is released.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card rounded-xl ring-0 border-0 bg-transparent py-0">
                <CardContent className="p-4 flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-royal/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-royal-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-1">Audit Trail</h4>
                    <p className="text-sm text-white/70">Every access attempt is logged and timestamped for full accountability.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="hidden md:block" />
        </div>
      </section>

      <Separator className="bg-gold/20" />

      {/* ═══════════════════ TRUST ═══════════════════ */}
      <section id="stories" className="py-12 relative overflow-hidden z-10">
        <div className="max-w-6xl mx-auto px-5 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl lg:text-4xl text-white mb-4 font-[family-name:var(--font-cinzel)]">
              Trusted by Families <span className="text-gold">Across America</span>
            </h2>
            <p className="text-base text-white/60 max-w-xl mx-auto">Join thousands of families who have taken control of their estate planning.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <Card className="glass-card rounded-2xl overflow-hidden ring-0 border-0 bg-transparent py-0">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-royal/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-royal-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-2 font-[family-name:var(--font-cinzel)]">Bank-Grade Encryption</h4>
                <p className="text-sm text-white/60 leading-relaxed">AES-256 encryption with Cloud KMS envelope keys protects every document and record.</p>
              </CardContent>
            </Card>
            <Card className="glass-card rounded-2xl overflow-hidden ring-0 border-0 bg-transparent py-0">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-2 font-[family-name:var(--font-cinzel)]">SOC 2 Designed</h4>
                <p className="text-sm text-white/60 leading-relaxed">Infrastructure designed to meet SOC 2 compliance standards for data security.</p>
              </CardContent>
            </Card>
            <Card className="glass-card rounded-2xl overflow-hidden ring-0 border-0 bg-transparent py-0">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-royal/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-royal-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-2 font-[family-name:var(--font-cinzel)]">24/7 Secure Access</h4>
                <p className="text-sm text-white/60 leading-relaxed">Access your estate vault anytime with multi-factor authentication and audit logging.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Separator className="bg-gold/20" />

      {/* ═══════════════════ ROADMAP ═══════════════════ */}
      <section id="roadmap" className="py-12 relative overflow-hidden z-10">
        <div className="max-w-6xl mx-auto px-5 relative z-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-royal-bright animate-pulse" />
            <Badge className="bg-transparent text-gold text-[0.6rem] tracking-[0.15em] uppercase font-bold px-0 h-auto border-none">Coming Soon</Badge>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl text-white mb-4 font-[family-name:var(--font-cinzel)]">
            More Features <span className="text-gold">Coming Soon</span>
          </h2>
          <p className="text-base text-white/60 max-w-xl mx-auto">We are continuously expanding the platform to better serve your family&apos;s needs.</p>
        </div>
      </section>

      <Separator className="bg-gold/20" />

      {/* ═══════════════════ PRICING ═══════════════════ */}
      <section id="pricing" className="py-12 relative overflow-hidden z-10">
        <div className="max-w-5xl mx-auto px-5 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl lg:text-4xl text-white mb-4 font-[family-name:var(--font-cinzel)]">
              Choose Your <span className="text-gold">Protocol</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {/* Free */}
            <Card className="glass-card rounded-2xl ring-0 border-0 bg-transparent py-0">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="status-dot" />
                  <div className="text-[0.6rem] tracking-[0.15em] text-white/60 uppercase">Self-Guided</div>
                </div>
                <div className="text-3xl text-white mb-1 font-[family-name:var(--font-cinzel)]">FREE</div>
                <div className="text-sm text-white/50 uppercase tracking-widest mb-4">Forever</div>
                <p className="text-white/60 text-sm mb-5 flex-grow">For families who need a roadmap but can handle the execution.</p>
                <Button variant="outline" asChild className="w-full py-3 border-2 border-white/30 bg-transparent text-white hover:bg-white/10 hover:border-white/50 transition-all text-[0.6rem] font-bold uppercase tracking-widest text-center rounded-lg h-auto">
                  <Link to="/login" search={{}}>Start Free</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Concierge (Gold) */}
            <Card className="glass-card rounded-2xl ring-0 border-2 !border-gold/50 bg-transparent relative md:-mt-3 md:mb-3 py-0">
              <div className="absolute top-0 left-0 w-full h-1 bg-gold rounded-t-2xl" />
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="status-dot" />
                    <div className="text-[0.6rem] tracking-[0.15em] text-gold uppercase font-bold">Concierge</div>
                  </div>
                  <Badge className="bg-gold text-black text-[0.55rem] font-bold uppercase rounded border-none">Popular</Badge>
                </div>
                <div className="text-3xl text-white mb-1 font-[family-name:var(--font-cinzel)]">$2,997</div>
                <div className="text-sm text-white/50 uppercase tracking-widest mb-4">One-Time Payment</div>
                <p className="text-white/60 text-sm mb-4 flex-grow">We do the heavy lifting. Automated filing and fraud protection included.</p>
                <ul className="space-y-2 text-sm text-white/70 mb-5">
                  <li className="flex gap-2 items-center"><span className="text-gold">✓</span> Full Vault Access</li>
                  <li className="flex gap-2 items-center"><span className="text-gold">✓</span> Automated Notifications <Badge className="bg-white/10 text-white/50 text-[0.5rem] font-semibold uppercase tracking-wider px-1.5 py-0 h-auto border-none ml-1">Coming Soon</Badge></li>
                  <li className="flex gap-2 items-center"><span className="text-gold">✓</span> Priority Support</li>
                  <li className="flex gap-2 items-center"><span className="text-gold">✓</span> E-Sign Integration <Badge className="bg-white/10 text-white/50 text-[0.5rem] font-semibold uppercase tracking-wider px-1.5 py-0 h-auto border-none ml-1">Coming Soon</Badge></li>
                </ul>
                <Button asChild className="bg-gold text-black w-full py-3 font-bold text-[0.65rem] uppercase tracking-widest text-center rounded-lg hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all border-none h-auto">
                  <Link to="/login" search={{}}>Secure Membership</Link>
                </Button>
              </CardContent>
            </Card>

            {/* White Glove */}
            <Card className="glass-card rounded-2xl ring-0 border-0 bg-transparent py-0">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="status-dot" />
                  <div className="text-[0.6rem] tracking-[0.15em] text-white/60 uppercase">White Glove</div>
                </div>
                <div className="text-3xl text-white mb-1 font-[family-name:var(--font-cinzel)]">$9,997</div>
                <div className="text-sm text-white/50 uppercase tracking-widest mb-4">One-Time Payment</div>
                <p className="text-white/60 text-sm mb-5 flex-grow">Dedicated human estate agent for complex asset administration.</p>
                <Button variant="outline" asChild className="w-full py-3 border-2 border-white/30 bg-transparent text-white hover:bg-white/10 hover:border-white/50 transition-all text-[0.6rem] font-bold uppercase tracking-widest text-center rounded-lg h-auto">
                  <a href="mailto:support@sirsi.ai">Contact Sales</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden z-10">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1609220136736-443140cffec6?q=80&w=1600&auto=format&fit=crop" alt="Family planning together" className="w-full h-full object-cover" style={{ objectPosition: "center 20%" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
        </div>

        {/* Art Deco corners */}
        <div className="deco-corner top-left" />
        <div className="deco-corner top-right" />
        <div className="deco-corner bottom-left" />
        <div className="deco-corner bottom-right" />

        <div className="relative z-10 text-center px-5 max-w-3xl mx-auto flex flex-col items-center justify-center py-10">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-gold" />
            <div className="w-2 h-2 bg-gold rotate-45" />
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-gold" />
          </div>

          <h2 className="text-2xl md:text-3xl lg:text-4xl text-white mb-4 leading-tight font-[family-name:var(--font-cinzel)] hero-text">
            Rise Forward.<br />
            <span className="text-gold hero-text-gold">Begin Your Legacy.</span>
          </h2>
          <p className="text-sm md:text-base text-white/90 mb-5 max-w-xl mx-auto hero-text">
            Don&apos;t let paperwork steal your moments of remembrance. Let us handle the chaos—so you can honor what matters.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button asChild className="bg-gold text-black px-8 py-3.5 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all border-none h-auto">
              <Link to="/login" search={{}}>Begin Your Legacy</Link>
            </Button>
            <Button variant="outline" asChild className="border-2 border-white/30 bg-transparent text-white px-8 py-3.5 rounded-lg font-semibold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-white/10 transition-all h-auto">
              <a href="#protocol">See How It Works</a>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-white text-[0.65rem] tracking-[0.12em] uppercase">
            <div className="flex items-center gap-2"><div className="status-dot" /><span>Setup in 15 Minutes</span></div>
            <div className="flex items-center gap-2"><div className="status-dot" /><span>Free Plan Available</span></div>
            <div className="flex items-center gap-2"><div className="status-dot" /><span>Satisfaction Guaranteed</span></div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="bg-[#152B65] border-t border-gold/20 py-6 relative z-10">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-5 gap-6 mb-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <svg viewBox="0 0 100 100" className="w-6 h-6 fill-current text-gold">
                  <path d="M50 20 C55 20 58 25 58 30 C58 35 55 38 50 38 C45 38 42 35 42 30 C42 25 45 20 50 20 M50 40 C60 40 70 30 80 15 C85 25 85 45 70 55 L60 60 L65 90 L50 85 L35 90 L40 60 L30 55 C15 45 15 25 20 15 C30 30 40 40 50 40 Z" />
                </svg>
                <span className="text-sm font-bold text-white tracking-widest font-[family-name:var(--font-cinzel)]">FINALWISHES</span>
              </div>
              <p className="text-white/60 text-xs leading-relaxed">The Estate Operating System. Transforming end-of-life management through AI-powered automation.</p>
            </div>
            <FooterCol title="Product" links={[{ label: "How It Works", href: "#protocol" }, { label: "Security", href: "#security" }, { label: "Pricing", href: "#pricing" }]} />
            <FooterCol title="Company" links={[{ label: "About Us", href: "#protocol" }, { label: "Contact", href: "mailto:support@sirsi.ai" }]} />
            <FooterCol title="Legal" links={[{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }]} />
          </div>

          <Separator className="bg-gold/20 mb-3" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-[0.6rem] text-white/40">© 2026 FinalWishes Inc. Powered by <strong>Sirsi Technologies</strong>.</div>
            <div className="flex items-center gap-3">
              <Badge className="bg-transparent text-white/50 text-[0.6rem] uppercase tracking-wider font-normal px-0 h-auto border-none gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                AES-256
              </Badge>
              <Badge className="bg-transparent text-white/50 text-[0.6rem] uppercase tracking-wider font-normal px-0 h-auto border-none gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                Cloud KMS
              </Badge>
              <Badge className="bg-transparent text-white/50 text-[0.6rem] uppercase tracking-wider font-normal px-0 h-auto border-none gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                Built with HIPAA Considerations
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ─── Sub-components ─── */


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
