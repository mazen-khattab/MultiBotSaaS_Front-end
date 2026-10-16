import { z } from "zod"
import { runAccountIdSchema } from "@/features/runs/forms/runAccountIdSchema"

// These are the custom run fields selected for the Post Scraper form. Keep
// account selection outside this object so it never leaks into infoJson.
export const postScraperRunMetadataSchema = z.strictObject({
  searchTerm: z.string().trim().min(1, "Enter a search term."),
  maxResults: z.number({ error: "Enter the maximum results." })
    .int("Enter a whole number.")
    .min(1, "Enter at least 1 result.")
    .max(1000, "Enter no more than 1000 results."),
})

export const postScraperRunSchema = postScraperRunMetadataSchema.extend({
  accountId: runAccountIdSchema,
})

export type PostScraperRunMetadata = z.infer<typeof postScraperRunMetadataSchema>
export type PostScraperRunValues = z.infer<typeof postScraperRunSchema>
