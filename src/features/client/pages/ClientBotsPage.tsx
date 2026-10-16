import { ArrowUpRight, Bot, Circle, LockKeyhole } from "lucide-react"
import { Link } from "react-router-dom"

import { buildBotWorkspacePath } from "@/app/router/routePaths"
import { frontendCapabilities } from "@/core/capabilities/frontendCapabilities"
import { useBots, useSubscribedBots } from "@/features/bots/hooks/useBots"
import type { BotDto } from "@/features/bots/types/bots.types"
import { BackendCapabilityNotice } from "@/features/client/components/BackendCapabilityNotice"
import { ApiErrorAlert } from "@/shared/components/feedback/ApiErrorAlert"
import { PageContainer } from "@/shared/components/layout/PageContainer"

export default function ClientBotsPage() {
  const subscribed = useSubscribedBots()
  const catalog = useBots()
  // Exclude assigned catalog entries using server metadata and the independent
  // subscription list, including while either query refreshes.
  const subscribedIds = new Set(subscribed.data?.map((bot) => bot.id))
  const discover = catalog.data?.filter((bot) => !bot.isSubscribed && !subscribedIds.has(bot.id)) ?? []
  return (
    <PageContainer>
      <div className="page-heading">
        <p className="eyebrow">Your workspace / Bot collection</p>
        <h2>My bots</h2>
        <p>Your personal collection of automations. Open a familiar workspace or find something new.</p>
      </div>
      <div className="space-y-10">
        <section aria-label="Subscribed bots" className="space-y-5">
          <div className="flex flex-wrap items-center gap-4 border-b pb-4">
            <span className="section-number" aria-hidden="true">01</span>
            <div className="flex-1"><h3 className="text-lg font-medium">Subscribed bots</h3><p className="mt-1 text-xs text-muted-foreground">Assigned to you. Ready for your next step.</p></div>
            {subscribed.isSuccess ? <span className="status-badge">{subscribed.data.length} in your collection</span> : null}
          </div>
          {subscribed.isPending ? <p role="status">Loading subscribed bots…</p> : null}
          <ApiErrorAlert error={subscribed.error} onRetry={() => { void subscribed.refetch() }} />
          {subscribed.data?.length === 0 ? <div className="luxury-panel p-8"><Bot className="mb-4 size-6 text-[var(--bronze-highlight)]" aria-hidden="true" /><p className="text-sm">You have no subscribed bots.</p><p className="mt-2 text-xs text-muted-foreground">Browse the collection below. Your administrator can assign bots to your account.</p></div> : null}
          <BotCards bots={subscribed.data ?? []} />
        </section>
        <section aria-label="Bot catalog" className="space-y-5">
          <div className="flex flex-wrap items-center gap-4 border-b pb-4">
            <span className="section-number" aria-hidden="true">02</span>
            <div className="flex-1"><h3 className="text-lg font-medium">Available bots</h3><p className="mt-1 text-xs text-muted-foreground">Discover the rest of the collection.</p></div>
            {catalog.isSuccess ? <span className="status-badge">{discover.length} to discover</span> : null}
          </div>
          {catalog.isPending ? <p role="status">Loading bot catalog…</p> : null}
          <ApiErrorAlert error={catalog.error} onRetry={() => { void catalog.refetch() }} />
          {catalog.isSuccess && discover.length === 0 ? <p className="luxury-panel p-6 text-sm text-muted-foreground">{catalog.data.length === 0 ? "No bots are available." : "Every available bot is already in your collection."}</p> : null}
          <BotCards bots={discover} />
        </section>
        <BackendCapabilityNotice title="Bot subscriptions" description={frontendCapabilities.clientPurchase.description} />
      </div>
    </PageContainer>
  )
}

/** Use subscription metadata for navigation; never infer entitlement from IDs. */
function BotCards({ bots }: { readonly bots: readonly BotDto[] }) {
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
    {bots.map((bot) => <article key={bot.id} className={`bot-card luxury-panel p-6 ${bot.isSubscribed ? "bot-card-owned" : ""}`}>
      <div className="mb-6 flex items-center justify-between gap-3"><span className="bot-card-icon"><Bot className="size-5" aria-hidden="true" /></span><span className="status-badge"><Circle className={`size-1.5 ${bot.isActive ? "fill-current" : ""}`} aria-hidden="true" />{bot.isActive ? "Active" : "Inactive"}</span></div>
      <h3 className="text-lg font-medium">{bot.name}</h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{bot.description || "A dedicated workspace for your automation."}</p>
      <p className="mb-6 mt-4 text-xs text-muted-foreground">{bot.isActive ? "Active" : "Inactive"} · {bot.isSubscribed ? "Assigned to your account" : "Not assigned to your account"}</p>
      {bot.isSubscribed ? <Link className="bot-card-action" to={buildBotWorkspacePath(String(bot.id))}>Open workspace<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
        : <p className="bot-card-action"><span>Subscription required</span><LockKeyhole className="size-3.5" aria-hidden="true" /></p>}
    </article>)}
  </div>
}
