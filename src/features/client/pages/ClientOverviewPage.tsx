import { Activity, ArrowRight, ArrowUpRight, Bot, Settings2, Workflow } from "lucide-react"
import { Link } from "react-router-dom"

import { routePaths } from "@/app/router/routePaths"
import { frontendCapabilities } from "@/core/capabilities/frontendCapabilities"
import { useBots } from "@/features/bots/hooks/useBots"
import { BackendCapabilityNotice } from "@/features/client/components/BackendCapabilityNotice"
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert"
import { PageContainer } from "@/shared/components/layout/PageContainer"
import { Button } from "@/shared/ui/button"

const overviewCards = [
  { label: "Available bots", icon: Bot, detail: "In the automation catalog" },
  { label: "Active workflows", icon: Workflow, detail: "Summary not yet available" },
  { label: "Runs today", icon: Activity, detail: "View history in each bot workspace" },
] as const

export default function ClientOverviewPage() {
  // Only the unpaginated catalog supplies a real total. Missing aggregates
  // stay unavailable rather than presenting sample activity as live data.
  const catalog = useBots()
  return (
    <PageContainer className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">Your workspace / Overview</p>
        <span className="hidden text-xs text-muted-foreground sm:inline">Thoughtfully automated.</span>
      </div>
      <section className="overview-hero luxury-panel" aria-labelledby="overview-title">
        <div className="relative z-10">
          <p className="eyebrow mb-5">A little less effort. A lot more possibility.</p>
          <h2 id="overview-title">Your automation workspace</h2>
          <p className="mt-5 max-w-md text-sm leading-7">Bring your bots, workflows, and next steps into focus. Make room for the work that matters.</p>
          <Button asChild variant="outline" className="mt-7 w-fit">
            <Link to={routePaths.clientBots}>Explore my bots <ArrowRight aria-hidden="true" /></Link>
          </Button>
        </div>
        <div className="relative z-10 border-t border-white/10 pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
          <span className="bot-card-icon mb-5"><Workflow className="size-5" aria-hidden="true" /></span>
          <h3 className="text-lg font-medium">Everything in its place.</h3>
          <p className="mt-3 text-sm leading-7">Each bot has a dedicated workspace for its accounts, configuration, and results. Pick up exactly where you need to.</p>
        </div>
      </section>
      <section aria-label="Workspace overview" className="overview-stats">
        {overviewCards.map(({ label, icon: Icon, detail }) => (
          <article key={label} className="overview-stat">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className="size-4 text-[var(--bronze-highlight)]" aria-hidden="true" />
            </div>
            <span className="stat-value" aria-label={label === "Available bots" && catalog.isSuccess ? `${label}: ${catalog.data.length}` : `${label} unavailable`}>
              {label === "Available bots" && catalog.isSuccess ? catalog.data.length : "—"}
            </span>
            <p className="text-xs text-muted-foreground">{detail}</p>
          </article>
        ))}
      </section>
      {catalog.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading available bots…</p> : null}
      <ApiErrorAlert error={catalog.error} onRetry={() => { void catalog.refetch() }} retrying={catalog.isFetching} />
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section className="luxury-panel p-6 sm:p-8" aria-labelledby="next-steps-title">
          <p className="eyebrow mb-3">Designed around your day</p>
          <h3 id="next-steps-title" className="luxury-title text-2xl">A clear path forward</h3>
          <div className="mt-5">
            <div className="overview-step"><span aria-hidden="true">01</span><div><h4 className="text-sm font-medium">Choose your automation</h4><p className="mt-1 text-xs leading-6 text-muted-foreground">Find your subscribed bots and discover the rest of the catalog.</p></div></div>
            <div className="overview-step"><span aria-hidden="true">02</span><div><h4 className="text-sm font-medium">Make it yours</h4><p className="mt-1 text-xs leading-6 text-muted-foreground">Connect accounts and configure the options available in each bot.</p></div></div>
            <div className="overview-step"><span aria-hidden="true">03</span><div><h4 className="text-sm font-medium">Follow the results</h4><p className="mt-1 text-xs leading-6 text-muted-foreground">Review runs and leads directly inside your bot workspace.</p></div></div>
          </div>
        </section>
        <div className="space-y-4">
          <Link to={routePaths.clientBots} className="luxury-panel luxury-hover flex items-start gap-4 p-6">
            <span className="bot-card-icon shrink-0"><Bot className="size-5" aria-hidden="true" /></span>
            <div className="flex-1"><h3 className="text-sm font-medium">Your bot collection</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">Open an assigned workspace or discover your next automation.</p></div><ArrowUpRight className="size-4 shrink-0 text-[var(--bronze-highlight)]" aria-hidden="true" />
          </Link>
          <Link to={routePaths.clientSettings} className="luxury-panel luxury-hover flex items-start gap-4 p-6">
            <span className="bot-card-icon shrink-0"><Settings2 className="size-5" aria-hidden="true" /></span>
            <div className="flex-1"><h3 className="text-sm font-medium">The finer details</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">Refine your company profile, messaging limits, and credentials.</p></div><ArrowUpRight className="size-4 shrink-0 text-[var(--bronze-highlight)]" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <BackendCapabilityNotice title="Summary metrics unavailable" description={frontendCapabilities.clientOverviewMetrics.description} />
    </PageContainer>
  )
}
