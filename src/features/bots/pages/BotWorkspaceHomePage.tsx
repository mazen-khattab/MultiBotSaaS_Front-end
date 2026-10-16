import { ArrowUpRight, Bot, CircleCheck, Layers } from "lucide-react"
import { Link, useOutletContext } from "react-router-dom"

import { buildBotTabPath } from "@/app/router/routePaths"
import type { BotWorkspaceContextValue } from "@/features/bots/botWorkspace.types"
import { PageContainer } from "@/shared/components/layout/PageContainer"

export default function BotWorkspaceHomePage() {
  const { descriptor, module } = useOutletContext<BotWorkspaceContextValue>()
  return (
    <PageContainer className="space-y-7">
      <div className="page-heading">
        <p className="eyebrow">Your collection / Bot workspace</p>
        <h2>{descriptor.name}</h2>
        <p>A dedicated space for the accounts, configuration, and results behind your automation.</p>
      </div>
      <section className="overview-hero luxury-panel">
        <div>
          <span className="bot-card-icon mb-6"><Bot className="size-6" aria-hidden="true" /></span>
          <p className="eyebrow mb-3">Consider the possibilities</p>
          <h3 className="luxury-title text-3xl sm:text-4xl">Workspace ready</h3>
          <p className="mt-4 max-w-lg text-sm leading-7">Bring the details together. Choose a workspace page below to manage this bot and move your work forward.</p>
        </div>
        <div className="relative z-10 rounded-xl border bg-black/10 p-6">
          <Layers className="mb-5 size-5 text-[var(--bronze-highlight)]" aria-hidden="true" />
          <p className="text-sm font-medium">One bot. A considered workspace.</p>
          <p className="mt-3 text-sm leading-7">Your available tools are collected here, with a clear view of every step.</p>
          <span className="status-badge mt-5"><CircleCheck className="size-3.5" aria-hidden="true" />{module.sidebarTabs.length} workspace pages</span>
        </div>
      </section>
      <section aria-labelledby="workspace-pages-title">
        <div className="mb-5 flex items-center gap-4 border-b pb-4"><span className="section-number" aria-hidden="true">01</span><div><p className="eyebrow mb-1">Made for your workflow</p><h3 id="workspace-pages-title" className="text-lg font-medium">Explore this workspace</h3></div></div>
        <div className="grid gap-4 lg:grid-cols-2">
          {module.sidebarTabs.map((tab, index) => {
            const Icon = tab.icon
            return <Link key={tab.slug} to={buildBotTabPath(descriptor.botId, tab.slug)} aria-label={`Open ${tab.label}`} className="workspace-tool-card luxury-panel luxury-hover">
              <span className="workspace-tool-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="workspace-tool-icon"><Icon className="size-5" aria-hidden="true" /></span>
              <div className="relative min-w-0 flex-1">
                <h4 className="luxury-title text-xl sm:text-2xl">{tab.label}</h4>
                <p className="mt-2 text-xs text-muted-foreground">Open workspace page</p>
              </div>
              <span className="workspace-tool-arrow"><ArrowUpRight className="size-4" aria-hidden="true" /></span>
            </Link>
          })}
        </div>
      </section>
    </PageContainer>
  )
}
