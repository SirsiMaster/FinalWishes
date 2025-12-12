import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "gold" | "outline" | "ghost";
    children: React.ReactNode;
}

export function Button({
    variant = "gold",
    className = "",
    children,
    ...props
}: ButtonProps) {
    const baseStyles = "inline-flex items-center justify-center px-8 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 font-tenor";

    const variants = {
        gold: "bg-gold text-navy hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:-translate-y-0.5",
        outline: "border border-gold/40 text-gold hover:bg-gold/10 hover:border-gold",
        ghost: "text-white/70 hover:text-white"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
