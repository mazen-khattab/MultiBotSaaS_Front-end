import { memberMessagesGroupsConfig } from "./memberMessagesGroups.config"
import { memberMessagesStartRunConfig, type MemberMessagesRunValues } from "./memberMessagesStartRun.config"
import type { RunsPageConfig } from "@/registry/configs/runsConfig.types"
import { scraperRunsConfig } from "@/registry/definitions/scraperModules"
import { defineLeadsScraperModule } from "@/registry/definitions/leadsScraper.shared"

export const memberMessagesRunsConfig: RunsPageConfig<MemberMessagesRunValues> = Object.freeze({
  ...scraperRunsConfig,
  startUnavailableReason: undefined,
  startRun: memberMessagesStartRunConfig,
})

export const memberMessagesModule = defineLeadsScraperModule({
  uiModuleCode: "FB-MEMBERS-MESSAGES-SCRAPER",
  supportsGroups: true,
  supportsLeads: true,
  supportsRuns: true,
  groupsConfig: memberMessagesGroupsConfig,
  runsConfig: memberMessagesRunsConfig,
})
