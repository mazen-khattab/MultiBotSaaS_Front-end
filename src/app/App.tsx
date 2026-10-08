import { Suspense } from "react"
import { RouterProvider } from "react-router-dom"

import { AppProviders } from "@/app/providers/AppProviders"
import { router } from "@/app/router/router"
import { RouteLoadingState } from "@/shared/components/feedback/RouteLoadingState"

export function App() {
  return (
    <AppProviders>
      <Suspense fallback={<RouteLoadingState />}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProviders>
  )
}
