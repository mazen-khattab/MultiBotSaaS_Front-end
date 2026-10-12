import { Suspense } from "react"
import { useOutletContext, useParams } from "react-router-dom"

import type { BotRouteParams } from "@/app/router/routeTypes"
import type { BotWorkspaceContextValue } from "@/features/bots/botWorkspace.types"
import { BotWorkspaceState } from "@/features/bots/components/BotWorkspaceState"
import type { BotTabComponent, BotTabComponentProps } from "@/registry/botRegistry.types"
import { PageContainer } from "@/shared/components/layout/PageContainer"

/** Render an existing lazy component reference, rather than defining a new page. */
function BotTabContent({ component: Component, botId, config }: BotTabComponentProps & { component: BotTabComponent }) {
  return <Component botId={botId} config={config} />
}

/** Select registered tabs from the parent workspace, never from URL guesses. */
export default function BotTabRoutePage() {
  const { botId, tabSlug } = useParams<keyof BotRouteParams>()
  const workspace = useOutletContext<BotWorkspaceContextValue | undefined>()

  if (!workspace) {
    return <PageContainer><BotWorkspaceState state="blocked" /></PageContainer>
  }

  // Check membership before invoking a resolver that might otherwise provide
  // a fallback. A descriptor for another route cannot render this bot's page.
  const tab = botId === workspace.descriptor.botId && tabSlug
    ? workspace.module.sidebarTabs.find((entry) => entry.slug === tabSlug)
    : undefined
  const Component = tab ? workspace.module.resolveComponent(tab.slug) : undefined

  if (!tab || !Component) {
    return (
      <PageContainer>
        <BotWorkspaceState state="not-found" botId={botId} />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-blue-600">Bot module</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          {tab.label}
        </h2>
      </div>
      {/* Loading stays inside the workspace shell while the lazy page arrives. */}
      <Suspense fallback={<p role="status" className="py-8 text-sm text-muted-foreground">Loading {tab.label}…</p>}>
        <BotTabContent key={`${workspace.descriptor.botId}:${tab.slug}`} component={Component} botId={workspace.descriptor.botId} config={tab.config} />
      </Suspense>
    </PageContainer>
  )
}
