import type { ReactNode } from "react"

import { AuthProvider } from "@/context/auth/AuthProvider"
import { TooltipProvider } from "@/shared/ui/tooltip"

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return <AuthProvider><TooltipProvider delayDuration={200}>{children}</TooltipProvider></AuthProvider>
}
