import type { ReactNode } from "react"

import { QueryProvider } from "@/app/providers/QueryProvider"
import { AuthProvider } from "@/context/auth/AuthProvider"
import { RealtimeProvider } from "@/context/realtime/RealtimeProvider"
import type { SignalRService } from "@/services/realtime/SignalRService"
import { AppErrorBoundary } from "@/shared/components/feedback/AppErrorBoundary"
import { TooltipProvider } from "@/shared/ui/tooltip"

interface AppProvidersProps {
  children: ReactNode
  realtimeService?: SignalRService
}

export function AppProviders({ children, realtimeService }: AppProvidersProps) {
  // Auth owns identity; Query consumes that identity only to isolate its cache.
  // The outer boundary also catches render failures inside any provider.
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <RealtimeProvider service={realtimeService}>
          <QueryProvider>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          </QueryProvider>
        </RealtimeProvider>
      </AuthProvider>
    </AppErrorBoundary>
  )
}
