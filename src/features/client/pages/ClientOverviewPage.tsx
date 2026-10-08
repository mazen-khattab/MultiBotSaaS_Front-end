import { Activity, Bot, CircleGauge, Workflow } from "lucide-react"

import { PageContainer } from "@/shared/components/layout/PageContainer"

const overviewCards = [
  { label: "Available bots", icon: Bot },
  { label: "Active workflows", icon: Workflow },
  { label: "Runs today", icon: Activity },
] as const

export default function ClientOverviewPage() {
  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-blue-600">Overview</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          Your automation workspace
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Live account and bot data will connect after the API layer is introduced.
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
            <p className="mt-5 text-2xl font-semibold text-slate-950" aria-label={`${label} unavailable`}>
              —
            </p>
          </article>
        ))}
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border bg-slate-950 p-6 text-white shadow-sm sm:p-8">
        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
          <CircleGauge className="size-5" aria-hidden="true" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">A focused view of every automation</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Bot discovery and real operational metrics depend on backend capabilities scheduled for later parts.
          This shell is ready for those integrations without restructuring.
        </p>
      </section>
    </PageContainer>
  )
}

