import type { RunDto } from "@/features/runs/types/runs.types"
import type { RunsPageConfig } from "@/registry/configs/runsConfig.types"
import { defineLeadsScraperModule } from "@/registry/definitions/leadsScraper.shared"
import { scraperRunsConfig } from "@/registry/definitions/scraperModules"

/**
 * Specialize only documented ScrapeDto fields. infoJson stays opaque until the
 * module's schema and adapter are available; historical metadata is not guessed.
 */
export const postScraperRunsConfig: RunsPageConfig<Record<string, unknown>> = Object.freeze({
  ...scraperRunsConfig,
  description: "Posts and interactions collected from target groups.",
  // The API can start scrapes, but this module cannot yet build approved settings.
  capabilities: Object.freeze({ ...scraperRunsConfig.capabilities, canCreateRun: false }),
  startUnavailableReason: "Starting a post scrape is unavailable until its run settings are ready.",
  table: Object.freeze({
    ...scraperRunsConfig.table,
    caption: "Post scraper run history",
    columns: Object.freeze([
      ...scraperRunsConfig.table.columns,
      // DTO IDs are available now. Do not fetch or invent account/group names.
      { key: "account", header: "Account ID", format: (run: RunDto) => run.accountId ?? "—" },
      { key: "group", header: "Target group ID", format: (run: RunDto) => run.groupId ?? "—" },
    ]),
  }),
})

/** Preserve the family pages and exact backend code through shared composition. */
export const postScraperModule = defineLeadsScraperModule({
  uiModuleCode: "FB-POSTS-SCRAPER",
  supportsGroups: true,
  supportsLeads: true,
  supportsRuns: true,
  runsConfig: postScraperRunsConfig,
})
