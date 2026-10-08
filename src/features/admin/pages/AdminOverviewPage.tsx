import { Bot, CreditCard, ReceiptText, Users } from "lucide-react"

import { PageContainer } from "@/shared/components/layout/PageContainer"

const summaryItems = [
  { label: "Users", icon: Users },
  { label: "Bots", icon: Bot },
  { label: "Subscriptions", icon: CreditCard },
  { label: "Transactions", icon: ReceiptText },
] as const

export default function AdminOverviewPage() {
  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-violet-600">Platform overview</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Control center</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Administrative data will appear when management endpoints are available.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map(({ label, icon: Icon }) => (
          <article key={label} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <span className="flex size-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-5 text-2xl font-semibold text-slate-950" aria-label={`${label} unavailable`}>
              —
            </p>
          </article>
        ))}
      </div>
      <section className="mt-6 rounded-2xl border border-dashed bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-950">Admin integrations are intentionally deferred</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          The current backend contract has no admin management endpoints. This dashboard provides the route and
          layout boundary without creating fake operations.
        </p>
      </section>
    </PageContainer>
  )
}

