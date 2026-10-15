import { z } from "zod"

import { adminGuidSchema, adminIdSchema, adminPageFilters } from "@/features/admin/shared/adminContracts"

/** This DTO is a UserBot relationship, with server-owned legacy purchase fields. */
export const adminSubscriptionSchema = z.object({ id: adminIdSchema, userId: adminGuidSchema, userFullName: z.string(), userEmail: z.string(),
  botId: adminIdSchema, botName: z.string(), uiModuleCode: z.string(), purchasePrice: z.number(), purchaseDate: z.string(), isActive: z.literal(true) })
export const assignAdminSubscriptionSchema = z.strictObject({ userId: adminGuidSchema, botId: adminIdSchema })
export const adminSubscriptionFiltersSchema = adminPageFilters.extend({ userId: adminGuidSchema.optional(), botId: adminIdSchema.optional(), isActive: z.boolean().optional() }).strict()
export type AdminSubscription = z.infer<typeof adminSubscriptionSchema>
export type AssignAdminSubscription = z.infer<typeof assignAdminSubscriptionSchema>
export type AdminSubscriptionFilters = z.input<typeof adminSubscriptionFiltersSchema>
