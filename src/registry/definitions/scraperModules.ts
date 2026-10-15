import { frontendCapabilities } from "@/core/capabilities/frontendCapabilities"
import type { RunsPageConfig } from "@/registry/configs/runsConfig.types"
import type { RunDto } from "@/features/runs/types/runs.types"
import { defineLeadsScraperModule } from "@/registry/definitions/leadsScraper.shared"

/** Only existing generic Runs UI is registered; bot-specific forms stay deferred. */
export const scraperRunsConfig: RunsPageConfig<Record<string, unknown>> = Object.freeze({
  title: "Runs",
  capabilities: Object.freeze({ canCreateRun: false, canListRuns: true, canGetRun: true, canCancelRun: true, canRetryRun: false }),
  startUnavailableReason: frontendCapabilities.scraperRunConfiguration.description,
  table: Object.freeze({
    caption: "Run history",
    columns: Object.freeze([
      { key: "id", header: "Run", accessorKey: "id" as const },
      { key: "status", header: "Status", accessorKey: "status" as const },
      { key: "leads", header: "Collected leads", accessorKey: "collectedLeadsCount" as const },
      { key: "started", header: "Started", format: (run: RunDto) => new Date(run.startedAt).toLocaleString() },
      { key: "ended", header: "Ended", format: (run: RunDto) => run.endedAt ? new Date(run.endedAt).toLocaleString() : "—" },
    ]),
  }),
})

/** Preserve the existing modules until a documented specialization changes them. */
export function defineScraperModule(uiModuleCode: string) {
  return defineLeadsScraperModule({
    uiModuleCode,
    supportsGroups: true,
    supportsLeads: true,
    supportsRuns: true,
    // No module-specific creation schema is defined yet. History, detail, and
    // cancellation work; the generic page keeps Start run disabled explicitly.
    runsConfig: scraperRunsConfig,
  })
}
