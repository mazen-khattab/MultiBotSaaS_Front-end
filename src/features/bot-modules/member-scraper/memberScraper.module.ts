import { memberScraperGroupsConfig } from "./memberScraperGroups.config"
import { memberScraperStartRunConfig, type MemberScraperRunValues } from "./memberScraperStartRun.config"
import type { RunsPageConfig } from "@/registry/configs/runsConfig.types"
import { scraperRunsConfig } from "@/registry/definitions/scraperModules"
import { defineLeadsScraperModule } from "@/registry/definitions/leadsScraper.shared"

export const memberScraperRunsConfig: RunsPageConfig<MemberScraperRunValues> = Object.freeze({
  ...scraperRunsConfig,
  startUnavailableReason: undefined,
  startRun: memberScraperStartRunConfig,
})

export const memberScraperModule = defineLeadsScraperModule({
  uiModuleCode: "FB-MEMBERS-SCRAPER",
  supportsGroups: true,
  supportsLeads: true,
  supportsRuns: true,
  groupsConfig: memberScraperGroupsConfig,
  runsConfig: memberScraperRunsConfig,
})
