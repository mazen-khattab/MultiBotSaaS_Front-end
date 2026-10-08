import { Skeleton } from "@/shared/ui/skeleton"

export function RouteLoadingState() {
  return (
    <div className="flex min-h-screen bg-background" role="status" aria-label="Loading page">
      <div className="hidden w-72 bg-slate-950 p-5 md:block">
        <Skeleton className="h-10 w-36 bg-white/10" />
        <div className="mt-12 space-y-3">
          <Skeleton className="h-10 w-full bg-white/10" />
          <Skeleton className="h-10 w-full bg-white/10" />
          <Skeleton className="h-10 w-4/5 bg-white/10" />
        </div>
      </div>
      <div className="flex-1 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-8 h-48 w-full" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}

