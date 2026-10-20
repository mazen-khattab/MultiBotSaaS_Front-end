import { z } from "zod"
import { runAccountIdSchema } from "@/features/runs/forms/runAccountIdSchema"
import { runTargetGroupIdSchema } from "@/features/runs/forms/runTargetGroupField"

// These are the custom run fields selected for the Post Scraper form. Keep
// account and group selection outside this object so they never leak into infoJson.
export const postScraperRunMetadataSchema = z.strictObject({
  searchTerm: z.string().trim().min(1, "Enter a search term."),
  postsCount: z.number({ error: "Enter the posts count." })
    .int("Enter a whole number.")
    .min(1, "Enter at least 1 post.")
    .max(1000, "Enter no more than 1000 posts."),
  postDescription: z.string(),
  analyzieCommentPrompt: z.string(),
  analyzieProfilePrompt: z.string(),
  aiMessageStructure: z.string(),
})

export const postScraperRunSchema = postScraperRunMetadataSchema.extend({
  accountId: runAccountIdSchema,
  targetGroupId: runTargetGroupIdSchema,
})

export type PostScraperRunMetadata = z.infer<typeof postScraperRunMetadataSchema>
export type PostScraperRunValues = z.infer<typeof postScraperRunSchema>
