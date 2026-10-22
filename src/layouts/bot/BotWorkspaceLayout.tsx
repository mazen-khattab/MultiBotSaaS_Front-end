import { Outlet, useLoaderData, useParams } from "react-router-dom"

import type { BotRouteParams } from "@/app/router/routeTypes"
import type { BotWorkspaceContextValue, BotWorkspaceLoaderData } from "@/features/bots/botWorkspace.types"
import { BotWorkspaceSidebar } from "@/features/bots/components/BotWorkspaceSidebar"
import { BotWorkspaceState } from "@/features/bots/components/BotWorkspaceState"
import { UnsupportedBotModule } from "@/features/bots/components/UnsupportedBotModule"
import { useBotModule } from "@/features/bots/hooks/useBotModule"
import type { BotModulesRegistry } from "@/registry/botRegistry.types"
import { DashboardShell } from "@/shared/components/layout/DashboardShell"
import { PageContainer } from "@/shared/components/layout/PageContainer"

/** Retrieval belongs to the loader; the layout only composes supplied data. */
export default function BotWorkspaceLayout({ registry }: { registry?: BotModulesRegistry }) {
  console.log(registry);
  const { botId } = useParams<keyof BotRouteParams>()
  const workspace = useLoaderData<BotWorkspaceLoaderData>()
  const descriptor = workspace.status === "ready" ? workspace.descriptor : null
  const resolved = useBotModule(descriptor, registry)
  const workspaceTitle = descriptor?.name ?? (botId ? `Bot ${botId}` : "Bot workspace")

  // Children receive context only after both data retrieval and module lookup
  // succeed. Missing or unsupported workspaces never render a module page.
  const context: BotWorkspaceContextValue | null = descriptor && resolved.status === "ready"
    ? { descriptor, module: resolved.module }
    : null

  return (
    <DashboardShell
      appearance="client"
      title={workspaceTitle}
      description="Bot workspace"
      sidebar={(onNavigate) => (
        <BotWorkspaceSidebar
          botId={botId}
          title={workspaceTitle}
          tabs={resolved.tabs}
          onNavigate={onNavigate}
        />
      )}
    >
      {context ? <Outlet context={context} /> : (
        <PageContainer>
          {resolved.status === "unsupported" ? (
            <UnsupportedBotModule error={resolved.error} />
          ) : (
            <BotWorkspaceState state="not-found" />
          )}
        </PageContainer>
      )}
    </DashboardShell>
  )
}
