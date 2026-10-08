import type { ReactNode } from "react"

import { TooltipProvider } from "@/shared/ui/tooltip"

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
}

