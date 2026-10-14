import type { BotModulesRegistry } from "@/registry/botRegistry.types"
import { defineScraperModule } from "@/registry/definitions/scraperModules"
import { postScraperModule } from "@/features/bot-modules/post-scraper/postScraper.module"

// Exact backend codes select UI only; ownership comes from the Bot API.
export const botModulesRegistry: BotModulesRegistry = Object.freeze({
  "FB-MEMBERS-SCRAPER": defineScraperModule("FB-MEMBERS-SCRAPER"),
  "FB-POSTS-SCRAPER": postScraperModule,
  "FB-MEMBERS-MESSAGES-SCRAPER": defineScraperModule("FB-MEMBERS-MESSAGES-SCRAPER"),
})
