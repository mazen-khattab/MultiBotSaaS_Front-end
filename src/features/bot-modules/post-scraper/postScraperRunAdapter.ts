import { postScraperRunMetadataSchema, type PostScraperRunMetadata } from "@/features/bot-modules/post-scraper/postScraperRunSchema"
import type { PostScraperRunAdapterState } from "@/features/bot-modules/post-scraper/postScraper.types"

/** Own the JSON format here, rather than serializing the entire account form. */
export const postScraperRunAdapter = Object.freeze({
  status: "ready",
  adapter: Object.freeze({
    serializeInfoJson(metadata: PostScraperRunMetadata): string {
      return JSON.stringify(postScraperRunMetadataSchema.parse(metadata))
    },
    extractInfoJson(infoJson: string): PostScraperRunMetadata | undefined {
      try {
        const result = postScraperRunMetadataSchema.safeParse(JSON.parse(infoJson))
        return result.success ? result.data : undefined
      } catch {
        // Older run metadata can use another shape or contain malformed JSON.
        // Leave it unrecognized rather than inventing defaults for old runs.
        return undefined
      }
    },
  }),
} satisfies PostScraperRunAdapterState<PostScraperRunMetadata>)
