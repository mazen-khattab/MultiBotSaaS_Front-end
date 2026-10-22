import { useOutletContext, useParams } from "react-router-dom"

import type { BotRouteParams } from "@/app/router/routeTypes"
import type { BotWorkspaceContextValue } from "@/features/bots/botWorkspace.types"
import { BotWorkspaceState } from "@/features/bots/components/BotWorkspaceState"
import { PageContainer } from "@/shared/components/layout/PageContainer"
import LeadDetailsPage from "./LeadDetailsPage"

/** Direct visits retain workspace authorization and the module's Leads support. */
export default function LeadDetailsRoutePage() {
  const { botId, leadId } = useParams<keyof BotRouteParams>()
  const workspace = useOutletContext<BotWorkspaceContextValue | undefined>()
  const supported = workspace?.descriptor.botId === botId && workspace?.module.sidebarTabs.some((tab) => tab.slug === "leads")

  return <PageContainer>
    {supported && workspace && botId && leadId ? <>
      <div className="page-heading">
        <p className="eyebrow">{workspace.descriptor.name} / Leads</p>
        <h2>Lead details</h2>
      </div>
      <LeadDetailsPage key={`${botId}:${leadId}`} botId={botId} leadId={leadId} />
    </> : <BotWorkspaceState state="not-found" botId={botId} />}
  </PageContainer>
}
