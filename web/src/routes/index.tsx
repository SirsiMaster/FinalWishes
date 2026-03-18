import { createFileRoute, Link } from '@tanstack/react-router'
import React, { useEffect } from 'react'

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
            <Link to="/login" className="text-xs font-bold tracking-[0.15em] uppercase text-white/70 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/login" className="bg-gold text-black px-5 py-2.5 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] hover:-translate-y-0.5 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <header className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
        {/* Hero background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=3840&auto=format&fit=crop"
            alt="Happy African American multi-generational family embracing"
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 20%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E3A8A]/80 via-[#1E3A8A]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1E3A8A]/30 via-transparent to-transparent" />
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

          <p className="font-[family-name:var(--font-cinzel)] text-lg md:text-xl tracking-[0.25em] uppercase text-white hero-text mb-6 font-bold">
            The Operating System for Your Life&apos;s Work
          </p>

          <h1 className="font-[family-name:var(--font-cinzel)] text-4xl md:text-5xl lg:text-6xl leading-[1.15] mb-8 hero-text">
            Preserve Your Story.
            <br />
            <span className="text-gold hero-text-gold">Protect Your People.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            The first platform that bridges <strong className="text-white">Life</strong> and{" "}
            <strong className="text-white">Legacy</strong>. Secure your memoirs, guide your heirs,
            and automate the chaos of estate settlement.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Link to="/login" className="bg-gold text-black px-8 py-4 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] hover:-translate-y-0.5 transition-all">
              Create Your Vault
            </Link>
            <a href="#problem" className="border-2 border-white/40 text-white px-8 py-4 rounded-lg font-semibold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-white/10 hover:border-white/60 transition-all">
              Watch the Film
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </header>

      <div className="section-divider" />

      {/* ═══════════════════ PROBLEM SECTION ═══════════════════ */}
      <section id="problem" className="relative z-10 grid md:grid-cols-2">
        <div className="relative h-[500px] md:h-auto overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1516307365426-bea591f05011?q=80&w=3840&auto=format&fit=crop"
            alt="Old photographs and letters"
            className="w-full h-full object-cover"
          />
          {/* Stat overlay */}
          <div className="absolute bottom-6 left-6 glass-card rounded-xl p-4">
            <div className="text-2xl font-bold text-danger font-[family-name:var(--font-cinzel)]">$1.2 Trillion</div>
            <div className="text-[0.6rem] text-white/60 uppercase tracking-[0.15em] mt-1">In Unclaimed Assets</div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 md:px-12 py-12 glass-panel">
          <div className="max-w-lg mx-auto">
            <h2 className="text-2xl md:text-4xl text-white mb-6 leading-tight font-[family-name:var(--font-cinzel)]">
              Two Tragedies:<br />
              <span className="text-gold">Chaos &amp; Silence</span>
            </h2>
            <p className="text-sm text-white/80 leading-relaxed mb-6">
              Death brings two tragedies. First, the <strong className="text-white">Silence</strong>—the extinguishing of a unique voice,
              wisdom, and history. Second, the <strong className="text-white">Chaos</strong>—the wreckage of frozen assets, legal battles,
              and family confusion that can last for years. FinalWishes is the bridge that prevents both.
            </p>
            <div className="glass-card rounded-xl p-4">
              <div className="text-2xl font-bold text-white font-[family-name:var(--font-cinzel)]">$1.2M</div>
              <div className="text-[0.6rem] text-gold uppercase tracking-[0.1em] mt-1 font-semibold">Lost Assets/Year</div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════ VALUE PROPOSITION ═══════════════════ */}
      <section id="value" className="py-16 relative z-10 overflow-hidden" style={{ background: "rgba(30, 58, 138, 0.6)" }}>
        <div className="max-w-4xl mx-auto px-5 relative z-10 text-center">
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
            We automate the chaotic administration of loss—so your family can grieve in peace, not paperwork.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
            <Link to="/login" className="bg-gold text-black px-6 py-3 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all">
              Begin Your Legacy
            </Link>
            <a href="#protocol" className="border-2 border-white/30 text-white px-6 py-3 rounded-lg font-semibold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-white/10 transition-all">
              See How It Works
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-white text-[0.65rem] tracking-[0.12em] uppercase font-semibold">
            <div className="flex items-center gap-2">
              <div className="status-dot" />
              <span>AES-256 Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="status-dot" />
              <span>SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="status-dot" />
              <span>Zero-Knowledge</span>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════ PROTOCOL — 4 Steps ═══════════════════ */}
      <section id="protocol" className="py-16 relative z-10 overflow-hidden">
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
              <div className="relative h-[400px] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=800&h=600&fit=crop" alt="Grandfather recording memoir" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1E3A8A]/50" />
                <div className="absolute top-5 left-5 flex items-center gap-3">
                  <div className="status-dot" />
                  <span className="text-5xl font-bold text-white/30 font-[family-name:var(--font-cinzel)]">01</span>
                </div>
              </div>
              <div className="flex flex-col justify-center p-8 glass-panel border-l-2 border-gold/20">
                <h3 className="text-3xl text-gold mb-3 font-[family-name:var(--font-cinzel)]">LIVING LEGACY</h3>
                <p className="text-sm text-white/80 leading-relaxed mb-4">
                  Wealth is transient. Wisdom is eternal. Capture your voice, your values, and your vision while you are vibrant. Create a vault of truth that outlasts you.
                </p>
                <ul className="space-y-2 text-sm text-white/60">
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
                <p className="text-sm text-white/80 leading-relaxed mb-4">
                  We stand watch. When the time comes, our system verifies the transition via government API and biometric checks. Your estate enters &quot;Fortress Mode&quot;, instantly securing digital assets against bad actors.
                </p>
                <ul className="space-y-2 text-sm text-white/60">
                  <li className="flex items-center gap-2"><span className="text-royal-bright">✓</span> Biometric Auth</li>
                  <li className="flex items-center gap-2"><span className="text-royal-bright">✓</span> Death Cert Verification</li>
                </ul>
              </div>
              <div className="relative h-[400px] overflow-hidden order-1 md:order-2">
                <img src="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=600&fit=crop&auto=format" alt="Security Lock" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#1E3A8A]/50" />
                <div className="absolute top-5 right-5 flex items-center gap-3">
                  <span className="text-5xl font-bold text-white/30 font-[family-name:var(--font-cinzel)]">02</span>
                  <div className="status-dot" />
                </div>
              </div>
            </div>

            {/* Step 3: NOTIFY */}
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative h-[400px] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop" alt="Legal Letters" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1E3A8A]/50" />
                <div className="absolute top-5 left-5 flex items-center gap-3">
                  <div className="status-dot" />
                  <span className="text-5xl font-bold text-white/30 font-[family-name:var(--font-cinzel)]">03</span>
                </div>
              </div>
              <div className="flex flex-col justify-center p-8 glass-panel border-l-2 border-gold/20">
                <h3 className="text-3xl text-gold mb-3 font-[family-name:var(--font-cinzel)]">AUTOMATED NOTIFICATION</h3>
                <p className="text-sm text-white/80 leading-relaxed mb-4">
                  The silence is broken on your terms. Your pre-recorded messages and legal directives are dispatched instantly to heirs, attorneys, and loved ones. No delays. No secrets.
                </p>
                <ul className="space-y-2 text-sm text-white/60">
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
                <p className="text-sm text-white/80 leading-relaxed mb-4">
                  The final transfer. Your assets—crypto, keys, and keepsakes—are distributed seamlessly according to your protocols. The friction of probate is replaced by the certainty of code.
                </p>
                <ul className="space-y-2 text-sm text-white/60">
                  <li className="flex items-center gap-2"><span className="text-gold">✓</span> Crypto &amp; Digital Assets</li>
                  <li className="flex items-center gap-2"><span className="text-gold">✓</span> Passwords &amp; Keys</li>
                  <li className="flex items-center gap-2"><span className="text-gold">✓</span> Sentimental Items</li>
                </ul>
                <Link to="/login" className="bg-gold text-black px-6 py-3 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all mt-6 self-start">
                  Start Your Protocol
                </Link>
              </div>
              <div className="relative h-[400px] overflow-hidden order-1 md:order-2">
                <img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=600&fit=crop&crop=faces" alt="Happy African American family embracing" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#1E3A8A]/50" />
                <div className="absolute top-5 right-5 flex items-center gap-3">
                  <span className="text-5xl font-bold text-gold/30 font-[family-name:var(--font-cinzel)]">04</span>
                  <div className="status-dot" />
                </div>
                <div className="absolute bottom-5 right-5 glass-card rounded-lg px-3 py-2 flex items-center gap-2">
                  <div className="status-dot" />
                  <span className="text-white font-bold uppercase tracking-widest text-xs">Protocol Complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════ SECURITY — Swiss Vault ═══════════════════ */}
      <section id="security" className="relative min-h-[60vh] flex items-center overflow-hidden z-10">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=3840&auto=format&fit=crop" alt="Secure data center vault" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A8A]/95 via-[#1E3A8A]/70 to-transparent" />
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
              <span className="text-[0.6rem] text-royal-bright uppercase tracking-widest font-bold">AES-256</span>
            </div>
            <div className="absolute -bottom-3 -left-3 glass-card rounded-lg px-3 py-1 flex items-center gap-2">
              <div className="status-dot" />
              <span className="text-[0.6rem] text-gold uppercase tracking-widest font-bold">SOC 2</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-10 items-center w-full py-16">
          <div>
            <h2 className="text-2xl md:text-4xl text-white mb-5 leading-tight font-[family-name:var(--font-cinzel)]">
              Built Like a<br />
              <span className="text-gold">Swiss Vault</span>
            </h2>
            <p className="text-sm text-white/80 leading-relaxed mb-6">
              Your family&apos;s data is more valuable than gold. We treat it that way.
              FinalWishes uses military-grade encryption to ensure your asset map is visible to{" "}
              <strong className="text-gold">no one</strong>—not even us—until verification.
            </p>

            <div className="space-y-4">
              <div className="glass-card rounded-xl p-4 flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-royal/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-royal-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-1">Zero-Knowledge Architecture</h4>
                  <p className="text-xs text-white/60">Your data is encrypted on your device before it ever touches our servers.</p>
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-1">Multi-Sig Release</h4>
                  <p className="text-xs text-white/60">Requires cryptographic proof of death and identity verification from two separate executors.</p>
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-royal/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-royal-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-1">Audit Trail</h4>
                  <p className="text-xs text-white/60">Every access attempt is logged, timestamped, and immutably recorded on-chain.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden md:block" />
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════ TESTIMONIALS ═══════════════════ */}
      <section id="stories" className="py-16 relative overflow-hidden z-10">
        <div className="max-w-6xl mx-auto px-5 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl lg:text-4xl text-white mb-4 font-[family-name:var(--font-cinzel)]">
              From Grief to <span className="text-gold">Gratitude</span>
            </h2>
            <p className="text-sm text-white/60 max-w-xl mx-auto">Real families who found peace through our protocol.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <TestimonialCard
              image="https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?q=80&w=3840&auto=format&fit=crop"
              name="David M."
              tag="Estate Settled in 3 Weeks"
              value="$1.2M"
              quote="When my father passed, I was handed a box of paperwork and told to 'figure it out.' FinalWish gave me the space to actually mourn him."
            />
            <TestimonialCard
              image="https://images.unsplash.com/photo-1589156280159-27698a70f29e?q=80&w=3840&auto=format&fit=crop"
              name="Angela W."
              tag="Hidden Assets Found"
              value="$47K"
              quote="I didn't know my mother had a crypto wallet until FinalWish's discovery scan found it. It paid for the funeral and grandkids' college."
            />
            <TestimonialCard
              image="https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?q=80&w=3840&auto=format&fit=crop"
              name="Marcus T."
              tag="Member Since 2023"
              value="∞"
              quote="'Peace of Mind' isn't just a slogan. Knowing my wife won't fight bureaucrats when I'm gone is the best gift I could give her."
            />
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════ ROADMAP ═══════════════════ */}
      <section id="roadmap" className="py-16 relative overflow-hidden z-10" style={{ background: "rgba(30, 58, 138, 0.6)" }}>
        <div className="max-w-6xl mx-auto px-5 relative z-10">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-royal-bright animate-pulse" />
              <div className="text-[0.6rem] tracking-[0.15em] text-gold uppercase font-bold">Coming Soon</div>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl text-white mb-4 font-[family-name:var(--font-cinzel)]">
              The Vision: <span className="text-gold">Expanding Your Legacy</span>
            </h2>
            <p className="text-sm text-white/60 max-w-xl mx-auto">We are building the operating system for generations. Here is what&apos;s next.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <FeatureCard icon="💰" color="gold" title="LegacyFund" desc="Crowd-sourced support for final wishes. Activate a verified fundraising campaign for funeral costs or charitable causes in one click." />
            <FeatureCard icon="🌳" color="royal" title="AncestryMap" desc="Visual lineage that lives forever. Connect generations through shared stories, verified history, and an interactive family tree." />
            <FeatureCard icon="📊" color="gold" title="AssetFlow" desc="Real-time transparent allocation. End family disputes with an immutable, view-only ledger of every asset distribution." />
            <FeatureCard icon="🔐" color="royal" title="LifeLocker" desc="Central command for insurance policies, property deeds, and financial records. Biometrically secured and ready for rapid release." />
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════ PRICING ═══════════════════ */}
      <section id="pricing" className="py-16 relative overflow-hidden z-10">
        <div className="max-w-5xl mx-auto px-5 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl lg:text-4xl text-white mb-4 font-[family-name:var(--font-cinzel)]">
              Choose Your <span className="text-gold">Protocol</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {/* Free */}
            <div className="glass-card rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="status-dot" />
                <div className="text-[0.6rem] tracking-[0.15em] text-white/60 uppercase">Self-Guided</div>
              </div>
              <div className="text-3xl text-white mb-1 font-[family-name:var(--font-cinzel)]">FREE</div>
              <div className="text-[0.6rem] text-white/50 uppercase tracking-widest mb-4">Forever</div>
              <p className="text-white/60 text-xs mb-5 flex-grow">For families who need a roadmap but can handle the execution.</p>
              <Link to="/login" className="w-full py-3 border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all text-[0.6rem] font-bold uppercase tracking-widest text-center rounded-lg">
                Start Free
              </Link>
            </div>

            {/* Concierge (Gold) */}
            <div className="glass-card rounded-2xl p-6 flex flex-col border-2 !border-gold/50 relative md:-mt-3 md:mb-3">
              <div className="absolute top-0 left-0 w-full h-1 bg-gold rounded-t-2xl" />
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="status-dot" />
                  <div className="text-[0.6rem] tracking-[0.15em] text-gold uppercase font-bold">Concierge</div>
                </div>
                <div className="px-2 py-0.5 bg-gold text-black text-[0.55rem] font-bold uppercase rounded">Popular</div>
              </div>
              <div className="text-3xl text-white mb-1 font-[family-name:var(--font-cinzel)]">$2,997</div>
              <div className="text-[0.6rem] text-white/50 uppercase tracking-widest mb-4">One-Time Payment</div>
              <p className="text-white/60 text-xs mb-4 flex-grow">We do the heavy lifting. Automated filing and fraud protection included.</p>
              <ul className="space-y-2 text-xs text-white/70 mb-5">
                <li className="flex gap-2 items-center"><span className="text-gold">✓</span> 10 Certified Death Certificates</li>
                <li className="flex gap-2 items-center"><span className="text-gold">✓</span> Auto-Filing Service</li>
                <li className="flex gap-2 items-center"><span className="text-gold">✓</span> Priority Support</li>
                <li className="flex gap-2 items-center"><span className="text-gold">✓</span> Asset Discovery Scan</li>
              </ul>
              <Link to="/login" className="bg-gold text-black w-full py-3 font-bold text-[0.65rem] uppercase tracking-widest text-center rounded-lg hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all">
                Secure Membership
              </Link>
            </div>

            {/* White Glove */}
            <div className="glass-card rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="status-dot" />
                <div className="text-[0.6rem] tracking-[0.15em] text-white/60 uppercase">White Glove</div>
              </div>
              <div className="text-3xl text-white mb-1 font-[family-name:var(--font-cinzel)]">$9,997</div>
              <div className="text-[0.6rem] text-white/50 uppercase tracking-widest mb-4">One-Time Payment</div>
              <p className="text-white/60 text-xs mb-5 flex-grow">Dedicated human estate agent for complex asset administration.</p>
              <Link to="/login" className="w-full py-3 border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all text-[0.6rem] font-bold uppercase tracking-widest text-center rounded-lg">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden z-10">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=1600&auto=format&fit=crop" alt="The Lockhart Legacy family" className="w-full h-full object-cover" style={{ objectPosition: "center 20%" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E3A8A] via-[#1E3A8A]/60 to-[#1E3A8A]/40" />
        </div>

        {/* Art Deco corners */}
        <div className="deco-corner top-left" />
        <div className="deco-corner top-right" />
        <div className="deco-corner bottom-left" />
        <div className="deco-corner bottom-right" />

        <div className="relative z-10 text-center px-5 max-w-3xl mx-auto flex flex-col items-center justify-center py-16">
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
            <Link to="/login" className="bg-gold text-black px-8 py-3.5 rounded-lg font-bold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all">
              Initialize Protocol
            </Link>
            <a href="#" className="border-2 border-white/30 text-white px-8 py-3.5 rounded-lg font-semibold text-[0.65rem] uppercase tracking-[0.12em] hover:bg-white/10 transition-all">
              Schedule a Call
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-white text-[0.65rem] tracking-[0.12em] uppercase">
            <div className="flex items-center gap-2"><div className="status-dot" /><span>Setup in 15 Minutes</span></div>
            <div className="flex items-center gap-2"><div className="status-dot" /><span>No Credit Card</span></div>
            <div className="flex items-center gap-2"><div className="status-dot" /><span>Cancel Anytime</span></div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="bg-[#162D6B] border-t border-gold/20 py-6 relative z-10">
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
            <FooterCol title="Company" links={[{ label: "About Us", href: "#" }, { label: "Careers", href: "#" }, { label: "Contact", href: "#" }]} />
            <FooterCol title="Legal" links={[{ label: "Privacy", href: "#" }, { label: "Terms", href: "#" }, { label: "GDPR", href: "#" }]} />
          </div>

          <div className="gold-divider mb-3" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-[0.6rem] text-white/40">© 2025 FinalWishes Inc. Powered by <strong>Sirsi Technologies</strong>.</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-white/50 text-[0.6rem] uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-success" /><span>SOC 2</span></div>
              <div className="flex items-center gap-1 text-white/50 text-[0.6rem] uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-success" /><span>HIPAA</span></div>
              <div className="flex items-center gap-1 text-white/50 text-[0.6rem] uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-success" /><span>256-bit</span></div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ─── Sub-components ─── */

function TestimonialCard({ image, name, tag, value, quote }: { image: string; name: string; tag: string; value: string; quote: string }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="relative h-56 overflow-hidden">
        <img src={image} alt={name} className="w-full h-full object-cover" style={{ objectPosition: "center 20%" }} />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1E3A8A] to-transparent" />
        <div className="absolute top-4 right-4 glass-card rounded-lg px-3 py-1.5 flex items-center gap-2">
          <div className="status-dot" />
          <span className="text-xs text-white uppercase tracking-widest font-semibold">Verified</span>
        </div>
      </div>
      <div className="p-5 -mt-6 relative">
        <div className="text-gold text-4xl font-[family-name:var(--font-cinzel)] leading-none mb-2">&ldquo;</div>
        <p className="text-white/80 text-sm leading-relaxed mb-4">{quote}</p>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-sm font-[family-name:var(--font-cinzel)]">{name}</div>
            <div className="text-gold text-[0.6rem] uppercase tracking-widest font-semibold">{tag}</div>
          </div>
          <div className="text-2xl font-bold text-royal-bright/30 font-[family-name:var(--font-cinzel)]">{value}</div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, color, title, desc }: { icon: string; color: "gold" | "royal"; title: string; desc: string }) {
  const borderHover = color === "gold" ? "hover:!border-gold/50" : "hover:!border-royal-bright/50";
  const titleHover = color === "gold" ? "group-hover:text-gold" : "group-hover:text-royal-bright";
  return (
    <div className={`glass-card rounded-2xl p-6 flex gap-4 items-start group ${borderHover} transition-all duration-500`}>
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h4 className={`text-white font-bold text-sm uppercase tracking-widest mb-2 ${titleHover} transition-colors`}>{title}</h4>
        <p className="text-xs text-white/60 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

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
