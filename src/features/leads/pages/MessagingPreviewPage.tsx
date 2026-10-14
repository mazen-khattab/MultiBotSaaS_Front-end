import { Link } from "react-router-dom"

import { buildBotTabPath } from "@/app/router/routePaths"
import { MessagingPreview } from "@/features/leads/components/MessagingPreview"
import type { BotTabComponentProps } from "@/registry/botRegistry.types"
import { Button } from "@/shared/ui/button"

/** A separate workspace page; pagination filters never select dispatch recipients. */
export default function MessagingPreviewPage({ botId }: BotTabComponentProps) {
  return (
    <div className="space-y-6">
      <Button asChild variant="outline"><Link to={buildBotTabPath(botId, "leads")}>Back to leads</Link></Button>
      <MessagingPreview key={botId} botId={Number(botId)} />
    </div>
  )
}
