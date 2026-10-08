import { Bot } from "lucide-react"
import { Outlet, useParams } from "react-router-dom"

import { routePaths } from "@/app/router/routePaths"
import { DashboardShell } from "@/shared/components/layout/DashboardShell"
import { DashboardSidebar } from "@/shared/components/layout/DashboardSidebar"
import { WorkspaceBackLink } from "@/shared/components/navigation/WorkspaceBackLink"

export default function BotWorkspaceLayout() {
  const { botId } = useParams<{ botId: string }>()
  const workspaceTitle = botId ? `Bot ${botId}` : "Bot workspace"

  return (
    <DashboardShell
      title={workspaceTitle}
      description="Bot workspace"
      sidebar={(onNavigate) => (
        <DashboardSidebar
          contextLabel="Bot workspace"
          contextTitle={workspaceTitle}
          topContent={<WorkspaceBackLink to={routePaths.clientBots} onNavigate={onNavigate} />}
          footer={
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Bot className="size-4 text-blue-400" aria-hidden="true" />
              Modules arrive in Part 3
            </div>
          }
        />
      )}
    >
      <Outlet />
    </DashboardShell>
  )
}

