import { z } from "zod"

// .NET Int64 IDs arrive as JSON numbers. Reject unsafe integers instead of
// silently dispatching a rounded ID to a different lead.
export const leadIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
export const botIdSchema = z.number().int().positive().max(2_147_483_647)

/** Allowlist the supplied DTOs before caching or displaying server data. */
export const leadListSchema = z.object({
  leadId: leadIdSchema,
  leadFormattedId: z.string(),
  profileName: z.string(),
  profileUrl: z.string(),
  aiMessage: z.string(),
  fromGroup: z.string(),
  status: z.string(),
  createdAt: z.string(),
})

export const leadDetailsSchema = z.object({
  id: leadIdSchema,
  botId: botIdSchema,
  groupId: botIdSchema.nullable(),
  accountId: botIdSchema.nullable(),
  scrapeId: leadIdSchema.nullable(),
  externalId: z.string().nullable(),
  profileName: z.string(),
  profileUrl: z.string(),
  aiMessage: z.string(),
  status: z.string(),
  createdAt: z.string(),
  processedAt: z.string().nullable(),
  // Parse separately for presentation: malformed metadata must not hide the record.
  metadataJson: z.string().nullable(),
})

// Strip unknown keys so spreading a detail DTO can never send metadata or IDs.
// Status remains a backend string; no status enum was supplied by the API.
export const updateLeadSchema = z.object({
  profileName: z.string(),
  profileUrl: z.string(),
  aiMessage: z.string(),
  status: z.string(),
})

export const leadsPageSchema = z.object({
  items: leadListSchema.array(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  currentPage: z.number().int().positive(),
})

export const messagingPreviewLeadSchema = leadListSchema
  .omit({ leadFormattedId: true, fromGroup: true, createdAt: true })
  .extend({ leadNumber: z.string() })

export const messagingPreviewSchema = z.object({
  dailyMessageLimit: z.number().int().nonnegative(),
  messagesSent: z.number().int().nonnegative(),
  allowedToProcessCount: z.number().int().nonnegative(),
  leads: messagingPreviewLeadSchema.array(),
})

export const dispatchMessagingSchema = z.object({
  botId: botIdSchema,
  accountId: botIdSchema,
  leadIds: leadIdSchema.array().min(1),
})

export const dispatchMessagingResultSchema = z.object({
  jobId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  status: z.string(),
  totalLeadsCount: z.number().int().nonnegative(),
})
