import { Activity, Bot, CircleGauge, Workflow } from "lucide-react"

import { useBots } from "@/features/bots/hooks/useBots"
import { BackendCapabilityNotice } from "@/features/client/components/BackendCapabilityNotice"
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert"
import { PageContainer } from "@/shared/components/layout/PageContainer"

const overviewCards = [
  { label: "Available bots", icon: Bot },
  { label: "Active workflows", icon: Workflow },
  { label: "Runs today", icon: Activity },
] as const

export default function ClientOverviewPage() {
  // Catalog is an unpaginated server list, so its length is a valid catalog
  // count. It says nothing about all-user workflow or daily run aggregates.
  const catalog = useBots()
  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-blue-600">Overview</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          Your automation workspace
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Open My bots to view your subscriptions and bot workspaces.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {overviewCards.map(({ label, icon: Icon }) => (
          <article key={label} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <span className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-5 text-2xl font-semibold text-slate-950" aria-label={label === "Available bots" && catalog.isSuccess ? `${label}: ${catalog.data.length}` : `${label} unavailable`}>
              {label === "Available bots" && catalog.isSuccess ? catalog.data.length : "—"}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-4 space-y-4">
        {catalog.isPending ? <p role="status">Loading available bots…</p> : null}
        <ApiErrorAlert error={catalog.error} onRetry={() => { void catalog.refetch() }} retrying={catalog.isFetching} />
        <BackendCapabilityNotice title="Summary metrics unavailable" description="Active workflow and daily run totals are not available. Open a bot workspace to view its current run history." />
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border bg-slate-950 p-6 text-white shadow-sm sm:p-8">
        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
          <CircleGauge className="size-5" aria-hidden="true" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">A focused view of every automation</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Your subscribed bots are available in My bots. Summary metrics will appear here when their integrations are ready.
        </p>
      </section>
    </PageContainer>
  )
}

