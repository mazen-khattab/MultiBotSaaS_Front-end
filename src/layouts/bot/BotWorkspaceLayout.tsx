import { Bot, House } from "lucide-react"
import { Outlet, useParams } from "react-router-dom"

import { buildBotWorkspacePath, routePaths } from "@/app/router/routePaths"
import type { BotRouteParams } from "@/app/router/routeTypes"
import { DashboardShell } from "@/shared/components/layout/DashboardShell"
import { DashboardSidebar } from "@/shared/components/layout/DashboardSidebar"
import { NavigationItem } from "@/shared/components/navigation/NavigationItem"
import { WorkspaceBackLink } from "@/shared/components/navigation/WorkspaceBackLink"

export default function BotWorkspaceLayout() {
  const { botId } = useParams<keyof BotRouteParams>()
  const workspaceTitle = botId ? `Bot ${botId}` : "Bot workspace"

  return (
    <DashboardShell
      title={workspaceTitle}
      description="Bot workspace"
      sidebar={(onNavigate) => (
        <DashboardSidebar
          contextLabel="Bot workspace"
          contextTitle={workspaceTitle}
          topContent={
            <div className="space-y-4">
              <WorkspaceBackLink to={routePaths.clientBots} onNavigate={onNavigate} />
              {botId ? (
                <nav aria-label="Bot workspace navigation">
                  <NavigationItem
                    item={{
                      key: "bot-home",
                      title: "Home",
                      href: buildBotWorkspacePath(botId),
                      icon: House,
                      end: true,
                    }}
                    onNavigate={onNavigate}
                  />
                </nav>
              ) : null}
            </div>
          }
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
