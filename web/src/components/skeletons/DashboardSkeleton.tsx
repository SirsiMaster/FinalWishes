import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="max-w-[1440px] mx-auto p-12 space-y-12 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* Page Header */}
      <div className="space-y-3 mb-16">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-14 w-[420px] rounded-2xl" />
        <Skeleton className="h-6 w-[500px]" />
      </div>

      {/* Primary Action Card (hero progress area) */}
      <div className="bg-[#F8FAFC] rounded-[3rem] p-16 flex items-center justify-between border border-slate-100">
        <div className="flex-1 space-y-10">
          <div className="space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-20 w-48 rounded-2xl" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-2 w-full max-w-xl rounded-full" />
        </div>
        <Skeleton className="h-16 w-48 rounded-2xl" />
      </div>

      {/* Stat Grid — 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 space-y-8">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Checklist + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1.2fr] gap-16 py-12">
        {/* Checklist */}
        <div className="bg-white rounded-[3rem] p-16 border border-slate-100 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#F8FAFC]">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-12">
          <div className="bg-white rounded-[3rem] p-12 border border-slate-100">
            <Skeleton className="h-6 w-32 mb-10" />
            <div className="grid grid-cols-2 gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center justify-center gap-6 p-10 bg-slate-50 rounded-3xl border border-slate-100">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-[3rem]" />
        </div>
      </div>
    </div>
  )
}
