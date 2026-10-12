import { CircleAlert } from "lucide-react"
import { Link } from "react-router-dom"

import { buildBotWorkspacePath, routePaths } from "@/app/router/routePaths"
import { Button } from "@/shared/ui/button"

interface BotWorkspaceStateProps {
  state: "not-found"
  botId?: string
}

/** Keep unavailable data and missing tabs inside the workspace shell. */
export function BotWorkspaceState({ botId }: BotWorkspaceStateProps) {
  return (
    <section role="alert" className="rounded-2xl border bg-white px-6 py-14 text-center shadow-sm">
      <CircleAlert className="mx-auto size-8 text-slate-500" aria-hidden="true" />
      <h2 className="mt-5 text-lg font-semibold text-slate-950">
        Workspace page not found
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The requested bot workspace or tab could not be found.
      </p>
      <Button variant="outline" className="mt-6" asChild>
        <Link to={botId ? buildBotWorkspacePath(botId) : routePaths.clientBots}>
          {botId ? "Back to workspace home" : "Back to bots"}
        </Link>
      </Button>
    </section>
  )
}
