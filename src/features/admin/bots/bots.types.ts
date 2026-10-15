import { z } from "zod"

import { adminIdSchema, adminPageFilters } from "@/features/admin/shared/adminContracts"

export const adminBotSchema = z.object({ id: adminIdSchema, name: z.string(), description: z.string().nullable(),
  currentPrice: z.number(), uiModuleCode: z.string(), cooldownMinutes: z.number().int().nonnegative(), isActive: z.boolean(), status: z.string() })
const moduleCode = z.string().trim().toUpperCase().min(1).max(50).regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, "Use letters and numbers separated by single hyphens.")
const metadata = { name: z.string().trim().min(1, "Enter a bot name.").max(100), description: z.string().nullable().optional(),
  // JS cannot represent the upper decimal(18,2) range exactly. The server keeps
  // final decimal precision validation; normal UI prices allow two decimals.
  currentPrice: z.number().min(0).lt(10 ** 16).refine((value) => value === Number(value.toFixed(2)), "Use at most two decimal places."),
  cooldownMinutes: z.number().int().min(0).max(2_147_483_647).optional() }
export const createAdminBotSchema = z.strictObject({ ...metadata, uiModuleCode: moduleCode })
export const updateAdminBotSchema = z.strictObject({ ...metadata, uiModuleCode: moduleCode.nullable().optional() })
export const adminBotFiltersSchema = adminPageFilters.extend({ search: z.string().max(100).optional(), isActive: z.boolean().optional() }).strict()
export type AdminBot = z.infer<typeof adminBotSchema>
export type CreateAdminBot = z.infer<typeof createAdminBotSchema>
export type UpdateAdminBot = z.infer<typeof updateAdminBotSchema>
export type AdminBotFilters = z.input<typeof adminBotFiltersSchema>
