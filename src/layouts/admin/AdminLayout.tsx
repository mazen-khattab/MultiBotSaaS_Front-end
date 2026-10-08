import { ShieldCheck } from "lucide-react"
import { Outlet } from "react-router-dom"

import { adminNavigation } from "@/features/admin/navigation/adminNavigation"
import { DashboardShell } from "@/shared/components/layout/DashboardShell"
import { DashboardSidebar } from "@/shared/components/layout/DashboardSidebar"

export default function AdminLayout() {
  return (
    <DashboardShell
      title="Administration"
      description="Platform operations and management"
      accountLabel="Platform admin"
      sidebar={(onNavigate) => (
        <DashboardSidebar
          contextLabel="Control center"
          contextTitle="Admin workspace"
          navigation={adminNavigation}
          onNavigate={onNavigate}
          footer={
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="size-4 text-emerald-400" aria-hidden="true" />
              Administrative area
            </div>
          }
        />
      )}
    >
      <Outlet />
    </DashboardShell>
  )
}

