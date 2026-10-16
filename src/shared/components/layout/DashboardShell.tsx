import { useEffect, type ReactNode } from "react"
import { useLocation } from "react-router-dom"

import { RealtimeConnectionStatus } from "@/features/realtime/RealtimeConnectionStatus"
import { DashboardHeader } from "@/shared/components/layout/DashboardHeader"
import { ClientThemeContext, useClientTheme } from "@/shared/components/layout/ClientThemeContext"
import { useSidebar } from "@/shared/hooks/useSidebar"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/shared/ui/sheet"
import { SidebarProvider } from "@/shared/ui/sidebar"

interface DashboardShellProps {
  sidebar: (onNavigate?: () => void) => ReactNode
  title: string
  description?: string
  accountLabel?: string
  children: ReactNode
  appearance?: "client"
}

function DashboardShellContent({
  sidebar,
  title,
  description,
  accountLabel,
  children,
}: DashboardShellProps) {
  const location = useLocation()
  const clientTheme = useClientTheme()
  const { mobileOpen, setMobileOpen } = useSidebar()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, setMobileOpen])

  return (
    <div className={clientTheme ? "client-theme client-dashboard min-h-screen bg-background" : "min-h-screen bg-background"}>
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 md:block">{sidebar()}</div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-0 bg-slate-950 p-0 text-slate-100">
          <SheetTitle className="sr-only">Application navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Navigate between the main sections of this workspace.
          </SheetDescription>
          {sidebar(() => setMobileOpen(false))}
        </SheetContent>
      </Sheet>

      <div className="min-w-0 md:pl-72">
        <DashboardHeader title={title} description={description} accountLabel={accountLabel} />
        <RealtimeConnectionStatus />
        <main id="main-content" className="min-h-[calc(100vh-4.5rem)]">
          {clientTheme ? <div className="client-page-enter" key={location.pathname}>{children}</div> : children}
        </main>
      </div>
    </div>
  )
}

export function DashboardShell(props: DashboardShellProps) {
  return (
    <ClientThemeContext.Provider value={props.appearance === "client"}>
      <SidebarProvider>
        <DashboardShellContent {...props} />
      </SidebarProvider>
    </ClientThemeContext.Provider>
  )
}
