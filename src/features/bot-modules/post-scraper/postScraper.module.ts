import type { RunDto } from "@/features/runs/types/runs.types";
import type { RunsPageConfig } from "@/registry/configs/runsConfig.types";
import { postScraperGroupsConfig } from "@/features/bot-modules/post-scraper/postScraperGroups.config";
import { postScraperStartRunConfig } from "@/features/bot-modules/post-scraper/postScraperStartRun.config";
import type { PostScraperRunValues } from "@/features/bot-modules/post-scraper/postScraperRunSchema";
import { defineLeadsScraperModule } from "@/registry/definitions/leadsScraper.shared";
import { scraperRunsConfig } from "@/registry/definitions/scraperModules";

/** Bind this bot's creation form while preserving its existing history columns. */
export const postScraperRunsConfig: RunsPageConfig<PostScraperRunValues> =
  Object.freeze({
    ...scraperRunsConfig,
    description: "Posts and interactions collected from target groups.",
    capabilities: Object.freeze({
      ...scraperRunsConfig.capabilities,
      canCreateRun: true,
    }),
    startUnavailableReason: undefined,
    startRun: postScraperStartRunConfig,
    table: Object.freeze({
      ...scraperRunsConfig.table,
      caption: "Post scraper run history",
      columns: Object.freeze([
        ...scraperRunsConfig.table.columns,
        // DTO IDs are available now. Do not fetch or invent account/group names.
        {
          key: "account",
          header: "Account ID",
          format: (run: RunDto) => run.accountId ?? "—",
        },
        {
          key: "group",
          header: "Target group ID",
          format: (run: RunDto) => run.groupId ?? "—",
        },
      ]),
    }),
  });

/** Preserve the family pages and exact backend code through shared composition. */
export const postScraperModule = defineLeadsScraperModule({
  uiModuleCode: "FB-POSTS-SCRAPER",
  supportsGroups: true,
  supportsLeads: true,
  groupsConfig: postScraperGroupsConfig,
  supportsRuns: true,
  runsConfig: postScraperRunsConfig,
});
