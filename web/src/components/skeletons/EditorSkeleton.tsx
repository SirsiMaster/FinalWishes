import { Skeleton } from "@/components/ui/skeleton"

export function EditorSkeleton() {
  return (
    <div role="status" aria-label="Loading editor" className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Sidebar portrait area */}
      <div className="flex gap-8">
        <div className="flex-shrink-0 space-y-4">
          <Skeleton className="h-48 w-40 rounded-2xl" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>

        {/* Editor panel */}
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-72 rounded-2xl" />
            <Skeleton className="h-5 w-[360px]" />
          </div>

          {/* Toolbar */}
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-9 rounded-lg" />
            ))}
          </div>

          {/* Editor body */}
          <div className="border border-[var(--neutral-border)] rounded-2xl p-6 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <Skeleton className="h-12 w-32 rounded-2xl" />
            <Skeleton className="h-12 w-32 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
