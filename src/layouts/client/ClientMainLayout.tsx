import { Sparkles } from "lucide-react"
import { Outlet } from "react-router-dom"

import { clientNavigation } from "@/features/client/navigation/clientNavigation"
import { DashboardShell } from "@/shared/components/layout/DashboardShell"
import { DashboardSidebar } from "@/shared/components/layout/DashboardSidebar"

export default function ClientMainLayout() {
  return (
    <DashboardShell
      title="Workspace"
      description="Your automation command center"
      sidebar={(onNavigate) => (
        <DashboardSidebar
          contextLabel="Client portal"
          contextTitle="My workspace"
          navigation={clientNavigation}
          onNavigate={onNavigate}
          footer={
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="size-4 text-blue-400" aria-hidden="true" />
              Ready for your next workflow
            </div>
          }
        />
      )}
    >
      <Outlet />
    </DashboardShell>
  )
}

