import { Bot, House } from "lucide-react"

import { buildBotTabPath, buildBotWorkspacePath, routePaths } from "@/app/router/routePaths"
import type { BotTabDefinition } from "@/registry/botRegistry.types"
import { DashboardSidebar } from "@/shared/components/layout/DashboardSidebar"
import { NavigationItem } from "@/shared/components/navigation/NavigationItem"
import { WorkspaceBackLink } from "@/shared/components/navigation/WorkspaceBackLink"

interface BotWorkspaceSidebarProps {
  botId?: string
  title: string
  tabs: readonly BotTabDefinition[]
  onNavigate?: () => void
}

/** Home is always available; module metadata supplies every remaining tab. */
export function BotWorkspaceSidebar({ botId, title, tabs, onNavigate }: BotWorkspaceSidebarProps) {
  return (
    <DashboardSidebar
      contextLabel="Bot workspace"
      contextTitle={title}
      topContent={
        <div className="space-y-4">
          <WorkspaceBackLink to={routePaths.clientBots} onNavigate={onNavigate} />
          {botId ? (
            <nav aria-label="Bot workspace navigation" className="space-y-1">
              <NavigationItem
                item={{ key: "bot-home", title: "Home", href: buildBotWorkspacePath(botId), icon: House, end: true }}
                onNavigate={onNavigate}
              />
              {/* Preserve registry order and use the existing encoded path builders. */}
              {tabs.map((tab) => (
                <NavigationItem
                  key={tab.slug}
                  item={{ key: tab.slug, title: tab.label, href: buildBotTabPath(botId, tab.slug), icon: tab.icon, end: tab.slug !== "runs" }}
                  onNavigate={onNavigate}
                />
              ))}
            </nav>
          ) : null}
        </div>
      }
      footer={
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Bot className="size-4 text-blue-400" aria-hidden="true" />
          Bot workspace
        </div>
      }
    />
  )
}
