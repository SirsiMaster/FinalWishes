import { Skeleton } from "@/components/ui/skeleton"

export function VaultSkeleton() {
  return (
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-[#133378]/10 pb-10">
        <div className="space-y-2">
          <Skeleton className="h-12 w-72 rounded-2xl" />
          <Skeleton className="h-5 w-[400px]" />
        </div>
        <Skeleton className="h-8 w-40 rounded-xl" />
      </div>

      {/* Dropzone */}
      <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-3 w-80" />
        </div>
      </div>

      {/* Category Folders — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
            <Skeleton className="h-14 w-14 rounded-2xl mb-6" />
            <Skeleton className="h-5 w-36 mb-2" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* File List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10">
        <div className="flex items-center gap-3 mb-8 px-2">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl">
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
