import React from "react";

export function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`
      relative overflow-hidden
      bg-royal-blue/20 backdrop-blur-md
      border border-white/10
      shadow-[0_4px_30px_rgba(0,0,0,0.1)]
      hover:border-gold/50 hover:shadow-[0_4px_30px_rgba(212,175,55,0.1)]
      transition-all duration-500
      ${className}
    `}>
            {children}
        </div>
    );
}
