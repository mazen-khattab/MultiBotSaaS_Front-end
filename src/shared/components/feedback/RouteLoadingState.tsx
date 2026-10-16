import { useInRouterContext, useLocation } from "react-router-dom"

import { routePaths } from "@/app/router/routePaths"
import { cn } from "@/shared/lib/utils"
import { Skeleton } from "@/shared/ui/skeleton"

function LoadingShell({ pathname }: { readonly pathname: string }) {
  const adminRoute = pathname === routePaths.admin || pathname.startsWith(`${routePaths.admin}/`)
  return (
    <div className={cn("flex min-h-screen bg-background", !adminRoute && "client-theme client-route-loading")} role="status" aria-label="Loading page">
      <div className="route-loading-sidebar hidden w-72 bg-slate-950 p-5 md:block">
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

function RoutedLoadingState() {
  return <LoadingShell pathname={useLocation().pathname} />
}

/** The outer Suspense fallback can render before RouterProvider exists. Use the
 * router's location when available, including MemoryRouter and pending routes. */
export function RouteLoadingState() {
  const inRouter = useInRouterContext()
  return inRouter ? <RoutedLoadingState /> : <LoadingShell pathname={typeof window === "undefined" ? routePaths.root : window.location.pathname} />
}

