import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-white selection:bg-gold/30">

      {/* Navbar Placeholder */}
      <nav className="fixed top-0 w-full z-50 h-20 border-b border-white/5 bg-navy/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gold rotate-45" />
            <span className="font-marcellus text-xl tracking-[0.2em] font-bold">FINALWISHES</span>
          </div>
          <div className="flex gap-8 text-xs font-bold tracking-[0.2em] uppercase text-white/70">
            <a href="#problem" className="hover:text-gold transition-colors">Problem</a>
            <a href="#protocol" className="hover:text-gold transition-colors">Protocol</a>
            <a href="#security" className="hover:text-gold transition-colors">Security</a>
          </div>
          <Button variant="gold">Get Started</Button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/50 to-transparent z-10" />
          <Image
            src="/images/hero-family.jpg"
            alt="Legacy Family"
            fill
            className="object-cover object-center opacity-60"
            priority
          />
        </div>

        <div className="relative z-10 text-center max-w-4xl px-6">
          <div className="flex justify-center mb-8">
            <div className="w-px h-16 bg-gradient-to-b from-transparent to-gold" />
          </div>

          <h1 className="font-marcellus text-5xl md:text-7xl leading-tight mb-8">
            Your Legacy <br />
            <span className="text-gold">Deserves a Guardian</span>
          </h1>

          <p className="font-tenor text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto tracking-wide">
            The average estate takes 18 months to settle. We transform the chaos into clarity.
          </p>

          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Button variant="gold" className="min-w-[200px]">Begin Your Legacy</Button>
            <Button variant="outline" className="min-w-[200px]">See How It Works</Button>
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section id="problem" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">

          {/* Text Content */}
          <div>
            <h2 className="font-marcellus text-4xl mb-6">
              The 500-Hour <span className="text-gold">Problem</span>
            </h2>
            <p className="font-tenor text-white/70 leading-relaxed mb-6">
              Probate courts, lost passwords, and endless paperwork. While you should be grieving, you're fighting bureaucracy.
            </p>
            <p className="font-tenor text-white/70 leading-relaxed mb-8">
              FinalWishes acts as your <span className="text-gold">Digital Executor</span>, securing assets and automating the transfer of wealth.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <GlassCard className="p-6">
                <div className="font-marcellus text-4xl text-white mb-2">18</div>
                <div className="text-gold text-[0.6rem] uppercase tracking-widest">Months Avg Time</div>
              </GlassCard>
              <GlassCard className="p-6">
                <div className="font-marcellus text-4xl text-white mb-2">$1.2M</div>
                <div className="text-gold text-[0.6rem] uppercase tracking-widest">Lost Assets/Year</div>
              </GlassCard>
            </div>
          </div>

          {/* Visual/Image Placeholder */}
          <div className="relative h-[600px] rounded-t-full border border-gold/30 overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=3840&auto=format&fit=crop"
              alt="Administration"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-navy/20 mix-blend-multiply" />
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-white/5 bg-navy/50 text-center">
        <p className="font-tenor text-white/40 text-sm">© 2025 FinalWishes. The Estate Operating System.</p>
      </footer>

    </main>
  );
}
