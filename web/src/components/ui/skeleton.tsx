import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--neutral-border)_60%,transparent)]", className)} {...props} />
}

export { Skeleton }
