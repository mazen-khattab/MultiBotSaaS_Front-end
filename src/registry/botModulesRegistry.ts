import type { BotModulesRegistry } from "@/registry/botRegistry.types"
import { postScraperModule } from "@/features/bot-modules/post-scraper/postScraper.module"
import { memberScraperModule } from "@/features/bot-modules/member-scraper/memberScraper.module"
import { memberMessagesModule } from "@/features/bot-modules/member-messages-scrape/memberMessages.module"

// Exact backend codes select UI only; ownership comes from the Bot API.
export const botModulesRegistry: BotModulesRegistry = Object.freeze({
  "FB-MEMBERS-SCRAPER": memberScraperModule,
  "FB-POSTS-SCRAPER": postScraperModule,
  "FB-MEMBERS-MESSAGES-SCRAPER": memberMessagesModule,
})
