import { postScraperRunSchema } from "@/features/bot-modules/post-scraper/postScraperRunSchema"
import type { PostScraperRunAdapterState } from "@/features/bot-modules/post-scraper/postScraper.types"

/**
 * Expose the blocker without a serializer or metadata extractor. In particular,
 * do not fall back to an empty object or add schemaVersion to a live payload.
 * The typed adapter contract is ready for the eventual documented schema;
 * the never type records that no production metadata type has been chosen.
 */
export const postScraperRunAdapter = postScraperRunSchema satisfies PostScraperRunAdapterState<never>
