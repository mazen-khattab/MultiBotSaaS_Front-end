import { z } from "zod"

/** Module codes and status remain server-supplied strings, never inferred IDs. */
export const botSchema = z.object({
  id: z.number().int().positive(), name: z.string(), description: z.string().nullable(),
  currentPrice: z.number(), uiModuleCode: z.string(), cooldownMinutes: z.number().int(),
  isActive: z.boolean(), status: z.string(), isSubscribed: z.boolean(), subscribedAt: z.string().nullable(),
})

export type BotDto = z.infer<typeof botSchema>
