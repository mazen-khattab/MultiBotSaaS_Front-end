import type { BotTabComponentProps } from "@/registry/botRegistry.types"
import { scraperRunsConfig } from "@/registry/definitions/scraperModules"
import GenericRunsPage from "@/features/runs/pages/GenericRunsPage"

/** Bind the existing registry tab contract without inventing a module form schema. */
export default function RegisteredRunsPage({ botId }: BotTabComponentProps) {
  return <GenericRunsPage botId={botId} config={scraperRunsConfig} />
}
