import { History } from "lucide-react"
import { lazy } from "react"

import type { BotModuleDefinition } from "@/registry/botRegistry.types"
import type { RunsPageConfig } from "@/registry/configs/runsConfig.types"
import type { RunDto } from "@/features/runs/types/runs.types"

/** Only existing generic Runs UI is registered; bot-specific forms stay deferred. */
export const scraperRunsConfig: RunsPageConfig<Record<string, unknown>> = Object.freeze({
  title: "Runs",
  capabilities: Object.freeze({ canCreateRun: false, canListRuns: true, canGetRun: true, canCancelRun: true, canRetryRun: false }),
  startUnavailableReason: "Run creation will be available when this module's run configuration is ready.",
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

const RunsPage = lazy(() => import("@/features/runs/pages/RegisteredRunsPage"))

/** These exact values are defined by the backend, independently of bot IDs. */
export function defineScraperModule(uiModuleCode: string): BotModuleDefinition {
  const tabs = Object.freeze([Object.freeze({ slug: "runs", label: "Runs", icon: History, component: RunsPage, config: scraperRunsConfig })])
  return Object.freeze({ uiModuleCode, sidebarTabs: tabs, pageConfigs: Object.freeze({ runs: scraperRunsConfig }),
    resolveComponent: (slug: string) => tabs.find((tab) => tab.slug === slug)?.component })
}
