import * as React from "react"

import { cn } from "@/lib/utils"

type CardVariant = "default" | "glass"

/**
 * Card — Royal Neo-Deco surface primitive.
 *
 * The radius scale is owned here (no per-route overrides): cards are
 * `rounded-3xl` (32px) by default, `rounded-2xl` (24px) at `size="sm"`.
 * Inner chips should use `rounded-xl` and pills `rounded-full` at the call site.
 *
 * Both variants bake in the brand hover/transition (lift + gold border +
 * gold-tinted shadow) and a gold focus-visible ring, so most cards feel alive
 * without bespoke per-screen classes.
 *
 * - `default` — opaque white surface with a faint royal ring.
 * - `glass`   — translucent glass panel (backdrop-blur + gold hairline border)
 *   referencing the `--card-bg` / `--card-shadow-hover` tokens from globals.css.
 *   Fallbacks are supplied inline so the variant renders correctly on the
 *   white flagship screens that sit outside the `.glass-theme` scope.
 */
function Card({
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  variant?: CardVariant
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(
        // Structure + unified radius scale (32px cards / 24px when sm).
        // `bg-card` is a PLAIN base (not variant-scoped) so a caller's custom
        // `bg-*` className wins via tailwind-merge dedup. (A variant-prefixed
        // `data-[variant=default]:bg-card` has higher specificity than a plain
        // `bg-[var(--royal)]` and silently overrode every custom-background card.)
        "group/card flex flex-col gap-4 overflow-hidden rounded-3xl py-4 text-sm bg-card",
        "data-[size=sm]:gap-3 data-[size=sm]:rounded-2xl data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0",
        "has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0",
        "*:[img:first-child]:rounded-t-3xl *:[img:last-child]:rounded-b-3xl",
        // Brand hover/transition + gold focus ring (both variants).
        "transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]",
        // Default: opaque white surface, royal hairline ring → gold on hover.
        "data-[variant=default]:text-card-foreground data-[variant=default]:ring-1 data-[variant=default]:ring-foreground/10 data-[variant=default]:hover:ring-[var(--gold)]/40 data-[variant=default]:hover:shadow-[var(--card-shadow-hover,0_4px_12px_rgba(0,0,0,0.08))]",
        // Glass: translucent panel, gold hairline border + gold-glow on hover.
        "data-[variant=glass]:bg-[var(--card-bg,#FFFFFF)] data-[variant=glass]:backdrop-blur-md data-[variant=glass]:border data-[variant=glass]:border-[var(--gold)]/15 data-[variant=glass]:text-card-foreground data-[variant=glass]:hover:border-[var(--gold)]/40 data-[variant=glass]:hover:shadow-[var(--card-shadow-hover,0_12px_48px_rgba(0,0,0,0.12),0_0_30px_rgba(200,169,81,0.18))]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-3xl px-4 group-data-[size=sm]/card:rounded-t-2xl group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-[var(--ink-muted)]", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-3xl p-4 group-data-[size=sm]/card:rounded-b-2xl group-data-[size=sm]/card:p-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
