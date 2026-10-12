import { z } from "zod"

import { RUN_STATUSES } from "@/features/runs/types/runs.types"

/** Validate documented run/list responses; infoJson remains an opaque string. */
export const runSchema = z.object({
  id: z.number().int().positive(), botId: z.number().int().nullable(),
  groupId: z.number().int().nullable(), accountId: z.number().int().nullable(),
  collectedLeadsCount: z.number().int().nonnegative(), infoJson: z.string(),
  startedAt: z.string(), endedAt: z.string().nullable(), status: z.enum(RUN_STATUSES),
})

export const runsPageSchema = z.object({
  items: runSchema.array(), totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(), currentPage: z.number().int().positive(),
})
