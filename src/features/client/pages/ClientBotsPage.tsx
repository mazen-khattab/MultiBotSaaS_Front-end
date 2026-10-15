import { Link } from "react-router-dom"

import { buildBotWorkspacePath } from "@/app/router/routePaths"
import { useBots, useSubscribedBots } from "@/features/bots/hooks/useBots"
import type { BotDto } from "@/features/bots/types/bots.types"
import { BackendCapabilityNotice } from "@/features/client/components/BackendCapabilityNotice"
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert"
import { PageContainer } from "@/shared/components/layout/PageContainer"

export default function ClientBotsPage() {
  const subscribed = useSubscribedBots()
  const catalog = useBots()
  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-blue-600">Bots</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">My bots</h2>
      </div>
      <div className="space-y-8">
        <BackendCapabilityNotice title="Bot subscriptions" description="Browse the catalog and open bots assigned to your account. Purchasing bots and changing subscriptions are unavailable here." />
        <section aria-label="Subscribed bots">
          {subscribed.isPending ? <p role="status">Loading subscribed bots…</p> : null}
          <ApiErrorAlert error={subscribed.error} onRetry={() => { void subscribed.refetch() }} />
          {subscribed.data?.length === 0 ? <p className="text-sm text-muted-foreground">You have no subscribed bots.</p> : null}
          <BotCards bots={subscribed.data ?? []} />
        </section>
        <section aria-label="Bot catalog" className="space-y-4">
          <h3 className="text-xl font-semibold">Available bots</h3>
          {catalog.isPending ? <p role="status">Loading bot catalog…</p> : null}
          <ApiErrorAlert error={catalog.error} onRetry={() => { void catalog.refetch() }} />
          {catalog.data?.length === 0 ? <p className="text-sm text-muted-foreground">No bots are available.</p> : null}
          <BotCards bots={catalog.data ?? []} />
        </section>
      </div>
    </PageContainer>
  )
}

/** Use subscription metadata for navigation; never infer entitlement from IDs. */
function BotCards({ bots }: { readonly bots: readonly BotDto[] }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    {bots.map((bot) => <article key={bot.id} className="space-y-3 rounded-xl border bg-card p-5">
      <h3 className="font-semibold">{bot.name}</h3>
      {bot.description ? <p className="text-sm text-muted-foreground">{bot.description}</p> : null}
      <p className="text-xs text-muted-foreground">{bot.isActive ? "Active" : "Inactive"} · {bot.isSubscribed ? "Assigned to your account" : "Not assigned to your account"}</p>
      {bot.isSubscribed ? <Link className="text-sm font-medium text-blue-600" to={buildBotWorkspacePath(String(bot.id))}>Open workspace</Link>
        : <p className="text-sm text-muted-foreground">Subscription required</p>}
    </article>)}
  </div>
}

