import { Suspense } from "react"
import { RouterProvider } from "react-router-dom"

import { router } from "@/app/router/router"
import { RouteLoadingState } from "@/shared/components/feedback/RouteLoadingState"
import { TooltipProvider } from "@/shared/ui/tooltip"

export function AppProviders() {
  return (
    <TooltipProvider delayDuration={200}>
      <Suspense fallback={<RouteLoadingState />}>
        <RouterProvider router={router} />
      </Suspense>
    </TooltipProvider>
  )
}
