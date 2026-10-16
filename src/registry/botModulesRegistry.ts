import type { BotModulesRegistry } from "@/registry/botRegistry.types"
import { defineScraperModule } from "@/registry/definitions/scraperModules"
import { postScraperModule } from "@/features/bot-modules/post-scraper/postScraper.module"
import { memberScraperGroupsConfig } from "@/features/bot-modules/member-scraper/memberScraperGroups.config"
import { memberMessagesGroupsConfig } from "@/features/bot-modules/member-messages-scrape/memberMessagesGroups.config"

// Exact backend codes select UI only; ownership comes from the Bot API.
export const botModulesRegistry: BotModulesRegistry = Object.freeze({
  "FB-MEMBERS-SCRAPER": defineScraperModule("FB-MEMBERS-SCRAPER", memberScraperGroupsConfig),
  "FB-POSTS-SCRAPER": postScraperModule,
  "FB-MEMBERS-MESSAGES-SCRAPER": defineScraperModule("FB-MEMBERS-MESSAGES-SCRAPER", memberMessagesGroupsConfig),
})
