import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading content" className="max-w-[1440px] mx-auto p-12 space-y-16 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-50 pb-16">
        <div className="space-y-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-12 w-64 rounded-2xl" />
          <Skeleton className="h-5 w-[400px]" />
        </div>
        <Skeleton className="h-14 w-36 rounded-2xl" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden">
        {/* Table header */}
        <div className="bg-slate-50 px-10 py-6 flex gap-10 border-b border-slate-100">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20 ml-auto" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-10 py-7 flex items-center gap-10 border-b border-slate-50">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-24 rounded-lg" />
            <Skeleton className="h-5 w-28" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-9 w-24 rounded-xl ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
