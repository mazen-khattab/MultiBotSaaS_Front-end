import * as React from "react"

import { SidebarContext } from "@/shared/hooks/useSidebar"
import { cn } from "@/shared/lib/utils"

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const value = React.useMemo(() => ({ mobileOpen, setMobileOpen }), [mobileOpen])
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export const Sidebar = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<"aside">>(
  ({ className, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn("flex h-full w-72 flex-col bg-slate-950 text-slate-100", className)}
      {...props}
    />
  ),
)
Sidebar.displayName = "Sidebar"

export const SidebarHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5", className)} {...props} />
)

export const SidebarContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("min-h-0 flex-1 overflow-y-auto px-3 py-4", className)} {...props} />
)

export const SidebarFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4", className)} {...props} />
)
