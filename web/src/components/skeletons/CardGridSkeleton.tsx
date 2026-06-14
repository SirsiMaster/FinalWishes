import { Skeleton } from "@/components/ui/skeleton"

interface CardGridSkeletonProps {
  /** Number of columns in the grid (default: 2) */
  columns?: 2 | 3
  /** Number of card skeletons to show (default: 4) */
  cards?: number
  /** Whether to show timeline-style rows instead of cards */
  timeline?: boolean
}

export function CardGridSkeleton({ columns = 2, cards = 4, timeline = false }: CardGridSkeletonProps) {
  const gridCols = columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"

  return (
    <div role="status" aria-label="Loading content" className="max-w-[1240px] mx-auto space-y-10 pb-24 px-6">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-[var(--neutral-border)] pb-10">
        <div className="space-y-2">
          <Skeleton className="h-12 w-72 rounded-2xl" />
          <Skeleton className="h-5 w-[420px]" />
        </div>
        <Skeleton className="h-12 w-44 rounded-2xl" />
      </div>

      {timeline ? (
        /* Timeline variant */
        <div className="space-y-4">
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="flex items-start gap-5 p-5 bg-white rounded-2xl border border-[var(--neutral-border)]">
              <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Card grid variant */
        <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-[var(--neutral-border)] flex items-center gap-8">
              <Skeleton className="h-16 w-16 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-16 rounded-lg" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex items-center justify-between border-t border-[var(--neutral-faint)] pt-4">
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
