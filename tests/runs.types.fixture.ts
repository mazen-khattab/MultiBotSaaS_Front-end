import { createElement, lazy } from "react"
import { z } from "zod"

import GenericRunsPage from "@/features/runs/pages/GenericRunsPage"
import type { BotTabComponentProps, BotTabDefinition } from "@/registry/botRegistry.types"
import type { RunsPageConfig } from "@/registry/configs/runsConfig.types"
import { defineLeadsScraperModule } from "@/registry/definitions/leadsScraper.shared"

const schema = z.object({ account: z.string().transform(Number), term: z.string() })
type Input = z.input<typeof schema>
type Output = z.output<typeof schema>

// Compile a test-only module with parsed numeric selections and typed columns.
export const config = {
  title: "Typed test runs",
  capabilities: { canCreateRun: true, canListRuns: false, canGetRun: false, canCancelRun: false, canRetryRun: false },
  table: { caption: "Run history", columns: [{ key: "status", header: "Status", accessorKey: "status", cell: (row) => row.status }] },
  startRun: {
    form: { schema, fields: [{ name: "account", label: "Account", type: "select", optionsProvider: "accounts" }] },
    accountOptionsProvider: "accounts",
    resolveSelection: (values) => ({ connectedAccountId: values.account }),
    serializeInfoJson: (values) => JSON.stringify({ term: values.term }),
  },
} satisfies RunsPageConfig<Input, Output>

/** The module wrapper binds its own config while satisfying existing routing. */
function TestModuleRuns({ botId }: BotTabComponentProps) {
  return createElement(GenericRunsPage<Input, Output>, { botId, config })
}

export const component: BotTabDefinition["component"] = lazy(async () => ({ default: TestModuleRuns }))
export const registryConfig: BotTabDefinition["config"] = config

// The shared factory retains transformed form output without type assertions.
export const composedModule = defineLeadsScraperModule<Input, Output>({
  uiModuleCode: "TEST-ONLY-SCRAPER", supportsGroups: false, supportsLeads: true,
  supportsRuns: true, runsConfig: config,
})
export const accountsOnlyModule = defineLeadsScraperModule({
  uiModuleCode: "TEST-ONLY-ACCOUNTS", supportsGroups: false, supportsLeads: false, supportsRuns: false,
})
// @ts-expect-error A Runs tab must supply its typed page configuration.
defineLeadsScraperModule({ uiModuleCode: "TEST-ONLY-MISSING", supportsGroups: false, supportsLeads: false, supportsRuns: true })
// @ts-expect-error Disabled Runs cannot carry an active run configuration.
defineLeadsScraperModule({ uiModuleCode: "TEST-ONLY-DISABLED", supportsGroups: false, supportsLeads: false, supportsRuns: false, runsConfig: config })

// @ts-expect-error Retry semantics are undefined; a module cannot enable retry.
export const invalidRetry: RunsPageConfig<Input, Output>["capabilities"]["canRetryRun"] = true
// @ts-expect-error Serializers must return opaque strings, not metadata objects.
export const invalidSerializer: NonNullable<RunsPageConfig<Input, Output>["startRun"]>["serializeInfoJson"] = () => ({ term: "test" })
// @ts-expect-error Parsed account values are numeric, not strings from the UI.
export const invalidSelection: NonNullable<RunsPageConfig<Input, Output>["startRun"]>["resolveSelection"] = (values) => ({ connectedAccountId: values.account.toUpperCase() })
