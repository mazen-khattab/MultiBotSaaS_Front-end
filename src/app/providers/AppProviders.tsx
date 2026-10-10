import type { ReactNode } from "react"

import { QueryProvider } from "@/app/providers/QueryProvider"
import { AuthProvider } from "@/context/auth/AuthProvider"
import { AppErrorBoundary } from "@/shared/components/feedback/AppErrorBoundary"
import { TooltipProvider } from "@/shared/ui/tooltip"

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  // Auth owns identity; Query consumes that identity only to isolate its cache.
  // The outer boundary also catches render failures inside any provider.
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <QueryProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </QueryProvider>
      </AuthProvider>
    </AppErrorBoundary>
  )
}
