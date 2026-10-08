import { createContext, useContext } from "react"

export interface SidebarContextValue {
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider")
  }
  return context
}

